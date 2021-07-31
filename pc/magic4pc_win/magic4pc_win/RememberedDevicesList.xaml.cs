using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Xaml.Navigation;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;

namespace Magic4PC.Win
{
    public sealed partial class RememberedDevicesList : Page
    {
        #region HasDevices
        public bool HasDevices
        {
            get { return (bool)this.GetValue(HasDevicesProperty); }
            set { this.SetValue(HasDevicesProperty, value); }
        }
        public static readonly DependencyProperty HasDevicesProperty = DependencyProperty.Register(
          nameof(HasDevices), typeof(bool), typeof(RememberedDevicesList), new PropertyMetadata(false));
        #endregion

        public RememberedDevicesList()
        {
            this.InitializeComponent();

            UpdateList();
        }

        private void UpdateList()
        {
            DeviceList.ItemsSource = Settings.Instance.StoredDevices;
            HasDevices = Settings.Instance.StoredDevices.Length > 0;
        }

        private void OnBackClicked(object sender, RoutedEventArgs e)
        {
            Frame.Navigate(typeof(MainPage), null, new SlideNavigationTransitionInfo() { Effect = SlideNavigationTransitionEffect.FromLeft });
        }

        private void OnForgetClicked(object sender, RoutedEventArgs e)
        {
            var storedDevices = Settings.Instance.StoredDevices;
            DeviceInfo[] dev = new DeviceInfo[storedDevices.Length - 1];
            int idxToRemove = DeviceList.SelectedIndex;
            storedDevices.AsSpan(0, idxToRemove).CopyTo(dev.AsSpan(0, idxToRemove));
            int lenPart2 = storedDevices.Length - idxToRemove - 1;
            storedDevices.AsSpan(idxToRemove + 1, lenPart2).CopyTo(dev.AsSpan(idxToRemove, lenPart2));
            Settings.Instance.StoredDevices = dev;
            Settings.Instance.Save();
            UpdateList();
        }
    }
}
