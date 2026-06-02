# ANCBuddy Changelog

## App v2.0.2: Panel flat row polish — June 2, 2026
**App source + site release metadata**
- Flattened the native panel's lower half into the same row language as the listening-mode controls: `AI Auto-EQ`, `Launch at Login`, update, license, buy, and quit actions now sit under consistent `SOUND` / `GENERAL` section labels without permanent footer boxes, the `Sound Profile` wave card remains a recessed data display, and the Sound-to-General divider spacing is tightened to match the rest of the panel rhythm
- Aligned the current release metadata around v2.0.2 / build 20002: site-visible version strings, structured-data download URL, trial DMG URL, release-process docs, and handoff notes now point at `ANCBuddy-2.0.2.dmg`

## App v2.0.1: Sparkle updater test — June 1, 2026
**App source + update metadata**
- Added a short Sparkle updater test release with `CFBundleVersion=20001` so v2.0.0 can verify the signed, notarized in-app update path

## App/Site v2.0.0: Sparkle updater + universal build — June 1, 2026
**App source + site release metadata**
- Redesigned the app panel footer into a quieter macOS-style utility zone: `Launch at Login` is now a distinct preference card with its switch aligned to the AI Auto-EQ control column, update and quit actions sit in a compact utility bar, footer boxes share one radius/background/border system, divider edges/spacing now align with the sound-profile card, and version/license metadata is visually de-emphasized
- Made the `Launch at Login` unavailable state actionable: if macOS sees a copy launched outside `/Applications`, the panel now says `Open from Applications` instead of `App not found`
- Treat `SMAppService.mainApp.status == .notFound` from a correctly installed `/Applications` build as a repairable off state and fall back to the classic System Events Login Item API when the user enables Launch at Login
- Added the Apple Events hardened-runtime entitlement for the legacy Login Item fallback path
- Avoided the System Events fallback when disabling a ServiceManagement-registered Login Item, preventing an unnecessary Apple Events authorization error when turning Launch at Login off
- Stopped the Now Playing helper during app termination so quitting ANCBuddy no longer leaves the perl-hosted adapter process behind
- Made `Quit ANCBuddy` return immediately by canceling pending Auto-EQ work and invalidating the Bose session asynchronously instead of waiting for slow BLE cleanup during app termination
- Expanded local-build cleanup to remove both legacy BoseControl LaunchAgent filenames (`com.bosecontrol.plist` and the older `com.bose.control.plist`)
- Hardened release packaging by copying the app into the DMG staging area with `ditto`, verifying the app signature from the generated DMG, and making final Gatekeeper/stapler checks fail the release script instead of being best-effort output
- Added Sparkle 2.9.2 as the in-app updater for future 2.x releases, including a `Check for Updates…` panel action, signed EdDSA appcast support at `https://ancbuddy.com/appcast.xml`, daily background checks, and user-confirmed installs only
- Switched the app build to a universal macOS binary (`arm64` + `x86_64`) so ANCBuddy keeps supporting both Apple Silicon and Intel Macs
- Separated marketing version (`2.0.0`) from monotonic build number (`20000`) so Sparkle can compare future appcast updates correctly
- Updated the release script to sign Sparkle's nested helper code inside-out, remove the duplicate notary submit, and generate the Sparkle appcast after the notarized DMG is ready
- Improved release-script notarization error reporting so missing `ANCBuddy-Notary` credentials print the exact `notarytool store-credentials` command instead of failing silently during output capture
- Cleared macOS metadata from generated DMGs before signing so strict DMG signature verification passes reliably
- Signed the final DMG without `codesign --timestamp` after local verification showed timestamped disk-image signatures becoming invalid on repeat verification; the app and embedded code remain timestamped
- Updated site release metadata, trial download URL, and visible version strings for the upcoming ANCBuddy 2.x DMG release path
- Resolved the site/app OS-support mismatch by advertising macOS 12+ consistently with the app's `LSMinimumSystemVersion`

