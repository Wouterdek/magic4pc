using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using Windows.Storage;

namespace Magic4PC.Win
{
    public class Settings : INotifyPropertyChanged
    {
        public DeviceInfo[] StoredDevices {
            get => _storedDevices;
            set
            {
                if (value != _storedDevices)
                {
                    _storedDevices = value;
                    NotifyPropertyChanged();
                }
            }
        }
        private DeviceInfo[] _storedDevices = new DeviceInfo[0];

        public string TargetScreen {
            get => _targetScreen;
            set
            {
                if (value != _targetScreen)
                {
                    _targetScreen = value;
                    NotifyPropertyChanged();
                }
            }
        }
        private string _targetScreen;

        public int UpdateFrequency {
            get => _updateFrequency;
            set
            {
                if (value != _updateFrequency)
                {
                    _updateFrequency = value;
                    NotifyPropertyChanged();
                }
            }
        }
        private int _updateFrequency = 33;

        public static Settings Instance
        {
            get
            {
                if (_instance == null)
                {
                    _instance = new Settings();
                    _instance.Load();
                }
                return _instance;
            }
        }
        private static Settings _instance = null;

        private Settings()
        { }

        public void AddDevice(DeviceInfo dev)
        {
            StoredDevices = StoredDevices.Append(dev).ToArray();
        }

        public void Save()
        {
            ApplicationDataContainer localSettings = Windows.Storage.ApplicationData.Current.LocalSettings;
            localSettings.Values["settings"] = JsonConvert.SerializeObject(this);
        }

        public void Load()
        {
            ApplicationDataContainer localSettings = Windows.Storage.ApplicationData.Current.LocalSettings;
            var settingsJson = localSettings.Values["settings"] as string;
            if(settingsJson != null)
            {
                JsonConvert.PopulateObject(settingsJson, this);
            }
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
