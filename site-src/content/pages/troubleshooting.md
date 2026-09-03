---
{
  "slug": "troubleshooting.html",
  "title": "Bose QC Ultra Connected but Not Working on Mac: Troubleshooting",
  "description": "Fix Bose QC Ultra problems on Mac: not showing in ANCBuddy, controls without audio, wrong active source, pairing failures, stale battery, and Multipoint confusion.",
  "kind": "support",
  "lastmod": "2026-09-03",
  "priority": 0.82,
  "h1": "Fix Bose QC Ultra connection, source, and audio problems on Mac",
  "faqs": [
    {
      "q": "Why is my Bose QC Ultra connected to Mac but not showing in ANCBuddy?",
      "a": "Confirm the device is paired and awake, check that ANCBuddy has Bluetooth permission, then disconnect and reconnect the QC Ultra in macOS before reopening ANCBuddy."
    },
    {
      "q": "Why do ANCBuddy controls work while Mac audio plays somewhere else?",
      "a": "The Bose control connection and the macOS audio output are separate. Use ANCBuddy's Mac-audio recovery when available, or select the Bose output in macOS Bluetooth or Sound settings."
    },
    {
      "q": "Why will a remembered Bose source not connect?",
      "a": "Remembered means saved by the Bose device, not currently available. Wake the target device, make sure Bluetooth is enabled, stop playback on competing sources, and retry the switch."
    },
    {
      "q": "Why does my phone keep taking over the Bose QC Ultra?",
      "a": "A phone can remain connected through Multipoint and become the active source when it starts playback. Stop playback on the phone, select the Mac source, or change Multipoint settings in the Bose app."
    },
    {
      "q": "Why does audio work but mode switching does not?",
      "a": "Bluetooth audio can remain available while the Bose control path is stale. Keep the QC Ultra awake, reconnect it, confirm Bluetooth permission, and reopen ANCBuddy."
    },
    {
      "q": "What information should I send to ANCBuddy support?",
      "a": "Send your Mac model, macOS version, exact Bose model, ANCBuddy version, the visible source state, whether audio playback works, and the recovery steps already tried."
    }
  ],
  "breadcrumbs": [
    { "name": "Home", "url": "/" },
    { "name": "Troubleshooting", "url": "/troubleshooting.html" }
  ],
  "relatedLinks": [
    { "title": "Audio-source switching", "href": "/switch-bose-qc-ultra-audio-sources-mac.html", "description": "Understand active, connected, and remembered source states." },
    { "title": "Complete Mac control guide", "href": "/control-bose-qc-ultra-from-mac.html", "description": "Review the normal setup and daily workflow." },
    { "title": "Bose QC Ultra app for Mac", "href": "/bose-qc-ultra-mac-app.html", "description": "Check supported devices, features, and limits." },
    { "title": "Support", "href": "/support.html", "description": "Contact the developer with a reproducible problem report." },
    { "title": "Download", "href": "/download.html", "description": "Install the current signed and notarized release." }
  ],
  "sources": [
    { "title": "Apple: Connect a Bluetooth device with your Mac", "url": "https://support.apple.com/guide/mac-help/connect-a-wireless-accessory-blth1004/mac" },
    { "title": "Bose: Bluetooth Multipoint", "url": "https://www.bose.com/stories/bluetooth-multipoint" },
    { "title": "Bose app support", "url": "https://support.bose.com/s/article/qc-headphonearn-download-the-bose-app?language=en_US" },
    { "title": "ANCBuddy audio-source guide", "url": "/switch-bose-qc-ultra-audio-sources-mac.html" }
  ]
}
---

Bose QC Ultra problems on a Mac are easier to diagnose when you separate three states: the normal macOS audio connection, the Bose control connection used by ANCBuddy, and the source list remembered by the Bose device. Choose the symptom below instead of resetting everything at once.

## Match the symptom first

| What you see | Most likely area |
| --- | --- |
| The Bose appears in macOS but not in ANCBuddy | Bose control connection or Bluetooth permission |
| ANCBuddy changes modes but sound plays through another output | macOS audio routing |
| The device appears as remembered but will not switch | Target source is unavailable or another source is active |
| The phone keeps becoming active | Multipoint and competing playback |
| Audio works but modes or sources stop updating | Stale Bose control connection |
| Battery or source status does not refresh | Sleeping device or stale connection state |

## Before you start

1. Confirm you are using the current ANCBuddy release from the [download page](/download.html).
2. Wake the headphones or earbuds and keep them close to the Mac.
3. Open **System Settings → Bluetooth** and confirm the exact QC Ultra device is paired.
4. Open **System Settings → Privacy & Security → Bluetooth** and confirm ANCBuddy is allowed to use Bluetooth.
5. Play a short audio clip from the Mac so you can distinguish control problems from audio-output problems.

