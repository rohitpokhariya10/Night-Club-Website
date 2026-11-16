# Gallery and Typography Redesign Report

**Date:** November 14, 2026 · **Scope:** the homepage gallery section (rebuilt) and the site-wide type system (Syne + Manrope).
**Reference:** Pinterest pin 145311525471662996. The frame-by-frame breakdown and mapping are in [`GALLERY-REFERENCE-MOTION.md`](GALLERY-REFERENCE-MOTION.md).
**Unchanged:** the API, database, routes, SEO metadata, sitemap, robots, JSON-LD, staging `noindex`, colour tokens, logo, Lenis settings, the hero intro's choreography and the "More than a night out" film section.

## 1. Typography

### What was wrong
The audit before (`artifacts/typography/before/type-audit.json`, 11 routes) found **five font families** competing:
- Kaushan Script on 11 H1s, 32 of 33 H2s, 28 eyebrows and 29 paragraphs;
- Rubik Dirt on 58 H3s and all 88 navigation links;
- Rubik on body copy;
- Syne and Manrope in the new night-out section.

The script lettering made every heading compete with every other heading, and with the photography.

### The system
Two families, both SIL Open Font License, self-hosted through `next/font/local` as Latin-subset variable WOFF2 files:

| Role | Family | Use |
|---|---|---|
| Display | **Syne** (34.6 KB, weights 400–800) | H1 (700), H2 and H3 (600), the hero headline (700, uppercase), the footer wordmark |
| Text | **Manrope** (24.4 KB, weights 200–800) | Body (400), eyebrows, navigation, buttons, captions, labels (600) |

- **Why this pair:** I compared three options in the browser on the same sections (`artifacts/typography/compare/`): the current fonts, Syne + Manrope, and Space Grotesk + Inter. Syne's wide, slightly eccentric capitals carry a nightlife character without script lettering. It already sets the night-out section, so the site now reads as one voice. Manrope is calm and highly legible at small sizes.
- **Central tokens** (`apps/web/src/styles/tokens.css`):
  - Sizes, all `clamp()` scales:
    - `--fs-hero` clamp(40px, 10.4vw, 104px)
    - `--fs-h1` clamp(40px, 6vw, 84px)
    - `--fs-h2` clamp(30px, 3.7vw, 54px)
    - `--fs-h2-compact` clamp(26px, 2.8vw, 40px)
    - `--fs-h3` clamp(19px, 1.6vw, 23px)
    - eyebrow 12px, body 15px, small 13px
  - Weights: display 700, heading 600, text 400, UI 600.
  - Line heights 1 / 1.08 / 1.25 / 1.75, and tracking from −0.04em (display) to 0.24em (eyebrows).
  - The family tokens are defined on `body`, where next/font defines its variables; on `:root` they resolved to an invalid value.
- **Eyebrows** that used script lettering (`.script`) are now small uppercase Manrope at 0.24em tracking in the readable accent colour. Headings use `text-wrap: balance`.
- **The logo is untouched** (it is an image).
- **No layout shift from font loading:** next/font generates size-adjusted fallbacks ("syne Fallback", "manrope Fallback"), both fonts are preloaded with `font-display: swap`, and Lighthouse measures CLS 0 on mobile and desktop.
- **Retired:** Rubik, Kaushan Script and Rubik Dirt are no longer loaded (the files remain in `public/fonts`). Font transfer on the homepage fell from **419 KB to 58 KB**.
- **Please confirm with the client:** `ASSETS.md` records these three as the **client-supplied brand fonts**. Replacing them follows the brief (at most two families, no script lettering), but it changes the brand's typography, so the client should sign it off. Re-enabling any of them is a `layout.tsx` and token change; no files were deleted.

### After
The audit after, on the production build (`artifacts/typography/after/type-audit.json`, same 11 routes), finds **exactly two families**:

| Element | Before | After |
|---|---|---|
| H1 | Kaushan Script 400 | **Syne 700** ×11 |
| H2 | Kaushan Script 400 (Syne 700 ×1) | **Syne 600** ×32; Syne 700 ×1 (the night-out headline) |
| H3 | Kaushan Script 400, Rubik Dirt 400 | **Syne 600** ×62 |
| Former script eyebrows (`.script`) | Kaushan Script 400 | **Manrope 600** ×27, uppercase, tracked |
| Navigation | Rubik Dirt 400 ×88 | **Manrope 600** ×88 |
| Body, buttons, footer | Rubik 400/500 | **Manrope** 400/500/600 (one 700); footer wordmark Syne 700 |

The one Syne 800 paragraph is the night-out section's decorative outlined "Good company" texture (`aria-hidden`), which was left as it was.

Visual checks:
- `artifacts/typography/after-v1/sheet-pages.png` (all pages)
- `artifacts/typography/after-sections/home-sheet.png` (homepage sections)
- before: `artifacts/typography/before/sheet-pages.png`

## 2. Homepage gallery

### Before
The section had three competing display lines:
- a giant decorative script "Wish you were here" (11vw, about 160px on a laptop), clipped at the screen edge on phones;
- a script eyebrow "A little look inside";
- a script headline "The nights we live for."

Under them sat a four-photo grid that assembled from its centre. The photographs read as secondary.
Before captures (the previous production build): `artifacts/gallery-redesign/before/` (stills at seven scroll positions plus scroll recordings at three widths).

### After: a ring of photographs around the title
- **Content:** eight approved Jimmy O's photographs with their existing captions:
  - the four from the previous section;
  - four already used on `/gallery`: good company, cocktails, the lounge, the celebration.

  No new or stock imagery was added.
- **Card shapes:** mixed, as in the reference. The two 16:9 photographs are landscape cards. The slots that orbit past the title's top and bottom are landscape or square, and portrait cards orbit the sides, which keeps the centre clear.
- **Editorial title:** the eyebrow "A LITTLE LOOK INSIDE" (Manrope 600, accent, short rules either side) and the heading "THE NIGHTS WE LIVE FOR." (Syne 600, `--fs-h2-compact`, uppercase via CSS, so the text itself is unchanged). There's no decorative ghost text and no competing headline; the media is the star.
- **Desktop and tablet:** the title sits in the ring's empty centre, and "Enter the Gallery" sits just below the ring.
- **Phones:** the title sits above the ring, and the call to action becomes a round button in the ring's centre.
- **Sizing is measured, not guessed.** `scripts/motion/gallery-clearance.mjs` places the cards exactly as the motion does at every 1.5° of the orbit, with and without the breathing peak, at 360–1920 px. It confirms:
  - no card ever overlaps the eyebrow, heading or CTA (the round phone button is measured as a circle);
  - no horizontal overflow;
  - on desktop and tablet, the settled ring fits below the fixed header at common laptop sizes (1280×720 to 1920×1080).

  Card size follows both width and viewport height.

Final check on the production build (`artifacts/gallery-redesign/clearance.txt`). "Fits" means the settled ring, at rest, fits below the 108 px fixed header:

| Viewport | Overlap with title | Smallest gap | Ring fits below header | …with the CTA too |
|---|---|---|---|---|
| 360, 390 (phone layout) | none | 14 px, 20 px | (title above the ring) | (CTA inside) |
| 768×900, 1024×900 | none | 23 px, 20 px | yes | yes |
| 1180×820 | none | 15 px | yes | yes |
| 1280×720, 1280×800, 1366×768 | none | 12 px, 12 px, 8 px | yes | no (one scroll more) |
| 1440×700 | none | 4 px | yes | no |
| 1440×900, 1920×1080 | none | 4 px | yes | yes |

There was no horizontal overflow at any width.

