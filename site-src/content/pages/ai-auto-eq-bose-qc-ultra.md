---
{
  "slug": "ai-auto-eq-bose-qc-ultra.html",
  "title": "AI Auto-EQ for Bose QC Ultra",
  "description": "How ANCBuddy's optional AI Auto-EQ works for Bose QC Ultra headphones and earbuds, including track metadata and privacy details.",
  "kind": "guide",
  "lastmod": "2026-07-02",
  "priority": 0.75,
  "h1": "AI Auto-EQ for Bose QC Ultra",
  "faqs": [
    {
      "q": "Is AI Auto-EQ required?",
      "a": "No. AI Auto-EQ is optional and only runs when enabled."
    },
    {
      "q": "What data does AI Auto-EQ use?",
      "a": "It uses the current artist, title, and album to generate a 3-band EQ profile."
    },
    {
      "q": "Are raw song names stored?",
      "a": "No. Results are cached by a hashed track key, and raw song names are not stored."
    },
    {
      "q": "What EQ bands are applied?",
      "a": "ANCBuddy applies Bass, Mid, and Treble values to the compatible Bose QC Ultra device."
    }
  ],
  "breadcrumbs": [
    { "name": "Home", "url": "/" },
    { "name": "Guides", "url": "/guides.html" },
    { "name": "AI Auto-EQ for Bose QC Ultra", "url": "/ai-auto-eq-bose-qc-ultra.html" }
  ],
  "relatedLinks": [
    { "title": "Privacy", "href": "/privacy.html", "description": "Read the data handling details." },
    { "title": "ANCBuddy features", "href": "/#features", "description": "Explore ANCBuddy." },
    { "title": "Bose QC Ultra Mac app", "href": "/bose-qc-ultra-mac-app.html", "description": "See all product features." }
  ]
}
---

AI Auto-EQ is an optional ANCBuddy feature that uses the current track's artist, title, and album to generate a 3-band Bass/Mid/Treble profile for compatible Bose QC Ultra devices.

## How it works

When AI Auto-EQ is enabled, ANCBuddy reads the currently playing track metadata and asks ANCBuddy's relay for a 3-band EQ recommendation. The app then applies Bass, Mid, and Treble values to the Bose QC Ultra device.

## Privacy behavior

AI Auto-EQ is opt-in. When enabled, ANCBuddy sends the current artist, title, and album to ANCBuddy's relay only to generate a 3-band EQ profile for that track. Results are cached by a hashed track key, and raw song names are not stored.

For the broader privacy summary, read [ANCBuddy privacy](/privacy.html).
