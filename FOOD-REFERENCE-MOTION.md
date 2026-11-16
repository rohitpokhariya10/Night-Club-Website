# Food & Drinks Reference: Motion Breakdown

**Reference:** https://eatnaked.co/, inspected November 15, 2026 in Playwright-driven Chromium at 1440×900 and 390×844. It is studied for motion only; no code, text, images or branded assets were copied.

## Method
- **Preloader:** the site opens with a percentage preloader, 11–45 s in headless Chromium. Every script waits for `.loader` to become hidden.
- `scripts/motion/eatnaked-recon.mjs`:
  - section structure (`structure.json`, `*-state-*.json`);
  - screenshots of the scroll entrances, rest states and interactions;
  - session videos (`eatnaked-1440.webm`, `eatnaked-390.webm`);
  - all in `artifacts/food-reference/{desktop,mobile}/`.
- `scripts/motion/eatnaked-sample.mjs`: a `requestAnimationFrame` sampler running inside the page, recording every frame's geometry, transform and opacity after a carousel drag (about 90 frames) and after each showcase click (157 frames). Output: `artifacts/food-reference/samples/*.json`.
- `scripts/motion/eatnaked-ancestors.mjs`: which ancestor elements actually animate during a showcase change (`samples/showcase-ancestors.json`).
- Screenshots taken every ~150–280 ms were **too slow** for these transitions; all timing below comes from the per-frame samples.

## Reference A: "Designed for Your Taste, Built for Your Day." (`.design`)
| Aspect | Observed |
|---|---|
| Composition | Three lifestyle cards in a row. The **centre card is 642×366** (about 45% of 1440); the **side cards are 514×293, i.e. 0.80×**, partly behind it. Each card carries its own category (h3), a short line (h4, 50% opacity) and a "View Meals" link. The section headline sits **below** the cards. |
| How it changes | **By dragging only.** No autoplay was seen over 9.7 s. Clicking a side card does nothing, and there are no arrows, tabs or keyboard control. |
| Transition (drag next) | On release, the incoming card travels to the centre and grows from 0.8× to 1×, and the outgoing card shrinks back to 0.8× at the side. The centre card's x went 617 → 492 (70 ms) → 419 (153 ms) → **385 (287 ms, 14 px past its rest position)** → 394 (437 ms) → **399 at rest (≈ 520–620 ms)**. Its width overshoots the same way (646 against 642). That is a back-out ease of about **0.6 s** with roughly 6% overshoot. |
| Opacity and filter | Image and text opacity stay at 1. Side cards read as dimmer because they are smaller and sit behind the centre card. |
| Entrance | The cards rise in from below as the section scrolls into view, and the card text fades up as it arrives. |
| Mobile (390) | The same carousel, one card wide, with neighbours peeking at the edges. |

## Reference B: "Ingredients that matter" (`.bowl`)
| Aspect | Observed |
|---|---|
| Composition | A small pill eyebrow and a large centred dish name at the top. A **huge top-down dish (812×809 on 1440)** at the bottom centre, cropped by the section's lower edge so it rises like a sun. **Three ingredient chips per side** (dark pills with a small icon) on stepped diagonals: x −60 px per 100 px down. They lie on an arc about 1.45× the dish radius, at about 40°, 51° and 63° from vertical. Faint spokes radiate from the dish's centre through the chips. **Round previous/next buttons** sit low on the left and right spokes. A small vertical dish index runs down the right edge, and a faint grid fills the background. |
| The change (next) | One shared timeline of **about 1.1 s** (`samples/showcase-ancestors.json`). |
| Dish | The **outgoing** image's container rotates **clockwise from −90° to +90°** (180°) while fading 1 → 0. The **incoming** container rotates **from −90° to 0°** while fading 0 → 1. The dish turns like a turntable as one plate gives way to the next. Previous reverses this: the active dish turns to +90° as it fades, and the incoming one comes back from +90° to 0°. |
| Labels | Each side's label group swaps as a unit. The outgoing group fades out drifting **10 px outward** (left group to −10 px, right group to +10 px); the incoming group fades in from 10 px outside. The chips themselves never move along the arc. |
| Title | The outgoing title fades out moving 10 px down; the incoming one fades in from 10 px below. |
| Easing | All parts share one asymmetric ease-in-out: progress 0.002 at 0.10, 0.024 at 0.19, 0.29 at 0.37, **0.72 at 0.46**, 0.86 at 0.55, 0.93 at 0.64 and 0.99 at 0.82 of the duration. It is slow to start, fastest just before the midpoint, then a long settle. |
| Rapid clicks | A second click during a change is ignored until it completes. |
| Keyboard | The buttons are real `<button>`s and work with Enter. |

## Adaptation for Jimmy O's (what we build, and where it differs)
| Reference | Jimmy O's | Note |
|---|---|---|
| A: drag-only carousel of 3 lifestyle cards, side cards at 0.8× | **Food · Drinks · After Dark**, 3 cards with the same 0.8× side scale and the measured back-out move (0.62 s, about 6% overshoot) | Adds the requested arrows, category tabs, arrow keys, click on a side card and touch swipe. The reference only drags. |
| A: text on every card | The centre card's headline enters through a mask and its copy and CTA rise in. The outgoing headline leaves through its mask, and side cards keep only their category label. | The requested text choreography; the reference does not mask its text. |
| A: headline below the cards | Eyebrow and headline **above** the cards | Better hierarchy and reading order. A deliberate difference. |
| B: top-down dish turning ±90/180° with a cross-fade, about 1.1 s, asymmetric ease | The same turntable cross-fade, with the same direction rule (next turns clockwise, previous reverses) and a matched ease. The dish also eases slightly back in depth on the way out. | Our dish photographs are not cut-out top-down bowls. They sit in a soft circular vignette, so the turn reads as a plate turning in the light. |
| B: 3 ingredient chips per side on stepped diagonals, swapping with a 10 px outward drift | Up to **3 verified detail labels per side** at the reference's arc angles, swapping the same way | Labels are phrases from the dish's own verified menu description; none are invented. |
| B: spokes, grid, round prev/next on the lower spokes, vertical dish index | The same structures in Jimmy O's violet on near-black; the index doubles as a direct picker | |
| B: the dish cropped by the section's lower edge | Kept on desktop. On phones, the whole dish with labels as a compact row below | Mobile is recomposed, not shrunk. |
