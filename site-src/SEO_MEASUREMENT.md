# ANCBuddy SEO Measurement Checklist

Measurement stays privacy-light: no third-party analytics script, ad pixel, or cross-site tracking is used. ANCBuddy records first-party attribution and site events in Supabase for distribution tests.

## After deploy

1. Submit `https://ancbuddy.com/sitemap.xml` in Google Search Console.
2. Submit the same sitemap in Bing Webmaster Tools.
3. Inspect these URLs after deployment:
   - `https://ancbuddy.com/`
   - `https://ancbuddy.com/download.html`
   - `https://ancbuddy.com/guides.html`
   - `https://ancbuddy.com/control-bose-qc-ultra-from-mac.html`
   - `https://ancbuddy.com/privacy.html`
   - `https://ancbuddy.com/404.html`
4. Confirm `https://www.ancbuddy.com/` redirects to `https://ancbuddy.com/`.
5. Validate representative generated pages in the Google Rich Results Test.

## Monthly review

- Indexed pages
- Sitemap errors
- Top queries
- Impressions for non-brand queries
- Clicks into guide, support, and download pages
- Manual trial-download and checkout-click trend
- First-party `site_events` by channel / UTM source
- Trial starts from `trial_signups`, separated from direct Lemon Squeezy purchases
- Purchases from `lemon_orders`, split into `direct` vs `trial_led`

## Distribution plan sources (revised 2026-07-06)

Use these exact source/campaign labels:

| Source | Use |
| --- | --- |
| `rbose_recovery` | Existing r/bose posts, modmail, or approved/unfiltered Reddit recovery actions. |
| `buyer_email` | Manual email to existing paid buyers. |
| `trial_followup` | Manual email to trial signups. |
| `community_warmup` | Helpful non-promotional Reddit/community participation. |
| `direct_outreach` | Targeted outreach to reviewers, Mac utility curators, writers, or guide authors. |
| `owned_guide` | Existing or new ANCBuddy guide/support/trust pages. |
| `listings` | Directory listings (AlternativeTo, MacUpdate, awesome-mac, MacMenuBar). |
| `waitlist_probe` | Wider-device-support waitlist elements. |

Do not send broader traffic until `trial_start`, `download_click`, `checkout_click`, and Lemon order attribution can be reviewed. If the Lemon Squeezy webhook or `lemon_orders` split is not reliable, treat purchase attribution as unknown instead of guessing.

Current code coverage checked on 2026-07-05:

- React homepage flow records `page_view`, `trial_open`, `trial_start`, `download_click`, and `checkout_click` through `site_events`.
- Generated static pages record `page_view`, `trial_open`, `download_click`, and `checkout_click`.
- Checkout links carry first-party attribution through `checkout[custom][...]` fields.
- Lemon order attribution still depends on signed webhook rows and the `direct` vs `trial_led` split being reviewable before larger traffic.

## Attribution QA

- Browser roles can insert into `site_events` and `trial_signups`.
- Browser roles cannot read, update, or delete `site_events`, `trial_signups`, or `lemon_orders`.
- Lemon Squeezy checkout links include only minimal `checkout[custom][...]` attribution fields.
- The Lemon Squeezy `order_created` webhook rejects bad `X-Signature` requests, accepts valid requests, and upserts duplicate order IDs without creating duplicates.