## Bose QC Ultra is connected but not showing in ANCBuddy

A working macOS audio connection does not guarantee that the separate Bose control path is available.

1. Quit ANCBuddy completely.
2. Keep the Bose QC Ultra powered on and awake.
3. Disconnect the Bose device in macOS Bluetooth settings.
4. Reconnect it and wait until macOS shows it as connected.
5. Reopen ANCBuddy.
6. If it still does not appear, toggle ANCBuddy's Bluetooth permission off and on, then launch the app again.
7. As a last local step, remove the device from macOS and pair it again.

Do not clear the Bose product's entire remembered-device list unless normal reconnect and pairing steps fail, because doing so affects every saved source.

## ANCBuddy controls work, but no sound comes from the Bose

The low-energy control connection and the Core Audio output are related but separate. ANCBuddy can therefore read battery or change a mode while macOS still sends sound elsewhere.

1. Expand **Audio Sources** and check which device is marked **Active Source**.
2. Open macOS Control Center or **System Settings → Sound → Output**.
3. Select the Bose QC Ultra output if it is available.
4. Use ANCBuddy's offered Mac-audio recovery. It reconnects and selects the Bose output after macOS exposes it.
5. If the Bose output does not appear, open Bluetooth Settings from the recovery path, disconnect, and reconnect the device there.

## Audio works, but modes or source controls do not

This usually points to a stale control connection rather than a speaker or codec problem.

1. Keep playback running at low volume so the Bose device stays awake.
2. Quit and reopen ANCBuddy.
3. Disconnect and reconnect the Bose device in macOS Bluetooth settings.
4. Confirm ANCBuddy still has Bluetooth permission.
5. Check whether battery and source status refresh before trying another mode switch.

If audio remains stable but control repeatedly disappears, note the exact device model, macOS version, and whether the problem begins after sleep, switching sources, or closing the lid.

## A remembered source will not connect

**Remembered** means saved in the Bose source list. It does not mean the target phone, tablet, or computer is currently awake and accepting a connection.

1. Wake the target device and turn Bluetooth on.
2. Stop playback on the current active source.
3. Confirm the target device has not forgotten or removed the Bose QC Ultra.
4. Select the remembered device once in ANCBuddy and wait for the status to refresh.
5. If it still fails, use **Pair New Device…** and complete pairing from the target device's Bluetooth controls.

If the remembered entry is obsolete, manage or clear it with the Bose app rather than repeatedly attempting to switch to a device that no longer has a valid pairing.

## The phone keeps taking over, or the wrong source becomes active

Bose Multipoint can keep more than one source connected. **Connected** is not the same as **active**: the active source is the device currently streaming audio.

1. Stop audio and video playback on the phone, including background apps.
2. Start playback on the Mac or select the Mac from ANCBuddy's remembered source list.
3. Check **Also Connected** to see whether the phone remains linked without being active.
4. If automatic switching remains disruptive, change Multipoint settings in the Bose app. ANCBuddy shows source states but does not advertise a Multipoint on/off toggle.

## Pairing starts but does not complete

ANCBuddy can put the Bose QC Ultra into pairing mode, but the new device must finish the connection through its own Bluetooth controls.

1. Start **Pair New Device…** in ANCBuddy.
2. Open Bluetooth settings on the phone, tablet, or computer you want to add.
3. Select the exact Bose QC Ultra entry and complete any confirmation shown there.
4. Cancel pairing in ANCBuddy if you started it for the wrong device.
5. If the new source never appears, cancel, restart the Bose product, and try once more with competing devices temporarily disconnected.

## Battery or source status is stale

Status can remain unchanged when the Bose device sleeps or the control connection stops refreshing.

1. Wake the Bose device and begin playback.
2. Close and reopen the ANCBuddy panel.
3. Reconnect the device if battery and source states remain unchanged.
4. Compare the active source with the device that is actually playing audio before assuming the status label is wrong.

## When the Bose app is still required

Use the Bose app for firmware updates, initial product setup, turning Multipoint on or off, Cinema Mode, custom modes, hardware shortcuts, touch-control settings, voice prompts, and clearing the Bose product's remembered-device list.

## Contact ANCBuddy support

If the problem remains, email [hello@ancbuddy.com](mailto:hello@ancbuddy.com) with:

- Mac model and macOS version
- exact Bose model
- ANCBuddy version
- whether macOS audio playback works
- the visible Active Source, Also Connected, and remembered-source states
- whether the issue follows sleep, source switching, pairing, or an app restart
- the steps above that changed or did not change the result

A reproducible symptom is more useful than a general statement that Bluetooth is broken.
