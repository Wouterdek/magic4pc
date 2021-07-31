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
using System.Diagnostics;
using System.ComponentModel;

namespace Magic4PC.Win
{
    public class ButtonGridAction
    {
        public string Label { get; set; }
        public string Description { get; set; }
        public Action<Page> Handler { get; set; }
    }

    public sealed partial class MainPage : Page
    {
        public MainPage()
        {
            this.InitializeComponent();
            // connection status, remembered devices, connect to new device
            buttonGrid.Items.Add(new ButtonGridAction
            {
                Label = "Connect to new device",
                Description = "Find a new device on the network and connect to it.",
                Handler = page => {
                    Frame.Navigate(typeof(ConnectionPage), null, new SlideNavigationTransitionInfo() { Effect = SlideNavigationTransitionEffect.FromRight });
                }
            });
            buttonGrid.Items.Add(new ButtonGridAction
            {
                Label = "View remembered devices",
                Description = "View or remove devices you have previously connected to.",
                Handler = page => {
                    Frame.Navigate(typeof(RememberedDevicesList), null, new SlideNavigationTransitionInfo() { Effect = SlideNavigationTransitionEffect.FromRight });
                }
            });
            buttonGrid.Items.Add(new ButtonGridAction
            {
                Label = "Settings",
                Description = "Change how the cursor responds to the remote",
                Handler = page => {
                    Frame.Navigate(typeof(SettingsPage), null, new SlideNavigationTransitionInfo() { Effect = SlideNavigationTransitionEffect.FromRight });
                }
            });

            UpdateStatusLabel();
            MagicCursorDriver.Instance.PropertyChanged += async (sender, e) =>
            {
                if (e.PropertyName.Equals(nameof(MagicCursorDriver.ConnectedDevice)))
                {
                    DispatcherQueue.TryEnqueue(() =>
                    {
                        UpdateStatusLabel();
                    });
                }
            };
        }

        private void UpdateStatusLabel()
        {
            if (MagicCursorDriver.Instance.ConnectedDevice != null)
            {
                StatusLabel.Text = "✔ Connected to " + MagicCursorDriver.Instance.ConnectedDevice.Mac;
            }
            else
            {
                StatusLabel.Text = "❌ Not connected";
            }
        }

        private void buttonGrid_ItemClick(object sender, ItemClickEventArgs e)
         => ((ButtonGridAction)e.ClickedItem).Handler(this);
    }
}