## App v2.0.0: One honest connection status — June 1, 2026
**App source only — site output unchanged**
- Added a warm BLE session manager for Bose control: panel refreshes, listening-mode switches, Auto-EQ applies, and Standard-EQ resets now share one serialized `BoseController` instead of reconnecting for every operation
- Kept the warm Bose session for 45 seconds after successful hardware use, then disconnected automatically; missing mode/battery responses, unconfirmed mode writes, failed EQ writes, and app termination invalidate it immediately
- Changed panel-open behavior to render cached mode/battery/status first and refresh Bose state silently in the background, so opening the menu-bar panel no longer forces a visible `Connecting…` cycle every time
- Simplified the listening-mode pending indicator to a bare lavender-white loading ring with no chip background or extra `Switching` text, so it sits naturally on the active violet mode row
- Removed the color-coded readiness dot from the macOS status bar; the status item is now a quiet native `headphones` launcher with no green/yellow/gray badge and no `headphones.slash`
- Removed the colored connection dot from the panel header too; `Connecting…` keeps the small amber spinner, then resolves to plain `Connected` or `Not connected` text
- Stopped the launch-time control check that only existed to initialize the old menu-bar dot; ANCBuddy now checks headphone control when the panel opens or when the user triggers a headphone action
- Reworked the Auto-EQ status model so the panel now separates feature state, transient work, and confirmed headphone sound: `Ready for music`, `Reading current track`, `Choosing sound profile`, `Updating headphones`, `Tuned for current track`, and `Restoring Standard EQ`
- Removed `Applied` / `Reset to Standard EQ` as persistent user-facing states; after a standard reset, Auto-EQ returns to `Off` and the wave card shows `STANDARD` / `Sound Profile` with flat `Bass 0 · Mid 0 · Treble 0`
- Kept pending recommendations out of the current sound card until Bose confirms `setEQ`; the visible profile and track now update only after a successful headphone write
- Removed the separate Auto-EQ status row entirely; `STANDARD`, `UPDATING`, `AI TUNED`, `READY`, and `ERROR` now live only inside the sound-profile card
- Decoupled listening-mode switching from the Auto-EQ sound card: Quiet/Aware/Immersion clicks now show only a spinner in the mode row, while `Sound Profile` keeps the last real Auto-EQ state, track, and EQ values
- Persisted the last known listening mode and last control-check time so the panel opens with the cached Quiet/Aware/Immersion context immediately, then refreshes Bose state quietly in the background
- Mode switches that are sent but not confirmed by Bose now keep the clicked target as the last chosen mode; a later refresh corrects it if the hardware reports something different
- Removed the device header's `Last checked` timestamp line; the header now stays focused on device name, battery, and `Connected` / `Connecting…` / `Not connected`, with only a short failure reason shown when needed
- Added a tiny amber loading ring beside `Connecting…` in the device header so the transition to `Connected` feels active without adding visual noise elsewhere
- Kept the open status panel anchored during `Connecting…` → `Connected` updates, so the menu-bar status glyph change no longer nudges the panel sideways
- Removed placeholder keyboard-shortcut chips from listening-mode rows and removed local `Last` labels from mode/battery rows; freshness is now communicated once, globally, through the header
- Made the Auto-EQ track title readable by giving it its own two-line `Current track` area instead of squeezing it after `For current track ·`
- Renamed the animated Auto-EQ wave card to `Sound Profile` and removed redundant per-EQ timestamp detail lines; the global device header remains the main freshness timestamp
- When the headphones are checking or not connected, Quiet/Aware/Immersion and the Auto-EQ toggle now become read-only while preserving the last known mode/EQ context
- Removed the manual `Refresh` row because opening the panel already performs the check
- Suppressed duplicate Auto-EQ hardware messages such as `Headphones unavailable` and `Retrying when reachable`; connection state is handled by the global header
- Collapsed the connection status into a single user-facing truth — "Can I control my headphones right now?" — so the menu-bar dot and the panel header can never disagree again
- Three states only: **Connected** (a real BMAP command just succeeded), **Connecting…** (check/action in flight), **Not connected** (last attempt failed, or headphones off/asleep/out of range)
- Removed macOS audio-output routing from the status entirely: being on built-in speakers no longer shows the headphones as disconnected, fixing the false negative in the most common ANC case (silence/focus with no Mac audio playing)
- Removed the hidden 70-second freshness decay that silently turned green into yellow; freshness is now plain text, never a color flip
- Dropped the 45-second background BLE poll and the CoreAudio output monitor; status now refreshes on panel-open and on user actions (mode switch / Auto-EQ) instead of holding a warm connect/disconnect loop
- Kept connection state legible inside the panel through text instead of color: `Connecting…`, `Connected`, and `Not connected` are the only visible connection labels
- Retired the technical interim labels (`Partial`, `Control not ready`, `Last ready`, `Mac sees Bose`) and stopped linking Apple's CoreAudio framework
- Supersedes the May 31 "Status truth fix" and "Status-bar Ready indicator" entries below within the same unreleased v2.0.0; the menu-bar readiness dot was intentionally removed before release

