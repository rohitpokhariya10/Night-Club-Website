# Jimmy O's Homepage Cinematic Scroll Motion (Delta Cafés Reference): Implementation Report

**Date:** November 14, 2026
**Scope:** homepage scroll choreography, smooth scrolling, typography and interaction motion. Design, fonts, colors, content, photography, hero video, backend, database and SEO configuration are unchanged.
**Status:** implemented and verified. Production build, lint and typecheck pass, with 52/52 browser tests and 12/12 API tests. Lighthouse mobile scored 100/100/100/69 (SEO is held at 69 by the deliberate staging `noindex`). Repeated navigation leaves DOM nodes and listeners flat, and both final recordings were decoded and played back.

The measured reference analysis is in **[DELTA-MOTION-REFERENCE.md](DELTA-MOTION-REFERENCE.md)**.

> **Later update (same day): see [PINTEREST-HERO-IMPLEMENTATION.md](PINTEREST-HERO-IMPLEMENTATION.md).** The hero background video was replaced by an animated light hero, so the mentions of the hero video and `HeroMedia` below describe the earlier state. Sequence A's ScrollTrigger **pin** was replaced by a visually identical **CSS `position: sticky` hold**, because the pin dropped keyboard focus from elements inside the hero whenever ScrollTrigger refreshed. The browser suite is now 58 tests. The journey recordings in `artifacts/jimmy-after/demo/` were re-recorded with the new hero; recordings of the earlier video hero remain in `demo/headed-earlier-build/`. This report covers what was built and how it was verified.

---

## 1. Reference inspection (Delta Cafés)

### How it was inspected

- **Computer Use and Claude-in-Chrome were not available in this session.** As the brief allows, the reference was driven with Playwright 1.65 in a **headed Chromium window**, using real mouse-wheel input so its smooth scrolling (Lenis) behaved as it would for a visitor.
- Captures: desktop video at 1440×900, 44 slow-scroll frames with a computed-style log of every transformed, clipped or translucent element per frame, timed bursts (0–1350 ms) after each section entered, reverse-scroll and fast-flick frames, hover frames, a route-change attempt, and a 390×844 touch pass with video. Delta's code, copy, images and branding were not copied.

### What was measured

| Finding | Evidence |
|---|---|
| Nuxt app; GSAP bundled privately; **Lenis** smooth scroll that settles in ≈450–500 ms; touch scrolls natively | `recon.json`, wheel-step timing |
| **No GSAP pins.** Every section moved exactly with the scroll. The only sticky element is the CSS `position: sticky` pre-footer. | `desktop-scroll-log.json` |
| Motion is overwhelmingly **scroll-linked**. Frames 600 ms and 1350 ms after the scroll stopped were identical in every section. | `bursts/` |
| **Recede and cover:** the sticky scene scales 1 → 0.94 while the footer panel rises over it (y +56 → 0, scale 1.028 → 1) | scroll log frames 41–43 |
| **Media settle:** full-bleed media scale 1.10 → 1.00 and y −180 → 0 px as it enters | scroll log frames 36–40 |
| **Counter-moving tracks:** two 5,178 px portrait rows travel in opposite directions at ≈0.2 px per scrolled px | scroll log frames 12–19 |
| **Depth fly-through:** background panel scale 0.82 → 0.92 with fade, while product bags grow, spread from the center and rotate | scroll log frames 22–31 |
| **Late hero exit:** the hero slide lifts (−10 → −40 px) and fades over ≈60 px of scroll | `bursts/hero-trace.json` |
| Collage hover lift with a caption pill; button pill-fill sweep | `interact/` |
| Canvases are Rive vector animations; photos are plain DOM | `recon.json` |

**Correction recorded during the work:** each 120 px synthetic wheel tick moved ≈240 px. This turned out to be a capture artifact, not a Delta setting. Headed Chromium on this Retina (DPR 2) display delivers Playwright's `wheel(0,120)` as `deltaY: 240`, while headless delivers 120 (verified).

