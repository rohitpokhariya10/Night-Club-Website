# Homepage hero cleanup — 16 November 2026

Removed the circular Jimmy O’s hero badge, the boxed “DEL MAR, CALIFORNIA — GOOD TIMES LIVE HERE” label, and the bottom-left “COASTAL SOUL. LATE-NIGHT ENERGY.” tagline. The headline, description, CTA text/destinations, header logo, light wall, dust, beams and dancing crowd are retained.

The skip link is clipped visually until `:focus-visible`, then appears below the header at 120px from the viewport top. It uses the existing dark surface, ivory text and champagne border/focus tokens. Text contrast is 15.90:1; the focus outline against its surface is 12.25:1. The homepage main landmark has `tabIndex={-1}`, so the existing native `#main` link moves focus correctly, including without JavaScript. The next Tab reaches Explore Nightlife.

Only one layout adjustment was needed: the remaining Discover Jimmy O’s link keeps its desktop position at the right of the hero footer. Hero height, padding and responsive typography are unchanged.

| Files inspected | Changes in this task |
| --- | --- |
| `apps/web/src/components/HeroLight.tsx` | Removed the badge, ring and image markup, its unused Image import, and obsolete comment. Kept the ambient dots and all scene layers. |
| `apps/web/src/components/SiteSections.tsx` | Removed the hero location label and bottom-left tagline only. |
| `apps/web/src/components/motion/HomeMotion.tsx` | Removed badge positioning, fade/drop tweens, cleanup references, and the location-label tween. Removed an already-obsolete empty `.hero-chip` tween that produced GSAP warnings. Retained the original 2.7-second intro duration and all retained element timings. The footer tween now naturally targets only the retained discovery link. |
| `apps/web/src/app/globals.css` | Removed dedicated badge/eyebrow styles and pre-paint references; corrected skip-link styling; kept the discovery link aligned right on desktop. |
| `apps/web/src/app/page.tsx` | Made the existing homepage main landmark focusable by the native skip link. |
| `apps/web/src/app/layout.tsx`, `components/Header.tsx`, `components/Motion.tsx`, `components/motion/SmoothScroll.tsx`, `styles/tokens.css` | Inspected; unchanged by this task. Paths are relative to `apps/web/src/` after the first entry. |
| `tests/browser/hero-intro.spec.ts`, `hero-gallery.spec.ts`, `visual-identity.spec.ts` | Updated expectations for removed elements while preserving existing motion, content, navigation and gallery assertions. |
| `tests/browser/hero-scene.spec.ts` | Existing crowd, lighting, reduced-motion and layout-shift checks; unchanged. |
| `tests/browser/hero-cleanup.spec.ts` | Added five viewport checks and four keyboard/reduced-motion checks, including runtime errors and missing GSAP target warnings. |
| `package.json`, `playwright.config.ts`, `eslint.config.mjs`, `apps/web/AGENTS.md`, installed Next.js accessibility/CSS guides | Inspected to select the existing validation workflow; unchanged. |

Header, layout, tokens, `lightShape.ts`, `crowd.ts` and the existing hero-scene tests were also compared byte-for-byte against the pre-edit working-file checkpoint. No Canvas drawing, resize, visibility, frame scheduling or teardown code was changed. No unrelated product components, environment variables, dependencies, backend or deployment settings were edited.

Validation actually executed:

```sh
npm run typecheck
npm run lint
npm run test:e2e -- tests/browser/hero-cleanup.spec.ts tests/browser/hero-intro.spec.ts tests/browser/hero-scene.spec.ts tests/browser/hero-gallery.spec.ts tests/browser/visual-identity.spec.ts --output=artifacts/hero-cleanup/test-results
```

Typecheck and ESLint passed. The final Chromium run passed all 37 tests in 1.8 minutes. Its [log](artifacts/hero-cleanup/test-results.log) includes every result. The first run exposed the pre-existing empty hero-chip tween; removing that stale reference resolved the warnings without relaxing the tests.

An additional Chromium check with JavaScript disabled verified Tab → skip link → Enter → main focus → Tab → primary CTA. No separate hero unit/component-test script exists; the relevant components were exercised through the existing Playwright runner. The database/integration suite and a production rebuild were not run for this cleanup.

Screenshots were visually inspected at 1440×900, 1024×900, 768×1024, 390×844 and 375×812. The headline and CTAs fit, silhouettes remain below the actions, and no horizontal overflow was detected. Intro, settled, scroll-transition, focused skip-link and reduced-motion states were inspected. The existing layout-shift test passed its CLS < 0.01 threshold. Crowd movement, pause/resume, reverse scroll lighting, session intro behavior, keyboard skipping, CTA navigation and no-JavaScript rendering passed.

| View | Before | After |
| --- | --- | --- |
| Desktop | [1440px](artifacts/hero-cleanup/before-1440.png) | [1440px](artifacts/hero-cleanup/after-1440.png) |
| Mobile | [390px](artifacts/hero-cleanup/before-390.png) | [390px](artifacts/hero-cleanup/after-390.png) |
| Tablet | — | [768px](artifacts/hero-cleanup/after-768.png), [1024px](artifacts/hero-cleanup/after-1024.png) |
| Narrow mobile | — | [375px](artifacts/hero-cleanup/after-375.png) |
| Keyboard focus | — | [Desktop](artifacts/hero-cleanup/skip-focused-1440.png), [mobile](artifacts/hero-cleanup/skip-focused-390.png) |
| Scene states | — | [Initial intro](artifacts/hero-cleanup/after-initial-1440.png), [scroll](artifacts/hero-cleanup/after-scroll-1440.png), [reduced motion](artifacts/hero-cleanup/reduced-390.png) |

No unresolved cleanup defects were found in the executed checks. Validation used the existing development server at http://localhost:3000. A visible in-app preview could not be opened because no browser connector was available; Chromium automation and saved screenshots were available and used.

The working tree already contained extensive uncommitted work. Source stability was checked before editing; the other agent’s production test process was allowed to finish before the focused regression run. Existing processes were left running. A working-file checkpoint is in `/tmp/jimmy-hero-cleanup-checkpoint`, and [cleanup.patch](artifacts/hero-cleanup/cleanup.patch) records only this task’s code/test changes relative to that checkpoint. Changes remain local, without a commit that would mix in the other agent’s work.
