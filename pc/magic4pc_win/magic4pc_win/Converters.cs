using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Data;
using System;

namespace Magic4PC.Win
{
    public class VisibleWhenZeroConverter : IValueConverter
    {
        public object Convert(object v, Type t, object p, string l) =>
            ((double)v) == 0 ? Visibility.Visible : Visibility.Collapsed;

        public object ConvertBack(object v, Type t, object p, string l) => null;
    }

    public class BoolToVisibilityConverter : IValueConverter
    {
        public object Convert(object v, Type t, object p, string l) =>
            ((bool)v) ? Visibility.Visible : Visibility.Collapsed;

        public object ConvertBack(object v, Type t, object p, string l) => null;
    }

    public class BoolToCollapsedConverter : IValueConverter
    {
        public object Convert(object v, Type t, object p, string l) =>
            ((bool)v) ? Visibility.Collapsed : Visibility.Visible;

        public object ConvertBack(object v, Type t, object p, string l) => null;
    }

    public class FalseWhenNegativeConverter : IValueConverter
    {
        public object Convert(object v, Type t, object p, string l) =>
            ((int)v) >= 0 ? true : false;

        public object ConvertBack(object v, Type t, object p, string l) => null;
    }
}