### Reproduced vs. not reproduced

| Delta behavior | Result on Jimmy O's |
|---|---|
| Recede and cover | **Reproduced** at the hero → "More than a night out" handoff (Sequence A) |
| Late hero slide exit | **Reproduced** (Sequence A) |
| Media settle (scale 1.1 → 1 with counter-translate) | **Reproduced** on the Specials full-bleed photo, and inside the venue, nightlife, food, event and celebration frames |
| Counter-moving tracks | **Adapted:** the ghost script lines "Good company" and "Wish you were here" drift horizontally against the scroll, the experience strip drifts the opposite way, and the food and drink cards counter-move vertically. Jimmy O's has no 5,000 px photo rows, and adding them would be a redesign. |
| Depth fly-through | **Adapted, played in reverse:** the homepage collage assembles from its own center as you scroll, ending in the existing, unchanged composition |
| Footer panel settle | **Reproduced** on the "See you tonight." footer wordmark |
| Button hover sweep | **Reproduced** in Jimmy O's own hover colors |
| Weighted smooth wheel scrolling | **Reproduced** with Lenis (`lerp 0.1`, native wheel distance, native touch) |
| 3.5 s preloader | **Deliberately not reproduced.** It would delay LCP, and the brief rules out long loading screens. |
| Tilted scattered collage | **Not applied.** It would change the existing gallery composition, which the brief says to preserve. |
| Route transition | **Unverified on Delta.** The URL changed within ≈320 ms, but the renderer returned no screenshot for >5 s. Jimmy O's keeps a short, non-blocking route intro instead. |
| Split-text heading reveals | **Not observed on Delta.** Jimmy O's masked line reveals are a Jimmy-specific typography upgrade the brief requested, not a Delta copy. |

---

## 2. What changed on the homepage

Each sequence is scroll-scrubbed (progress = scroll position) unless marked time-based. Fast jumps and reverse scrolling therefore always land in a correct, visible state.

| Seq. | Handoff | What the visitor sees | Desktop (≥1025 px) | Tablet (701–1024 px) | Mobile (≤700 px) |
|---|---|---|---|---|---|
| **A** | Hero → "More than a night out" | The video hero holds still and recedes (scale → 0.92, darkening veil) while the rest of the page rises over it as a full-bleed panel. The headline block lifts away and fades as the panel arrives. On load, the existing staggered entrance plays (time-based). | Pin with `pinSpacing:false` (no extra scroll length) | Same as desktop | No pin. Native scroll with the measured late copy exit and a slight media lag. |
| **B** | Venue → nightlife | The lounge photo's frame opens (0.80 → 1) while the image inside settles (1.30 → 1). "Good company" drifts horizontally against the scroll and the experience strip drifts the other way. Then the purple layer emerges from beneath the nightlife photo while that photo moves at its own depth and "Stay a little longer." slides in. | Full | Full | Shorter travel; no strip drift or photo depth |
| **C** | Nightlife → food & drinks | The burger and cocktail cards counter-move (+60 → −60 px and −50 → +50 px), each image settles (1.20 → 1), and each caption panel slides up over its photo. Links are always clickable. | Full | Full | Image and caption settle only (single column) |
| **D** | Food → specials → events | The Specials photo settles exactly like Delta's full-bleed media (scale 1.12 → 1, y −5% → 0). Event cards rise at staggered rates and arrive together; their images settle. Dates, links and data are unchanged. | Full | Full | Each card rises on its own trigger |
| **E** | Events → celebrations → gallery | The celebration photo is unmasked from its center (`clip-path` 22%/9% inset → 0) as the image settles. The collage then **assembles**: photos start pulled toward the collage center, smaller (0.80) and dimmer (0.35), and settle into the original grid. The center photo leads, the sides follow, and the CTA rises with the final photo. "Wish you were here" drifts. | Full, plus the existing depth layers | Full | Lighter pull (0.28), scale 0.90 |
| **F** | Gallery → visit/contact | Motion settles. Review quotes and the visit headline use masked line reveals (time-based), and hours, phone, email and booking actions appear without animation, so they are usable immediately. The "See you tonight." wordmark rises and settles as the footer arrives. | Full | Full | Full |

