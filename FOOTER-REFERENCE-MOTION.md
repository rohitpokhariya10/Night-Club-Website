# Footer Reference: Analysis

**Reference:** https://in.pinterest.com/pin/420171840258591043/, inspected November 14, 2026.

## Access and method
- The pin was opened in Playwright-driven Chromium (`scripts/motion/pinterest-recon.mjs`, then `scripts/motion/pin-image.mjs`). Pinterest showed its login prompt over the page; I did not log in and bypassed nothing.
- **The pin has no video.** The page has no `<video>` element and loads no video media. It is a single still image: Pinterest titles it "Black Orange Modern Annual Marketing Report Presentation – Templates by Canva", a presentation title slide.
- **What was saved:** the pin's own public image (its `og:image`, requested at original size: `i.pinimg.com/originals/0a/40/c0/…jpg`, 1600×900). It is in `artifacts/footer-reference/media/` for analysis only and is not used on the site.
- **Measurements:** `scripts/motion/image-profile.mjs` (results in `artifacts/footer-reference/profile.json`).
- **Consequence:** the reference defines a **composition, not a motion**. There is no entrance, timing, easing, hover or scroll behaviour to inspect, so none is claimed. The footer's motion is original choreography, designed to bring this composition to life; it is not a recreation of observed animation.

## What the reference shows (1600×900, measured)
| Element | Observation |
|---|---|
| Background | Near-black, overlaid with **9 equal vertical "flutes"** (column edges measured at about 11.1% intervals: 11.4, 55.3, 66.4, 77.4, 88.6%…). Each flute is a hard-edged band of soft light, like light seen through fluted glass. Adjacent flutes show the glow at different offsets, so the light breaks at every edge. |
| Light | A warm glow that **brightens left → right** (average luminance across the tenths of the width: 18, 19, 15, 19, 23, 26, 31, 38, 49, 57) and **peaks at 50–70% of the height** (by tenth of the height: 11, 12, 15, 21, 29, 56, 51, 48, 33, 20). The left-centre is almost black; a secondary glow sits in the top-left corner. |
| Small label | "2045", top left, about 22px, light, inset 5.6% from the left edge. |
| Headline | "2045 Annual / Marketing Report.": two lines, **bottom left**, very large (cap height about 95px, so about 8% of the width), **light weight**, tight leading (about 1.04), white, same 5.6% inset. |
| Rule | One hairline, white at about 80%, at **87% of the height**, spanning the full width inside 5.6% margins. |
| Bottom row | Three small items on one line below the rule: left-aligned ("Warner & Spencer"), centred ("Performance, Insights, & Future Outlook") and right-aligned (a website address). |
| Character | Calm, confident, editorial. Huge but light type over atmospheric light, a single precise rule, and a disciplined three-part base line. Lots of empty dark space. |

## Direction change (superseded design)
The first implementation followed the mapping below: a near-full-screen closing scene with fluted light, a huge "See you tonight.", full navigation, booking buttons and the opening hours. After review, the client asked for a **short, minimal footer** instead. The final footer (see `PREMIUM-FOOTER-REDESIGN-REPORT.md`) keeps only the reference's quietest ideas:
- one hairline divider above a slim base row;
- dark space with a single restrained glow;
- small, well-spaced labels.

The striped light, the oversized statement, the repeated navigation, the CTAs and the hours were removed. The table below is kept as the record of that first iteration.

## Mapping to the Jimmy O's footer (first iteration, superseded)
| Reference | Jimmy O's footer | Why |
|---|---|---|
| 9-flute fluted-glass light field, warm glow peaking right of centre | **Fluted light in the site's own colours:** violet `--accent`/`--button`/`--purple` with an indigo second glow, peaking right of centre and fading to near-black at the top and left. 9 flutes on desktop, 7 on tablet, 5 on phones. CSS only, server-rendered. | The homepage opens with a fluted-glass light hero, so the site now begins and ends in the same light. |
| Small top-left label | The **Jimmy O's logo** (unchanged artwork) with the existing tagline "Coastal California by day. Electric nightlife after dark." | Brand presence in the reference's quiet corner |
| Huge light headline, bottom left | **"See you tonight."**, the existing footer wordmark, set as the reference's two-line headline in Syne (weight tuned in the browser), bottom left, with the CTAs "Book a Table" (`/reservations`) and "Plan a Private Party" (`/private-parties`) | The headline is real existing copy, and it is the natural last line of a night out |
| Hairline rule at 87% height | An animated hairline rule | The reference's single precise line |
| Three-part base row | **Find us** (address and directions), **Get in touch** (phone and email) and **Hours**, using the verified venue data from `packages/shared` | Real information in the reference's left / centre / right rhythm |
| (none) | Navigation (all 12 existing links), Privacy Policy, Back to top and the copyright, in a quiet band | The links a footer needs |

## Motion (first iteration, superseded; the reference is static)
| Moment | Behaviour | Mode |
|---|---|---|
| Approach | Each flute's light rises into place from below as the footer arrives, the flutes slightly out of step, and the refraction slides so the light seems to shift behind the glass. | Scroll-scrubbed, so it reverses exactly and ends when the page reaches its end |
| Statement | "See you tonight." rises word by word through masks. The eyebrow and CTAs follow. | Once, when it comes into view |
| Rule | Draws from left to right. The base row and navigation wipe on after it. | Once |
| Brand | The logo and tagline settle last. | Once |
| Pointer (desktop) | The glow drifts gently toward the pointer, at low intensity. | Continuous, follows the pointer only |
| Hover and focus | Links get an underline sweep, arrows nudge, and the CTAs use the existing button sweep. | CSS |

Every revealed element is visible without JavaScript and with reduced motion. Keyboard focus finishes any pending reveal at once.
