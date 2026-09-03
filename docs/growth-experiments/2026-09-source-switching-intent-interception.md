# Growth experiment: QC Ultra source-switching intent interception

**Campaign key:** `source_switching_intent_2026_09`  
**Prepared:** 2026-09-04  
**Status:** Ready for manual execution; no external reply has been published by this change.

## Decision this experiment is meant to make

Can transparent, problem-first replies placed inside public discussions where a **Mac user is already struggling with Bose QC Ultra source switching or Mac audio routing** generate attributable paid ANCBuddy orders?

This is deliberately not a broad Reddit test. It tests one narrow mechanism:

> Put ANCBuddy next to the exact problem moment it can solve, explain the limits honestly, and measure behavior close to payment.

The website, product, price, checkout, trial and landing page stay unchanged during the first batch. That preserves the ability to attribute the result to distribution rather than to several simultaneous changes.

## Hypothesis

If ANCBuddy is introduced transparently to supported QC Ultra owners at the moment they are trying to select a source from a Mac, understand which device is active, start pairing, or recover the Mac audio route, then some will start the trial or purchase because ANCBuddy 2.2.0 offers an explicit paid Mac workflow that basic Bluetooth controls and simpler free utilities do not provide.

The hypothesis is false or commercially unimportant if accepted replies cannot create qualified human visits, or if enough qualified visits occur without checkout or download behavior.

## Product truth that every reply must preserve

ANCBuddy 2.2.0 can, on supported hardware:

- show active, also-connected and remembered Bose sources;
- select a remembered source from the Mac;
- start or cancel Bose pairing;
- reconnect and select the Bose Core Audio output when macOS exposes it;
- open Bluetooth Settings when the audio profile is unavailable;
- provide Quiet, Aware, Immersion, battery and optional AI Auto-EQ controls;
- run as a signed and notarized macOS app on macOS 12 or newer.

It must **not** be presented as able to:

- change or repair Bose firmware;
- restore a removed physical-button shortcut or Bose voice prompts;
- turn Multipoint on or off;
- prevent every genuine Bluetooth disconnection;
- manage arbitrary non-Bose Bluetooth devices;
- replace the Bose app for firmware updates and unsupported settings.

ANCBuddy is a paid product: 14-day trial, then a $9.99 one-time license. The maker relationship and paid nature must never be hidden.

## Eligibility gate

Publish only when every answer below is **yes**:

1. Does the discussion explicitly involve a Mac, macOS or MacBook, or can the reply be placed directly under a comment that does?
2. Is the hardware one of ANCBuddy's supported models: QC Ultra Headphones Gen 1, QC Ultra Headphones Gen 2, or QC Ultra Earbuds 2nd Gen?
3. Is the problem specifically source selection, active/connected-source visibility, pairing, or a recoverable Mac audio-route mismatch?
4. Can ANCBuddy materially help without implying a firmware or hardware fix?
5. Is the discussion still open and useful to participants?
6. Do the current community rules allow this transparent, relevant maker reply?
7. Is there no substantially identical ANCBuddy reply already in the thread?

Skip the placement when any answer is no. Also skip competitor launch threads, generic buying-advice threads, Windows-only cases, microphone/call-quality issues and total hardware failures.

## Attribution contract

Use this landing page for the whole first batch:

`https://ancbuddy.com/switch-bose-qc-ultra-audio-sources-mac.html`

Use these fixed UTM values:

- `utm_source=reddit`
- `utm_medium=community_reply`
- `utm_campaign=source_switching_intent_2026_09`
- `utm_content=<placement_slug>`

Full link template:

`https://ancbuddy.com/switch-bose-qc-ultra-audio-sources-mac.html?utm_source=reddit&utm_medium=community_reply&utm_campaign=source_switching_intent_2026_09&utm_content=<placement_slug>`

Never reuse a placement slug. The slug belongs to the thread, not to a copy variant.

## First batch: seed placements and prepared replies

These are candidates, not permission to post blindly. Re-check the live discussion, supported device, exact Mac context and current rules immediately before publishing.

### A1 — Gen 2 button-based source switching removed

