# Cinematic hero refinement — Chromium verification completed

16 November 2026. **Verification update:** browser execution became available again. The current source passed all 85 focused Chromium tests on the isolated production build, including the previously deferred crowd, lighting, intro, cleanup, scene and cinematic-scroll checks. Desktop/mobile recordings covering more than two lighting cycles, scroll/return and reduced motion were generated and visually reviewed. Crowd/CTA clearance, tiny phone screens, paused reduced-motion canvases, resume and route cleanup pass. No crowd source changes were needed during this verification.

Current evidence: `artifacts/production-browser-results.json`, `artifacts/hero-crowd/after-1440.png`, `after-390.png`, and `artifacts/hero-lighting/recordings/after-1440.webm`, `after-390.webm`. The later reflective-lettering recordings also show the current crowd at full resolution. See `REFLECTIVE-HEADLINE-REPORT.md` for the final build and validation.

The implementation notes below preserve the earlier sequence and checks. Statements about the approval limit and initially pending browser work describe that earlier checkpoint, not the current verification status. Long-duration heap/thermal and physical-device coverage are not claimed.

## Source changes

| File | Change |
| --- | --- |
| `apps/web/src/lib/motion/crowd.ts` | Refined the existing two-canvas renderer, proportions, individual dance movement, phone screens/glints, depth and lifecycle timing. |
| `apps/web/src/app/globals.css` | Removed glass-panel/band styles; refined spotlight intensity and localized stage glow; increased the proportional crowd canvas area by approximately 12%. |
| `apps/web/src/components/HeroLight.tsx` | Removed slat generation and the LightField markup; kept the five overhead rigs, crowd canvases, dust, scroll wash and sweep; added one static atmosphere layer. |
| `apps/web/src/components/SiteSections.tsx` | Removed the LightField import/render only. All copy, CTA destinations, navigation and other sections stay unchanged. |
| `apps/web/src/components/motion/HomeMotion.tsx` | Removed the glass renderer, its ambient state tweens, pointer highlight and lifecycle references. Added independent inner-beam sweeping and an atmosphere reveal. Kept original intro duration and scroll choreography. |
| `apps/web/src/lib/motion/lightField.ts`, `lightShape.ts` | Removed unused panel renderer and slat geometry after tracing all runtime references. Their pre-edit contents remain in the checkpoint. |
| `tests/browser/hero-intro.spec.ts`, `hero-gallery.spec.ts`, `cinematic-motion.spec.ts` | Updated obsolete panel expectations to check spotlights/atmosphere while preserving the relevant original coverage. |
| `tests/browser/hero-lighting.spec.ts` | Prepared responsive, two-cycle spotlight, pause/resume, scroll, reduced-motion, navigation and recording checks. **Not executed.** |
| `tests/browser/hero-crowd.spec.ts` | Prepared phone-pixel footprint, dancing/static rendering, preference-change and browser-error checks. **Not executed.** |
| `tests/crowd.test.ts` | Three executed Node tests covering flash scheduling and renderer lifecycle with a Canvas operation recorder. |

The crowd stage itself changed only `crowd.ts` and its hero CSS, plus new tests/report. Every other existing file in the crowd-stage source/test checkpoint remained byte-for-byte unchanged. The earlier lighting stage remains part of the current local work. No dependencies, environment variables, API/database, deployment configuration, header, copy, CTA, strings, food sections, gallery or footer were changed by these two stages.

## Crowd and lighting implementation

- **Height:** desktop canvas height changed from 44% to 49.3%, tablet from 38% to 42.6%, mobile from 40% to 44.8%. The canvas remains bottom-anchored, and the renderer recalculates both axes from a uniform figure size. There is no vertical CSS stretch. These are starting values awaiting visual clearance checks, not a verified measurement of visible figure-height gain.
- **Anatomy:** narrower varied shoulders, a short curved neck, rounded shoulder contours, different head widths, five hair shapes, bent upper-arm/forearm joints, smaller palms, varied wrist angles and restrained midground hand detail. Most arms stay down or in modest poses.
- **Movement:** seeded individual phase, tempo, amplitude and slow phrase envelopes. Small shoulder rolls, head turns and body sway replace uniform bouncing. Foreground movement is quieter than midground motion. No audio was added.
- **Phones:** up to four separated midground holders on desktop, two on mobile. Each screen follows the actual wrist/hand coordinates and has a dark casing, pale blue fill and very small local spill. Screen opacity changes gently with the person’s motion.
- **Flashes:** independently scheduled phone events share a minimum 5.5-second quiet interval. A flash lasts 180ms with a soft envelope and peak alpha of 0.48; its white core is capped at 1.8 canvas CSS pixels. The small surrounding spill has much lower opacity. No full-scene exposure change or strong bloom. No glints in reduced-motion mode.
- **Depth:** small softer far silhouettes, defined midground shoulders/heads, and darker, slower foreground figures. The obsolete central gap reserved for the removed logo badge is gone. Rim illumination is selective and subdued rather than a bright outline around everyone.
- **Stage glow:** smaller, asymmetric radial pools at the left/right of the crowd, a faint central ember pocket and broad dark haze. These static gradients have feathered falloff and no panel boundaries or horizontal stripes.
- **Spotlights:** five existing rigs remain. Independent inner beams sweep through roughly ±5.5–8° with full cycles of 8.6–12 seconds; mobile amplitude is 65% of desktop. A quarter-cycle entry joins the sine sweep at a zero-velocity turn. Core/beam gradient strength increased roughly 11–13%; the existing central content scrim is retained. Idle transforms belong to inner lights; ScrollTrigger rotates outer rigs and controls scroll opacity. No animated blur was added.
- **Lifecycle/performance:** the existing GSAP ticker and ResizeObserver are reused. No React animation state or per-phone timers. Paint frequency is capped at 60Hz desktop/30Hz mobile, including high-refresh displays; DPR remains capped at 2/1.5 respectively. The crowd now uses visible-scene elapsed time, preventing offscreen time from jumping the poses or replaying missed glints. Start/stop are idempotent; destroy removes the ticker and disconnects the observer. Browser performance and heap measurements remain pending.
- **Reduced motion:** the existing static-render path draws a complete crowd without dancing, decorative flashes or spotlight sweeps. The Node tests verify static scheduling/lifecycle behavior; actual browser rendering and keyboard checks remain pending for this revision.