## App v2.0.0: Status-bar Ready indicator — May 31, 2026
**App source only — site output unchanged**
- Added a color-coded menu-bar readiness indicator: the native headphones icon stays visible and gets a small green/yellow/gray readiness dot for Bose/BMAP control status
- Added a tooltip to the status-bar icon with the latest ready/check/unreachable state and last-seen context, so the app's readiness is visible before opening the panel
- Added a fast local CoreAudio output monitor that notices when macOS sees or selects the Bose headphones, immediately triggers a Bose-Control check when they appear, and downgrades stale ready state when the audio device disappears
- Kept the gentle 45-second Bose-Control background check as a fallback; it still skips during active checks, mode switches, and Auto-EQ apply/reset work instead of holding a permanent Bose BLE connection

## App v2.0.0: Status truth fix — May 31, 2026
**App source only — site output unchanged**
- Replaced the panel's simple green `Connected via Bluetooth` state with explicit control reachability: checking, reachable, partial, and not reachable
- Split Auto-EQ failures by source (hardware, AI relay, Now Playing, and limit/license) so a fresh reachable headphone check clears stale hardware EQ errors without masking real AI-service or license problems
- Updated Auto-EQ copy so reachable-command failures say `EQ apply failed`, unreachable hardware says `Headphones unavailable` / `Retrying when reachable`, and relay failures remain separate as `AI service unavailable`
- Stale battery and listening-mode values are now shown only as muted `Last ...` context while a fresh check is pending or the headphones are unreachable, so an old `40%` can no longer look like a live battery reading
- Refreshes now use a generation guard so older BLE results cannot overwrite newer status, and missing battery reads show `Battery unavailable` instead of preserving an old percentage

## App v2.0.0: Launch at Login toggle — May 30, 2026
**App source only — site output unchanged**
- Added a `Launch at Login` switch to the native ANCBuddy panel so users can enable or disable autostart without leaving the app
- The implementation uses Apple's ServiceManagement login-item API on macOS 13+ and keeps a macOS 12 fallback for older supported systems
- Local dev builds no longer force-add ANCBuddy to Login Items; autostart is now controlled by the app UI

## App v2.0.0: AI Auto-EQ Current EQ visual — May 30, 2026
**App source only — site output unchanged**
- Reworked the AI Auto-EQ wave card as `Current EQ`: the animated left/middle/right zones now reflect the applied Bass/Mid/Treble profile instead of a decorative listening-mode pattern
- Made the EQ values the primary readable payload and moved the current track into smaller secondary context, so the card explains what changed while keeping the premium animated feel

