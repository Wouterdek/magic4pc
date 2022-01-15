# Magic4PC

Allows you to use the magic remote on your webOS LG TV as a mouse for your PC.

# Installing

This project consists of two applications, one for on your tv and one for on your pc.
You can find the latest release on the [releases page](https://github.com/Wouterdek/magic4pc/releases).
Download and extract the `win_install.zip` file, make sure [developer mode is enabled on your PC](https://docs.microsoft.com/en-us/gaming/game-bar/guide/developer-mode) and run the `install_x64.bat` (or `install_arm64.bat`) file to install the Windows client app.

You will also need the webOS app, which is available as an .ipk file in the release.
To install the .ipk, first install the [webOS TV SDK](https://webostv.developer.lge.com/sdk/installation/download-installer/) on your PC, make sure your TV is [rooted](rootmy.tv) (and ready for ssh: see [here](https://webostv.developer.lge.com/develop/app-test/using-devmode-app#connectingTVandPC) and [here](https://github.com/webosbrew/webos-homebrew-channel/blob/main/README.md#development-tv-setup)) or you have enabled [developer mode](https://webostv.developer.lge.com/develop/app-test/using-devmode-app/), and then install the app from the webOS TV CLI using `ares-install --device YOUR_DEVICE_ID_HERE me.wouterdek.magic4pc_1.0.0_all.ipk`. Find your device id with `ares-install --device-list`.

# Usage

To connect, make sure your TV and PC are connected to the same network, open the app on both devices, and the TV should appear in the windows app as an option to connect.
After connecting, you can move the remote to move the cursor, use the red/green buttons for left/right click, orange/blue for enter/escape and play/pause for media play/pause.
If the cursor is on the wrong screen, select the correct one in the PC app settings and restart the app.

# Building from source

## The WebOS IPK
Install Node.js v14.15.1, run `npm install` in `/webos/magic4pc/`, and then run `npm run pack` in `/webos/`.

## The Windows app
Install Visual Studio 2019 or later with WinUI 3.0 (and WindowsAppSDK), open up `/pc/magic4pc.sln` and publish the app with sideloading enabled.
