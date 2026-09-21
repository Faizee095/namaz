# Azan

A personal prayer-time app built with Expo and React Native. Azan calculates daily prayer-start times for the user's location, schedules local reminders, plays a bundled Azan notification sound, supports English and Hindi UI, and lets users track completed prayers.

## Features

- Prayer times for Fajr, Dhuhr, Asr, Maghrib, and Isha.
- Device-location detection with a Muzaffarpur fallback.
- Manual city search, including locations such as London, Dubai, and Patna.
- English/Hindi language toggle.
- Daily prayer completion checkboxes saved on the device.
- Completion message after all five prayers are checked.
- Local daily notifications with the bundled Azan sound.
- Branded launch screen and developer credit.
- Mosque schedules remain separate from calculated prayer-start times.

## Calculation behavior

The app uses the `adhan` package with:

- Karachi calculation parameters: 18 degrees for Fajr and Isha.
- Hanafi madhab for Asr independently from the general calculation method.

The displayed times are calculated prayer-start times. They are not intended to reproduce a particular mosque's delayed Azan or Jama'at schedule. Different mosques can announce Azan or Jama'at at different times, so the app does not add an arbitrary delay to Isha.

## Requirements

Install these before starting:

- Node.js 20.19.4 or newer is recommended by the Expo SDK 57 dependency tree.
- npm.
- Expo Go for phone testing, or an Android emulator.
- An Expo account for EAS cloud builds.

Check your versions:

```powershell
node --version
npm --version
```

Node 20.19.3 may work but can show `EBADENGINE` warnings. Upgrade Node if possible.

## Clone and install

```powershell
git clone <repository-url>
cd Azan
npm install
```

The repository contains `package-lock.json`, so `npm install` installs the locked dependency versions where possible.

## Run locally

Start the Expo development server:

```powershell
npm start
```

Useful alternatives:

```powershell
npm run android
npm run ios
npm run web
```

For phone testing:

1. Install Expo Go.
2. Connect the phone and computer to the same Wi-Fi network.
3. Sign in to Expo Go if Expo asks for authentication.
4. Run `npm start`.
5. Scan the QR code.
6. Allow location and notification permissions.
7. Tap `Get prayer reminders` to schedule daily notifications.

If the phone cannot reach the computer over Wi-Fi, try:

```powershell
npx expo start --lan
```

Expo tunnel mode may fail in restricted environments with an error such as `Cannot use ngrok with a robot user`. LAN mode is preferred when both devices share a network.

Clear the Metro cache after dependency or configuration changes:

```powershell
npx expo start -c
```

## Expo authentication

Local Expo Go testing may work without an Expo account, but Expo Go and the CLI must use the same account when authentication is required.

Check the current CLI account:

```powershell
npx expo whoami
```

Browser login:

```powershell
$env:BROWSER = "none"
npx expo login --browser
```

If the CLI prints a login URL but cannot open the browser, copy the complete URL into Chrome or Edge and finish the Google login. Do not enter a Google password into a legacy username/password prompt.

For EAS builds, authenticate with:

```powershell
npx eas-cli login
```

An `EXPO_TOKEN` can also authenticate EAS, but access-token sessions appear as robot users and cannot be used to open a project in Expo Go. Use a personal Expo account for Expo Go testing.

## Check the project

Type-check the app:

```powershell
npx tsc --noEmit
```

Validate the resolved Expo configuration:

```powershell
npx expo config --type public
```

If VS Code shows stale TypeScript errors while the command passes, run **TypeScript: Restart TS Server** from the Command Palette, or use **Developer: Reload Window**.

## Build an installable Android APK

The `preview` EAS profile in `eas.json` creates an installable APK:

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

EAS will provide a build page and download link after the cloud build finishes. Open the APK link on an Android phone, download the file, allow installation from that source if Android asks, and install it.

The Android application ID is:

```text
com.faiyazuddin.azan
```

A new APK is required after changes to native configuration, notification sounds, or native modules. Expo Go does not include the custom notification sound in the same way as a rebuilt APK.

## Production Android build

For a Google Play-oriented build:

```powershell
npx eas-cli build --platform android --profile production
```

The production profile normally creates an Android App Bundle (`.aab`). An APK is convenient for direct installation; an AAB is preferred for Google Play distribution.

## Notifications and Azan audio

The app bundles:

```text
assets/azan.mp3
```

The recording is configured as the Android notification-channel sound and notification sound. The channel ID is `azan-reminders-v2` so existing installs can adopt the new sound after reinstalling a rebuilt app.

Important behavior:

- The user must enable reminders inside the app.
- The user must grant notification permission.
- Android notification-channel settings can be changed by the user in system settings.
- Custom notification audio requires a rebuilt native APK; it cannot be fully verified in Expo Go.
- The phone's volume, silent mode, Do Not Disturb, and battery restrictions can affect playback.

The audio attribution and license are documented in [AUDIO_LICENSE.md](AUDIO_LICENSE.md).

## Location selection

On first launch, the app requests foreground location permission and calculates prayer times from the phone's coordinates. The dashboard also includes:

- An `UPDATE` action to refresh the current GPS location.
- `Choose another city` for manual city selection.
- Quick selections for London, Dubai, and Patna.

Manual city selection is useful when the user is in one place but wants to view prayer times for another city.

## Daily tracker

Each prayer row is tappable. The app stores completion state in AsyncStorage under a key for the local calendar date. The tracker shows progress such as `3/5 done`, resets automatically on a new day, and displays a completion message after all five prayers are checked.

## Project structure

```text
App.tsx              Main UI, prayer calculations, location, notifications, and tracker
index.ts             Expo app entry point
app.json             Expo app configuration and native plugins
eas.json             EAS build profiles
assets/azan.mp3      Bundled notification Azan recording
AUDIO_LICENSE.md     Audio source and license attribution
package.json         Dependencies and npm scripts
```

## Common issues

### Expo Go says the accounts do not match

Sign in to Expo Go with the same personal Expo account shown by `npx expo whoami`. Do not use an `Expo token (robot)` session for Expo Go.

### Tunnel mode fails

Use the same Wi-Fi network and run:

```powershell
npx expo start --lan
```

Disable VPNs and allow Node.js through Windows Firewall if necessary.

### Notifications do not play Azan

Confirm that reminders are enabled, notification permission is granted, the new rebuilt APK is installed, and the Android channel sound is enabled in system notification settings. A previously installed APK may still use the old notification channel.

### Location remains unavailable

Enable location services and grant foreground location permission. The app can still calculate using the Muzaffarpur fallback, or you can manually choose a city.

## License

The app source follows the repository license. The bundled audio has separate Creative Commons Attribution-ShareAlike 4.0 licensing; see [AUDIO_LICENSE.md](AUDIO_LICENSE.md).