**Candidate:** https://www.reddit.com/r/bose/comments/1rkwb46/newest_update_for_bose_quietcomfort_ultra_gen_2/  
**Slug:** `gen2_button_removed`

**Prepared reply**

> That firmware change is the part a Mac utility can work around, but it cannot restore the physical button. I build ANCBuddy, a paid macOS menu-bar app. On supported QC Ultra models, v2.2.0 shows the active, other connected and remembered Bose sources and lets you select a remembered source from the Mac. It can also start or cancel pairing. It does not change Bose firmware, restore the old button/voice prompts, or toggle Multipoint. There is a 14-day trial before the $9.99 one-time license, and this guide shows the exact source workflow: [tracked link]

### A2 — Reopening the phone app for every switch

**Candidate:** https://www.reddit.com/r/bose/comments/1smbfhy/thoughts_on_the_qc_ultra_2_headphones_after_a/  
**Slug:** `gen2_app_switching`

**Prepared reply**

> For people in this thread whose computer is a Mac: avoiding the phone app for this specific workflow is why I built ANCBuddy. It is a paid menu-bar app, and v2.2.0 can show which Bose source is active, which other one remains connected, and the remembered source list, then select a remembered source from macOS. It also supports Bose pairing from the Mac. It is not a firmware or automatic-handoff fix and does not toggle Multipoint. The 14-day trial is meant to let you verify it with your own setup before the $9.99 one-time purchase: [tracked link]

### A3 — Manual source control after broken automatic handoff

**Candidate:** https://www.reddit.com/r/bose/comments/1tx73r8/review_why_you_shouldnt_buy_the_bose_qc_ultra_gen/  
**Slug:** `gen2_manual_switch_removed`

**Prepared reply**

> I agree that explicit control and automatic handoff are different problems. ANCBuddy is not a fix for Bose's firmware or a guarantee that automatic switching will behave. For Mac users who want explicit control instead, I build this paid menu-bar app: it shows active, connected and remembered QC Ultra sources and lets you select a remembered source from the Mac. It can also start pairing and help recover the Mac audio route when macOS exposes it. It cannot restore the removed hardware shortcut or change Multipoint. There is a 14-day trial and a $9.99 one-time license: [tracked link]

### A4 — MacBook route or connection confusion

**Candidate:** https://www.reddit.com/r/bose/comments/1tcuuov/are_bose_qc_ultra_connectivity_issues_becoming_a/  
**Slug:** `macbook_connectivity`

**Prepared reply**

> One important boundary: a Mac app cannot repair a headset that genuinely drops its Bluetooth link. I build ANCBuddy, a paid Mac menu-bar app, and it is useful in the narrower case where the QC Ultra remains reachable but the active source or macOS audio output is wrong. It shows active/connected/remembered Bose sources, lets you select a remembered source, and can reconnect/select the Bose Core Audio output when macOS exposes it; otherwise it opens Bluetooth Settings. It is not a firmware fix. The 14-day trial lets you test whether your case is the recoverable one before paying $9.99 once: [tracked link]

### A5 — Explicit source choice without the Bose phone app

**Candidate:** https://www.reddit.com/r/bose/comments/1m0mj52/let_me_choose_my_audio_source_without_having_to/  
**Slug:** `choose_audio_source`

**Prepared reply**

> This explicit-source workflow is the exact gap I built ANCBuddy for on macOS. Disclosure: it is my paid menu-bar app. On supported QC Ultra models it shows the active source, another connected source and remembered devices, then lets you select a remembered source from the Mac; it can also start or cancel pairing. It does not toggle Multipoint or replace the Bose app for firmware/settings. There is a 14-day trial, then a $9.99 one-time license: [tracked link]

### A6 — Mac plus phone Multipoint context

**Candidate:** https://www.reddit.com/r/bose/comments/178wneb/qc_ultra_headphones_multipoint_controls/  
**Slug:** `mac_iphone_multipoint`

**Prepared reply**

> For the Mac+iPhone setup described here, ANCBuddy can provide explicit source visibility and selection from the Mac, although it cannot turn Multipoint itself on or off. I am the developer, and it is a paid macOS menu-bar app. v2.2.0 shows the active source, another connected source and remembered devices, then lets you select a remembered source or start pairing. It also exposes the everyday listening modes and battery on the Mac. There is a 14-day trial before the $9.99 one-time license: [tracked link]

