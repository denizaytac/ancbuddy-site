# BoseControl Changelog

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
- Multi-device support (QC Ultra Earbuds)
- Additional Bose model support (based on demand)