## Initial checks before browser access was restored

| Command/check | Result |
| --- | --- |
| `npm run typecheck` | Passed after the crowd/CSS changes. |
| `npm run lint` | Passed, including both new test files. |
| `node --import tsx --test tests/crowd.test.ts` | 3 passed. |
| API `tsc` through `npm run build` | Passed in an isolated temporary copy. |
| Default Next/Turbopack production build | Failed because the sandbox denied the internal port binding used by its CSS worker (`Operation not permitted`). This is an environment restriction; no source/config workaround was applied. |
| `npm run build -w @jimmy/web -- --webpack` | Passed in the same isolated copy: compilation, TypeScript, static generation and build traces completed. All 18 static pages generated. This uses Next’s bundled alternate build mode without changing project configuration. |
| Browser regressions, recordings, current screenshots | **Not run for the crowd refinement.** Automatic approval review had hit a usage limit. |

The isolated crowd build is at `/var/folders/dv/0w4tgj1d105fk12cmb7q2rk00000gn/T/jimmy-crowd-build.dfyl95qd`. The modified application source in that copy was compared with the working files and matches. Existing local servers/build outputs were not replaced. The temporary lighting preview started for this work on port 3200 was stopped.

The first lifecycle-test attempt patched a different GSAP module instance than the web renderer and failed; the test harness was corrected to use the web workspace’s GSAP instance. The final three tests pass without a forced process exit. The operation recorder validates numeric geometry and lifecycle behavior; it does **not** render pixels or establish visual quality.

## Original browser checklist and broader follow-up

Once browser approval execution is available again, use the updated build or current development server and run:

```sh
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e -- \
  tests/browser/hero-lighting.spec.ts \
  tests/browser/hero-crowd.spec.ts \
  tests/browser/hero-cleanup.spec.ts \
  tests/browser/hero-intro.spec.ts \
  tests/browser/hero-scene.spec.ts \
  tests/browser/hero-gallery.spec.ts \
  tests/browser/cinematic-motion.spec.ts \
  --output=artifacts/hero-crowd/test-results
```

Use an isolated production server for the final production comparison. Do not point tests at the older lighting build. Do not rebuild over another agent’s active preview.

Review actual Chromium screenshots at 1440×900, 1920×1080, 1024×900, 768×1024, 390×844 and 375×812. Check visible crowd height, head/shoulder proportions, bent arms, phone-to-hand attachment, crowd/CTA clearance, layered contrast and localized glow. Tune the implementation if these visuals do not meet the brief.

Review desktop/mobile recordings covering the first intro, at least 20 seconds of crowd motion and at least two spotlight cycles, 25/50/75% scroll positions, full hero exit/re-entry, return to top and reduced-motion preference changes. The prepared lighting tests record 28 seconds of idle motion plus these lifecycle scenarios. Planned paths are `artifacts/hero-lighting/recordings/after-1440.webm` and `after-390.webm`; they have **not been generated**. Current crowd screenshots are planned under `artifacts/hero-crowd/`.

Also verify real console/hydration errors, GSAP target warnings, CLS, focus/CTA navigation, phone glint comfort, sustained frame times, high-DPR cost and heap/ticker behavior across repeated client navigation. Local tests do not establish absence of browser memory leaks, battery impact, animation jank or visual overlaps.

Earlier screenshots and baseline recordings under `artifacts/hero-lighting/` were captured during the preceding lighting stage, before this crowd refinement. They are historical references and are **not evidence of the current crowd**. The prior cleanup’s 37 passing browser tests also predate these lighting/crowd changes.

## Preservation and status

- Pre-crowd working-file checkpoint: `/tmp/jimmy-crowd-refinement-checkpoint`.
- Earlier pre-lighting checkpoint: `/tmp/jimmy-hero-lighting-checkpoint`.
- Focused crowd patch: [crowd-refinement.patch](artifacts/hero-crowd/crowd-refinement.patch).
- Source comparison: [source-audit.json](artifacts/hero-crowd/source-audit.json).

All changes remain local and uncommitted. **The required Chromium desktop/mobile verification, reduced-motion checks and animation recordings are now complete**, as summarized in the update at the top. The original environment limitation is resolved. The broader physical-device, screen-reader, audio-listening and long-duration resource limits remain explicitly documented.
