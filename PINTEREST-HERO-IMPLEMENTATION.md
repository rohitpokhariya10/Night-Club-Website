# Animated Light Hero (Pinterest Reference): Implementation Report

**Date:** November 14, 2026
**Result:** the homepage hero background video has been **replaced** by an animated light hero that follows the primary Pinterest reference's choreography, rebuilt with Jimmy O's own logo, fonts, colour tokens, copy and links. The video files remain in `public/videos/` but the homepage no longer renders or requests them.

The motion analysis (what was watched, measured timings and the mapping to our brand assets) is in **[PINTEREST-HERO-REFERENCE.md](PINTEREST-HERO-REFERENCE.md)**.

---

## 1. Reference inspection (summary)

- **Tools:** Computer Use was not available in this session. Both pins were opened in Playwright-driven Chromium.
- **Access:** Pinterest showed its login prompt and the pin videos played underneath it. No login, and nothing was bypassed. Each pin page references a public MP4 on `v1.pinimg.com`; those were saved only for frame-accurate study and are not used on the site.
- **Primary** (`pin/672725263127191910`, 17.2 s): an 11-slat fluted-glass light band with an emblem orb. The intro runs: a U-shaped band with the orb centred → the band deepens → the headline ghosts in blurred → the orb falls (ease-out) as the band tilts → nav, CTAs and labels arrive → an ambient flowing loop. About 2.1 s to full composition, settled by about 2.4 s. Measured from 0.1 s frames and full-resolution keyframes.
- **Secondary** (`pin/939070959796023033`, 10 s): a different animation, a static streak field whose colours shift around the cursor. Only the **pointer-reactive light** idea was adopted.

## 2. What was implemented

### The hero
| Layer | Implementation |
|---|---|
| **Fluted glass and light band** | 11 slats on desktop, 8 on tablet and 6 on phones. Each slat holds a CSS-gradient band in the Jimmy O's tokens (`--text` core → `--accent-readable` → `--accent` → `--purple` → `--button` → `--background`). Each slat's band has its own vertical position, skew (flattened, so the band *steps* at each seam), thickness and brightness, driven by one curve model (`lightShape.ts`). |
| **Orb** | Dark glass disc with a purple glow ring and the **Jimmy O's logo** |
| **Copy** | The existing eyebrow (now a framed tag), **"DEL MAR AFTER DARK."** in the existing Kaushan Script, the existing description, and the existing **EXPLORE NIGHTLIFE** and **BOOK A TABLE** buttons, in the reference's centred resting composition |
| **Floating labels** | The existing experience labels ("DJ experiences", "Karaoke nights", "Catch the game", "Drinks & good company") with circuit lines and twinkling dots. Decorative and `aria-hidden`. |
| **Foot** | Unchanged: "COASTAL SOUL. LATE-NIGHT ENERGY." and "Discover Jimmy O's ↓" |

### The intro (GSAP timeline, timings from the reference)
| t (s) | Light | Orb | UI |
|---|---|---|---|
| 0 → 0.35 | Glows in as a **U-shaped band** (lowest point behind the orb) | Fades in at the **centre** (0.5 of height, scale 0.82) | None (header hidden) |
| 0 → 0.8 | The U **deepens and brightens** | Holds | None |
| 1.0 | (holds) | **Starts falling** (`power2.out`, 1.7 s) | **Headline ghosts in**: opacity 0.12, `blur(16px)` → sharp by about 1.85 s. The eyebrow appears. |
| 1.2 → 2.6 | **Morphs to the rising diagonal** (`sine.inOut`) | 0.74 at 1.6 s, 0.78 at 1.9 s, 0.81 at 2.4 s (reference: 0.72, 0.77, 0.81) | 1.45 description; 1.5 CTAs (stagger) and **header**; 1.55 labels; 1.6 lines and dots; 1.9 foot |
| about 2.7 | **Ambient flow** starts: phase drift and incommensurate sine cycles of tilt, bow, wave, core and centre line | At rest (0.82; 0.83 on phones) | Skip control fades out |

- **Skip intro:** a visible button (keyboard focus moves to the first CTA), plus **any key, wheel, touch or pointer-down** finishes the intro instantly. It plays **once per session** (`sessionStorage`); later homepage views show the finished hero with its ambient light.
- **Pointer (desktop, from the secondary reference):** the brightest part of the band follows the pointer with smoothed `quickTo`.
- **Performance hygiene:** the light engine writes four CSS custom properties per visible slat per frame (transform and opacity only). It **sleeps** when the hero is off-screen, fully covered or the tab is hidden (`data-ambient="running|paused"`). No video, canvas or WebGL is used.
- **Pre-paint:** a tiny inline script sets the opening frame before the first paint, so the finished state never flashes and then jumps back. A CSS fail-safe reveals everything after 3.5 s if JavaScript never runs.
- **Reduced motion:** no intro, ambient flow, pointer effect or Skip button. The finished composition renders immediately.
- **No JavaScript:** the finished composition is fully server-rendered. Resting slat values are computed on the server for each breakpoint.

