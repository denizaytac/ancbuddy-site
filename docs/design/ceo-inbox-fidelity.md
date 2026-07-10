# CEO Inbox fidelity ledger

Accepted references:

- `ceo-inbox-concept.png` for desktop
- `ceo-inbox-mobile-concept.png` for mobile

## Preserved

| Design checkpoint | Implementation |
| --- | --- |
| Information hierarchy | Brand and navigation, weekly revenue goal, approval queue, focused action, and supporting activity appear in the same order as the references. |
| Desktop layout | Narrow navigation rail, central approval workspace, and right metrics rail on wide screens. |
| Mobile layout | Single-column decision flow with compact header, goal summary, action content, and a persistent decision bar. |
| Typography | Geist is used for product UI; Instrument Serif is reserved for the revenue goal. |
| Color and surfaces | Near-black background, quiet bordered surfaces, lavender accent, and the same primary/secondary text contrast. |
| Copy | The locked navigation, goal, queue, evidence, risk, activity, and decision labels are preserved. |
| Interaction model | Select an action, inspect the exact target and payload, then approve, request changes, or reject. |

## Intentional deviations

- Decorative toolbar icons from the concept were omitted because they had no defined action.
- Login, loading, error, and empty states were added because the production interface needs them.
- `Approval required`, recipient/target, version, expiry, and exact budget details are shown to make the execution boundary explicit.
- The right metrics rail collapses below desktop width so the approval task remains readable.
- Generated concept images are documentation only; the shipped interface is native React and CSS.

## QA viewports

- Desktop: 1536 x 1024
- Mobile: 390 x 844

The implementation was compared at native viewport size for hierarchy, layout, typography, palette, spacing, copy, responsive behavior, and decision interactions.
