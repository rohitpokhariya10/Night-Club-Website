# Delta Cafés — Observed Motion Reference

Inspected November 14, 2026 at https://deltacafes.com/en.

## How it was inspected (and what was not available)

- **Computer Use and Claude-in-Chrome were not available in this session.** As the brief allows, inspection used Playwright driving a **headed Chromium window** (v1.65, Chromium 1254) with **real mouse-wheel input**, so the site's smooth-scroll library responded as it would to a visitor.
- Captured: a 1440×900 desktop video, 44 slow-scroll frames (≈240 px apart), a per-frame computed-style log of every transformed, clipped or translucent element in view, timed bursts after each section entered (0–1350 ms), reverse-scroll frames, fast-flick frames, hover frames, a route-change attempt, and a 390×844 touch-device pass with video.
- Evidence lives in `artifacts/delta-reference/`: `video/`, `video-mobile/`, `desktop/`, `bursts/`, `reverse/`, `fast/`, `interact/`, `route2/`, `mobile/`, plus `desktop-scroll-log.json`, `bursts/hero-trace.json`, `recon.json` and the `sheet-*.png` contact sheets. Capture scripts are in `scripts/motion/`.
- The cookie dialog was dismissed with "reject all". Delta's code, text, images and brand assets were not copied; only motion behavior was measured.

## Platform facts (measured)

| Item | Observation |
|---|---|
| Framework | Nuxt (`/_nuxt/*.js` bundles). GSAP is bundled privately (no `window.gsap`), so ScrollTrigger configs could not be read directly. Motion was measured from computed styles instead. |
| Smooth scroll | **Lenis** (`html.lenis`). Scrolling settles in ≈450–500 ms after a wheel step (e.g. 425 → 604 → 632 → 638 → 640 px at 0/150/300/450/600 ms), consistent with Lenis's default `lerp ≈ 0.1`. Touch devices scroll natively. *Correction:* each synthetic 120 px wheel tick moved ≈240 px, but this is a capture artifact. Headed Chromium on this Retina (DPR 2) display delivers Playwright's `wheel(0,120)` as `deltaY: 240` (verified: headless delivers 120). So there is **no evidence of a non-default wheel multiplier** on the reference. |
| Pinning | **No GSAP pins.** Every `<section>` moved by exactly the scroll delta at every step. The only sticky element is `.pre-footer`, which is CSS `position: sticky`. |
| Time vs. scroll | Frames at 600 ms and 1350 ms after a scroll stop were identical in every section. **Homepage motion is overwhelmingly scroll-linked.** Time-based motion appears only in the preloader, hover states and a hero slide fade. |
| Canvas | 5 canvases. All are Rive vector animations (icons, one illustrated band, an Azores background). Photos are ordinary DOM images, not WebGL. |

## Sequence-by-sequence observations

| # | Where | Start state | Scroll interaction | Image movement | Text movement | Technique (as measured) | Timing | End state |
|---|---|---|---|---|---|---|---|---|
| 1 | Preloader | Brown screen | none (time-based) | – | Logo fades in, then "The house · logo · of coffee" words spread apart | Time-based intro | ≈3.5 s before the hero | Hero video revealed |
| 2 | Hero (video) | Full-bleed video, large light-weight headline bottom-left, side cards, numbered thumbnail row | Native scroll until ≈65% of the hero has passed | Video moved ≈10 px more than the scroll (slight parallax) | Hero slide translated up (−10 → −40 px) while fading 0.74 → 0.004 over ≈60 px of scroll | Late, scroll-linked slide exit | Starts ≈600 px into a 855 px hero | Slide gone, video scrolled away |
| 3 | "Since 1961" | Centered condensed heading on dark brown, tilted vintage photos scattered around it | Native | Photos keep fixed scatter transforms (±0.3–2.8° rotation, large translate) with only ±6 px drift | Static | Scattered tilted collage. **Hover:** photo lifts and straightens, and a dark caption pill appears | – | – |
| 4 | "Journey" | Full-bleed photo with a centered heading | Native | No measurable transforms | Static; labels and copy placed over the image | Plain full-bleed scene; the impact comes from scale and composition | – | – |
| 5 | "D de Delta" | Two horizontal rows of portrait photos, each 5,178 px wide, with a heading between them | Scroll-linked, no pin | Row A x −78 → −270 px while Row B x −2308 → −2082 px over ≈960 px of scroll (**opposite directions, ≈0.2 px per scrolled px**) | Static | Counter-moving horizontal tracks | Continuous while in view | Rows offset; reverses exactly when scrolling back |
| 6 | Brown → cream | Hard section edge | Native | – | – | Background change is a hard edge, not a color tween | – | – |
| 7 | "Culture" | Cream, two-column editorial items | Native | No transforms | Static | Layout only | – | – |
| 8 | Quiz | Product bags scattered around a centered heading | Scroll-linked through a tall (1935 px) section | Background panel scale 0.82 → 0.92 and opacity 0.29 → 1 as it enters. Each bag grows (≈154 → 315 px), spreads outward from the center and rotates, so the camera seems to fly through them. Varied opacity reads as depth. | Heading scrolls natively | Depth fly-through (scale, outward translate, rotation) | Over ≈1,700 px of scroll | Bags have left past the edges |
| 9 | Journal | Horizontal row of cards | Native | – | – | Layout only | – | – |
| 10 | "Positive impact" | Dark green, large heading, B&W photos at the edges | Native (photo tops moved exactly with scroll) | – | – | Layout only | – | – |
| 11 | Azores (sticky pre-footer) | Full-bleed media below the impact section | Scroll-linked as it enters | `background-container` scale **1.10 → 1.00** and y **−180 → 0 px** | Heading stays centered | Media "settle": scale-down plus counter-translate | Over ≈1 viewport | Media at rest, filling the viewport |
| 12 | Footer handoff | Azores scene stuck in place | Scroll-linked | Sticky scene shrinks **1 → 0.94** (recedes) | Footer panel rises **y +56 → 0** and **scale 1.028 → 1** over the receding scene; under-footer at 0.3 opacity | **Recede and cover** | Final ≈400 px | Footer panel resting over a smaller scene |
| 13 | Buttons | Pill button with an arrow disc | Hover (time-based) | – | Pill fills from left to right and the arrow disc slides into the pill | Hover sweep | ≈300 ms | Filled |
| 14 | Header | Pill navigation, logo centered | – | – | – | Nav pill changes tone to match the section beneath it | – | – |
| 15 | Route change | Click "History of Delta" | – | – | – | URL changed within ≈320 ms (client routing) while the old page stayed on screen. The renderer then returned no screenshot for >5 s. | – | **Unverified:** the visual route transition could not be captured |
| 16 | Mobile (390 px) | Same order in one column | Touch scrolls natively; Lenis is still present | Same counter tracks and quiz bags, scaled down | Static | Same techniques, smaller | – | – |

