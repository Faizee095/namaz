# Azan

A personal prayer-time app built with Expo and React Native. Azan calculates prayer times for the user's location, shows each prayer's time window, provides Qibla direction and prayer guides, schedules local reminders, and tracks daily and weekly prayer progress. The interface is available in English and Hindi.

## Features

- Prayer times for Fajr, Dhuhr, Asr, Maghrib, and Isha.
- The calculated end of each prayer window: Fajr to sunrise, Dhuhr to Asr, Asr to Maghrib, Maghrib to Isha, and Isha to the next Fajr.
- Friday Jumu’ah information during the Dhuhr window, with a short guide.
- Tahajjud window after Isha and before Fajr, including the app's recommended last third of the night.
- A Qibla bearing from north and a phone compass direction indicator when heading data is available.
- Device-location detection with a Muzaffarpur fallback.
- Manual city search, including locations such as London, Dubai, and Patna.
- English/Hindi language toggle.
- Daily prayer completion checkboxes saved on the device.
- Completion message after all five prayers are checked.
- Prayer progress for the last seven days.
- Tap a prayer to see a common Hanafi rak‘ah sequence and basic movement guide. Jumu’ah and Tahajjud rows also open their guides.
- Online Arabic recitation audio for selected Qur’an passages and prayer supplications. Audio playback needs an internet connection.
- A monthly timetable that can be shared.
- Optional per-prayer time adjustments.
- Local daily notifications with the bundled Azan sound.
- Branded launch screen and developer credit.
- Editable local mosque Jama’at schedule, kept separate from calculated prayer-start times.

## Calculation behavior

The app uses the `adhan` package with:

- Karachi calculation parameters: 18 degrees for Fajr and Isha.
- Hanafi madhab for Asr independently from the general calculation method.

The displayed times are calculated prayer-start times. The listed prayer end times use the next prayer boundary in this calculation: sunrise ends Fajr, Asr starts the end of Dhuhr, Maghrib ends Asr, Isha ends Maghrib, and the next Fajr ends Isha. These are calculation-based windows, not a mosque's Azan or Jama'at schedule. Different mosques may use local timings; the app keeps the mosque schedule separate and does not add an arbitrary delay to Isha.

The prayer guides show a commonly taught Hanafi sequence. Sunnah and optional rak‘ahs, and Witr rulings and methods, vary by school. The guides are a basic reference; follow the school and local imam you trust. Jumu’ah follows the mosque's khutbah and congregation time. Tahajjud's last-third period is calculated from the displayed Isha-to-Fajr night interval.

## Requirements

Install these before starting:

- Node.js and npm versions supported by the Expo version installed in `package.json`.
- npm.
- Expo Go for phone testing, or an Android emulator.
- An Expo account for EAS cloud builds.

Check your versions:

```powershell
node --version
npm --version
```

If npm reports `EBADENGINE`, install a supported Node.js version for the Expo SDK used by this project.

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

The recording is configured as the notification sound and as the Android notification-channel sound. The channel ID is `azan-reminders-v3`.

Important behavior:

- The user must enable reminders inside the app.
- The user must grant notification permission.
- Reminders are scheduled for the selected five daily prayers, up to eight days ahead, using the app's calculated prayer times.
- Expo Go uses the device's default notification sound; the custom Azan sound requires a rebuilt native app.
- Android notification-channel settings can be changed by the user in system settings.
- An existing Android installation may keep its prior notification-channel settings. Reinstall the rebuilt app and check the channel's sound setting if Azan does not play.
- The phone's volume, silent mode, Do Not Disturb, and battery restrictions can affect playback.

The audio attribution and license are documented in [AUDIO_LICENSE.md](AUDIO_LICENSE.md).

## Location selection

On first launch, the app requests foreground location permission and calculates prayer times from the phone's coordinates. The dashboard also includes:

- An `UPDATE` action to refresh the current GPS location.
- `Choose another city` for manual city selection.
- Quick selections for London, Dubai, and Patna.

Manual city selection is useful when the user is in one place but wants to view prayer times for another city.

## Daily tracker

Each prayer row opens its prayer guide, and the completion control tracks whether it was performed. The app stores completion state in AsyncStorage by local calendar date. The tracker shows daily progress, resets for each new date, and includes a seven-day progress view.

## Qibla

The Qibla section calculates the initial bearing from the selected coordinates to the Kaaba. When the device provides compass heading data, the direction indicator rotates relative to the phone. Keep the phone flat and use the on-screen bearing as a directional aid; nearby magnetic interference can affect compass readings.

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

Confirm that reminders are enabled and notification permission is granted. Expo Go uses the default notification sound. For the custom Azan sound, install a rebuilt native app and check that the Android `Prayer reminders` channel has sound enabled in system settings. Android preserves channel settings on the device, which can override the app's configured sound.

### Location remains unavailable

Enable location services and grant foreground location permission. The app can still calculate using the Muzaffarpur fallback, or you can manually choose a city.

## License

The app source follows the repository license. The bundled audio has separate Creative Commons Attribution-ShareAlike 4.0 licensing; see [AUDIO_LICENSE.md](AUDIO_LICENSE.md).
