---
{
  "slug": "privacy.html",
  "title": "ANCBuddy Privacy",
  "description": "Privacy details for ANCBuddy trial signup, first-party attribution, license validation, Bluetooth control, and optional AI Auto-EQ.",
  "kind": "privacy",
  "lastmod": "2026-07-05",
  "priority": 0.7,
  "h1": "ANCBuddy privacy",
  "faqs": [
    {
      "q": "Does normal mode switching send data to ANCBuddy servers?",
      "a": "No. Quiet, Aware, Immersion, battery, and connection control happen locally between your Mac and the paired Bose device."
    },
    {
      "q": "What does AI Auto-EQ send?",
      "a": "Only when enabled, ANCBuddy sends the current artist, title, and album to generate a 3-band EQ profile."
    },
    {
      "q": "Are raw song names stored?",
      "a": "No. AI Auto-EQ results are cached by a hashed track key, and raw song names are not stored."
    },
    {
      "q": "What is collected for the trial?",
      "a": "The trial form collects the name and email address entered by the user, plus privacy-light first-party attribution such as campaign parameters and referrer host."
    },
    {
      "q": "Does ANCBuddy use analytics or ad pixels?",
      "a": "No. The website does not use a third-party analytics SDK, ad pixels, or cross-site tracking. It logs first-party campaign and event data only for distribution measurement."
    }
  ],
  "breadcrumbs": [
    { "name": "Home", "url": "/" },
    { "name": "Privacy", "url": "/privacy.html" }
  ],
  "relatedLinks": [
    { "title": "AI Auto-EQ guide", "href": "/ai-auto-eq-bose-qc-ultra.html", "description": "What the optional EQ feature does." },
    { "title": "Download", "href": "/download.html", "description": "Get the current Mac app release." },
    { "title": "Support", "href": "/support.html", "description": "Ask a privacy or setup question." }
  ]
}
---

ANCBuddy's everyday Bose QC Ultra controls are local Mac-to-headphones Bluetooth actions; only the trial form, first-party distribution measurement, license checks, update checks, and optional AI Auto-EQ use network services.

## Local controls

Switching Quiet, Aware, and Immersion modes is handled from your Mac to your paired Bose QC Ultra device over Bluetooth. ANCBuddy does not need the Bose phone app to be open for these daily controls.

## Trial and license data

The trial form asks for a name and email address before the DMG download starts. To understand which launch channels work, the website also stores first-party attribution fields: UTM source, medium, campaign, referrer host, landing path, current path, and a generated session ID. The same fields can be passed to Lemon Squeezy checkout as custom checkout data.

ANCBuddy does not use a third-party analytics SDK, ad pixels, or cross-site tracking. The first-party site events are limited to page view, trial open, trial start, download click, and checkout click. License purchases and license validation are handled through Lemon Squeezy. For purchase-source measurement, Lemon Squeezy can send signed order webhooks to ANCBuddy's Supabase project; ANCBuddy stores the order ID, amount, status, first-party attribution fields, and a hashed customer email for matching purchases back to prior trial signups without storing the raw purchase email in the measurement table. ANCBuddy stores license state locally so existing users do not need to re-enter keys on every launch.

## AI Auto-EQ

AI Auto-EQ is opt-in. When enabled, ANCBuddy sends the current artist, title, and album to ANCBuddy's relay only to generate a 3-band EQ profile for that track. Results are cached by a hashed track key, and raw song names are not stored.

## Support

For privacy questions, email [denoaytac62@gmail.com](mailto:denoaytac62@gmail.com).
