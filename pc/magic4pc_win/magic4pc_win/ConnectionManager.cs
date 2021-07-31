using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Magic4PC.Win
{
    public class ConnectionManager
    {
        public static ConnectionManager Instance { get; } = new ConnectionManager();

        private ConnectionManager()
        {
        }

        public void StartAutoConnect()
        {
            MagicCursorDriver.Instance.PropertyChanged += OnCursorDriverPropChange;
            CheckConnection();
        }

        public void StopAutoConnect()
        {
            MagicCursorDriver.Instance.PropertyChanged -= OnCursorDriverPropChange;
            cancelSrc?.Cancel();
            cancelSrc = null;
        }

        private void OnCursorDriverPropChange(object sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == nameof(MagicCursorDriver.ConnectedDevice))
            {
                CheckConnection();
            }
        }

        private CancellationTokenSource cancelSrc;
        private void CheckConnection()
        {
            bool isConnected = MagicCursorDriver.Instance.ConnectedDevice != null;

            if (!isConnected && cancelSrc == null)
            {
                cancelSrc = new CancellationTokenSource();
                Task.Run(async () => await AutoConnectAsync(cancelSrc.Token));
            }
            else if (isConnected && cancelSrc != null)
            {
                cancelSrc.Cancel();
                cancelSrc = null;
            }
        }

        private async Task AutoConnectAsync(CancellationToken token)
        {
            //keep trying to connect to devices from settings until connected
            while(true)
            {
                var devices = Settings.Instance.StoredDevices;
                foreach (var dev in devices)
                {
                    token.ThrowIfCancellationRequested();
                    try
                    {
                        const int timeoutMs = 5000;
                        CancellationTokenSource cancelSrc = new CancellationTokenSource(timeoutMs);
                        var client = await MagicClient.Connect(dev, Settings.Instance.UpdateFrequency, new[] { MagicClient.SensorDataField.Coordinate }, cancelSrc.Token);

                        cancelSrc = null;
                        MagicCursorDriver.Instance.StartStreamingCursorFromClient(client);
                        return;
                    }
                    catch (OperationCanceledException)
                    {
                        Debug.WriteLine("No response from device "+dev.Mac);
                    }
                }
                await Task.Delay(1000);
            }
        }
    }
}
