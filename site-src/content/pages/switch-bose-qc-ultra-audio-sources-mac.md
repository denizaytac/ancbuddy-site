---
{
  "slug": "switch-bose-qc-ultra-audio-sources-mac.html",
  "title": "Switch Bose QC Ultra Audio Sources from a Mac",
  "description": "See active, connected, and remembered Bose QC Ultra audio sources, switch devices, start pairing, and recover Mac audio with ANCBuddy 2.2.0.",
  "kind": "guide",
  "lastmod": "2026-09-02",
  "priority": 0.82,
  "h1": "Manage Bose QC Ultra audio sources from your Mac",
  "faqs": [
    {
      "q": "Can I switch Bose QC Ultra audio sources from my Mac?",
      "a": "Yes. ANCBuddy 2.2.0 can show active, connected, and remembered Bose sources, then switch to a remembered device."
    },
    {
      "q": "What is the difference between active, connected, and remembered sources?",
      "a": "The active source is currently streaming. Another source can remain connected without streaming. A remembered source is saved by the Bose device but may be disconnected."
    },
    {
      "q": "Can ANCBuddy turn Bose Multipoint on or off?",
      "a": "No. ANCBuddy shows connected source states, but it does not advertise a Multipoint on/off toggle."
    },
    {
      "q": "Can I start or cancel Bose pairing from ANCBuddy?",
      "a": "Yes. ANCBuddy can start or cancel Bose pairing. Complete the new connection from the Bluetooth controls on the device you want to add."
    },
    {
      "q": "What if the Bose controls work but Mac audio still plays elsewhere?",
      "a": "ANCBuddy can reconnect and select the Bose audio output when macOS exposes it. If the audio profile does not appear, the recovery path opens Bluetooth Settings."
    }
  ],
  "breadcrumbs": [
    { "name": "Home", "url": "/" },
    { "name": "Guides", "url": "/guides.html" },
    { "name": "Audio Sources on Mac", "url": "/switch-bose-qc-ultra-audio-sources-mac.html" }
  ],
  "relatedLinks": [
    { "title": "Bose QC Ultra Mac app", "href": "/bose-qc-ultra-mac-app.html", "description": "See modes, sources, battery, and optional AI Auto-EQ." },
    { "title": "Complete Mac control guide", "href": "/control-bose-qc-ultra-from-mac.html", "description": "Set up the full daily workflow." },
    { "title": "Bose app alternative", "href": "/bose-music-app-for-mac-alternative.html", "description": "Compare macOS, ANCBuddy, and the Bose app." },
    { "title": "Battery on Mac", "href": "/bose-qc-ultra-battery-mac.html", "description": "Understand battery visibility." },
    { "title": "QC Ultra Headphones Gen 2", "href": "/qc-ultra-headphones-gen-2-mac.html", "description": "Read the Gen 2 Mac guide." },
    { "title": "QC Ultra Earbuds 2nd Gen", "href": "/qc-ultra-earbuds-2nd-gen-mac.html", "description": "Read the Earbuds Mac guide." },
    { "title": "Download ANCBuddy", "href": "/download.html", "description": "Try the signed and notarized Mac app." },
    { "title": "All guides", "href": "/guides.html", "description": "Browse the ANCBuddy guide hub." }
  ]
}
---

ANCBuddy 2.2.0 shows which remembered device is actively streaming to your Bose QC Ultra and which other sources remain connected. From the Mac menu bar, you can switch to another remembered source or start pairing without opening the Bose phone app.

<figure class="article-screenshot"><picture><source type="image/avif" srcset="/ancbuddy-audio-sources-mac.avif"><source type="image/webp" srcset="/ancbuddy-audio-sources-mac.webp"><img src="/ancbuddy-audio-sources-mac.png" alt="ANCBuddy Audio Sources panel showing the active Bose QC Ultra source, another connected source, and remembered devices on Mac" width="672" height="1604" loading="eager" decoding="async"></picture><figcaption>Real ANCBuddy 2.2.0 Audio Sources panel with privacy-safe device labels.</figcaption></figure>

## Active Source vs. Other Connected Sources

The **Active Source** is the device currently streaming audio to the Bose QC Ultra. A second device can appear under **Also Connected** when it remains linked but is not the active stream.

Seeing both states helps answer two different questions: “Where is the sound coming from now?” and “Which other device is still connected?”

## Remembered devices

Remembered devices are saved in the Bose QC Ultra source list. They do not have to be connected at this moment. ANCBuddy lists those sources separately so you can choose one without treating every saved device as active.

ANCBuddy manages the Bose source list shown by compatible QC Ultra hardware. It does not browse or control arbitrary Bluetooth products nearby.

## How to switch to a remembered Bose source

1. Open ANCBuddy from the Mac menu bar.
2. Expand **Audio Sources**.
3. Confirm which device is marked as the active source.
4. Check whether another source remains connected.
5. Open the remembered or paired-device list.
6. Select the device you want the Bose QC Ultra to use.
7. Wait for the source status to refresh before starting playback.

For the wider setup, mode, and battery workflow, read [how to control Bose QC Ultra from your Mac](/control-bose-qc-ultra-from-mac.html).

## Start or cancel pairing

Choose **Pair New Device…** in ANCBuddy to put the Bose QC Ultra into pairing mode. Then use the Bluetooth controls on the new phone, tablet, computer, or other source to complete the connection. ANCBuddy can also cancel the Bose pairing request.

Starting pairing is different from managing every step of macOS Bluetooth setup. If this Mac has never been paired, macOS may still require Bluetooth Settings.

## Multipoint, simply explained

Multipoint is the Bose ability to keep more than one source connected. ANCBuddy can show the active source and another connected source, which makes the current Multipoint state easier to understand.

ANCBuddy 2.2.0 does **not** advertise a switch for turning Multipoint on or off. Use the Bose app for that setting.

## Mac-audio recovery

The low-energy Bose control connection and the macOS audio output are related but separate. That is why ANCBuddy controls can sometimes work while sound is still routed elsewhere.

When that happens, ANCBuddy can reconnect and select the Bose Core Audio output after macOS exposes it. If the Bose audio profile does not appear, use the offered Bluetooth Settings recovery and reconnect there.

## Supported devices and limits

ANCBuddy supports Bose QuietComfort Ultra Headphones Gen 1, Bose QuietComfort Ultra Headphones Gen 2, and Bose QuietComfort Ultra Earbuds 2nd Gen on macOS 12 or newer, across Apple Silicon and Intel Macs.

The shared supported-device workflow covers modes, battery, and remembered audio sources. ANCBuddy does not claim to restore hardware shortcuts or Bose voice prompts, update firmware, toggle Multipoint, or manage non-Bose Bluetooth devices.

See the [QC Ultra Headphones Gen 2 Mac guide](/qc-ultra-headphones-gen-2-mac.html), [QC Ultra Earbuds 2nd Gen Mac guide](/qc-ultra-earbuds-2nd-gen-mac.html), or the broader [Bose QC Ultra Mac app overview](/bose-qc-ultra-mac-app.html) for device context.

## Try audio-source control on your Mac

[Download ANCBuddy for a 14-day free trial](/download.html). The current release is signed and notarized for macOS; a permanent license is $9.99 one-time.

You can also return to the [ANCBuddy homepage](/) or browse the [full guides hub](/guides.html).
