using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Magic4PC.Win
{
    public class MagicCursorDriver : INotifyPropertyChanged
    {
        public static MagicCursorDriver Instance
        {
            get
            {
                if(instance == null)
                {
                    instance = new MagicCursorDriver();
                }
                return instance;
            }
        }
        private static MagicCursorDriver instance;

        #region ConnectedDevice
        public DeviceInfo ConnectedDevice
        {
            get => _connectedDevice;
            private set
            {
                if(value != _connectedDevice)
                {
                    _connectedDevice = value;
                    NotifyPropertyChanged();
                }
            }
        }
        private DeviceInfo _connectedDevice = null;
        #endregion

        private MagicClient client;
        private CancellationTokenSource cancelSrc;
        private Screen targetScreen;

        private MagicCursorDriver()
        {
            Settings.Instance.PropertyChanged += (sender, e) =>
            {
                if(e.PropertyName == nameof(Settings.TargetScreen))
                {
                    UpdateScreen();
                }
            };
        }

        public void StartStreamingCursorFromClient(MagicClient client)
        {
            if (ConnectedDevice != null)
            {
                Stop();
            }
            this.client = client;
            ConnectedDevice = client.DeviceInfo;
            cancelSrc = new CancellationTokenSource();
            Task.Run(async () =>
            {
                try
                {
                    int i = 0;
                    await foreach (var update in client.StreamRemoteUpdates(cancelSrc.Token))
                    {
                        if (i++ % 200 == 0)
                        {
                            UpdateScreen();
                        }

                        if(update is RemoteTransformUpdate transform)
                        {
                            float x = transform.coordinate.x / 1920;
                            float y = transform.coordinate.y / 1080;
                            SetCursorPosition(x, y);
                        }
                        else if(update is RemoteInputUpdate input)
                        {
                            Debug.WriteLine(input.keyCode);
                            const int redBtnKeyCode = 403;
                            const int greenBtnKeyCode = 404;
                            const int yellowBtnKeyCode = 405;
                            const int blueBtnKeyCode = 406;

                            const int leftBtnKeyCode = 37;
                            const int upBtnKeyCode = 38;
                            const int rightBtnKeyCode = 39;
                            const int downBtnKeyCode = 40;

                            const int playKeyCode = 415;
                            const int pauseKeyCode = 19;

                            if (input.keyCode == redBtnKeyCode) // Left mouse
                            {
                                PushMouseButtonEvent(input.isDown, !input.isDown, false, false);
                            }
                            else if (input.keyCode == greenBtnKeyCode) // Right mouse
                            {
                                PushMouseButtonEvent(false, false, input.isDown, !input.isDown);
                            }
                            else if (input.keyCode == yellowBtnKeyCode)
                            {
                                PushKeyboardButtonEvent(PInvoke.User32.VirtualKey.VK_RETURN, input.isDown);
                            }
                            else if (input.keyCode == blueBtnKeyCode)
                            {
                                PushKeyboardButtonEvent(PInvoke.User32.VirtualKey.VK_ESCAPE, input.isDown);
                            }
                            else if (input.keyCode == leftBtnKeyCode)
                            {
                                PushKeyboardButtonEvent(PInvoke.User32.VirtualKey.VK_LEFT, input.isDown);
                            }
                            else if (input.keyCode == upBtnKeyCode)
                            {
                                PushKeyboardButtonEvent(PInvoke.User32.VirtualKey.VK_UP, input.isDown);
                            }
                            else if (input.keyCode == rightBtnKeyCode)
                            {
                                PushKeyboardButtonEvent(PInvoke.User32.VirtualKey.VK_RIGHT, input.isDown);
                            }
                            else if (input.keyCode == downBtnKeyCode)
                            {
                                PushKeyboardButtonEvent(PInvoke.User32.VirtualKey.VK_DOWN, input.isDown);
                            }
                            else if (input.keyCode == playKeyCode) // Play media key
                            {
                                PushKeyboardButtonEvent(PInvoke.User32.VirtualKey.VK_MEDIA_PLAY_PAUSE, input.isDown);
                            }
                            else if (input.keyCode == pauseKeyCode) // Play media key
                            {
                                PushKeyboardButtonEvent(PInvoke.User32.VirtualKey.VK_MEDIA_PLAY_PAUSE, input.isDown);
                            }
                        }
                    }
                }
                finally
                {
                    Stop();
                }
            });
        }

        private float lastX, lastY;
        private void SetCursorPosition(float x, float y)
        {
            var screenBounds = targetScreen.Bounds;
            PInvoke.User32.SetCursorPos(
                (int)(screenBounds.left + (screenBounds.right - screenBounds.left) * x),
                (int)(screenBounds.top + (screenBounds.bottom - screenBounds.top) * y)
            );
            lastX = x;
            lastY = y;
        }

        private void PushMouseButtonEvent(bool leftDown, bool leftUp, bool rightDown, bool rightUp)
        {
            var flags = (PInvoke.User32.mouse_eventFlags)0;
            flags |= leftDown ? PInvoke.User32.mouse_eventFlags.MOUSEEVENTF_LEFTDOWN : 0;
            flags |= leftUp ? PInvoke.User32.mouse_eventFlags.MOUSEEVENTF_LEFTUP : 0;
            flags |= rightDown ? PInvoke.User32.mouse_eventFlags.MOUSEEVENTF_RIGHTDOWN : 0;
            flags |= rightUp ? PInvoke.User32.mouse_eventFlags.MOUSEEVENTF_RIGHTUP : 0;
            PInvoke.User32.mouse_event(flags, (int)lastX, (int)lastY, 0, IntPtr.Zero);
        }

        private void PushKeyboardButtonEvent(PInvoke.User32.VirtualKey key, bool isDown)
        {
            PInvoke.User32.INPUT[] inputs = new PInvoke.User32.INPUT[1];
            inputs[0].type = PInvoke.User32.InputType.INPUT_KEYBOARD;
            inputs[0].Inputs.ki.wVk = key;
            inputs[0].Inputs.ki.dwFlags = isDown ? 0 : PInvoke.User32.KEYEVENTF.KEYEVENTF_KEYUP;
            PInvoke.User32.SendInput(1, inputs, Marshal.SizeOf<PInvoke.User32.INPUT>());
        }

        private void UpdateScreen()
        {
            targetScreen = Screen.AllScreens.Where(s => s.DeviceName == Settings.Instance.TargetScreen).SingleOrDefault();
            if(targetScreen == null)
            {
                targetScreen = Screen.AllScreens.First();
            }
        }

        public void Stop()
        {
            cancelSrc.Cancel();
            cancelSrc = null;
            client.Dispose();
            client = null;
            ConnectedDevice = null;
        }

        #region NotifyPropertyChanged
        public event PropertyChangedEventHandler PropertyChanged;
        private void NotifyPropertyChanged([CallerMemberName] string propertyName = "")
        {
            if (PropertyChanged != null)
            {
                PropertyChanged(this, new PropertyChangedEventArgs(propertyName));
            }
        }
        #endregion
    }
}
