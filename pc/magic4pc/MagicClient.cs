using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Magic4PC
{
    public class DeviceInfo
    {
        public string Model { get; set; }
        public string IPAddress { get; set; }
        public int Port { get; set; }
        public string Mac { get; set; }
    }

    public struct Quaternion
    {
        public float q0, q1, q2, q3;

        public override string ToString() => $"({q0}, {q1}, {q2}, {q3})";
    }

    public struct Vector2
    {
        public float x, y;

        public override string ToString() => $"({x}, {y})";
    }

    public struct Vector3
    {
        public float x, y, z;

        public override string ToString() => $"({x}, {y}, {z})";
    }

    public interface IRemoteUpdate
    {}

    public struct RemoteTransformUpdate : IRemoteUpdate
    {
        public Vector2 coordinate;
        public Vector3 gyroscope;
        public Vector3 acceleration;
        public Quaternion quaternion;
    }

    public struct RemoteInputUpdate : IRemoteUpdate
    {
        public int keyCode;
        public bool isDown;
    }

    public class ConnectionLostException : Exception
    {
    }

    public class MagicClient : IDisposable
    {
        public const int BroadcastPort = 42830;
        public const int DefaultSubscriptionPort = 42831;
        public const int ProtocolVersion = 1;

        public static async IAsyncEnumerable<DeviceInfo> FindAvailableDevices(Action<string> errorHandler, [EnumeratorCancellation] CancellationToken token = default)
        {
            UdpClient listener = new UdpClient(BroadcastPort);

            token.Register(l => ((UdpClient)l).Close(), listener);
            while (true)
            {
                token.ThrowIfCancellationRequested();
                var udpMsg = await listener.ReceiveAsync().WithCancellation(token);
                DeviceInfo dev = null;
                try
                {
                    var msg = Encoding.UTF8.GetString(udpMsg.Buffer);
                    var jobject = JObject.Parse(msg);
                    var pktType = (string)jobject["t"];
                    var version = (int)jobject["version"];
                    if(pktType.Equals("magic4pc_ad"))
                    {
                        if (version.Equals(ProtocolVersion))
                        {
                            dev = JsonConvert.DeserializeObject<DeviceInfo>(msg);
                            dev.IPAddress = udpMsg.RemoteEndPoint.Address.ToString();
                        }
                        else
                        {
                            errorHandler($"A device was found with an incompatible protocol version ({version} != {ProtocolVersion})");
                        }
                    }
                }
                catch(Exception ex)
                {
                    errorHandler(ex.Message);
                    Debug.WriteLine(ex);
                }
                if(dev != null)
                {
                    yield return dev;
                }
            }
        }

        public DeviceInfo DeviceInfo { get; private set; }
        public IEnumerable<SensorDataField> Filter { get; private set; }

        private UdpClient client;
        private MagicClient(DeviceInfo dev, UdpClient client, IList<SensorDataField> filter)
        {
            DeviceInfo = dev;
            this.client = client;
            Filter = filter;
        }

        public class SensorDataField
        {
            internal delegate void Decode(BinaryReader data, ref RemoteTransformUpdate output);
            private SensorDataField(string value, Decode decoder)
            {
                Value = value;
                Decoder = decoder;
            }

            internal string Value { get; }
            internal Decode Decoder { get; }

            public static SensorDataField ReturnValue { get; } = new SensorDataField("returnValue", (BinaryReader data, ref RemoteTransformUpdate output) =>
            {
            });
            public static SensorDataField DeviceId { get; } = new SensorDataField("deviceId", (BinaryReader data, ref RemoteTransformUpdate output) =>
            {
            });
            public static SensorDataField Coordinate { get; } = new SensorDataField("coordinate", (BinaryReader data, ref RemoteTransformUpdate output) =>
            {
                output.coordinate.x = data.ReadInt32();
                output.coordinate.y = data.ReadInt32();
            });
            public static SensorDataField Gyroscope { get; } = new SensorDataField("gyroscope", (BinaryReader data, ref RemoteTransformUpdate output) =>
            {
                output.gyroscope.x = data.ReadSingle();
                output.gyroscope.y = data.ReadSingle();
                output.gyroscope.z = data.ReadSingle();
            });
            public static SensorDataField Acceleration { get; } = new SensorDataField("acceleration", (BinaryReader data, ref RemoteTransformUpdate output) =>
            {
                output.acceleration.x = data.ReadSingle();
                output.acceleration.y = data.ReadSingle();
                output.acceleration.z = data.ReadSingle();
            });
            public static SensorDataField Quaternion { get; } = new SensorDataField("quaternion", (BinaryReader data, ref RemoteTransformUpdate output) =>
            {
                output.quaternion.q0 = data.ReadSingle();
                output.quaternion.q1 = data.ReadSingle();
                output.quaternion.q2 = data.ReadSingle();
                output.quaternion.q3 = data.ReadSingle();
            });
        }

        public struct SubscribeSensorSettings
        {
            public int updateFreq;
            public string[] filter;
        }

        public static async Task<MagicClient> Connect(DeviceInfo device, int updateFrequency, IEnumerable<SensorDataField> filterEnum, CancellationToken token = default)
        {
            var filter = filterEnum.ToArray();

            UdpClient client = new UdpClient();
            var cancelRegistration = token.Register(l => ((UdpClient)l).Close(), client);
            client.Connect(device.IPAddress, device.Port);

            JObject msg = new JObject();
            msg["t"] = "sub_sensor";
            msg["updateFreq"] = updateFrequency;
            var jfilter = new JArray();
            foreach(var filterVal in filter.Select(f => f.Value)) { jfilter.Add(filterVal); }
            msg["filter"] = jfilter;
            var msgBytes = Encoding.UTF8.GetBytes(msg.ToString());
            await client.SendAsync(msgBytes, msgBytes.Length).WithCancellation(token);
            var result = await client.ReceiveAsync().WithCancellation(token);
            token.ThrowIfCancellationRequested();
            cancelRegistration.Unregister();
            return new MagicClient(device, client, filter);
        }

        public async IAsyncEnumerable<IRemoteUpdate> StreamRemoteUpdates([EnumeratorCancellation] CancellationToken token = default)
        {
            Stopwatch stopwatch = new Stopwatch();
            stopwatch.Start();
            while (true)
            {
                token.ThrowIfCancellationRequested();

                UdpReceiveResult result;
                CancellationTokenSource rcvTimeout = new CancellationTokenSource(2000);
                var combinedCancelSrc = CancellationTokenSource.CreateLinkedTokenSource(token, rcvTimeout.Token);
                try
                {
                    result = await client.ReceiveAsync().WithCancellation(combinedCancelSrc.Token);
                }
                catch(TaskCanceledException)
                {
                    if(token.IsCancellationRequested)
                    {
                        throw;
                    }
                    throw new ConnectionLostException();
                }

                var msgJson = Encoding.UTF8.GetString(result.Buffer);
                var jobject = JObject.Parse(msgJson);
                if (((string)jobject["t"]).Equals("remote_update"))
                {
                    var payload = Convert.FromBase64String((string)jobject["payload"]);
                    using(var reader = new BinaryReader(new MemoryStream(payload)))
                    {
                        yield return ReadRemoteUpdate(reader);
                    }
                }
                else if (((string)jobject["t"]).Equals("input"))
                {
                    int keyCode = (int)jobject["parameters"]["keyCode"];
                    bool isDown = (bool)jobject["parameters"]["isDown"];
                    yield return new RemoteInputUpdate { keyCode = keyCode, isDown = isDown };
                }
                if (stopwatch.ElapsedMilliseconds > 500)
                {
                    stopwatch.Restart();
                    var replyBytes = Encoding.UTF8.GetBytes("{}");
                    await client.SendAsync(replyBytes, replyBytes.Length).WithCancellation(token);
                }
            }
        }

        private RemoteTransformUpdate ReadRemoteUpdate(BinaryReader data)
        {
            RemoteTransformUpdate output = new();
            foreach (var entry in Filter)
            {
                entry.Decoder(data, ref output);
            }
            return output;
        }

        public void Dispose()
        {
            client.Dispose();
        }
    }
}