### Related fixes made along the way
- **Hero hold now uses CSS `position: sticky`** instead of a ScrollTrigger pin. This is the "page rises over the receding hero" effect from the earlier Delta work. Browser tracing showed that ScrollTrigger re-wraps the pinned hero on every refresh, which **dropped keyboard focus** from anything inside it (Skip intro, the CTAs). The sticky hold looks identical, adds no scroll length, moves no DOM and works without JavaScript. It stays off on phones and under reduced motion.
- **Hero outline button:** on phones the light can pass behind the actions, so "BOOK A TABLE" now keeps a dark brand-token fill for text contrast.
- **Short or narrow screens:** the two upper labels (and their lines) hide at ≤1100 px width or ≤820 px height so they never crowd the CTAs.

## 3. Files changed

**New**
- `apps/web/src/lib/motion/lightShape.ts`: curve model, intro and resting states, per-slat values
- `apps/web/src/lib/motion/lightField.ts`: light engine (GSAP ticker; sleeps when not visible)
- `apps/web/src/components/HeroLight.tsx`: server-rendered light field, orb, labels, lines, dots
- `tests/browser/hero-intro.spec.ts`: 6 tests
- `scripts/motion/`: `pinterest-recon.mjs`, `video-frames.mjs`, `hero-intro-frames.mjs`, `hero-intro-compare.mjs`, `hero-record.mjs`, `hero-screens.mjs`
- `PINTEREST-HERO-REFERENCE.md`, this report, `docs/lighthouse-hero-mobile.json`, `docs/lighthouse-hero-desktop.json`

**Modified**
- `apps/web/src/components/SiteSections.tsx`: hero markup. The `HeroMedia` and `HeroPoster` video and poster are removed from the hero; the light field, orbit and Skip button are added. Copy and links are unchanged.
- `apps/web/src/components/motion/HomeMotion.tsx`: the hero scene is rewritten (intro, ambient flow, pointer, skip, visibility). The scroll recede is kept, driven by the CSS hold.
- `apps/web/src/app/globals.css`: animated-hero block, centred composition, sticky hold, outline-button contrast, label visibility
- `apps/web/src/app/layout.tsx`: pre-paint intro script and `suppressHydrationWarning` on `<html>`
- `apps/web/src/app/page.tsx`: `.hero-hold` wrapper around the hero
- `apps/web/src/components/HomeGalleryMotion.tsx`: adds a `data-motion="ready"` marker only (test synchronisation; no visual change)
- Tests: `site.spec.ts`, `hero-gallery.spec.ts` and `cinematic-motion.spec.ts`. Video assertions became light-hero assertions and pin assertions became sticky-hold assertions. `home-gallery.spec.ts` now waits for the idle-built gallery scene before measuring it.
- `scripts/motion/demo-record.mjs` (waits for the intro) and `verify-video.mjs` (1 s minimum duration)

**Kept, unused:** `HeroMedia.tsx`, `HeroPoster.tsx`, `public/videos/jimmy-os-hero-{desktop,mobile}.mp4` and the poster `.webp` files, kept for possible future use.

**Not touched:** API, database and Prisma, SEO metadata, canonical URLs, sitemap, robots, JSON-LD, navigation destinations, fonts, colour tokens, forms, other homepage sections' content, and internal pages.

## 4. Recordings and screenshots (final production build)

Recorded against the production build `OAUpfl-CnbZd_4DxIanGe` (`next start`, built 19:12:53) in headless Chromium. Every video was **decoded and played** in Chromium (`scripts/motion/verify-video.mjs`): metadata was read, 1.5 s of real playback advanced, and frames were extracted.

| Recording | Path | Size | Length |
|---|---|---|---|
| **Hero intro + ambient + pointer sweep (desktop)** | `artifacts/pinterest-hero/recordings/jimmy-os-hero-intro-desktop.webm` | 1440×900 | 9.9 s (intro runs 0.45 → 3.25 s) |
| **Hero intro + ambient (mobile)** | `artifacts/pinterest-hero/recordings/jimmy-os-hero-intro-mobile.webm` | 390×844 | 7.4 s (intro runs 0.23 → 3.03 s) |
| Skip intro (desktop / mobile) | `artifacts/pinterest-hero/recordings/jimmy-os-hero-skip-{desktop,mobile}.webm` | — | 3.8 s each (Skip pressed at about 0.98 s) |
| Full homepage journey, new hero (desktop / mobile) | `artifacts/jimmy-after/demo/jimmy-os-{desktop,mobile}-journey.webm` | — | 156.5 s / 145.8 s (chapter JSON alongside) |

- **Reference vs ours, real time:** `artifacts/pinterest-hero/recordings/realtime-vs-reference-{desktop,mobile}.png`. Each pairs a reference frame (T0 + 0, 0.3, 0.6, 0.9, 1.1, 1.3, 1.6, 1.9, 2.1 and 2.4 s) with our frame at the same offset, taken from the real-time video.
- **Frame-exact iterations** (the intro paused and seeked in the dev build): `artifacts/pinterest-hero/v{2,3,4}-compare/compare.png` (desktop) and `v{4,5}-compare-mobile/` (mobile). They show how the band, timing and mobile proportions were refined.
- **Screenshots** (finished hero): `artifacts/pinterest-hero/screenshots/hero-{1920,1440,1024,768,390}.png`, `hero-1440-reduced-motion.png` and `sheet.png`
- **Formats:** WebM (VP8) plays in Chrome, Firefox, Edge and VLC. macOS QuickTime Player does not open WebM.