## App v2.0.0: Immediate mode-switch feedback — May 30, 2026
**App source only — site output unchanged**
- Added a transient spinner-only pending state for Quiet / Aware / Immersion clicks so the panel confirms the user's target mode immediately while Bose/BLE finishes the actual change
- The pending target mode is highlighted in violet, other mode clicks are blocked until the command completes, and the Auto-EQ sound card stays focused on EQ state instead of mirroring the mode switch
- Failed mode changes now roll back to the last confirmed mode and show a small inline error such as `Headphones unreachable` or `Switch failed. Try again.` instead of feeling like the panel ignored the click
- Stale background refreshes are ignored for mode selection while a switch is pending, so opening the panel and clicking quickly cannot restore an older mode highlight afterward

## App v2.0.0: License migration — May 30, 2026
**App source only — site output unchanged**
- Added the BoseControl → ANCBuddy paid-user migration: the app now reads legacy `com.deniz.bosecontrol` preferences and carries `bose_*` license, instance, trial, last-seen, cached headphone UUID, and related keys into the new `ancbuddy_*` defaults on launch
- Existing ANCBuddy values are preserved, trial start dates merge conservatively to the earlier date, and last-seen anti-tamper dates merge to the later date so buyers do not need to re-enter their Lemon Squeezy license after updating

## App v2.0.0: Liquid Glass panel polish — May 30, 2026
**App source only — site output unchanged**
- Moved the status-panel glass, clipping, and shadow from SwiftUI into an AppKit container so the panel no longer shows rectangular shadow/blur artifacts when opened from the menu bar
- Added a macOS 26 Liquid Glass path via `NSGlassEffectView`, with a clipped `NSVisualEffectView` fallback for older macOS versions and a solid fallback when Reduce Transparency is enabled
- Softened the panel depth, increased the outer corner radius, and kept the existing controls/actions unchanged

## App/Site v2.0.0: User-facing copy cleanup — May 30, 2026
**App source + site hero source**
- Renamed the visible control section from `Noise Cancellation` to `Listening Mode`, since Quiet, Aware, and Immersion describe listening behavior rather than only cancellation strength
- Rewrote the mode subtitles to be more direct: `Full noise cancellation`, `Hear your surroundings`, and `Wider, more spacious sound`
- Removed protocol/debug labels from the app panel and site hero mockup, replacing BMAP/FBlock/FEBE/BLE wording with user-facing EQ copy, waiting states, and readable bass/mid/treble values
- Simplified Auto-EQ feedback so status text describes what the app is doing for the listener: analyzing, choosing, applying, and applied

## App v2.0.0: Menu-bar UI redesign — May 30, 2026
**App source only — site output unchanged**
- Rebuilt the app's menu-bar interface as a native control panel styled to match the website: clicking the icon opens a dark translucent card with the violet accent instead of a plain text menu
- The panel shows device status (connection + battery), the supported headphone, and selectable Quiet / Aware / Immersion mode cards with the active mode highlighted — mirroring the site's hero mockup
- AI Auto-EQ is now visible and animated in-app: a live status line (Listening → Analyzing → Applied / Reset / Error), the applied bass/mid/treble values, secondary current-track context, and a reactive Current EQ wave
- Replaced the old black headphones AppIcon with the violet ANCBuddy buddy/logo artwork already used on the website, including a regenerated `AppIcon.icns` and full iconset for the app bundle
- Kept the menu-bar icon as a native headphones glyph; current actions (modes, Auto-EQ toggle, license activate/buy, quit) remain, gated by trial/license as before
- Native license/error dialogs now use the branded app icon, while the panel header stays focused on live headphone connection status
- Built with SwiftUI hosted in a borderless status panel; AI Auto-EQ now uses ANCBuddy's central Supabase relay instead of user-supplied DeepSeek keys