### Choreography (from the reference, adapted)
| Reference (time-based loop) | Jimmy O's (scroll-linked) |
|---|---|
| Swirl burst → settle (3.4–5.0 s) | **Entrance, scrubbed by scroll.** Cards start enlarged (1.6–1.9×), tilted (±22–38°), pushed outward and dimmed, and settle into the ring while it turns 40° counter-clockwise. It reverses exactly when scrolling back. Cards are dimmed at most to about 40% brightness and never hidden. |
| Steady counter-clockwise orbit, cards upright | **Orbit:** a further 40° counter-clockwise as the section scrolls past. Each card's slot is recomputed (`--cx`/`--cy`) and the cards stay upright. |
| Breathing zoom | The ring breathes 1 → 1.06 → 1 across the orbit. |
| Ripple wave (counter-clockwise tilt-and-pop) | Plays **once each time the ring settles**, and when the pointer enters the ring, starting from the nearest card. 0.1 s between neighbours, about 1.7 s in total. Each card dims, then tilts (±12–18°), grows 1.1× and rises above its neighbours. |
| Single-card pops | **Hover or keyboard focus** pops one card (±5°, 1.08×, raised above its neighbours) and shows its caption. |

- **Accessibility:**
  - Nothing moves on its own except the sub-2-second ripple, so no pause control is needed (WCAG 2.2.2).
  - **Reduced motion** shows the static ring, with no ripple and no hover tilt.
  - **Without JavaScript**, the server-rendered ring is complete (each card's slot is in the HTML).
  - Each card remains a `<button>` that opens the existing fullscreen viewer: arrow keys, swipe, a focus trap, and focus returns to the card. Focus order follows the ring.
- **Engineering notes:**
  - Each motion layer has a single owner, so nothing fights:
    - `.lens-card`: orbit and breathing, through CSS variables;
    - `.lens-card-inner`: burst and settle (GSAP);
    - `.lens-card-pop`: the ripple (GSAP);
    - `.lens-face`: hover and focus (CSS).
  - The scene is built at browser idle time, as the previous gallery was, and marks itself `data-motion="ready"`.
  - Two issues were found and fixed while testing:
    1. Reverting the scene (switching to reduced motion) rewound the spin tween, which moved the cards again. Slot writes now stop once the scene is gone.
    2. A GSAP `y` reveal on the CTA took over its CSS `translate`, which carried the phone layout's centring into desktop. The CTA now fades in only.

### Comparison with the reference
`artifacts/gallery-redesign/reference-vs-jimmy-os.png` sets reference frames against the site at 1440×900, captured on the production build with `scripts/motion/gallery-states.mjs`:
- burst (3.8 s);
- settling (4.4 s);
- ring (5.0 s);
- mid-ripple (7.04 s);
- orbit (12 s).

The same states on a phone are in `states-mobile.png`, and the ripple and hover close-ups in `states-desktop-hover.png`.

## 3. Verification
| Check | Result |
|---|---|
| `npm run lint` | passed |
| `npm run typecheck` (web and API) | passed |
| `npm run build` (production) | passed, build `HG7yz6W22vDiGBrUWOFuu` |
| `npm test` (API) | **12 passed**, 0 failed |
| Playwright, dev server (`artifacts/gallery-redesign/e2e-dev.log`) | **65 passed**, 0 failed: cinematic-motion 12, hero-gallery 13, hero-intro 6, home-gallery 11, night-out 6, site 17 |
| Playwright, production build on :3100 (`e2e-production.log`) | **60 passed, 5 failed.** The 5 are the real form-submission tests. The local API accepts only its configured `WEB_ORIGIN` (`http://localhost:3000`, `apps/api/src/app.ts`), so it correctly answers "Origin not allowed" to the production server on port 3100. The API was not changed. The same 5 tests pass against :3000 in the dev run, and the form code is unchanged in this phase. |

The `site.spec.ts` responsive test covers every page at 360, 390, 768, 1024, 1440 and 1920 px, including horizontal overflow and console errors. The gallery's own checks run at 390, 768, 1024 and 1440 px, and the clearance check at 360–1920 px.

### Test changes (stated explicitly; nothing loosened to make it pass)
- **`home-gallery.spec.ts` was rewritten.** Its assertions compared the section pixel-for-pixel with the baseline of the retired four-photo grid (`artifacts/home-gallery/baseline-layout.json`), so they could not survive an intentional redesign. The new suite keeps every intent of the old one:
  - a complete composition at 390, 768, 1024 and 1440 px, in order, with no overflow and no layout shift;
  - a scrubbed entrance that reverses exactly;
  - fast jumps settle completely;
  - hover changes no frame;
  - reduced motion and breakpoint switches restore the static layout;
  - the viewer's rapid controls, focus trap and cleanup across navigation;
  - no-JS;
  - touch tap and swipe.

  It also adds checks for the ring's own rules:
  - the title is clear of every card;
  - the orbit runs counter-clockwise;
  - the ripple fires on pointer entry and ends at rest;
  - keyboard order and focus pop;
  - photos are never cropped by the viewport edge.

  Viewer counts are now "/ 8". The old baseline file is kept for the record.
- **`site.spec.ts`:** the body-font assertion changed from `rubik` to `manrope`, because the body font changed on purpose.
- **`cinematic-motion.spec.ts`:** the reduced-motion layer list now names the gallery's new layers (`.lens-card-inner`, `.lens-card-pop`) instead of the removed `.collage-reveal`.
- One race in the new scrub test was fixed by waiting for animation frames after each jump. ScrollTrigger applies scrubbed state on the next frame, so the earlier reads were sometimes one position behind. That was a test-timing issue, not product behaviour.

### Hero intro
- The intro's choreography, timing and light field are unchanged: the hero-intro tests pass.
- I captured seeked frames at 0, 0.6, 1.1, 1.6, 2.1 and 2.7 s and compared them with the frames captured before this phase (`artifacts/section-video/hero-after/`). The differences, 2.8–10.5% of pixels, fall **only on text**: the headline, eyebrow, navigation, labels and button outlines, whose widths follow the new font metrics. The light field, orb and logo are pixel-identical. The difference maps are in `artifacts/gallery-redesign/hero-intro-diff/`.
- The headline itself is now Syne 700 uppercase instead of the script face; that is the requested typography change, not a choreography change.

### Performance
**Lighthouse 13.6.0, homepage, production build** (lab data, not field data):

| Run | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | Total | Fonts |
|---|---|---|---|---|---|---|---|---|---|---|
| Mobile, before this phase (`docs/lighthouse-night-out-mobile.json`) | 100 | 100 | 100 | 69 | 0.9 s | 0.9 s | 60 ms | 0 | 793 KB | 419 KB |
| **Mobile, runs 1–5** (`docs/lighthouse-gallery-mobile-{1..5}.json`) | 97, 100, 100, 100, 100 | 100 | 100 | 69 | 2.0 s, then 0.9 s | 2.0 s, then 0.9 s | **0 ms** | **0** | **446 KB** | **58 KB** |
| Desktop, before (`docs/lighthouse-night-out-desktop.json`) | 100 | 100 | 100 | 69 | 0.2 s | 0.2 s | 0 ms | 0 | 866 KB | 419 KB |
| **Desktop, after** (`docs/lighthouse-gallery-desktop.json`) | 100 | 100 | 100 | 69 | 0.2 s | 0.2 s | 0 ms | 0 | **508 KB** | **58 KB** |

- The homepage transfer is **44% smaller on mobile** (793 → 446 KB), almost entirely from retiring the script and Rubik fonts. TBT fell from 60 ms to 0 ms.
- Images rose by 12 KB on mobile, from four more photographs at small card sizes. They are lazy-loaded with per-shape `sizes`.
- SEO 69 is the deliberate staging `noindex`/robots block, unchanged.
- **The one regression to note:** mobile run 1, the first after the server started, scored 97 (FCP and LCP 2.0 s). Runs 2–5 scored 100 at 0.9 s. Its network timings were normal (document 6 ms, fonts 3 ms), so it looks like a cold start, but I could not isolate the cause.

**Scroll frame timing** (`scripts/motion/gallery-frames.mjs`): requestAnimationFrame intervals while scrolling steadily through the gallery, 3 runs each, on the production builds before and after:

| | Desktop 1440×900 | Phone 390×844, CPU 4× slower |
|---|---|---|
| Old collage | p95 16.7 ms, max 22.3 ms, 0 frames > 34 ms | p95 16.8 ms, max 16.8 ms, 0 frames > 34 ms |
| New ring | p95 16.7 ms, max 16.8 ms, 0 frames > 34 ms | p95 16.7 ms, max 16.8 ms, 0 frames > 34 ms |

There were no dropped frames and no measurable cost from the orbit, which updates 16 CSS variables per frame.

## 4. Recordings and screenshots
All on the production build, each **verified playable** by decoding in Chromium (`verify-video.mjs`: metadata read, playback advanced 1.5 s, frames grabbed):
- **Final gallery, scrolling through and back with real wheel input** (desktop and tablet) or touch-style steps (phone):
  - `artifacts/gallery-redesign/final/section-scroll-desktop.webm` (1440×900, 19.5 s)
  - `…-tablet.webm` (768×1024, 18.4 s)
  - `…-mobile.webm` (390×844, 27.8 s)

  Frames from the desktop recording: `final/rec-sheet-desktop.png`.
- **Before** (the previous production build): `artifacts/gallery-redesign/before/section-scroll-{desktop,tablet,mobile}.webm`. All three were verified playable.
- **Before/after at matching scroll positions** (entering, section at top, mid-section): `artifacts/gallery-redesign/before-after-{desktop,tablet,mobile}.png`
- **Settled ring and viewer, from the test run:** `artifacts/gallery-redesign/after-{390,768,1024,1440}.png` and `viewer-{390,768,1024,1440}.png`; the burst is in `burst-1440.png`.
- **Choreography states:** `artifacts/gallery-redesign/states/`, plus the comparison sheet above.
- **Typography:** before `artifacts/typography/before/`, after `artifacts/typography/after/` (page screenshots and audit), font comparison `artifacts/typography/compare/`.
- **Hero-intro difference maps:** `artifacts/gallery-redesign/hero-intro-diff/`.

## 5. Files
- **New:**
  - `GALLERY-REFERENCE-MOTION.md` and this report
  - `components/HomeGalleryMotion.tsx` (rewritten)
  - `scripts/motion/` additions:
    - `gallery-probe.mjs`, `gallery-clearance.mjs`, `gallery-states.mjs`, `gallery-frames.mjs`
    - `diff-map.mjs`, `type-audit.mjs`, `type-compare.mjs`, `pinterest-recon.mjs`
  - `docs/lighthouse-gallery-{mobile-1…5,desktop}.json`
- **Modified:**
  - `app/layout.tsx`: Syne and Manrope only, preloaded.
  - `styles/tokens.css`: typography tokens.
  - `app/globals.css`:
    - the font swap and the typography system;
    - the ring styles;
    - retired the collage and ghost-script rules.
  - `components/SiteSections.tsx`: the `HomeGallery` markup.
  - `components/LightboxGallery.tsx`: a `ring` variant with per-shape image `sizes`; the unused `collage` variant was removed.
  - `lib/gallery.ts`: eight homepage photos with shapes, and `ringPoint`.
  - `scripts/motion/section-capture.mjs`: a `SECTION` option.
  - Tests: as listed above.
- **Untouched:**
  - the API, Prisma schema and migrations;
  - SEO metadata, sitemap, robots and JSON-LD;
  - routes, colours, the logo and Lenis;
  - `NightFilm.tsx` and the night-out scene.

## 6. Limitations and remaining differences from the reference
- **Scroll-linked rather than time-based:** a deliberate accessibility and usability choice, explained in `GALLERY-REFERENCE-MOTION.md`.
- **Restrained amplitudes**, so captions and faces stay readable.
- **An elliptical ring** on wide screens, where the reference is a circle in a portrait frame.
- Eight photographs is the reference's count. The venue has more approved photos on `/gallery` if the ring should rotate through a larger set later.
- The first mobile Lighthouse run after a server start scored 97 (FCP and LCP 2.0 s); four further runs scored 100. Its network timings show no cause; it looks like a cold start.
- Frame timing comes from headless Chromium's `requestAnimationFrame` intervals, a useful regression signal but not a substitute for checks on real devices.
- **Client sign-off on typography:** the supplied brand fonts are retired from the site (see section 1).
- **Client media rights and consent** for every photograph remain the launch review item already recorded in `ASSETS.md`.