**Reverse scrolling:** every scroll-linked effect (rows 5, 8, 11, 12) returns exactly to earlier states. Nothing replays as a fresh time-based entrance.
**Fast scrolling:** Lenis absorbs a 1,800 px flick and settles within ≈1.3 s. No section was observed stuck or blank after settling.

## What was *not* observed (so it will not be invented)

- No scroll-pinned storytelling scenes (no `pin` / `pin-spacer`).
- No clip-path image masks on the homepage. Every measured image motion was a transform (scale or translate).
- No split-text heading reveals were measured on the homepage. Headings moved with native scroll. (Jimmy O's masked heading reveals are a Jimmy-specific typography upgrade the brief requested, not a Delta copy.)
- No scroll-driven background color tween.

## Mapping to Jimmy O's

Delta's movement mostly comes from a **few scroll-linked transforms on large media plus weighted smooth scrolling**. The mapping keeps Jimmy O's layout, fonts, colors and photos, and re-uses those measured techniques at the brief's six handoffs.

| Delta behavior (measured) | Jimmy O's equivalent | Technique |
|---|---|---|
| Lenis smoothing, ≈450 ms settle, native touch | Site-wide smooth wheel scrolling. Native touch, keyboard and anchors stay intact. Disabled for reduced motion. | Lenis 1.3.27 (`lerp 0.1`, `wheelMultiplier 1`) driven by the GSAP ticker; `ScrollTrigger.update` on every Lenis scroll. Wheel distance equals native distance. |
| #12 Recede and cover (scene scales to 0.94 while the next panel rises over it) | **Sequence A — Hero → "More than a night out."** The video hero stays in place and recedes (scale → 0.92, darkening veil) while the rest of the page slides up over it like a panel. | ScrollTrigger pin with `pinSpacing:false` (adds no scroll length). Scrubbed scale and veil. The cover is a full-bleed panel with an opaque background. Desktop and tablet only; mobile scrolls natively. |
| #2 Late hero slide exit (translate up and fade) | Hero copy and footer line lift away as the cover arrives | Scrubbed `y` and opacity on the hero composition wrapper (entrance targets stay separate) |
| #11 Media settle (scale 1.10 → 1, y −180 → 0) | **Sequence D — Specials full-bleed photo.** Also used inside the venue, nightlife, food and celebration frames. | Scrubbed scale plus counter-`yPercent` on the inner image while the section enters |
| #8 Background panel scale 0.82 → 0.92 with fade | **Sequence B — Venue lounge photo** frame opens from 0.84 to 1 while its image settles | Scrubbed frame scale with inverse inner-image scale (transforms only) |
| #5 Counter-moving horizontal tracks (≈0.2 px/px) | Ghost script "Good company" and "Wish you were here" drift horizontally against the vertical scroll. The experience strip items drift the opposite way. Food and drink cards counter-move vertically. | Scrubbed `x`/`y` with linear ease, proportional to scroll |
| #8 Depth fly-through (objects grow and spread from the center) | **Sequence E — Gallery collage assembles in reverse**: photos start pulled toward the collage's center, smaller and dimmer, then settle into the existing grid. The center photo leads. | Scrubbed per-tile translate toward the center plus scale and opacity on the existing `.collage-reveal` layer. The existing depth layer, hover and lightbox are untouched. |
| #12 Footer panel rise (y +56 → 0, scale 1.028 → 1) | **Sequence F — "See you tonight." footer wordmark** settles as the footer arrives. Visit/contact gets no heavy motion, so it is immediately usable. | Scrubbed `y`/`scale` on the wordmark |
| #13 Button hover sweep | Existing buttons fill left → right in their existing hover colors, and the arrow nudges | CSS only (`::before` `scaleX`) |
| #3 Collage hover (lift and caption) | Already present in the Jimmy O's gallery (caption plus image scale) | Kept unchanged |
| #15 Route transition | Not verifiable on Delta. Jimmy O's keeps a short, non-blocking page-intro entrance (masked title, intro photo settle). | Time-based, ≤1.2 s, no loading screen |
| #1 Preloader | **Deliberately not reproduced.** A 3.5 s preloader would delay LCP, and the brief rules out long loading screens. The hero keeps its short staggered entrance. | – |
| Tilted scatter collage (#3) | **Not applied.** It would change the existing gallery composition, which the brief says to preserve. | – |
