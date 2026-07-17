---
{
  "slug": "trust.html",
  "title": "ANCBuddy Trust and Safety",
  "description": "Trust details for ANCBuddy: Bose independence, local Bluetooth control, network paths, signing, updates, and closed-source maintenance rationale.",
  "kind": "trust",
  "lastmod": "2026-07-05",
  "priority": 0.7,
  "h1": "ANCBuddy trust and safety",
  "faqs": [
    {
      "q": "Is ANCBuddy official Bose software?",
      "a": "No. ANCBuddy is an independent third-party Mac utility and is not affiliated with, endorsed by, or sponsored by Bose Corporation."
    },
    {
      "q": "Does ANCBuddy need the cloud for normal mode switching?",
      "a": "No. Quiet, Aware, Immersion, battery, and connection controls happen locally over Bluetooth between your Mac and the paired Bose QC Ultra device."
    },
    {
      "q": "Which network paths exist?",
      "a": "Network use is limited to Sparkle update checks and optional AI Auto-EQ when enabled. Normal website browsing does not send measurement events."
    },
    {
      "q": "Why is ANCBuddy closed-source?",
      "a": "ANCBuddy is closed-source so its Bluetooth integration, signing, notarization, update delivery, and compatibility work can be maintained as one product."
    }
  ],
  "breadcrumbs": [
    { "name": "Home", "url": "/" },
    { "name": "Trust", "url": "/trust.html" }
  ],
  "relatedLinks": [
    { "title": "Privacy", "href": "/privacy.html", "description": "Review website, update, and AI Auto-EQ data handling." },
    { "title": "Facts", "href": "/facts.html", "description": "Canonical product facts and supported devices." },
    { "title": "Support", "href": "/support.html", "description": "Ask setup, privacy, or compatibility questions directly." }
  ]
}
---

ANCBuddy is a small Mac utility for a narrow job: controlling compatible Bose QC Ultra listening modes from the Mac menu bar. This page collects the technical trust details behind the product.

## Independence from Bose

ANCBuddy is independent software by Deniz Aytac. It is not affiliated with, endorsed by, or sponsored by Bose Corporation. Bose, QuietComfort, QC Ultra, and related marks are used only to describe compatible hardware.

The Bose phone app remains the official place for firmware updates, product setup, and deeper Bose account/device settings. ANCBuddy is for daily Mac control after your supported headphones or earbuds are already paired.

## What stays local

Normal mode switching is local. Quiet, Aware, Immersion, battery, and connection status use Bluetooth communication between your Mac and the paired Bose QC Ultra device.

ANCBuddy does not update headphone firmware and does not need the Bose phone app to be open for those daily controls.

## Network paths

ANCBuddy is not a zero-network product. These are the network paths to know about:

- Update checks: the Mac app uses Sparkle to check for signed updates.
- Optional AI Auto-EQ: only when enabled, ANCBuddy sends current artist/title/album to ANCBuddy's relay to generate a 3-band EQ suggestion.

There is no third-party analytics SDK, ad pixel, cross-site tracking, attribution session, or site-event measurement on the public site.

## Signing and updates

ANCBuddy builds are signed with Developer ID and notarized by Apple. The app includes Sparkle update checks so signed fixes can be delivered outside the Mac App Store.

## Closed-source maintenance rationale

ANCBuddy is closed-source for now. The reason is practical maintenance: Bluetooth behavior, macOS releases, Bose firmware behavior, support, signing, notarization, and update delivery all take ongoing work.

There is no public abandonment or future open-source promise at this time. If that policy changes, it should be stated explicitly rather than implied.
