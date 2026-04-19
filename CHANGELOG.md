# BoseControl Changelog

## v1.2.2 — April 19, 2026
**Activation Dialog Redesign — Clipboard Magic**
- Activation dialog now auto-detects a license key in the clipboard and pre-fills the field — one ENTER and you're activated
- Extracts the key even from pasted email text (e.g. "Your license key is: XXXX-…-XXXX")
- Cmd+V / Cmd+C / Cmd+X / Cmd+A / Cmd+Z now work inside the activation field (previously silently blocked in menu-bar-only apps)
- Activate button stays disabled until the key has a valid UUID format — catches typos before the API call
- After a failed activation, the dialog re-opens with your key preserved and the error shown inline — no more lost input, no dead end
- When a trial has expired and you click a mode, the app checks the clipboard first: if a key is there, it jumps straight to the pre-filled dialog instead of showing a generic error

## v1.2.1 — April 19, 2026
**Landing Page: Lifetime Updates Highlight**
- Hero subtext now reads "Lifetime updates" instead of "No subscription"
- Pricing card tagline updated to "Lifetime updates included"
- Pricing card bullet reworded to "Lifetime updates — free forever"
- FAQ firmware answer clarified with lifetime updates note
- Added new FAQ entry: "Do I get updates for free?"

## v1.2.0 — April 19, 2026
**14-Day Free Trial & License Activation**
- Added 14-day free trial — try all features before buying, no credit card required
- Added in-app license activation via Lemon Squeezy License API ("Activate License…" menu item)
- Added "Buy BoseControl…" menu item linking directly to Lemon Squeezy checkout
- Trial status now shown in menu ("Trial: X days left")
- After trial: noise mode buttons disabled until a valid license key is entered
- Online license validation enforces the 3-Mac activation limit per key
- Anti-tamper: clock rollback is detected and treated as expired trial
- Offline-friendly: temporary network failures never lock out an already-licensed user

## v1.1.2 — March 24, 2026
**QC Ultra Earbuds 2nd Gen Support Confirmed**
- QC Ultra Earbuds 2nd Gen confirmed working (thanks tofu79 on Reddit!)
- Updated landing page: device list now includes Headphones & Earbuds
- Added new testimonial from Earbuds 2nd Gen user
- Updated FAQ to reflect all supported devices

## v1.1.1 — March 23, 2026
**Landing Page: Community Testimonials**
- Added animated testimonials section with real user feedback from r/bose
- Framer-style horizontal scroll with fade-in/out edges
- Placed between "How It Works" and "Pricing" sections

## v1.1.0 — March 18, 2026
**Gen 2 Support & Improved Device Discovery**
- Added support for Bose QC Ultra Gen 2 headphones
- Replaced name-based device detection with Bluetooth Service UUID (FEBE) filtering
- Added Bose Manufacturer ID (0x009E) validation for reliable device identification
- Device discovery now works regardless of custom headphone names
- Improved error messages with actionable troubleshooting hints
- Future-proofed: any Bose device using BMAP protocol will be detected automatically

## v1.0.0 — March 17, 2026
**Initial Release**
- Native macOS menu bar app for Bose QC Ultra headphones
- One-click noise mode switching: Quiet / Aware / Immersion
- Keyboard shortcuts (1/2/3 for modes, R to refresh, Q to quit)
- Real-time battery level display
- Auto-start on login via macOS Login Items
- Reverse-engineered BMAP protocol over Bluetooth Low Energy
- Apple notarized and code-signed
- Single Swift binary, 64KB DMG, zero dependencies

## Roadmap
- Global hotkeys (work even when app is not focused)
- Apple Shortcuts integration
- ~~Multi-device support (QC Ultra Earbuds)~~ ✅ Confirmed working (v1.1.2)
- Additional Bose model support (based on demand)
