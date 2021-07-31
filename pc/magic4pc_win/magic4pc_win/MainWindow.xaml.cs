using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Xaml.Navigation;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Magic4PC.Win
{

    public sealed partial class MainWindow : Window
    {
        public MainWindow()
        {
            this.InitializeComponent();
            this.Title = "Magic4PC";
            if(Settings.Instance.StoredDevices.Length == 0)
            {
                ContentFrame.Navigate(typeof(ConnectionPage), null, new SuppressNavigationTransitionInfo());
            }
            else
            {
                ContentFrame.Navigate(typeof(MainPage), null, new SuppressNavigationTransitionInfo());
            }
        }
    }
}
