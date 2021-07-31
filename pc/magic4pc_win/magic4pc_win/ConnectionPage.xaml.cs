using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.UI.Xaml.Media.Animation;
using System.Threading;
using System.Threading.Tasks;

namespace Magic4PC.Win
{
    public sealed partial class ConnectionPage : Page
    {
        #region IsConnecting
        public bool IsConnecting
        {
            get { return (bool)this.GetValue(IsConnectingProperty); }
            set { this.SetValue(IsConnectingProperty, value); }
        }
        public static readonly DependencyProperty IsConnectingProperty = DependencyProperty.Register(
          nameof(IsConnecting), typeof(bool), typeof(ConnectionPage), new PropertyMetadata(false));
        #endregion

        #region HasFoundDevice
        public bool HasFoundDevice
        {
            get { return (bool)this.GetValue(HasFoundDeviceProperty); }
            set { this.SetValue(HasFoundDeviceProperty, value); }
        }
        public static readonly DependencyProperty HasFoundDeviceProperty = DependencyProperty.Register(
          nameof(HasFoundDevice), typeof(bool), typeof(ConnectionPage), new PropertyMetadata(false));
        #endregion

        private HashSet<string> macAddresses = new HashSet<string>();
        private CancellationTokenSource findDevicesCancelToken;

        public ConnectionPage()
        {
            this.InitializeComponent();
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            ConnectionManager.Instance.StopAutoConnect();
            Action<string> onError = msg =>
            {
                errorLabel.Text = msg;
                errorLabel.Visibility = Visibility.Visible;
            };
            findDevicesCancelToken = new CancellationTokenSource();
            try
            {
                await foreach (var device in MagicClient.FindAvailableDevices(onError, findDevicesCancelToken.Token))
                {
                    HasFoundDevice = true;
                    if (macAddresses.Add(device.Mac))
                    {
                        DeviceList.Items.Add(device);
                    }
                }
            }
            catch(OperationCanceledException)
            {}
        }

        private void OnCancelClicked(object sender, RoutedEventArgs e)
        {
            findDevicesCancelToken.Cancel();
            ConnectionManager.Instance.StartAutoConnect();
            Frame.Navigate(typeof(MainPage), null, new SlideNavigationTransitionInfo() { Effect = SlideNavigationTransitionEffect.FromLeft });
        }

        private async void OnConnectClicked(object sender, RoutedEventArgs e)
        {
            IsConnecting = true;

            var dev = (DeviceInfo)DeviceList.SelectedItem;
            try
            {
                const int timeoutMs = 5000;
                CancellationTokenSource cancelSrc = new CancellationTokenSource(timeoutMs);
                var client = await MagicClient.Connect(dev, Settings.Instance.UpdateFrequency, new[] { MagicClient.SensorDataField.Coordinate }, cancelSrc.Token);
                
                if (RememberCheckbox.IsChecked ?? false)
                {
                    Settings.Instance.AddDevice(dev);
                    Settings.Instance.Save();
                }

                findDevicesCancelToken.Cancel();
                MagicCursorDriver.Instance.StartStreamingCursorFromClient(client);
                Frame.Navigate(typeof(MainPage), null, new SlideNavigationTransitionInfo() { Effect = SlideNavigationTransitionEffect.FromLeft });
            }
            catch (OperationCanceledException)
            {
                errorLabel.Text = "No response from device";
                errorLabel.Visibility = Visibility.Visible;
            }
            finally
            {
                IsConnecting = false;
            }
        }
    }
}
