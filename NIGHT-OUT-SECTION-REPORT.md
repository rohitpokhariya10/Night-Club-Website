# "More than a night out": Section Redesign Report

**Date:** November 14, 2026 · **Scope:** the homepage `#discover` section only.

## What changed and why it feels more premium
- **Film instead of a static photo.** A full-bleed, 2.2:1 cinematic frame (16:10 on tablet, 4:5 portrait on phones) plays a nightlife-focused cut of the **client-supplied Jimmy O's footage**: guests toasting at the bar, the bar with cocktails and flowers, cocktail-making, and the garnish shot, looping seamlessly. A brand-tinted grade (purple left, indigo right, dark top and bottom) keeps the overlapping headline readable.
- **Editorial typography.** **Syne 700** for the headline, set uppercase in two deliberate lines on desktop and tablet ("MORE THAN" / "A NIGHT OUT.") and three on phones, with the offset line overlapping the film's top edge and "OUT." in a purple-to-indigo gradient. **Manrope** is used for the eyebrow, lede, supporting copy and button. A numbered eyebrow ("01 —— A DEL MAR ORIGINAL") gives the editorial cue. Both fonts are SIL OFL, self-hosted through `next/font/local` and not preloaded, since the section is below the fold.
- **Layered composition.** Purple and indigo light fields, an outlined "GOOD COMPANY" forming a cropped typographic base under the copy, a round magnetic "Discover the Jimmy O's story" link on the film's edge, and a two-column copy row.
- **Content kept:** the eyebrow, headline, both paragraphs, the **Our Story** button and the round link (both to `/about`), plus the `#discover` anchor. Text is untouched; uppercase is CSS-only, so screen readers and search engines read the original casing.

## Motion (scoped to this section)
1. **Entrance** (once, when the section arrives): the index slides in, the eyebrow wipes on, then each headline word rises through its own mask (staggered 0.075 s, `expo.out`). The copy and its actions rise once afterwards.
2. **Cinematic reveal** (scroll-scrubbed): the frame opens from a cropped letterbox (`inset(24% 26%)`) to full-bleed while the footage settles from scale 1.34 to 1, and the offset headline line rides the expanding edge. It reverses exactly when scrolling back.
3. **Layered parallax:** the lights, "GOOD COMPANY", the headline and the footage move at different depths. The copy and its button deliberately stay still so the CTA never drifts under the pointer.
4. **Pointer (desktop):** the footage leans toward the pointer, the frame edge catches a soft light, and the round link is magnetic.
5. **Exit:** the film sinks back (scale 0.94) and dims as the next section arrives.

The scene is built at browser idle time or on the visitor's first scroll input, whichever comes first, so its setup never runs in the page-load critical path. A check of the earliest possible scroll confirmed the film is already in its letterbox state the first time it appears.

**Preserved:** the hero intro (pixel-identical seeked frames at 0, 0.6, 1.1, 1.6 and 2.1 s; the 2.7 s end frame differs by ≤3/255 in 0.045% of pixels because the ambient light starts moving), the hero hold, Lenis, ScrollTrigger setup, the experience-strip drift and every other section's scene.

## Video
- **Source:** `public/videos/jimmy-os-hero-desktop.mp4`, unchanged and still in the project. This is the client-supplied clip recorded in `MEDIA-UPDATE.md`.
- **The edit:** `scripts/motion/make-section-film.mjs` keeps segments 7.50–10.42, 11.32–13.22, 0.00–4.05 and 5.66–7.46 s, dropping the daytime exterior and the food shots. It is re-encoded in Chromium (canvas + `MediaRecorder`, H.264 MP4, no ffmpeg needed) to `jimmy-os-nightlife-desktop.mp4` (1280×720, 10.7 s, 3.77 MB) and `jimmy-os-nightlife-mobile.mp4` (640×360, 1.09 MB), with WebP posters `jimmy-os-nightlife-poster(-mobile).webp`.
- **Behaviour:** the poster is a real server-rendered image (stable layout). The film is created only when the section is **actually on screen** (no MP4 is requested at page load). It plays muted, looped and inline with no controls, **pauses off-screen** and in hidden tabs, uses the mobile file on phones, and is **never created** for reduced motion, Save-Data or `prefers-reduced-data`. The source is chosen in JavaScript, avoiding the Chromium `<source media>` memory leak fixed earlier.

### Authentic media still needed (the footage is not night footage)
The supplied clip shows the bar, cocktails, guests and food, mostly by daylight. To fully convey nightlife, please supply authorised footage of: **DJ performances, the dance floor and crowd at night, night lighting and the interior after dark, the exterior at night, and live music or karaoke**. Ideally 1080p or 4K originals with guest consent and usage rights.

## Files
- **New:** `components/NightFilm.tsx`, `public/fonts/{syne,manrope}-variable-latin.woff2` with `syne-OFL.txt` and `manrope-OFL.txt`, the two nightlife MP4s and posters, `tests/browser/night-out.spec.ts` (6 tests), and `scripts/motion/{make-section-film,section-capture,hero-baseline,compare-images}.mjs`
- **Modified:**
  - `components/SiteSections.tsx`: `HomeAbout` markup
  - `components/motion/HomeMotion.tsx`: `nightOutScene`, `stripScene`, idle or first-input build
  - `app/layout.tsx`: the two fonts
  - `app/globals.css`: section styles; retired the previous section's rules
  - Video assertions scoped to the hero in `site.spec.ts`, `hero-gallery.spec.ts` and `cinematic-motion.spec.ts`; old selectors updated in `cinematic-motion.spec.ts`
  - `scripts/motion/{nav-heap,sequence-check,demo-record}.mjs`
- **Untouched:** the hero, API, database, SEO metadata, sitemap, robots, JSON-LD, routes, the colour tokens (one section-scoped indigo light, `--night-blue`, was added) and the other sections.

## Verification
- `npm run lint` passed, `npm run typecheck` passed, and the production build passed.
- **Browser tests: 64 passed, 0 failed** (cinematic-motion 12, hero-gallery 13, hero-intro 6, home-gallery 10, night-out 6, site 17). **API: 12 passed.**
- **Lighthouse** on the production build: mobile scored **100** in 4 of 4 runs for performance (accessibility and best practices 100; SEO 69, the staging block), with **TBT 60 ms**, LCP 0.9 s and CLS 0. Total transfer is 793 KB, against 749 KB before; the difference is the two new fonts. Desktop scored 100/100/100/69 with TBT 0 ms. An earlier build that set the section up at load measured TBT 80–140 ms; moving setup to idle or first input fixed that.
- **Memory:** across 10 home ⇄ events navigation cycles with the film started each time, DOM nodes and listeners stayed flat (1,260 / 795).
- **No layout shift** in the section (CLS 0 at 390–1920 px) and no horizontal overflow.

## Recordings and screenshots
- **Section scrolling on production, verified playable:** `artifacts/section-video/final/section-scroll-{desktop,tablet,mobile}.webm`. The before recording is `artifacts/section-video/before/section-scroll-desktop.webm`.
- **Full homepage journey on production:** `artifacts/section-video/journey/jimmy-os-{desktop,mobile}-journey.webm`
- **Before/after at matching scroll positions:** `artifacts/section-video/before-after-{desktop,tablet,mobile}.png`. Frames from the recording: `artifacts/section-video/final/rec-sheet-desktop.png`