## App v2.0.0: Central AI-EQ Relay — May 30, 2026
**App + Supabase source; site privacy copy updated**
- Removed all user-facing DeepSeek key UI from the app: no add/test key rows, no Keychain prompt, no user-provided API key requirement
- Added the `eq-recommend` Supabase Edge Function and private relay tables for hashed track-result caching, anonymous install usage, fair-use limits, and neutral throttling
- Deniz's DeepSeek key now lives only as a Supabase secret; the app sends normalized track metadata to the relay and receives clamped Bose EQ values
- Deployed the relay to Supabase project `wryaxqkfpphtzbskfjgi`, applied the AI-EQ tables remotely, set `DEEPSEEK_API_KEY`, and verified fresh `source:"deepseek"` plus repeated `source:"cache"` responses
- Local per-track caching remains, and backend cache hits avoid repeat paid DeepSeek calls across users
- Added English-only neutral AI service messages for monthly limits, relay throttling, and transient AI failures
- Updated landing-page privacy wording and FAQ so "No analytics" does not conflict with opt-in AI Auto-EQ relay usage

## App v2.0.0: AI Adaptive EQ Phase 5 — May 29, 2026
**App source only — site output unchanged**
- Completed the user-facing AI Adaptive EQ UI: an `AI Auto-EQ` menu toggle plus visible listening/request/apply status
- The original WIP used BYOK via Keychain, but the release path now uses the central AI relay above instead
- Auto-EQ starts or stops immediately from the menu and stays gated by the trial/license state
- The menu now shows visible Auto-EQ feedback: listening/request/apply status, last detected track, last EQ values, and concrete errors
- Turning `AI Auto-EQ` off now resets the headphones to Standard/flat EQ (`bass=0, mid=0, treble=0`) so the effect is easy to compare
- Added visible transition feedback and a temporary menu-bar activity icon while EQ is being written
- Made AI Auto-EQ recommendations more aggressive with a bolder DeepSeek prompt, post-parse level boosting, and a fresh cache namespace so old subtle recommendations are ignored

## App WIP: AI Adaptive EQ Phase 4 — May 29, 2026
**App source only — site output unchanged**
- Added the auto-apply orchestrator: when the playing song changes, ANCBuddy fetches the DeepSeek EQ recommendation and sets it on the headphones automatically
- Opt-in and off by default — runs only once you enable the toggle (and your license is active); a known song applies instantly from cache, a new song is fetched after a short debounce so skipping tracks doesn't spam the API
- Verified end-to-end on real hardware: both a cached track and a fresh AI recommendation adjusted the headphone EQ live
- Follow-up Phase 5 added the API-key entry and on/off menu toggle

## App WIP: AI Adaptive EQ Phases 2–3 — May 29, 2026
**App source only — site output unchanged**
- Added now-playing track detection across players (Tidal / Spotify / Apple Music / Safari) via a perl-hosted MediaRemote adapter — live-verified on macOS 26
- Added an EQ recommendation service: it maps the current song to a 3-band Bose EQ profile; the initial WIP used BYOK, but the v2.0.0 release path now uses the central AI relay above
- Recommendations are cached locally per track so repeat plays never trigger a second API call; every band level is validated to the Bose -10…10 range

## App WIP: AI Adaptive EQ Phase 1 — May 28, 2026
**App source only — site output unchanged**
- Added the first real EQ transport layer in `BoseController`: `getEQ()` and `setEQ(...)` for Bose Settings/RangeControl
- Added typed EQ data structures for bass, mid, and treble signed levels, matching the APK reverse-engineering result and live-observed payload order
- Added a hidden `--debug-eq` runner for live protocol verification against the headphones before this becomes user-facing UI
- Tightened FBlock info parsing so delayed version responses do not pollute the discovered FBlock list during debug runs
- Added verbose CoreBluetooth state logging for the EQ debug runner to make permission-vs-power failures visible during live tests
- Increased the Bluetooth readiness wait from 3s to 10s to make fresh debug/app launches more reliable while CoreBluetooth leaves its initial `unknown` state
- The hidden EQ debug runner now initializes a minimal NSApplication context before CoreBluetooth so bundle-launched tests behave like the real menu bar app
- EQ debug logging now shows the active bundle ID, cached peripheral UUID, connected-peripheral count, reconnect attempts, and scan fallback
- Verbose connect logging now reports the concrete failure reason when already-connected or cached peripheral reconnects fail
- Live verification passed on Bose hardware: `getEQ()` read `bass=5, mid=-10, treble=-10`, `setEQ(current)` returned ok, and a follow-up `getEQ()` read the same values
- Device discovery now falls back from FEBE Service UUID scanning to a broad BLE scan that only accepts Bose manufacturer data (`0x009E`), helping the EQ debug path recover when audio is connected but BMAP is not advertising by service UUID