### Reserve R1 — Switching between Bluetooth devices

**Candidate:** https://www.reddit.com/r/bose/comments/17qtwz2/quiet_comfort_ultra_issues_switching_between/  
**Slug:** `switching_bt_devices`

Use only under a comment that explicitly confirms a supported QC Ultra model and macOS. Start from A5, then tailor it to the actual source pair.

### Reserve R2 — Laptop disconnection

**Candidate:** https://www.reddit.com/r/bose/comments/1nuarhm/bose_qc_ultra_keeps_disconnecting_from_my_laptop/  
**Slug:** `laptop_disconnect`

Use only if the laptop is confirmed to be a Mac and the symptom is a source/audio-route mismatch rather than a genuine radio disconnect. Start from A4 and preserve its limitation language.

## Execution rules

- Publish at most two carefully tailored replies per day.
- Answer the user's problem before mentioning ANCBuddy.
- Keep the maker disclosure, paid-product disclosure and limitations in the same comment as the link.
- Replace `[tracked link]` with the correct unique UTM link.
- Do not paste identical prose. Tailor only the opening and relevant capability; keep product truth fixed.
- Do not upvote, coordinate votes, use alternate accounts, contact users privately, or argue with negative responses.
- Record `published_at`, final comment URL, status, removal status and qualitative responses.
- If a moderator or participant says the reply is inappropriate, remove it and record the outcome.
- Do not change the landing page, price, trial, checkout or product during the first eight accepted placements unless a factual error or production bug requires correction.

## Metrics

### Primary metric

Count of genuine paid orders attributable to `source_switching_intent_2026_09`:

- `status = 'paid'`
- `amount_usd > 0`
- `test_mode = false`
- `is_internal = false`
- `refunded = false`
- campaign present in direct, first-touch or last-touch attribution

### Secondary metrics

- accepted and still-live replies;
- qualified human sessions by placement;
- trial opens;
- downloads;
- checkout sessions;
- paid revenue;
- reply removals or negative moderation signals.

A **qualified human session** is a non-internal attribution-v2 session carrying the experiment campaign, with at least one page view and no obvious bot/crawler user agent. This is still a proxy; paid orders remain the decision metric.

## Sales math and repeatability test

The immediate target is approximately eight incremental paid sales per month.

Let:

- `P` = eligible problem-moment placements per month;
- `C` = qualified human sessions per placement;
- `R` = paid orders per qualified human session.

The mechanism can be the full path only if:

`P × C × R >= 8 incremental paid orders/month`

No value for `C` or `R` is assumed in advance.

A result of two paid orders from eight placements would justify a scale test only if at least 32 similarly eligible fresh placements per month can be found without lowering fit or violating community rules. If supply is smaller, classify this as a useful tactical source of sales rather than the repeatable path to ten per month.

## Observation windows

- **Early read:** 7 days after the eighth accepted reply, focused on qualified sessions, downloads and checkout sessions.
- **Primary decision:** 21 days after the eighth accepted reply, allowing the 14-day trial to mature.
- **Trailing watch:** keep the attribution query available for 60 days so delayed purchases are not silently lost.

Do not evaluate the batch before eight accepted placements unless a safety, factual or moderation problem requires stopping.

## Pre-registered decision rules

### Strong scale signal

- at least 2 genuine attributed paid orders from the first 8 accepted placements; and
- evidence that at least 32 equally eligible fresh placements per month exist.

Then run a second batch with the same message, page and offer. Do not change the website first.

### Positive but not yet a growth engine

- at least 1 genuine attributed paid order; or
- at least 3 attributed checkout sessions.

Then repeat one comparable batch to estimate whether the signal persists and whether channel supply is sufficient.

### Reach failure

- 8 accepted replies but fewer than 8 qualified human sessions.

Then stop. The placement surface does not deliver enough attention even when intent fit looks good.

### Commercial mismatch

- at least 20 qualified human sessions but zero checkout sessions and zero downloads.

Then stop this message/channel pairing and inspect the replies and landing-page promise before changing product or price.

