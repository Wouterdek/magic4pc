using Magic4PC.Win;
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
    public sealed partial class SettingsPage : Page
    {
        DispatcherTimer timer = new DispatcherTimer();
        IList<Screen> screens;

        public SettingsPage()
        {
            this.InitializeComponent();

            this.timer.Tick += (sender, e) => UpdateScreenSettings();
            this.timer.Interval = new TimeSpan(0, 0, 2);
            this.timer.Start();
            UpdateScreenSettings();

            Binding refreshBinding = new Binding();
            refreshBinding.Source = Settings.Instance;
            refreshBinding.Path = new PropertyPath(nameof(Settings.UpdateFrequency));
            refreshBinding.Mode = BindingMode.TwoWay;
            refreshRateBox.SetBinding(NumberBox.ValueProperty, refreshBinding);
            Settings.Instance.PropertyChanged += (sender, e) =>
            {
                if(e.PropertyName == nameof(Settings.UpdateFrequency)) { Settings.Instance.Save(); }
            };
        }

        private void UpdateScreenSettings()
        {
            screens = Screen.AllScreens;
            displayCanvas.Children.Clear();

            var minLeft = screens.Min(s => s.Bounds.left);
            var minTop = screens.Min(s => s.Bounds.top);
            var maxRight = screens.Max(s => s.Bounds.right);
            var maxBottom = screens.Max(s => s.Bounds.bottom);
            var width = maxRight - minLeft;
            var height = maxBottom - minTop;
            var scale = Math.Min(displayCanvas.Width / width, displayCanvas.Height / height);
            var offsetX = (displayCanvas.Width - (width * scale)) * 0.5;
            var offsetY = (displayCanvas.Height - (height * scale)) *0.5;

            for (int i = 0; i < screens.Count; ++i)
            {
                Screen screen = screens[i];
                var button = new ToggleButton
                {
                    Content = i.ToString(),
                    IsChecked = screen.DeviceName.Equals(Settings.Instance.TargetScreen)
                };
                int screenIdx = i;
                button.Click += (sender, e) =>
                {
                    SelectScreen(screenIdx);
                };
                Canvas.SetLeft(button, offsetX + screen.Bounds.left * scale);
                button.Width = (screen.Bounds.right - screen.Bounds.left) * scale;
                Canvas.SetTop(button, offsetY + screen.Bounds.top * scale);
                button.Height = (screen.Bounds.bottom - screen.Bounds.top) * scale;
                displayCanvas.Children.Add(button);
            }
        }

        private void SelectScreen(int selectedScreenIdx)
        {
            Settings.Instance.TargetScreen = screens[selectedScreenIdx].DeviceName;
            Settings.Instance.Save();
            int i = 0;
            foreach(var c in displayCanvas.Children.OfType<ToggleButton>())
            {
                c.IsChecked = i == selectedScreenIdx;
                i++;
            }
        }

        private void OnBackButtonClicked(object sender, RoutedEventArgs e)
        {
            Frame.Navigate(typeof(MainPage), null, new SlideNavigationTransitionInfo() { Effect = SlideNavigationTransitionEffect.FromLeft });
        }
    }
}
