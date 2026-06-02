# ANCBuddy Changelog

## v2.0.2 — June 2, 2026
**Native ANCBuddy 2.x release**
- Stabilized the trial download dialog so Supabase captures signups first, Web3Forms email notifications run best-effort in the background, and visitors never see an email-service fallback while the direct DMG download is available.
- New native menu-bar panel for Listening Mode, battery/status context, AI Auto-EQ, Launch at Login, license actions, updates, and quit.
- Added AI Auto-EQ: an opt-in sound profile that uses the current track to choose Bass/Mid/Treble settings, applies them to supported Bose headphones, and shows the result in the panel.
- Added in-app update support with "Check for Updates..." and background update checks for future releases.
- Existing BoseControl buyers keep their license, trial state, and saved headphone preferences after updating to ANCBuddy.
- Universal Mac app: ANCBuddy now supports both Apple Silicon and Intel Macs, with a refreshed website and download flow for the public ANCBuddy release.

## Site Update — May 15, 2026
**More reliable trial download**
- The trial form now keeps the download path available even if the email service is temporarily unavailable.
- Trial requests are still captured for follow-up, but visitors are no longer blocked by a third-party form outage.

## Site Update — May 12, 2026
**Trial form fix**
- Fixed an external form issue that prevented some visitors from starting the free trial download.
- The trial button now reliably leads to the GitHub-hosted DMG after submission.

## Site Update — May 2, 2026
**Brand refresh**
- Added the ANCBuddy mascot, refreshed favicons, and updated the social preview image.
- Brought the website visuals in line with the ANCBuddy name and violet brand system.

## v1.2.3 — April 19, 2026
**Free trial download**
- Added a "Try free for 14 days" flow on the website so new users can request the trial and download the DMG from GitHub Releases.
- App behavior was unchanged from v1.2.0.

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
- Updated the website device list, FAQ, and community proof around the expanded supported-device set.

## v1.1.1 — March 23, 2026
**Community testimonials**
- Added real user feedback from r/bose to the website.
- Placed testimonials between the product walkthrough and pricing so visitors can see early community validation before buying.

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