**Typography:** headings use masked line reveals. Each line rises out of a clip window (`clip-path` with negative insets, so Kaushan Script swashes are never cut off), runs once per trigger with `expo.out` for 1.05 s and a 0.085 s stagger, and is restored to its original markup when finished. The text stays in semantic HTML at all times.
**Navigation:** the mobile menu links stagger in on open (0.55 s). Desktop nav underline behavior is unchanged. Internal pages get a short route intro: the intro photo settles (1.12 → 1) and the title rises out of its mask.
**Buttons:** the existing hover color sweeps in left → right and the arrow nudges toward its target. Final colors are identical to before.
**Smooth scroll:** Lenis 1.3.27 (`lerp 0.1`, `wheelMultiplier 1`, `syncTouch false`), driven by the GSAP ticker and calling `ScrollTrigger.update` on every Lenis scroll. Keyboard scrolling, touch, scrollbar drag, back/forward, dialogs and the skip link stay native. In-page anchors scroll smoothly, honor `scroll-padding-top`, update the URL hash and move focus like a native jump. Lenis is disabled under reduced motion.

---

## 3. Implementation

### Motion architecture

```
apps/web/src/lib/motion/
  config.ts       media queries (desktop / tablet / mobile / motion), Lenis settings, eases, anchor offset
  scroll.ts       single Lenis instance on the GSAP ticker; start/stop/halt helpers
  primitives.ts   lineReveal, titleReveal (masked typography), mediaOf (inner image layer),
                  revealOnFocus (finish pending reveals on keyboard focus), whenIdle
apps/web/src/components/motion/
  SmoothScroll.tsx  mounted once in the root layout: Lenis lifecycle, anchors, route-change momentum halt
  HomeMotion.tsx    homepage sequences A–D and F
apps/web/src/components/HomeGalleryMotion.tsx   sequence E (collage assembly)
apps/web/src/components/Motion.tsx              all routes: page intro, internal-page reveals, footer settle
```

- Every scene runs inside **`gsap.matchMedia()`** with `motion` / `mobile` / `desktop` conditions. It is fully reverted on unmount, breakpoint change or a reduced-motion preference change, and SplitText instances revert with it. React Strict Mode double-invocation and hot reload are safe for the same reason.
- Homepage scenes run in **`useLayoutEffect`**, so they revert before React removes the DOM.
- The **hero scene starts immediately**. Every below-the-fold scene, including the gallery, is built at the next **idle moment** (`requestIdleCallback`, with a `setTimeout` fallback), inside the same context so cleanup is unchanged. This keeps SplitText measurement and ~40 trigger creations out of the load critical path (see §6).
- **Content never depends on motion.** Sections are server-rendered and fully visible without JavaScript and under reduced motion, as tested. Scrubbed scenes derive state from scroll position, so nothing can be left hidden after a fast jump. Time-based reveals finish immediately when a keyboard user focuses inside them, and focusing back into the covered hero scrolls it into view.
- **No transform conflicts:** each GSAP target is a dedicated layer: `.cinema-media`, `.photo-media`, `.collage-reveal`, `.collage-depth`, `.collage-parallax`, `.ghost-drift`. Hover lifts on event tiles and buttons moved from `transform` to the independent CSS `translate` property, so they compose with scroll transforms instead of being cancelled by them.
- Once the next panel fully covers the hero, the scene dispatches a `hero:cover` event. **`HeroMedia` remains the single owner of playback** and pauses the video while it's covered.

### ScrollTrigger configuration

