# CEO Inbox design lock

The implementation source of truth is `ceo-inbox-concept.png` for desktop and
`ceo-inbox-mobile-concept.png` for mobile.

## Visible-copy lock

- ANCBuddy; CEO Inbox
- Inbox; Outcomes; Learning
- Weekly goal; €1,000 total revenue; €60 earned
- 3 decisions need you; Review and act in seconds.
- Expected upside; Evidence; Risk; This week; Activity; Agent note
- Approve & queue; Request changes; Reject

Login and error states are functional necessities not shown in the primary concept.
They reuse the same typography, border, color, and control system.

## Design tokens

- Background: true near-black `#0a0a0c`; never cream or warmed gray.
- Surface: `#101116` to `#15161c`, with 8–12% white borders.
- Accent: lavender `#a78bfa`; primary gradient may end at `#7c3aed`.
- Text: `#f5f5f7`; secondary `#a4a4ad`; tertiary `#71717b`.
- Type: Geist for all product UI; Instrument Serif only in the revenue goal.
- Controls: 12–14px labels, 44px minimum mobile hit targets.
- Container model: rails, rows, separators, and one focused approval surface;
  no metric-card grid.
