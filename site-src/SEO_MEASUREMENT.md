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

## Attribution QA

- Browser roles can insert into `site_events` and `trial_signups`.
- Browser roles cannot read, update, or delete `site_events`, `trial_signups`, or `lemon_orders`.
- Lemon Squeezy checkout links include only minimal `checkout[custom][...]` attribution fields.
- The Lemon Squeezy `order_created` webhook rejects bad `X-Signature` requests, accepts valid requests, and upserts duplicate order IDs without creating duplicates.