| Scene | Trigger | Start → end | Mode | Animated |
|---|---|---|---|---|
| A `hero-recede` (≥701 px) | `.cinema-hero` | top top → bottom top | **pin**, `pinSpacing:false`, scrub | media scale 1→0.92; veil opacity 0→0.62; copy yPercent →−22 and fade over the first 45%; footer line fade |
| A `hero-exit` (≤700 px) | `.cinema-hero` | top top → bottom top | scrub | media yPercent 0→16; veil →0.45; copy exit from 20% to 75% |
| B `venue-open` | `.about-stage` | top bottom → center center | scrub | frame scale 0.80→1 (mobile 0.90); image 1.30→1, yPercent −6→0 |
| B ghost drift | `.about-stage` | top bottom → bottom top | scrub | `.ghost-drift` xPercent 9→−9 (mobile 4→−4) |
| B strip drift (≥701 px) | `.experience-strip` | top bottom → bottom top | scrub | items x 48→−48 |
| B `nightlife-layers` | `.stacked-photo` | top bottom → center 45% | scrub | `--back` 0→1 (purple layer emerges); image 1.22→1; tag xPercent 18→0 |
| B nightlife depth (≥701 px) | `.split-feature` | top bottom → bottom top | scrub | photo yPercent 7→−7 |
| C cards | each `.editorial-link` | top bottom → top 30% | scrub | image 1.20→1; caption y 70→0 |
| C counter-move (≥701 px) | `.editorial-pair` | top bottom → bottom top | scrub | left y 60→−60; right y −50→50 |
| D `specials-settle` | `.special-feature` | top bottom → center center | scrub | image scale 1.12→1, yPercent −5→0 |
| D events | `.event-tiles` (mobile: each tile) | top bottom → top 40% (mobile 55%) | scrub | tile y 90+55·i → 0; image 1.18→1 |
| E `celebration-unmask` | celebration `.photo` | top bottom → center 55% (mobile top 35%) | scrub | clip inset(22% 9%)→0; image 1.30→1 |
| E `home-gallery-assemble` | `.gallery-preview` | top 92% → top 30% (mobile 40%) | scrub, `invalidateOnRefresh` | per photo: toward-center offset ×0.42 (mobile 0.28) +70 px, scale 0.80 (mobile 0.90), opacity 0.35 → rest; image 1.2→1; CTA y 36→0. The center photo starts at 0, the sides at 0.14/0.20/0.28. |
| E script drift | `.home-gallery` | top bottom → bottom top | scrub | xPercent 6→−6 (mobile 3→−3) |
| E depth (kept from before, desktop) | each tile | top 52% → bottom top | scrub 0.6 | `.collage-parallax` small y/scale |
| F footer settle (all routes) | `.footer` | top bottom → bottom bottom | scrub | wordmark yPercent 35→0, scale 1.05→1, opacity 0.4→1 |
| Titles, quotes (time-based) | container | top 85–92% | `once` | masked lines (1.05 s); eyebrow and support copy rise 18–22 px |

### Files

**Created**
- `apps/web/src/lib/motion/config.ts`, `scroll.ts`, `primitives.ts`
- `apps/web/src/components/motion/SmoothScroll.tsx`, `HomeMotion.tsx`
- `tests/browser/cinematic-motion.spec.ts`: 12 regression tests
- `scripts/motion/`: capture and verification tooling: `delta-recon`, `delta-capture`, `delta-probe2`–`4`, `delta-route`, `site-capture`, `sequence-check`, `sequence-sheets.sh`, `contact-sheet`, `demo-record`, `verify-video`, `nav-heap`, `leak-retainers`
- `DELTA-MOTION-REFERENCE.md`, this report, `docs/lighthouse-motion-mobile.json`, `docs/lighthouse-motion-desktop.json`
- `artifacts/delta-reference/`, `artifacts/jimmy-before/`, `artifacts/jimmy-after/`, `artifacts/comparison/`

