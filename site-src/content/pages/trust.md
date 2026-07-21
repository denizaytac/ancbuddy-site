---
{
  "slug": "trust.html",
  "title": "ANCBuddy Trust and Safety",
  "description": "Trust details for ANCBuddy: Bose independence, local Bluetooth control, network paths, refunds, signing, updates, and closed-source maintenance rationale.",
  "kind": "trust",
  "lastmod": "2026-07-21",
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
      "a": "Network use is limited to trial/download flow, first-party distribution measurement, license validation, Sparkle update checks, and optional AI Auto-EQ when enabled."
    },
    {
      "q": "Why is ANCBuddy paid and closed-source?",
      "a": "ANCBuddy is paid closed-source for now so maintenance, signing, notarization, support, macOS changes, and Bose firmware changes stay worth handling."
    }
  ],
  "breadcrumbs": [
    { "name": "Home", "url": "/" },
    { "name": "Trust", "url": "/trust.html" }
  ],
  "relatedLinks": [
    { "title": "Privacy", "href": "/privacy.html", "description": "Review trial, attribution, license, and AI Auto-EQ data handling." },
    { "title": "Facts", "href": "/facts.html", "description": "Canonical product facts, supported devices, price, and download links." },
    { "title": "Support", "href": "/support.html", "description": "Ask setup, privacy, or license questions directly." }
  ]
}
---

ANCBuddy is a small paid Mac utility for a narrow job: controlling compatible Bose QC Ultra listening modes from the Mac menu bar. This page collects the trust details that matter before installing or recommending it.

## Independence from Bose

ANCBuddy is independent software by Deniz Aytac. It is not affiliated with, endorsed by, or sponsored by Bose Corporation. Bose, QuietComfort, QC Ultra, and related marks are used only to describe compatible hardware.

The Bose phone app remains the official place for firmware updates, product setup, and deeper Bose account/device settings. ANCBuddy is for daily Mac control after your supported headphones or earbuds are already paired.

## What stays local

Normal mode switching is local. Quiet, Aware, Immersion, battery, and connection status use Bluetooth communication between your Mac and the paired Bose QC Ultra device.

ANCBuddy does not update headphone firmware and does not need the Bose phone app to be open for those daily controls.

## Network paths

ANCBuddy is not a zero-network product. These are the network paths to know about:

- Trial/download flow: the website offers an optional name-and-email signup before starting the DMG download; visitors can skip it and download directly.
- First-party distribution measurement: the website records campaign/source fields and basic site events to understand which channels work.
- License validation: paid licenses are handled through Lemon Squeezy.
- Update checks: the Mac app uses Sparkle to check for signed updates.
- Optional AI Auto-EQ: only when enabled, ANCBuddy sends current artist/title/album to ANCBuddy's relay to generate a 3-band EQ suggestion.

There is no third-party analytics SDK, ad pixel, or cross-site tracking on the site.

## Price, trial, and refund

ANCBuddy has a 14-day trial and costs $9.99 one-time if it earns a place in your menu bar. Lemon Squeezy handles checkout and refund processing. The current support policy is a 14-day no-questions refund.

## Signing and updates

The public ANCBuddy 2.0.3 DMG is signed with Developer ID, notarized by Apple, and distributed through the ANCBuddy GitHub release asset and Lemon Squeezy download flow. The app includes Sparkle update checks so fixes can ship outside the Mac App Store.

## Closed-source maintenance rationale

ANCBuddy is closed-source for now. The reason is practical maintenance: Bluetooth behavior, macOS releases, Bose firmware behavior, support, signing, notarization, and update delivery all take ongoing work. The $9.99 one-time price is meant to fund that maintenance without a subscription.

There is no public abandonment or future open-source promise at this time. If that policy changes, it should be stated explicitly rather than implied.