## Trial Form Resilience — May 15, 2026
**FormSubmit went down (Cloudflare 521) and took the trial funnel with it — replaced with a hybrid setup that survives outages**
- Trial form no longer POSTs natively to FormSubmit. It now fires two parallel requests on submit: a Web3Forms call for the email notification, and a Supabase insert into a new `trial_signups` table for logging
- If Web3Forms is reachable, the user is redirected to the GitHub Releases DMG exactly as before. If Web3Forms is unreachable (timeout or 5xx), the dialog switches to a fallback view with the direct DMG download link so visitors never hit a Cloudflare error page again
- The Supabase insert runs independently from the email dispatch — every trial attempt is logged, even during a Web3Forms outage
- 8-second client-side timeout via `AbortController` prevents the dialog from hanging if either service stalls
- Honeypot anti-spam field preserved; submit button shows a `Sending…` state while in flight, then transitions to a `Download started` confirmation with a manual download button — the browser typically auto-triggers the DMG download without navigating away, so the dialog now stays on the user's screen with a clear next step instead of getting stuck
- Required env vars (committed in `.env.example`): `VITE_WEB3FORMS_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Trial Form Fix — May 12, 2026
**Free trial download was failing for every visitor — fixed**
- FormSubmit's hashed (anonymous) endpoint was no longer active on their side, so submissions died with "Email address … is not formatted correctly" before the DMG redirect could fire
- Trial form now posts to the verified direct‑email endpoint instead — restores the GitHub Releases DMG download for every "Try free for 14 days" click
- Reported by a Reddit user; affected anyone using the trial flow since the hashed endpoint silently stopped responding

## Site Brand Refresh — May 2, 2026
**Mascot artwork rolled out across the site — app code unchanged**
- New buddy mascot lands in the hero section above the headline — friendly violet character wearing the headphones, transparent PNG with violet drop‑shadow halo, gentle float animation, motion-respectful
- Refreshed favicon set: `.ico` plus 16 / 32 / 180 / 512 PNG sizes and a dedicated `apple-touch-icon.png`
- New 1200×630 social preview image at `/og-image.png` replaces the old square logo for `og:image` + `twitter:image` — WhatsApp, Twitter, LinkedIn now show the full landscape banner
- Menubar logo in the Mac mockup, the footer mark, and the iOS home-screen icon all share the same Squircle app-icon master
- Removed the unused inline `mark.svg` from `/public`

## v1.2.3 — April 19, 2026
**Landing Page: Free Trial Download (Email-Gated)**
- Landing page now offers a "Try Free for 14 Days" button next to every "Buy" CTA
- Email + name capture via formsubmit.co (no third-party newsletter, signups arrive in maintainer's inbox)
- Trial DMG hosted on GitHub Releases — direct download starts after submit
- App code unchanged in this release; trial logic was already shipped in v1.2.0

## v1.2.2 — April 19, 2026
**Activation Dialog Redesign — Clipboard Magic**
- Activation dialog now auto-detects a license key in the clipboard and pre-fills the field — one ENTER and you're activated
- Extracts the key even from pasted email text (e.g. "Your license key is: XXXX-…-XXXX")
- Cmd+V / Cmd+C / Cmd+X / Cmd+A / Cmd+Z now work inside the activation field (previously silently blocked in menu-bar-only apps)
- Activate button stays disabled until the key has a valid UUID format — catches typos before the API call
- After a failed activation, the dialog re-opens with your key preserved and the error shown inline — no more lost input, no dead end
- When a trial has expired and you click a mode, the app checks the clipboard first: if a key is there, it jumps straight to the pre-filled dialog instead of showing a generic error

## v1.2.0 — April 19, 2026
**14-Day Free Trial & License Activation**
- Added 14-day free trial — try all features before buying, no credit card required
- Added in-app license activation via Lemon Squeezy License API ("Activate License…" menu item)
- Added "Buy …" menu item linking directly to Lemon Squeezy checkout
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
**Initial Release (as BoseControl)**
- Native macOS menu bar app for Bose QC Ultra headphones
- One-click noise mode switching: Quiet / Aware / Immersion
- Keyboard shortcuts (1/2/3 for modes, R to refresh, Q to quit)
- Real-time battery level display
- Auto-start on login via macOS Login Items
- Reverse-engineered BMAP protocol over Bluetooth Low Energy
- Apple notarized and code-signed
- Single Swift binary, 64KB DMG, zero dependencies

## Roadmap
### v2.x Completed Roadmap Items
- Launch at Login control: autostart is now a first-class panel setting backed by macOS Login Items, with the local build script no longer overriding the user's choice
- App update mechanism: Sparkle 2.9.2 is now embedded with a signed appcast flow and `Check for Updates…`; v2.0.0 is the manual bootstrap release for future in-app 2.x updates
- Universal build: the app and Now Playing adapter now build as `arm64` + `x86_64`

### v2.0.2 Remaining Release Work
- Release operations: refresh notary credentials, build/sign/notarize `ANCBuddy-2.0.2.dmg`, publish GitHub Release, deploy the generated appcast, then update Lemon Squeezy

### Post-v2.0 Polish
- Liquid Glass / Icon Composer app-icon pass: keep the current violet buddy icon for v2.0, but later rebuild it as a layered Icon Composer source asset with separated background, headphones, buddy silhouette, face details, and highlights. Preview Default, Dark, Mono/Clear, and Tinted appearances; preserve small-size Dock legibility; export refreshed `AppIcon.icns`, iconset, favicon/marketing PNGs, and a dock-context mockup. This is visual polish, not a v2.0 release blocker.

### v2.1 Candidates
- Mac Connection Assist (`Use on This Mac`): best-effort action for already-paired Bose headphones to connect the Bluetooth audio device to the current Mac, set it as macOS output, then refresh ANCBuddy's BLE/BMAP control status. Keep the UX honest: ANCBuddy can request the connection and route audio locally, but cannot guarantee taking headphones away from an iPhone or another Mac when Bose multipoint slots, active calls, or firmware block the switch. Use separate audio-route state from control reachability; use IOBluetooth for the paired-device connection and CoreAudio for output routing; do not set Bose as input/mic by default.

### Later
- Global hotkeys (work even when app is not focused)
- Battery & Charging Management: show live charging speed (percentage/hour), estimated time to full, charging status, and per-session charge history; add helpful notifications for low battery, charge complete, and unusually slow charging. Start with local sampling from the existing Bose battery percentage, then research whether BMAP exposes richer read-only charging telemetry. Keep it local-only and label estimates clearly when exact device data is unavailable.
- v2.1 Preview — Listening Budget (Estimate): larger privacy-preserving preview feature after the faster hotkeys utility release. Opt-in, local-only listening budget; store only daily aggregates (listening time, coarse volume buckets, estimated weekly budget), with no track history, no cloud sync, no DeepSeek/Supabase/analytics linkage, and explicit export/delete controls. Base the estimate on the WHO/ITU safe-listening model (adult baseline: 80 dB(A) for 40h/week; optional cautious profile: 75 dB(A) for 40h/week) using CoreAudio output volume + active playback time as the v1 measurement path. Clearly label every result as an estimate / not medical; avoid diagnosis, prevention, or "safe" claims. Treat true Bose/BMAP SPL or headphone-volume discovery as a later read-only research spike, not a v2.1 requirement.
- Apple Shortcuts integration
- Additional Bose model support (based on demand)
- Raycast extension
- Multi-brand expansion (Sony WH-1000, Sennheiser Momentum) — under evaluation