**Modified**
- `apps/web/package.json`, `package-lock.json`: added `lenis` **1.3.27** (pinned exactly)
- `apps/web/src/app/layout.tsx`: mounts `SmoothScroll`
- `apps/web/src/app/page.tsx`: `data-home` on `<main>`; post-hero sections wrapped in a full-bleed `.scene-cover` panel; mounts `HomeMotion`
- `apps/web/src/app/globals.css`: appended motion block (layers, Lenis rules, cover panel, purple-layer variable, `translate`-based hover lifts, button sweep, ghost overflow on ≥701 px)
- `apps/web/src/components/ui.tsx`: `Photo` gains an inner `.photo-media` layer (same box)
- `apps/web/src/components/SiteSections.tsx`: hero media and veil wrappers, `.ghost-drift` span, homepage-only `data-reveal`/`data-parallax` removed (the scenes replace them)
- `apps/web/src/components/Sections.tsx`: `Visit` no longer fades in (immediately usable)
- `apps/web/src/components/Motion.tsx`: route intro upgrade and footer settle; skips the homepage
- `apps/web/src/components/HomeGalleryMotion.tsx`: scrubbed assembly replaces threshold fade-ins
- `apps/web/src/components/HeroMedia.tsx`: pauses while covered; source chosen in JS (memory fix, §6)
- `apps/web/src/components/Header.tsx`: mobile menu link stagger
- `apps/web/src/hooks/useGalleryMotion.ts`: `useLayoutEffect` (memory fix, §6)
- `tests/browser/home-gallery.spec.ts`: updated for the scrubbed assembly (§6)
- `README.md`, `QA.md`: pointers to this work

**Not touched:** `apps/api`, Prisma schema and migrations, `packages/shared` content, metadata, canonical URLs, `robots.ts`, `sitemap.ts`, JSON-LD, routes, fonts and assets.

---

## 4. Visual evidence and recordings

### Final-build recordings (decoded and verified playable)

All four were recorded against the final production build (`BUILD_ID UOIjq6m67R8wlR3A-Ytv6`, served by `next start` on :3100, started one second after the build, which is newer than every web source file).

| Recording | Path | Resolution | Duration | Size |
|---|---|---|---|---|
| **Desktop journey** | `artifacts/jimmy-after/demo/jimmy-os-desktop-journey.webm` | 1440×900 | 161.4 s | 57.5 MB |
| **Mobile journey** | `artifacts/jimmy-after/demo/jimmy-os-mobile-journey.webm` | 390×844 | 143.9 s | 17.3 MB |
| Desktop stepped capture (with reverse and fast passes) | `artifacts/jimmy-after/desktop/video/jimmy-os-desktop-stepped-capture.webm` | 1440×900 | 75.6 s | 27.5 MB |
| Mobile stepped capture | `artifacts/jimmy-after/mobile/video/jimmy-os-mobile-stepped-capture.webm` | 390×844 | 89.6 s | 12.3 MB |