### Inconclusive downstream activity

- qualified sessions and downloads/checkouts exist, but no paid order by day 21.

Keep the trailing watch to day 60, but do not call the channel validated. The next test should isolate either audience fit or paid differentiation, not launch several new tactics.

## Supabase evaluation queries

### Experiment events by placement

```sql
with campaign_events as (
  select
    *,
    coalesce(first_utm_content, utm_content, last_utm_content, '(unknown)') as placement,
    lower(coalesce(user_agent, '')) ~
      '(bot|crawler|spider|headless|lighthouse|curl|wget|python|facebookexternalhit|semrush|ahrefs|googleother|bingpreview)'
      as obvious_bot
  from public.site_events
  where coalesce(is_internal, false) = false
    and attribution_version = 2
    and coalesce(first_utm_campaign, utm_campaign, last_utm_campaign) =
      'source_switching_intent_2026_09'
)
select
  placement,
  count(distinct session_id) filter (
    where event_name = 'page_view' and not obvious_bot
  ) as qualified_sessions,
  count(distinct session_id) filter (
    where event_name = 'trial_open' and not obvious_bot
  ) as trial_open_sessions,
  count(distinct session_id) filter (
    where event_name = 'download_click' and not obvious_bot
  ) as download_sessions,
  count(distinct session_id) filter (
    where event_name = 'checkout_click' and not obvious_bot
  ) as checkout_sessions,
  min(created_at) as first_event_at,
  max(created_at) as last_event_at
from campaign_events
group by placement
order by first_event_at;
```

### Genuine attributed paid orders

```sql
select
  lemon_order_id,
  lemon_created_at,
  amount_usd,
  currency,
  conversion_path,
  coalesce(first_utm_content, utm_content, last_utm_content, '(unknown)') as placement
from public.lemon_orders
where status = 'paid'
  and amount_usd > 0
  and coalesce(test_mode, false) = false
  and coalesce(is_internal, false) = false
  and coalesce(refunded, false) = false
  and coalesce(first_utm_campaign, utm_campaign, last_utm_campaign) =
    'source_switching_intent_2026_09'
order by lemon_created_at;
```

### Batch summary

```sql
with sessions as (
  select
    session_id,
    bool_or(event_name = 'page_view') as has_page_view,
    bool_or(event_name = 'trial_open') as has_trial_open,
    bool_or(event_name = 'download_click') as has_download,
    bool_or(event_name = 'checkout_click') as has_checkout,
    bool_or(
      lower(coalesce(user_agent, '')) ~
      '(bot|crawler|spider|headless|lighthouse|curl|wget|python|facebookexternalhit|semrush|ahrefs|googleother|bingpreview)'
    ) as obvious_bot
  from public.site_events
  where coalesce(is_internal, false) = false
    and attribution_version = 2
    and coalesce(first_utm_campaign, utm_campaign, last_utm_campaign) =
      'source_switching_intent_2026_09'
  group by session_id
), orders as (
  select count(*) as paid_orders, coalesce(sum(amount_usd), 0) as paid_revenue_usd_minor
  from public.lemon_orders
  where status = 'paid'
    and amount_usd > 0
    and coalesce(test_mode, false) = false
    and coalesce(is_internal, false) = false
    and coalesce(refunded, false) = false
    and coalesce(first_utm_campaign, utm_campaign, last_utm_campaign) =
      'source_switching_intent_2026_09'
)
select
  count(*) filter (where has_page_view and not obvious_bot) as qualified_sessions,
  count(*) filter (where has_trial_open and not obvious_bot) as trial_open_sessions,
  count(*) filter (where has_download and not obvious_bot) as download_sessions,
  count(*) filter (where has_checkout and not obvious_bot) as checkout_sessions,
  orders.paid_orders,
  orders.paid_revenue_usd_minor
from sessions
cross join orders
group by orders.paid_orders, orders.paid_revenue_usd_minor;
```

## Manual boundary

The repository and Supabase can prepare and measure this experiment, but they cannot publish replies from the founder's Reddit account. Each external reply therefore remains a deliberate manual action after the eligibility and rule check. No result is recorded until a real reply is live and a real behavioral event occurs.
