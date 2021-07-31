# Magic4PC

Allows you to use the magic remote on your LG tv as a mouse for your PC.

# Installing

You can find the latest release on the releases page.
Download and extract the win_install.zip file, make sure developer mode is enabled on your PC and run the install_x64.bat (or install_arm64.bat) file to install the Windows client app.

You will also need the WebOS app, which is available as an .ipk file in the release.
To install the .ipk, first install the webOS TV SDK on your PC, enable developer mode on your TV, and then install the app using `ares-install --device YOUR_DEVICE_HERE me.wouterdek.magic4pc_1.0.0_all.ipk`.


# Building from source

Requires Visual Studio 2019 with WinUI 3.0, Node.js, Enact and the LG WebOS CLI development tools
