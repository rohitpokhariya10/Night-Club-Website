# Hero and gallery upgrade

Implemented and verified November 14, 2026 in the existing Next.js project.

## Hero

- Removed the foreground photograph, frame and overlapping composition. The photograph remains in the gallery and media library.
- Preserved the optimized desktop/mobile MP4 files and both WebP posters, plus the existing Rubik, Rubik Dirt and Kaushan Script font configuration.
- Full-viewport, cover-cropped film with restrained navy/purple gradients, left-aligned two-line heading, exact requested copy and internal nightlife/reservation links.
- Poster and heading render on the server. The optional video fades in when playback actually starts, with muted autoplay, looping and inline playback; no hero controls.
- Video loads only when the hero is visible and preferences permit it. Reduced motion and Save-Data use the poster. Playback pauses out of view or when the tab is hidden.
- GSAP sequences the eyebrow, masked heading lines, description, buttons and discovery link. Text and links do not depend on video playback.

## Gallery

- Preserved all nine photographs, captions, numbered labels, masonry composition, fonts and reservation CTA.
- ScrollTrigger reveals the eyebrow, masked heading and cards with power3.out easing: 850ms cards, 100ms column staggering, 42px desktop/24px smaller-screen movement.
- Desktop hover uses a 1.055 image scale, atmospheric overlay change, 5px caption lift and highlighted fullscreen icon; neighboring cards remain stable.
- Only two selected images receive gentle ±1.5% scroll depth, on desktop with a fine pointer. Native scrolling is retained; no libraries were added.
- Native modal viewer expands/fades in, displays uncropped photographs, and supports buttons, arrow keys, Escape, focus containment/restoration, background scroll locking and touch swipes.
- Opening, image changes and closing kill superseded tweens. Repeated Escape and rapid navigation are covered by regression tests. Preference changes mid-transition settle immediately.
- Gallery data now lives in `apps/web/src/lib/gallery.ts`; reusable scroll behavior lives in `apps/web/src/hooks/useGalleryMotion.ts`. Content is visible without JavaScript and reduced-motion users receive a functional nonanimated viewer.

## Reference

The supplied [Pinterest reference](https://in.pinterest.com/pin/418905202856001540/) was recovered from its public HTML/video asset after the web extractor could not open it. A sampled sequence from the approximately 30-second clip was inspected. Its immersive grid depth informed the restrained transitions; its 3D grid treatment was not copied over the existing editorial masonry. Reference media was used only for inspection and is not included in the website.

## Executed verification

- `npm run typecheck -w @jimmy/web` — passed.
- `npm run build -w @jimmy/web` — passed, including static generation and Next TypeScript checks.
- `PLAYWRIGHT_BASE_URL=http://localhost:3002 npx playwright test tests/browser/hero-gallery.spec.ts` — **13 passed**, 43.5 seconds, against the production build.
- Actual desktop/mobile video source selection, active muted playback, no controls, exact copy and CTA links verified.
- Layouts tested at **390, 768, 1024 and 1440px**, with no horizontal overflow and correct two-/three-column masonry.
- Reveals, stable card geometry, hover reversal, modal navigation, rapid clicks/keys, repeated Escape, focus trap/restoration, scroll lock cleanup, touch swiping and client-side route returns verified.
- Reduced motion, mid-transition preference changes, Save-Data, unavailable video and no-JavaScript content verified.
- No console/runtime errors recorded by the focused suite.
- Twelve production screenshots captured; hero, masonry and viewer screenshots visually reviewed for alignment and image treatment.

Run the focused suite against the normal development server with `npx playwright test tests/browser/hero-gallery.spec.ts`. `PLAYWRIGHT_BASE_URL` optionally selects another local server. This suite does not submit forms or mutate the database.

## Screenshots

| Width | Hero | Gallery | Viewer |
| --- | --- | --- | --- |
| 390 | [Open](artifacts/hero-gallery/hero-390.png) | [Open](artifacts/hero-gallery/gallery-390.png) | [Open](artifacts/hero-gallery/viewer-390.png) |
| 768 | [Open](artifacts/hero-gallery/hero-768.png) | [Open](artifacts/hero-gallery/gallery-768.png) | [Open](artifacts/hero-gallery/viewer-768.png) |
| 1024 | [Open](artifacts/hero-gallery/hero-1024.png) | [Open](artifacts/hero-gallery/gallery-1024.png) | [Open](artifacts/hero-gallery/viewer-1024.png) |
| 1440 | [Open](artifacts/hero-gallery/hero-1440.png) | [Open](artifacts/hero-gallery/gallery-1440.png) | [Open](artifacts/hero-gallery/viewer-1440.png) |

## Scope and limits

No backend, database, media files or unrelated page content changed. A small root integration attribute identifies the existing smooth-scroll behavior to Next.js during client navigation. The older browser test expecting a playback control now follows the new no-controls requirement.

Testing used Chromium on macOS and mobile/touch emulation, not physical iOS/Android devices or a screen reader. Existing source photography limits large-screen sharpness. The prior Lighthouse scores in QA.md were not remeasured and should not be treated as results for this revision. No public deployment was performed.