- **Chapters**, in `*-journey-chapters.json`: hero entrance → A → B venue → B nightlife → C → D specials → D events → E celebration → E gallery → F → reverse scroll to top → end. Chapter start times (s), desktop: 0.1, 2.7, 21.2, 25.6, 34.9, 44.3, 54.2, 61.8, 69.7, 80.9, 99.0, end 160.4. Mobile: 0.1, 2.7, 11.4, 15.1, 21.9, 31.4, 40.2, 45.8, 59.7, 70.4, 83.5, end 143.0.
- **How "playable" was verified:** `scripts/motion/verify-video.mjs` loads each file in Chromium's `<video>` element. It reads metadata, plays for 1.5 s and checks that `currentTime` advanced 1.5 s (all four passed), then seeks to every chapter and grabs the decoded frame. Those frames are in `artifacts/jimmy-after/demo/verify-desktop/` and `verify-mobile/`, each with a `sheet.png`. I reviewed them: they show the final implementation at each chapter, including the receding hero, the collage assembling, and the unclipped "Wish you were here" line from the final fix.
- **Headless:** the final recordings use headless Chromium. The first headed attempt hung at its first screenshot while the Mac display was asleep, and the run was later interrupted by sleep. Rendering is the same engine; the only behavioral difference is wheel delta (120 vs 240 per tick), so headless runs scroll more slowly and the videos are longer.
- **Earlier headed recordings** (build from just before the three non-visual fixes in §6), also verified playable: `artifacts/jimmy-after/demo/headed-earlier-build/jimmy-os-desktop-journey.webm` (69.8 s) and `jimmy-os-mobile-journey.webm` (172.9 s).
- **Format:** WebM (VP8). It plays in Chrome, Firefox, Edge and VLC (drag the file into a browser tab). macOS QuickTime Player does not open WebM.

### Screenshots

| Evidence | Path |
|---|---|
| Every scene at **0 / 25 / 50 / 75 / 100% and reverse-25%**, at desktop, tablet and mobile (final build) | `artifacts/jimmy-after/sequences-{desktop,tablet,mobile}/` (`sheet-*.png`, `check.json`) |
| Before vs after at matching scroll positions | `artifacts/comparison/before-after-desktop.png` |
| Delta technique vs the Jimmy O's equivalent (recede and cover, media settle, counter tracks, depth assembly) | `artifacts/comparison/delta-vs-jimmy.png` |
| BEFORE baseline: frames, logs and videos | `artifacts/jimmy-before/{desktop,mobile}/` |
| AFTER stepped captures (69 desktop and 49 mobile frames, reverse, fast) | `artifacts/jimmy-after/{desktop,mobile}/` |
| Delta reference (frames, logs, video, bursts, hover, mobile) | `artifacts/delta-reference/` |

---

## 5. Responsive and reduced-motion behavior

- **Desktop (≥1025 px):** full choreography, including the hero pin and the desktop-only gallery depth layers.
- **Tablet (701–1024 px):** same scenes, including the hero handoff (verified in `sequences-tablet`).
- **Mobile (≤700 px):** native scrolling (Lenis leaves touch native), **no pinning**, shorter travel, and no counter-moving columns in single-column layouts.
- **Reduced motion:** no Lenis, no pins, no split text, no scroll transforms (all `transform: none`), no video. Everything is visible immediately and fully functional, as tested.
- **No JavaScript:** the layout and content are unchanged (existing no-JS test).

---

## 6. Quality assurance (actual results)

### Build and static checks
- `npm run build` (API and web): **pass** (Next.js 16.4.6, 18 routes).
- `npm run lint`: **pass** (0 problems). `npm run typecheck`: **pass**.
- Final re-confirmation after the Mac woke: lint, typecheck, API and browser suites all re-run and passing. The app source is unchanged since the 04:18 build; only capture scripts changed.

### Tests
- **Browser (Playwright): 52 passed, 0 failed** in a single run. Files: `site.spec.ts` (17), `hero-gallery.spec.ts` (13), `home-gallery.spec.ts` (10), `cinematic-motion.spec.ts` (12, new).
- **API (`npm test`): 12 passed, 0 failed.**
- New `cinematic-motion.spec.ts` covers:
  - the hero recede at 0/50/100% and in reverse, pin release, and pause while covered
  - fast jumps leaving nothing hidden, with every scene ending at rest
  - scrubbed (not replayed) intermediate states
  - anchor scroll with focus and URL hash
  - reduced motion: no Lenis, pins, split text or transforms
  - mobile: no pin, no overflow
  - repeated client navigation: no duplicate pins, page never locked
  - no horizontal overflow through the whole page at 390, 768, 1024, 1440 and 1920 px
