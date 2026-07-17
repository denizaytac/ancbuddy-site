# Commercial mode

The public site has one runtime/build switch in `src/config/commercial-mode.json`:

```json
{
  "commercialMode": "paused"
}
```

`paused` removes public purchase, checkout, trial, signup, and direct DMG paths. It also disables homepage tracking, omits the tracking script from generated SEO pages, redirects legacy `#trial` and `#pricing` hashes to neutral product sections, and removes active offer/download structured data.

## Public path audit before pause

- Lemon Squeezy: homepage pricing CTA, generated SEO navigation/content, facts/trust pages, `llms.txt`, and checkout attribution helpers.
- Trial form: homepage navigation, hero, final CTA, footer, `#trial`, and `TrialDialog`.
- DMG: `TrialDialog`, `download.html`, facts/support/guide pages, JSON-LD, and `llms.txt`.
- Supabase: homepage `trackPageView`/`trackSiteEvent`, trial signup writes, and the inline static-page attribution script.
- Update path: `public/appcast.xml` points to the GitHub Release asset. It is intentionally preserved and is not linked as a new-user download path.

## Rollback

The complete paused-mode change is isolated in one commit. Revert that commit to restore the exact prior site, then rebuild and deploy through the normal `main` GitHub Pages workflow.

The JSON switch can be set to `active` for local comparison of conditional React and generator behavior, but source metadata/content neutralized in the paused-mode commit is restored completely only by reverting the commit.

## External checkout

Removing website links does not invalidate an already-known Lemon Squeezy checkout URL. Pause or deactivate the product/checkout in Lemon Squeezy separately.
