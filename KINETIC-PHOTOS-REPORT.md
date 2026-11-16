# Homepage kinetic photographs

16 November 2026. The existing “EVERY NIGHT HAS A RHYTHM.” musical installation has been extended locally. This is the homepage strings section, not the separate `/gallery` page. Implementation and the requested Chromium verification are complete.

## Implementation and composition

The original seven venue photographs, crops, captions, destinations, four musical strings, note buttons and opt-in sound remain. The headline is smaller, its offset and scroll drift are restrained, and the first rail sits closer to the introduction. Desktop uses a dominant landscape cocktail print between two supporting photographs, followed by two pairs spread across the room. Tablet has its own wider-card composition and shorter rows than before. Mobile starts with one prominent nightlife photograph, then three paired rows; its headline fits in two lines at 375/390px. The phone scene is not a scaled desktop arrangement.

The visual mounting point is a small champagne ↔ clip with a 44px touch target. Frames retain their authentic crops, warm edges and restrained shadows. No generated photography, invented events or additional content was introduced.

## Interaction model

- Drag the photograph itself to swing it around the string attachment. A pendulum uses a gravity-like restoring force, release velocity and damping, with a maximum angle of 18°. Available space narrows that angle near another print or the stage edge. A pause before release clears stale velocity. The pivot remains on the string rather than at the photograph’s center.
- Drag the ↔ mount to slide along the curved rail. The selected mount follows the pointer directly; neighbors make room while retaining their left-to-right order. Safe bounds include card width and resting tilt. Dropped positions survive scrolling offscreen, changes to reduced motion and revisiting a breakpoint during this mounted session.
- A movement threshold of 6px for mouse/pen or 9px for touch distinguishes dragging from clicking. A drag suppresses its resulting click, while the next intentional click works immediately. Keyboard activation is not suppressed.
- Horizontal touch gestures interact with a photograph. Vertical swipes remain native page scrolling; pinch zoom is allowed. Pointer capture, cancellation, transfer of implicit touch capture, Escape, window blur, visibility changes and unmount all release interaction state.
- Photo movement gives the supporting string a small, silent deflection, capped at seven layout units. Its existing modal physics lets nearby photographs respond. Photo movement never calls the audio callback. Existing direct string plucks, strums, peg controls and opt-in sound are preserved.

## Geometry, motion and accessibility

At rest, mounts use the exact existing cubic Bézier geometry. While a string vibrates, they use the same quadratic spline and coordinate rounding as its rendered SVG path. The existing GSAP ticker coordinates string simulation and photo motion; no second animation loop or per-frame React state was added. Geometry is measured at setup, resize, scroll and pointer-down, not on each pointer move. An idle or offscreen instrument removes its ticker. Dropped positions remain when motion sleeps.

Tab reaches the sound control, four pegs, then each mount and photograph link. Left/Right repositions a focused photo or mount; Shift moves farther; Home/End moves to its available limits. A polite status announces the dropped/keyboard position. Enter on the photograph retains normal navigation. Reduced motion allows direct repositioning with no pendulum settling, entrance or decorative oscillation. Server-rendered photographs and links remain usable without JavaScript.

## Files

| File | Purpose |
| --- | --- |
| `apps/web/src/lib/experience.ts` | Desktop, tablet and mobile compositions; original content unchanged. |
| `apps/web/src/components/strings/ExperiencePhotoCard.tsx` | Separate accessible mounting control; existing photo link preserved. |
| `apps/web/src/components/strings/ExperienceStringsSection.tsx` | Gesture help and polite position status. |
| `apps/web/src/hooks/useStringInstrument.ts` | Session positions per responsive layout. |
| `apps/web/src/lib/strings/instrument.ts` | Pointer/keyboard gestures, shared-loop integration, anchors and cleanup. |
| `apps/web/src/lib/strings/photoPhysics.ts` | Pendulum and ordered collision/boundary constraints. |
| `apps/web/src/lib/strings/geometry.ts` | Point evaluation matching the live SVG spline. |
| `apps/web/src/lib/strings/scene.ts` | Smaller headline scroll drift. |
| `apps/web/src/app/globals.css` | Section-only composition, mounting affordance and touch styles. |
| `tests/photo-physics.test.ts`, `tests/photo-instrument.test.ts` | Physics and actual instrument event/lifecycle regressions. |
| `tests/browser/kinetic-photos.spec.ts` | Six widths, real gestures, sound separation, geometry, keyboard, cancellation and remount tests. |
| `tests/browser/experience-strings.spec.ts` | Existing keyboard-order test extended to include mounts; original assertions retained. |
| `scripts/motion/kinetic-capture.mjs` | Full-resolution production interaction recordings. |

The concurrently requested reflective headline is separate; see `REFLECTIVE-HEADLINE-REPORT.md`. Hero/crowd code was not changed by the gallery implementation.

## Verification and artifacts

- TypeScript and ESLint passed.
- All 13 relevant string/photo Node tests passed, including the real instrument with a DOM/event adapter. That adapter does not substitute for native browser testing.
- The first Chromium run passed all 22 existing/new gallery tests. The final mobile heading adjustment also passed the new gallery tests at all six widths.
- API TypeScript and the isolated Next/Webpack production build passed. All 18 static pages were generated; the build’s application source hashes match the working tree.
- **Final isolated production suite: 85/85 passed, zero failures, skips or retries (445.6 seconds).** This includes the existing strings tests, the new gallery/headline tests, hero intro/cleanup/crowd/lighting/scene checks, gallery preservation and cinematic scroll regressions. Results: `artifacts/production-browser-results.json`; log: `artifacts/production-browser-run.log`.
- Production desktop and mobile recordings were reviewed through extracted sequential frames, including entrance, two-direction swing, release/settling, mounted sliding, pluck, reduced motion and link navigation. The geometry remains attached and the gesture does not open the link. Viewport and full-section screenshots were inspected.

Artifacts:

- `artifacts/kinetic-photos/composition-{1440,1920,768,1024,375,390}.png`: entire section after a repositioning gesture. The fixed header is hidden only for these section captures, to avoid overlaying the middle of a tall screenshot.
- `artifacts/kinetic-photos/entrance-1440.png` and `entrance-390.png`: actual viewport, with the original header present.
- `artifacts/kinetic-photos/recordings/complete-1440.webm` and `complete-390.webm`: production entrance, swinging in both directions, release, sliding, plucking, sound toggle, reduced motion and link navigation.
- `artifacts/kinetic-photos/kinetic-photos.patch`: scoped patch relative to the existing uncommitted work.
- `artifacts/kinetic-photos/source-audit.json`: preservation audit and production-source comparison.

## Tradeoffs and scope

Cards stay on their supporting string and retain their order. Neighbors limit travel, particularly on paired mobile rows; the single lead mobile photo has a wider travel span. There are no cross-string transfers, persisted backend positions or new dependencies. A fresh component/page session resets positions. Chromium uses emulated touch; physical iOS/Android devices, Safari, Firefox and a screen-reader listening session are not covered by these checks. Audio triggering and tuning are tested; speaker-level/timbre approval still requires listening on a real device.

Changes are local and uncommitted. Existing Claude/user changes were checkpointed and preserved; no header, food, events, separate gallery, footer, backend, database, environment or deployment files were edited for this feature.