- **Changes to existing tests in `home-gallery.spec.ts`, and why:**
  - The threshold-based "center leads" entrance test (opacity 0 → 1 at fixed thresholds) was replaced by a test of the scrubbed assembly. That test checks that the center leads and the sides follow, that progress grows with scroll, that the photos end at rest, that reverse scrolling scrubs back, that the CLS is 0, and that the original layout baseline holds.
  - "At rest" now accepts the identity matrix as well as `none`, since scrubbed scenes end on an identity transform.
  - `settled()` waits for typography reveals to finish.
  - The old "reverse scrolling never restarts entrances" expectation became "reverse scrolling scrubs back with photos visible and frames unmoved", which is the reference behavior.
  - Every layout-baseline, lightbox, keyboard, touch, focus and no-JS assertion is unchanged and passes.
- **Note:** the form-submission tests send real inquiries and hit the API's in-memory limit of 5 per hour. One run failed with `429 RATE_LIMIT` for that reason. Reloading the API dev server (touching `server.ts` without changing content) reset the limiter, and all 5 passed. Those tests store `browser-rebuild@example.invalid` records in the development database, as they did before.

### Lighthouse 13.6.0 (production build, local lab)

| Run | Perf | A11y | Best practices | SEO | LCP | TBT | CLS | JS transfer |
|---|---|---|---|---|---|---|---|---|
| Mobile, final build (3 runs) | **100 / 100 / 100** | 100 | 100 | 69 | 0.8 s | 50 / 40 / 40 ms | 0 | 244 KB |
| Desktop, final build | **100** | 100 | 100 | 69 | 0.2 s | 0 ms | 0.001 | 248 KB |
| Mobile, pre-motion reference (`docs/lighthouse-local.json`) | 100 | 100 | 100 | 69 | 0.8 s | 20 ms | 0 | 221 KB |

SEO 69 is the deliberate staging `noindex`/robots block, unchanged. Reports: `docs/lighthouse-motion-mobile.json` and `docs/lighthouse-motion-desktop.json`. These are local lab measurements, not field data.

### Performance findings
- **JS cost:** about **+23 KB** transferred for the motion layer (Lenis, SplitText and the scenes). LCP is unchanged at 0.8 s on mobile. The LCP element is hero text (the description line on mobile, the "AFTER DARK." headline line on desktop), as in the pre-motion report, where it was the hero H1. CLS is 0. All scroll motion uses transforms and opacity. The two `clip-path` animations (celebration unmask and line reveals) cover small areas.
- **TBT:** before idle deferral, the motion build measured TBT 120–210 ms on mobile (Performance 96–99), compared with 20 ms pre-motion. Building below-the-fold scenes at idle time brought it to **40–50 ms** (Performance 100 in all three runs).
- **INP:** not field-measured. TBT is the lab proxy. Hover and interaction motion is CSS-only or short GSAP tweens.

### Memory across repeated navigation (two leaks found and fixed)
Measured with forced GC after 10 extra client-navigation cycles (`scripts/motion/nav-heap.mjs`). Retainers were traced with heap snapshots (`scripts/motion/leak-retainers.mjs`).

| Route pair | Before fixes (DOM nodes) | After fixes (DOM nodes / listeners) |
|---|---|---|
| `/` ⇄ `/events` | 1,586 → **8,026** | **939 → 939** / 508 → 508 |
| `/gallery` ⇄ `/events` | 744 → **3,074** | **507 → 507** / 446 → 446 |
| `/` ⇄ `/gallery` | 1,819 → **10,609** | **939 → 939** / 508 → 508 |

1. **Hero video (homepage):** in Chromium, `<source media="(max-width: 700px)">` keeps a live `MediaQueryList` listener after the `<video>` is removed. That listener retained the whole previous homepage DOM on every visit. **Fix:** `HeroMedia` picks the source in JS using the same 700 px breakpoint and sets `src` directly. Loading behavior (poster first, `preload="none"`, deferred start) is unchanged.
2. **Gallery page:** the existing `useGalleryMotion` hook reverted GSAP in a passive `useEffect`, after React had detached the DOM. Snapshots traced the retention to Chromium's responsive-image viewport listeners. **Fix:** `useLayoutEffect`, so it reverts before removal. As a side effect, tiles no longer render visibly for one frame before their entrance.

