# Homepage collage motion

Implemented November 14, 2026. This revision targets the existing four-photo homepage collage.

## Preserved composition

The original fonts, decorative purple script, eyebrow, white heading, colors, four image sources and their ordering, responsive grid, and “Enter the Gallery” link to `/gallery` are preserved. No hero, route, metadata, API or database changes were made.

Before editing, the section, four photo frames, decorative text, eyebrow, heading and CTA were measured at 390, 768, 1024 and 1440px. The completed composition matches those measurements exactly, including the existing 25px mobile column offset. Measurements are saved in [baseline-layout.json](artifacts/home-gallery/baseline-layout.json).

## Motion and interaction

- The decorative text fades in, followed by the eyebrow and rising handwritten heading, using `power3.out`.
- Scroll thresholds sequence the center dancefloor photo before the left exterior and right atmosphere photos; the lower food photo enters as it reaches the viewport. The CTA enters last.
- Nested layers separate the entrance, clipping, image scale, scroll depth and hover effects. Photo frames never move out of their original grid positions.
- Desktop entrances use 58–88px vertical movement, restrained side offsets, and 1.05–1.075 image scales over 1.1 seconds. Smaller screens use 24–36px vertical movement and 0.8-second entrances.
- Only the depth portion uses scrubbing. Desktop image content has small differential movement, with the center moving more slowly; the decorative text moves at most 8px. Depth returns to its original position at the end of its scroll range. No pinning or scroll interception is used.
- Completed entrances remain visible on reverse scrolling. Fast jumps complete the images when reaching the CTA. Triggers remain scoped until cleanup, avoiding removal during an in-progress ScrollTrigger refresh.
- Desktop hover uses a 500ms image scale, atmospheric overlay and caption/fullscreen indicator. Existing image labels supply the captions.
- Homepage photos open the existing native modal viewer, now shared through a collage variant. Its expansion, dimming, keyboard controls, focus trap/restoration, scroll lock and touch swipe behavior are preserved. The full `/gallery` viewer still contains all nine original photos.
- Image sources account for the tall cover crops; below-the-fold images remain lazy loaded.
- Reduced motion displays the normal composition without entrance or depth effects. Server-rendered images and the gallery CTA remain available without JavaScript.

Implementation: `HomeGalleryMotion.tsx`, the homepage composition in `SiteSections.tsx`, scoped collage CSS, the collage variant in `LightboxGallery.tsx`, and separate homepage photo data in `lib/gallery.ts`. No animation dependency was added.

## Reference inspection

The supplied [Pinterest reference](https://in.pinterest.com/pin/955748352150543104/) was recovered through its public HTML and MP4 after the web extractor could not open it. Both whole-clip samples and a denser 200ms frame sequence around the gallery transition were inspected. Its layered image entrances and differential movement informed this implementation; the reference layout and media were not copied into the website.

## Verification

- Frontend TypeScript check passed.
- Production Next.js build passed, including TypeScript and all route generation.
- **23 Playwright checks passed against the production build:** 10 homepage collage checks plus 13 existing hero/gallery regression checks.
- Verified heading → center → sides progression; fast jumps and reverse scrolling; stable photo frames on hover and during depth; modal arrows, rapid interactions, repeated Escape, focus containment/restoration, scroll lock cleanup, route returns and touch swipe.
- Verified reduced motion, preference/breakpoint changes, no-JavaScript content and the unchanged gallery CTA route.
- Exact resting-layout comparisons passed at **390, 768, 1024 and 1440px**.
- The gallery-specific layout-shift observer recorded **0** during the tested entrance sequence after fonts were ready. This is not a new whole-site Lighthouse score.
- No console/runtime errors were recorded by the monitored suites.
- After visual review prompted a source-size adjustment for sharper tall tablet crops, the production build was rerun. The four responsive layout/viewer checks and screenshots were refreshed against that final build.

Commands:

```sh
npm run build -w @jimmy/web
PLAYWRIGHT_BASE_URL=http://localhost:3002 npx playwright test tests/browser/home-gallery.spec.ts tests/browser/hero-gallery.spec.ts
PLAYWRIGHT_BASE_URL=http://localhost:3002 npx playwright test tests/browser/home-gallery.spec.ts -g 'preserves original layout'
```

## Screenshots

| Width | Original composition | Updated composition | Viewer |
| --- | --- | --- | --- |
| 390 | [Before](artifacts/home-gallery/before-390.png) | [After](artifacts/home-gallery/after-390.png) | [Open](artifacts/home-gallery/viewer-390.png) |
| 768 | [Before](artifacts/home-gallery/before-768.png) | [After](artifacts/home-gallery/after-768.png) | [Open](artifacts/home-gallery/viewer-768.png) |
| 1024 | [Before](artifacts/home-gallery/before-1024.png) | [After](artifacts/home-gallery/after-1024.png) | [Open](artifacts/home-gallery/viewer-1024.png) |
| 1440 | [Before](artifacts/home-gallery/before-1440.png) | [After](artifacts/home-gallery/after-1440.png) | [Open](artifacts/home-gallery/viewer-1440.png) |

The final section captures exclude the fixed site header and development toolbar so the entire composition can be inspected. The site itself retains its navigation. A [center-first entrance sample](artifacts/home-gallery/center-entrance.png) is also retained.

Testing used Chromium on macOS with mobile/tablet sizes and touch emulation. Physical iOS/Android devices and screen readers were not tested. No public deployment was performed.
