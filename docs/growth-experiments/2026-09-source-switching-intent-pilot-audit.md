# Source-switching intent pilot audit

**Date:** 2026-09-04  
**Campaign:** `source_switching_intent_2026_09`  
**Purpose:** Tighten the prepared experiment before any public reply is posted.

This audit supersedes the original seed-placement order in
`2026-09-source-switching-intent-interception.md`. The original document remains
the measurement and product-truth contract. This file is the execution gate.

## Why the candidate set was tightened

The current growth question is not whether Bose users complain about Bluetooth.
It is whether ANCBuddy can win paid demand in the narrower problem moment it can
actually solve: a supported QC Ultra owner on a Mac wants explicit visibility or
control over Bose sources.

Several initially prepared threads mixed that problem with genuine radio drops,
firmware regressions, Windows-only setups, or discussions with no Mac context.
Using those placements would create an avoidable false negative and weaken trust.

## First pilot: four high-purity placements

A reply may be published only after the live thread, exact comment, supported
hardware, current community rules, and absence of a duplicate maker reply are
checked again. If any gate fails, skip it rather than substituting a lower-fit
thread merely to fill the batch.

### P1 — Gen 2 source button removed, Mac context required

- Thread: `https://www.reddit.com/r/bose/comments/1rkwb46/newest_update_for_bose_quietcomfort_ultra_gen_2/`
- Placement slug: `gen2_button_removed_mac`
- Required scope: reply only where the user explicitly describes switching
  between a Mac and another source, or after the user confirms that setup.
- Solvable job: replace the removed hardware source carousel with explicit source
  visibility and remembered-source selection from macOS.
- Boundary: ANCBuddy cannot restore the physical button, Bose voice prompts,
  firmware behavior, or Multipoint settings.

Prepared reply:

> That update removed the hardware source carousel, so a Mac app cannot restore the button itself. I am the developer of ANCBuddy, a paid macOS menu-bar app. It can give a supported QC Ultra setup explicit source control instead: show the active, other connected and remembered Bose sources, then select a remembered source from the Mac. It does not change firmware or toggle Multipoint. There is a 14-day trial before the $9.99 one-time license: [tracked link]

### P2 — Explicit source choice without reopening the phone app

- Thread: `https://www.reddit.com/r/bose/comments/1m0mj52/let_me_choose_my_audio_source_without_having_to/`
- Placement slug: `choose_audio_source_mac_iphone`
- Required scope: use only under the explicit Mac-and-iPhone discussion and only
  when the QC Ultra model is supported.
- Solvable job: choose a remembered Bose source from macOS and see which source is
  active or still connected.
- Boundary: explicit selection is not automatic handoff and does not change the
  Multipoint toggle.

Prepared reply:

> The Mac+iPhone source-choice problem described here is the specific workflow I built ANCBuddy for. Disclosure: it is my paid macOS menu-bar app. On supported QC Ultra models it shows the active, other connected and remembered Bose sources, then lets you select a remembered source from the Mac. It can also start or cancel pairing. It does not toggle Multipoint or repair Bose firmware. The trial lasts 14 days, then the license is $9.99 once: [tracked link]

### P3 — Rotating a QC Ultra 2 across several Apple devices

- Thread: `https://www.reddit.com/r/bose/comments/1s23oln/qc_ultra_2_easy_to_switch_between_4_apple_devices/`
- Placement slug: `qcu2_four_apple_devices`
- Required scope: the stated setup must still include a Mac Studio or MacBook and
  QC Ultra Headphones Gen 2.
- Solvable job: make the Mac side of a multi-device setup explicit rather than
  depending on automatic source takeover.
- Boundary: ANCBuddy controls the supported Bose device from macOS; it is not a
  cross-platform manager for every Apple device and cannot guarantee automatic
  handoff.

Prepared reply:

> For the Mac Studio or MacBook part of this setup, explicit source control is possible even though no utility can turn five devices into simultaneous Multipoint connections. I build ANCBuddy, a paid Mac menu-bar app for supported QC Ultra models. It shows the active, other connected and remembered Bose sources, lets you select a remembered source, and can start pairing from macOS. It does not manage the iPhone or iPad side, change Bose firmware, or guarantee automatic handoff. There is a 14-day trial and a $9.99 one-time license: [tracked link]

### P4 — QC Ultra switching between MacBook and phone

- Thread: `https://www.reddit.com/r/bose/comments/17qtwz2/quiet_comfort_ultra_issues_switching_between/`
- Placement slug: `macbook_phone_explicit_switch`
- Required scope: reply only to a comment that explicitly confirms a supported QC
  Ultra model, MacBook, and a desire for manual source selection rather than a
  genuine Bluetooth-radio repair.
- Solvable job: show source state and select the remembered Mac or phone source
  from the Mac.
- Boundary: skip when the headset fully drops Bluetooth or the case is only about
  microphone/call quality.

Prepared reply:

> If the headset is still reachable and the problem is choosing the MacBook versus the phone, explicit control is different from fixing a true Bluetooth drop. I am the developer of ANCBuddy, a paid macOS menu-bar app. On supported QC Ultra models it shows active, connected and remembered sources and lets you select a remembered source from the Mac. It cannot repair a radio disconnection, change firmware, or toggle Multipoint. The 14-day trial is there to verify that your case is the controllable one before paying $9.99 once: [tracked link]

## Rejected from the first pilot

- `gen2_app_switching`: no explicit Mac context was found. Fails the Mac gate.
- `gen2_manual_switch_removed`: no explicit Mac context was found. Fails the Mac
  gate.
- `macbook_connectivity`: the Mac case is dominated by genuine unstable-link
  symptoms rather than a clearly recoverable source or audio-route mismatch.
- `laptop_disconnect`: the identified case is Windows-only.
- `mac_iphone_multipoint`: keep only as reserve. The thread is old and contains
  mixed reports that the behavior later changed, so it is weaker evidence than
  the four placements above.

Mac-app and listening-mode request threads are real evidence but test a different
intent. Do not mix them into this source-switching pilot. They are candidates for
a later experiment only after this mechanism has a result.

## Pilot execution rule

1. Publish no more than one carefully tailored reply per day until four accepted,
   still-live placements exist.
2. Answer the user's problem before mentioning ANCBuddy.
3. Keep the maker disclosure, paid-product disclosure, material limitation, and
   tracked link in the same reply.
4. Use the existing campaign values and the unique placement slug above.
5. Record the final comment URL, time, removal status, and qualitative response.
6. Do not change product, price, trial, checkout, or the source-switching landing
   page during the pilot unless a factual or production bug requires correction.
7. Stop immediately on a moderator request or a pattern of negative moderation.

## Pilot decision gate

This four-placement pilot is a quality and reach gate, not final proof that the
channel can produce eight incremental monthly sales.

### Expand from four to eight placements only when

- all four replies remain accepted and live;
- at least four qualified human sessions are attributed to the pilot;
- at least one attributed download or checkout session occurs; and
- there is no material moderation or trust problem.

A genuine attributed paid order is stronger evidence than every proxy above and
immediately justifies completing the original eight-placement batch.

### Stop for reach failure when

- four accepted replies produce fewer than four qualified human sessions after
  seven full days.

### Stop for commercial mismatch when

- the campaign reaches at least 20 qualified human sessions with zero downloads
  and zero checkout sessions.

### Do not call the channel repeatable until

- the original eight-placement batch produces paid evidence; and
- at least 32 equally eligible fresh placements per month can be found without
  weakening fit, violating community rules, or relying on stale threads.

## What this audit changes in our beliefs

The experiment is now capable of answering a narrower, more useful question:
Does exact-fit source-switching intent create downstream commercial behavior when
ANCBuddy is introduced transparently at the problem moment?

It still cannot establish a path to ten paid sales per month before real replies
are accepted and real outcomes are observed. That uncertainty is the point of the
pilot, not a gap to hide with more planning.