Lenis was ruled out by disabling it, and the new homepage scenes were ruled out by disabling each one. Both leaks were in code that predates this work and only showed when motion was enabled. JS heap still rises about 1 MB over 10 cycles, compared with about 0.7–0.8 MB with all motion disabled. That residue is framework and JIT caching, not retained DOM.

### Other checks
- **Layout stability:** the homepage collage layout matches the stored baselines at 390, 768, 1024 and 1440 px. Gallery CLS is 0, and Lighthouse CLS is 0 (mobile) and 0.001 (desktop). The hero pin uses `pinSpacing:false`, so it adds no scroll length.
- **Overflow:** none at 360–1920 px across all routes and through the whole homepage journey.
- **Console:** no errors or warnings on the production build at desktop, tablet or mobile (`sequences-*/check.json`). The dev server prints Next's "image detected as LCP" hints when a script jumps the scroll without user input; production does not.
- **SEO regression:** the production server HTML still contains the homepage headings (spot-checked "More than a night out.", "Find your", "A taste of the good life.", "The nights we live for.") and the H1 text, canonical, JSON-LD and staging `noindex`. Headings are never canvas or image text. Split text is temporary and restored. All 18 routes return 200 with canonical paths (tested).
- **Accessibility:** Lighthouse 100. Focus is preserved: covered or pending content reveals on focus, and anchors move focus. The mobile menu focus trap and Escape still work (tested). Reduced motion is respected throughout.

---

## 7. Known limitations

- **Tooling:** Computer Use and Claude-in-Chrome were unavailable. Inspection and recordings used Playwright Chromium (headed for the reference and the earlier recordings, headless for the final recordings).
- **Delta route transition:** not verifiable (see §1). The preloader and the tilted collage were deliberately not reproduced.
- **Browser coverage:** verification ran in Chromium only. Safari, Firefox and real iOS/Android devices, including assistive technology, were not tested. The CSS `translate` property, `clip-path` and Lenis are supported by current versions of those browsers, but that is unverified here.
- **Mobile gallery ghost line:** "Wish you were here" is clipped at 390 px. This was already the case in the original mobile design (`artifacts/jimmy-before/mobile/frames/f030-y07800.png`) and was left as-is to preserve the composition.
- **Hero copy:** once the hero is scrolled past, its copy is intentionally at opacity 0. Tabbing back into it scrolls the page to the top so it is readable.
- **Superseded document:** `HOMEPAGE-GALLERY-MOTION.md` describes the earlier threshold-based collage entrance. README now points here.
- **Lab metrics only:** Lighthouse and memory figures are local measurements, not field Core Web Vitals.

## 8. Reproducing the evidence

```sh
npm run build && (cd apps/web && npx next start -p 3100)       # production build
export BASE_URL=http://localhost:3100
HEADLESS=1 node scripts/motion/sequence-check.mjs artifacts/jimmy-after/sequences-desktop desktop
bash scripts/motion/sequence-sheets.sh artifacts/jimmy-after/sequences-desktop
HEADLESS=1 node scripts/motion/demo-record.mjs artifacts/jimmy-after/demo desktop   # or: mobile
node scripts/motion/verify-video.mjs artifacts/jimmy-after/demo/jimmy-os-desktop-journey.webm \
  artifacts/jimmy-after/demo/verify-desktop artifacts/jimmy-after/demo/jimmy-os-desktop-journey-chapters.json
ROUTES=/,/events node scripts/motion/nav-heap.mjs
npx playwright test    # against the dev server on :3000 (needs API and database)
```