## 5. Test results (actual)

- `npm run lint`: **pass**. `npm run typecheck`: **pass**. `npm run build` (API and web): **pass**.
- **Browser (Playwright): 58 passed, 0 failed**, in a single run on the final code. Files: `site.spec.ts` (17), `hero-gallery.spec.ts` (13), `home-gallery.spec.ts` (10), `cinematic-motion.spec.ts` (12) and `hero-intro.spec.ts` (6, new).
- **API (`npm test`): 12 passed, 0 failed.**
- The new `hero-intro.spec.ts` covers:
  - the reference order: a centred orb with a blurred, translucent headline at start, then the orb at 0.82, a sharp headline, the header visible, ambient flow running, the band still moving and the session flag set
  - **Skip intro** by keyboard, with focus moving to the first CTA
  - skipping by wheel input, and the intro playing only once per session
  - **reduced motion**: finished at once, no Skip control, no animation, no video
  - **no JavaScript**: 11 slats with server-computed transforms, the finished composition, no Skip control
  - pointer-reactive light
- Other checks also covered by the suite: no `<video>` element and **no `.mp4`/`.webm`/`.m3u8` requests** on the homepage (including under Save-Data); the ambient light pausing off-screen and resuming; the sticky hold and recede, then scrolling away; the light sleeping when covered; no horizontal overflow at 390–1920 px; all 18 routes returning 200 with canonical URLs and one H1; and navigation, forms, the gallery viewer and the mobile menu.
- **Bugs found and fixed while testing:**
  - The ScrollTrigger pin dropped keyboard focus. Fixed by replacing the pin with the CSS sticky hold.
  - In development Strict Mode, Skip intro could be momentarily hidden. Fixed by applying the intro classes before any layout read.
  - The gallery tests raced against the idle-time scene build. Fixed with the ready marker.

## 6. Lighthouse (local lab, production build)

| Run | Perf | A11y | BP | SEO | LCP | TBT | CLS | Transfer |
|---|---|---|---|---|---|---|---|---|
| Mobile, final build (3 runs) | **100 / 100 / 100** | 100 | 100 | 69 | 0.9 s | 70 / 50 / 50 ms | 0 | 749 KB total (245 KB JS) |
| Desktop, final build | **100** | 100 | 100 | 69 | 0.2 s | 0 ms | 0 | — |
| Mobile, previous video hero (`docs/lighthouse-motion-mobile.json`) | 100 | 100 | 100 | 69 | 0.8 s | 40 ms | 0 | 1,511 KB total (759 KB was the hero video) |

- SEO 69 is the deliberate staging `noindex`/robots block, unchanged. Reports: `docs/lighthouse-hero-mobile.json` and `docs/lighthouse-hero-desktop.json`.
- **Page weight halved**, because the hero no longer downloads a video.
- **LCP:** the LCP element is the "AFTER DARK." headline line. It paints at first paint as the blurred ghost, so LCP stays 0.9 s even though the headline sharpens later.
- **One outlier:** on an intermediate build of this hero (before the final label and contrast tweaks), 1 of 6 mobile runs measured Performance 75. That run had a single 1,219 ms browser-internal ("unattributable") long task under high machine load. The other 5 runs, and all 3 on the final build, scored 100. It's recorded here rather than discarded.

## 7. Remaining differences from the Pinterest reference

1. **Palette:** the reference's orange and white light becomes Jimmy O's purple, lilac and white by design. The brand palette is less saturated at the hot end, so the band reads cooler and softer.
2. **Light rendering:** CSS-gradient slats approximate the reference's refracted light. The reference shows more glow spilling beyond the slats and a warm haze along the bottom; ours is cleaner, with a slightly flatter core.
3. **Opening frame:** the reference clip starts already lit (it loops). On a real page load ours glows in over 0.35 s from dark.
4. **Orb:** carries the Jimmy O's script logo rather than a ring emblem.
5. **Labels:** 4 existing Jimmy O's labels instead of 6. The upper two hide on narrower or short screens, and all hide on phones.
6. **Ambient loop:** procedural (incommensurate sine cycles) with the same character and pace (about 4–9 s cycles), not a frame-for-frame copy of the reference's path.
7. **Typography:** the existing Kaushan Script headline in place of the reference's sans-serif, using the same blur-to-sharp ghost reveal.
8. **Duration:** our intro completes in about 2.7 s, against about 2.4 s for the reference to settle, and starts two frames after hydration.
9. **Mobile and tablet:** the reference is landscape-only; the portrait adaptations (fewer slats, flatter curve, thinner band) are ours.
10. **Tooling:** watched through Playwright Chromium, not Computer Use. Safari, Firefox and real devices were not tested.
