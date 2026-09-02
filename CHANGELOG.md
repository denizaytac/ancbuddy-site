# ANCBuddy Changelog

## v2.2.0 — September 2, 2026
**Audio-source control and more reliable live status**
- See which remembered device is actively streaming and which other sources remain connected.
- Switch to another remembered source or start pairing a new device directly from ANCBuddy.
- Reconnect this Mac's Bose audio route when macOS is still using another output, with clear recovery if the audio profile is missing.
- Open the panel faster while device names and capabilities finish loading in the background.
- Reopening ANCBuddy now recognizes Immersion with Still or Motion after live headphone adjustments, without stale mode highlights.
- Releases headphone control cleanly when ANCBuddy quits and avoids repeated connection attempts when the panel is reopened.
- Contact the developer directly; the prefilled email includes the app and macOS versions, never license information.

## v2.1.0 — August 17, 2026
**Immersive Audio controls**
- Switch compatible QC Ultra headphones between Still and Motion directly inside the active Immersion mode.
- See the headphones' live Immersive Audio setting and clear feedback while a change is being confirmed.
- Devices that don't expose this setting keep the existing Quiet, Aware, Immersion, battery, and AI Auto-EQ controls unchanged.

## v2.0.3 — July 20, 2026
**Reliable recovery after Bluetooth interruptions**
- Restores headphone control automatically when macOS interrupts an active Bose Bluetooth session.
- Discards stale connections instead of leaving ANCBuddy unreachable until the app or Bluetooth is restarted.
- Retries one time with a fresh connection when the headphones stop responding.
- Shows connection progress immediately and offers a Retry action after a failed attempt.

## v2.0.2 — June 2, 2026
**Native ANCBuddy 2.x release**
- New native menu-bar panel for Listening Mode, battery/status context, AI Auto-EQ, Launch at Login, license actions, updates, and quit.
- Added AI Auto-EQ: an opt-in sound profile that uses the current track to choose Bass/Mid/Treble settings, applies them to supported Bose headphones, and shows the result in the panel.
- Added in-app update support with "Check for Updates..." and background update checks for future releases.
- Existing BoseControl buyers keep their license, trial state, and saved headphone preferences after updating to ANCBuddy.
- Universal Mac app: ANCBuddy now supports both Apple Silicon and Intel Macs.

## v1.2.2 — April 19, 2026
**Smoother license activation**
- The activation dialog now detects a license key in the clipboard and pre-fills the field.
- Paste, copy, select-all, and undo now work correctly inside the activation field for the menu-bar app.
- Failed activation attempts keep the entered key visible with the error shown inline.

## v1.2.0 — April 19, 2026
**14-day trial and license activation**
- Added a 14-day free trial with all app features enabled.
- Added Lemon Squeezy license activation and a direct buy link from the app.
- Licensed users stay unlocked during temporary network issues, while license validation still enforces the 3-Mac activation limit.
- Added clock-rollback protection for the trial period.

## v1.1.2 — March 24, 2026
**QC Ultra Earbuds support confirmed**
- Confirmed support for Bose QC Ultra Earbuds 2nd Gen.

## v1.1.0 — March 18, 2026
**Gen 2 support and better device discovery**
- Added support for Bose QC Ultra Headphones Gen 2.
- Improved headphone discovery so custom-named Bose devices are detected reliably.
- Added clearer troubleshooting messages when the app cannot reach the headphones.

## v1.0.0 — March 17, 2026
**Initial release as BoseControl**
- Native macOS menu-bar app for Bose QC Ultra headphones.
- One-click Quiet, Aware, and Immersion mode switching with battery display.
- Simple macOS DMG installer.
