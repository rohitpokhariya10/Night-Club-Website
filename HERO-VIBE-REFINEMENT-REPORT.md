# Hero nightclub vibe refinement — 17 November 2026

## Scope

Refined the existing hero locally. No new dependencies, spotlight system, animation loop, or Canvas layer. The header logo/navigation/booking link, headline, supporting copy, reflective lettering, and scroll architecture remain in place. The checkout already contained music/DJ and strings work; those implementation files and their existing CSS changes were preserved.

## Lighting and composition

- Raised the existing beams' opacity by 0.04 and gently strengthened their warm fills. Their feathered fade extends farther into the room. The same clipped cones and blur layers remain; there are no rectangular light panels or new blur effects.
- Broadened and lifted the existing radial stage haze behind the crowd. The central shade still protects the text.
- Increased individual sweep amplitudes from 5.5–8° to 6.4–9.4°, with distinct 8.1–11.1-second periods (previously 8.6–12 seconds). Mobile retains the 0.65 movement multiplier. Sine easing, the independent beam phases, and separate scroll-owned rigs remain.
- Headline catch angles still derive from these sweeps and update on the same GSAP timelines. No independent shimmer was introduced.
- Removed both hero CTA elements, all `.cinema-copy` action/button CSS, and their intro animation/focus references. Rebalanced vertical padding and description margins. The header's Book a Table link remains functional.
- Skip intro now moves keyboard focus to the existing Discover Jimmy O’s link, without scrolling the page.

## Crowd

The same seeded three-depth crowd now has tighter spacing, taller proportional figures, more varied height/baselines, and a clearly exposed back row. New one-arm reaches and lower bent-arm dancing complement existing raised arms, pumps, sways and phones. Two-handed poses are slightly asymmetric. Select warm rims distinguish figures without outlining every person.

| Viewport | People before → after | Crowd Canvas height before → after | Phones |
| --- | --- | --- | --- |
| 1440 × 900 | 52 → 59 | 49.3% → 55% of hero | 4 |
| 390 × 844 | 18 → 20 | 44.8% → 49% of hero | 2 |

Phone screens and their sparse, local glints retain the existing shared quiet interval. No full-scene flashes. Foreground heads remain dark and soft; the middle row is crisper and the distant row warmer.

## Accessibility and performance

The scene remains decorative and hidden from assistive technology. Text remains real, selectable content. Reduced motion draws a still crowd with no flashes, disables animated lighting/reflections, and shows the finished composition immediately. No-JavaScript text and static lighting continue to render; the existing Canvas crowd still requires JavaScript.

Two canvases, the original GSAP ticker lifecycle, offscreen/document-hidden pause behavior, DPR limits (2 desktop, 1.5 mobile) and paint caps (60 desktop, 30 mobile) are retained. The extra people and taller buffers cost some drawing work and memory.

A local Chromium draw-submission microbenchmark measured median 0.5 → 0.7 ms at desktop size and approximately 0.3 → 0.3 ms at phone size. This uses DPR 1 and excludes rasterization/compositing; it is not a physical-device FPS claim. Raw measurements and methodology are in `artifacts/hero-vibe/render-cost.json` and `render-cost.mjs`.

## Visual review

Reviewed Chromium captures of the development and production builds at 1440 × 900 and 390 × 844, plus responsive browser checks at desktop/tablet/phone sizes. Desktop has a fuller, staggered crowd against broader warm haze; the headline remains the focal point. The phone view keeps the same hierarchy with four beams, a smaller crowd, and no horizontal overflow. The text-to-crowd clearance is intentional after removing the CTA row. Production captures logged no console or page errors.

Evidence (ignored local artifacts):

- `artifacts/hero-vibe/before/`: original desktop/phone rest and scroll captures.
- `artifacts/hero-vibe/production/1440-rest-2.png`: final desktop.
- `artifacts/hero-vibe/production/390-rest-2.png`: final phone.
- `artifacts/hero-vibe/production/hero-sheet-1440.jpg` and `hero-sheet-390.jpg`: rest frames plus 25/50/75% scroll positions.
- `artifacts/hero-lighting/recordings/after-1440.webm` and `after-390.webm`: two beam cycles, scroll, pause/resume and reduced-motion lifecycle.
- `artifacts/headline-reflection/two-cycles-1440.webm` and `two-cycles-390.webm`: reflection synchronization recordings.
- `artifacts/hero-vibe/crowd-counts.json`: seeded before/after population and pose counts.

## Validation

- Workspace TypeScript: passed.
- ESLint for all files edited in this task: passed.
- Full-project ESLint: one error in pre-existing `apps/web/src/components/music/MusicDock.tsx:24` (`react-hooks/set-state-in-effect`). Left untouched per scope.
- Crowd lifecycle and reflection unit tests: 7/7 passed.
- Production API + Next.js build: passed. An initial build reused a cached Turbopack port-permission failure. Moving only `.next/cache/turbopack` to `/tmp/jimmy-hero-build-cache-gksmjzps/` and rebuilding with the permitted local-port access resolved it; no configuration change was needed.
- Initial full hero browser suite: 45/48 passed. The three failures were the early-screenshot hydration race (desktop cleanup and both recorded lighting cases), plus one desktop angular-speed sample above the existing bound during the development run. All three affected cases passed when rerun on the production build after the screenshot fix, with the same speed bound. The final two spotlight lifecycle recordings passed (2/2), as did production layout-shift checks at desktop and phone sizes (2/2, CLS below 0.01).
- Additional targeted production checks: 12/12 passed (hero composition, four responsive hero/gallery views, header destinations, no-JavaScript, Save-Data, intro skip and visual identity).

The initial desktop cleanup screenshot exposed a test-harness race: Playwright hid an unrelated DJ input caret before hydration, producing an attribute mismatch. The early screenshot now uses `caret: 'initial'`, so it does not mutate the input. No DJ implementation change was made.

## Files edited in this task

Application:
- `apps/web/src/app/globals.css` — hero-only rules, preserving existing unrelated changes.
- `apps/web/src/components/SiteSections.tsx` — HomeHero CTA markup only.
- `apps/web/src/components/motion/HomeMotion.tsx` — hero sweep values, CTA tween removal and skip focus.
- `apps/web/src/lib/motion/crowd.ts` — density, proportions, depth and gestures.

Hero-related test expectations:
- `tests/browser/hero-cta.spec.ts`
- `tests/browser/hero-cleanup.spec.ts`
- `tests/browser/hero-intro.spec.ts`
- `tests/browser/hero-scene.spec.ts`
- `tests/browser/hero-lighting.spec.ts`
- `tests/browser/hero-gallery.spec.ts`
- `tests/browser/buttons.spec.ts`
- `tests/browser/site.spec.ts`
- `tests/browser/visual-identity.spec.ts`

Documentation: this report. The pre-existing edit to `tests/browser/headline-reflection.spec.ts` was retained as found.

## Limits

Visual and browser verification used Playwright Chromium with emulated phone dimensions, not a physical phone, Safari or Firefox. The visible Chrome connection was unavailable, so captures and recordings provide the visual evidence. Battery use and long-duration mobile thermal performance were not measured. The scene remains a stylized silhouette treatment, not photographic crowd footage. This task did not run a deployment or Git commit/push. During final verification, a concurrent commit, `5d0f25d` ("fix - Hero section"), appeared on `main` and `origin/main`, containing the hero implementation along with the pre-existing music/strings work. It was left intact. This report and the added desktop/mobile layout-shift parametrization in `tests/browser/hero-scene.spec.ts` remain local.
