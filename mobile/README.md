# Gem Track mobile

This Flutter app loads the existing Gem Track interface at
https://inventory.1ctstore.com in the phone's system WebView. It uses the same
login, permissions, API and MySQL database as the browser. It needs an internet
connection.

## Android via USB debugging

1. Enable Developer options and USB debugging on the phone.
2. Connect the phone to the computer and accept the USB debugging prompt.
3. From this directory, run `flutter devices` and then
   `flutter run -d <android-device-id>`.

To build an APK, run `flutter build apk --debug`. Install it over USB with
`adb install -r build/app/outputs/flutter-apk/app-debug.apk`. The APK can
also be opened from the phone's file manager after allowing that app to
install unknown apps.

## iPhone via Developer Mode

1. Install and launch Xcode on a Mac. Install CocoaPods for the iOS plugins.
   In Xcode Settings, add your Apple Account.
2. Run `flutter pub get` and `flutter build ios --config-only --no-codesign`,
   then open `ios/Runner.xcworkspace` in Xcode.
3. Select Runner → Signing & Capabilities, enable automatic signing and select
   your development team. If Xcode reports that the bundle ID is already
   registered to another team, choose a unique ID for your development build.
4. Connect and unlock your iPhone, then trust the Mac when prompted. On the
   iPhone, enable Developer Mode under Settings → Privacy & Security and
   confirm it after the restart.
5. Select the iPhone as the run target in Xcode and press Run. Alternatively,
   run `flutter run --release -d <iphone-device-id>` after configuring signing.
   If the phone prompts you to trust the developer, follow the prompt under
   Settings → General → VPN & Device Management.

Browser push notifications depend on the browser's web push support. Login,
QR scanning, photo uploads, exports and printing should be checked on both
physical devices before handing out a build.

[Flutter Android setup](https://docs.flutter.dev/platform-integration/android/setup)
 · [Flutter iOS setup](https://docs.flutter.dev/platform-integration/ios/setup)
