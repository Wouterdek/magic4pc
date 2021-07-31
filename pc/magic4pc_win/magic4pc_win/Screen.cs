using PInvoke;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace Magic4PC.Win
{
    public class Screen
    {
        public static IList<Screen> AllScreens
        {
            get
            {
                List<Screen> screens = new List<Screen>();
                bool success;
                unsafe
                {
                    var handle = GCHandle.Alloc(screens);
                    success = User32.EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, EnumMonitorCallback, (IntPtr)handle);
                    handle.Free();
                }
                if(!success)
                {
                    throw new Exception("EnumDisplayMonitors failed");
                }
                return screens;
            }
        }

        private static unsafe bool EnumMonitorCallback(IntPtr hMonitor, IntPtr hdcMonitor, RECT* lprcMonitor, void* dwData)
        {
            var list = (List<Screen>)GCHandle.FromIntPtr(new IntPtr(dwData)).Target;
            list.Add(new Screen(hMonitor));
            return true;
        }

        private readonly IntPtr monitor;

        public RECT Bounds { get; private set; }
        public bool IsPrimary { get; private set; }
        public string DeviceName { get; private set; }
        public RECT WorkingArea { get; private set; }

        internal unsafe Screen(IntPtr monitor)
        {
            this.monitor = monitor;
            Update();
        }

        public void Update()
        {
            if (!User32.GetMonitorInfo(monitor, out User32.MONITORINFOEX info))
            {
                throw new Exception("GetMonitorInfo failed");
            }

            Bounds = info.Monitor;
            IsPrimary = (info.Flags & User32.MONITORINFO_Flags.MONITORINFOF_PRIMARY) != 0;
            unsafe
            {
                DeviceName = new string(info.DeviceName);
            }
            WorkingArea = info.WorkArea;
        }
    }
}
