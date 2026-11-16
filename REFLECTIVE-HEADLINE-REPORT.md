# Spotlight-reactive headline

16 November 2026. The original “DEL MAR / AFTER DARK.” H1 now catches a restrained champagne reflection from the existing ceiling lights. Its wording, font, weight, spacing, size, line breaks and layout are unchanged. Implementation and the requested Chromium verification are complete.

## Rendering and synchronization

Each original `.hero-line-text` retains its solid ivory glyphs. An empty, absolutely positioned `aria-hidden` span paints decorative generated glyphs in precisely the same line box. The reflected layer uses clipped, feathered gradients over a faint static surface treatment. It does not replace the real text fill. “DEL MAR” uses lower decorative opacity (0.48); “AFTER DARK.” uses 0.86, with already restrained highlight colors. Mobile reduces the lighting influence to 60%.

Three central existing spotlights provide position, resting direction, animated direction, cone width and opacity. Their cones are projected onto each headline line. Highlight direction matches the beam; intensity fades as the cone misses the line and as the room lighting fades. The projection accounts for existing media scale/translation and the copy’s scroll offset.

The existing ambient, intro and scroll timelines call the same reflection update. No independent shimmer, ticker, timer, React frame state or new animation timing was added. Static geometry is measured on setup/resize. Per-frame work reads existing animation values and inline transform strings, then updates only changed decorative CSS variables. No blur/filter animation was added. The existing hero visibility controls naturally stop ambient updates offscreen. Cleanup disconnects the ResizeObserver and removes reflection variables.

One important integration correction was made during browser testing: GSAP’s rotation getter can normalize a CSS individual `rotate` property. Reading that getter altered the rig’s resting transform. The final implementation instead reads the already-rendered inline rotation without mutating it, including GSAP transforms containing percentage translations. A focused unit regression covers that format. Existing spotlight ownership and the zero idle rotation of outer rigs now pass their checks.

## Accessibility and fallbacks

There is still one accessible H1 with the exact original name. Decorative spans are hidden from assistive technology, receive no pointer events and contain no real duplicate text nodes. The base text remains selectable and opaque. Browser assertions confirm that adding/removing the overlay does not change line dimensions and that overlay geometry and typography align with the base.

Reduced motion and forced-colors mode hide the decorative layer, leaving the ivory headline. Unsupported text clipping also leaves the solid base. No JavaScript is required for the readable heading. The effect introduces no keyboard controls or focus changes.

## Files

| File | Change |
| --- | --- |
| `apps/web/src/components/SiteSections.tsx` | Two empty decorative spans inside the existing H1 text lines. |
| `apps/web/src/app/globals.css` | Scoped reflective overlay and fallback styles. |
| `apps/web/src/components/motion/HomeMotion.tsx` | Reflection updates/cleanup attached to existing hero timelines. |
| `apps/web/src/lib/motion/headlineReflection.ts` | Light projection, cached geometry, non-mutating transform reads and CSS-variable rendering. |
| `tests/headline-reflection.test.ts` | Projection/falloff and percent-transform parsing. |
| `tests/browser/headline-reflection.spec.ts` | H1 semantics, all six sizes, alignment, opaque base, fallbacks, two-cycle beam synchronization recordings. |

The previously deferred `hero-lighting.spec.ts` recording fixture was corrected to configure video at file scope and test only the four visible lights on mobile. No original assertions were removed to conceal a product failure.

## Verification and visual review

- TypeScript, ESLint and the isolated production Webpack build passed.
- Both headline unit tests pass. Across strings, photo mechanics, headline projection and crowd lifecycle, 18 focused Node tests pass.
- Chromium headline checks pass at 1440, 1920, 768, 1024, 375 and 390px: one H1; aligned decorative line boxes; unchanged dimensions/fonts; continuously opaque ivory base; moving reflection state; reduced-motion cleanup; no horizontal overflow or page errors.
- Both desktop/mobile spotlight lifecycle tests pass after the integration correction, covering two full cycles, scroll ownership, pause/resume, return to top, reduced motion and remount.
- Both production two-cycle recordings pass direct reflection-angle versus beam-angle comparison (sampled every 180ms, within 0.15°). The desktop development recording interrupted by a reload was superseded by the passing isolated-production run.
- **Final isolated production suite: 85/85 passed, zero failures, skips or retries (445.6 seconds).** All ten relevant browser spec files passed. Structured result: `artifacts/production-browser-results.json`; full log: `artifacts/production-browser-run.log`.

Visual review: desktop lettering is crisp with a shallow warm surface variation, strongest on “AFTER DARK.”; on mobile the reflection is quieter and does not compete with the CTA row. The underlying crowd, phones and overhead lighting remain visible and separate from the headline. The production desktop recording was reviewed across both complete spotlight cycles plus scroll/return/reduced motion; a full mobile sequence was also reviewed through sequential extracted frames. Reflections stay restrained, with no duplicate lettering or bright streaks obscuring the CTAs.

Artifacts:

- `artifacts/headline-reflection/hero-{width}.png`, `lettering-{width}.png`, `reduced-{width}.png`.
- `artifacts/headline-reflection/two-cycles-1440.webm` and `two-cycles-390.webm`.
- `artifacts/headline-reflection/beam-sync-{width}.json`: actual sampled reflection/beam angles.
- `artifacts/headline-reflection/headline-reflection.patch`: focused diff against the checkpoint taken after the gallery work.

## Limits and preservation

This is a lightweight approximation of reflected stage light, not a physically rendered material. There are no shaders, WebGL, new packages or independent shine loops. Source comparison confirms that the crowd renderer, phone flashes, spotlight component/design, header, CTAs, copy and unrelated sections were preserved by this headline change. The separately requested gallery work was retained.

Chromium desktop/tablet/emulated-mobile coverage does not establish physical-device, Safari/Firefox, screen-reader, battery or long-duration thermal performance. Changes remain local and uncommitted; no deployment or environment configuration was modified.
