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

## Revision, 17 November 2026: from present-but-invisible to visibly catching the light

**Problem reported:** the effect was not visibly working on the site. The implementation above was mechanically sound (projection, sync, cleanup and tests all passed), but in Chromium the headline read as ordinary flat ivory type.

**Diagnosis** (measured in Chromium, `scripts/visual/headline-review.mjs`):

- **Too little change to see:** the reflection changed the letters' luminance by about 2/255 on average.
- **White on white:** the highlights were warm white (`rgb(255 253 244)`) drawn on near-white ivory (`#F6F3EE`), at 32–46% strength, then multiplied by the overlay's 0.48 / 0.86 opacity. There was almost nothing for light to brighten.
- **Hairline highlights:** each one was 2–3% of the line's width.
- **Never "caught":** each line's intensity sat at about 0.7 at all times. The three beams always hang over the headline, so the letters wore a constant faint tint and never caught the light.
- **What worked:** the mapping was correct. Projected positions tracked the beams; logged against the beam angles over a full cycle.

**Fix** (no new loops: the same `update()` called by the existing intro, ambient and scroll timelines):

1. **Smoked-mirror material** (static, in the overlay): a faint ceiling sheen at the top, a fine horizon at mid-height (a bright edge over a warm dark edge), and a lightly smoked lower half. This is what makes the lettering read as polished mirror, and what gives a highlight room to show. The ivory base underneath is untouched.
2. **A specular glint** (`specular()` in `headlineReflection.ts`). A polished surface returns a light to the viewer only when the beam passes a particular angle, so each beam has a catch angle on its own sweep path. As the beam swings through it, a glint rises and fades: a Gaussian lobe of 1.5° (about 1° on phones). The catch angle is 45% into the sweep, set by `HomeMotion` (which owns the sweeps), so it always lies on the path the beam actually travels.
3. **Who glints:** only the two angled beams over the headline (rigs 2 and 4). The centre key light gives just a faint diffuse wash. With the existing sweeps this means a glint roughly a third of the time, about a second each, never in unison, with clean mirror lettering between. Three-beam and catch-angle variants were simulated against the real sweep functions before choosing; all of them glinted 43–85% of the time.
4. **Drawn as a feathered streak**, aligned with the beam: a bright warm core with amber fringes, about one letter wide, over each beam's soft wash.
5. **"AFTER DARK." stronger:** the overlay now runs at 1 on "AFTER DARK." and 0.62 on "DEL MAR" (previously 0.86 and 0.48).
6. **Phones** keep the existing ×0.6 strength.
7. **Unchanged:** reduced motion, forced colours and the no-clip fallback still show the plain ivory headline.

**Scroll:** the rigs' scroll swing passes through the catch angles, so the letters catch the light at consistent scroll positions and return to the same resting state at the top.

**Measured result** (80 samples per size, including the strongest glints):
- **Desktop:** the letters' median luminance is never below 211/255 (the solid base is about 242, so about 87% clean), the 5th percentile at least 188, and the brightest pixel 238 (no flare).
- **Phones:** median at least 210 (the 5th percentile of 145 is antialiased edges on the smaller type).
- **Change the reflection makes:** about 21/255 on average now, against 2 before.

**Tests added:**
- `tests/headline-reflection.test.ts`: the specular lobe; glint at the catch angle, none away from it, none without a catch point, none when the cone misses.
- `tests/browser/headline-reflection.spec.ts`, at 1440 and 390 px over 16 s:
  - the centre beam never glints;
  - glints are visible but occasional (clean more than 25% of the time, lit less than 60%);
  - every strong glint of a beam happens at the same orientation of that beam, which is the sync check;
  - the letters stay readable (median at least 195, no flare above 250).

**Verification, 17 November 2026:**
- **Checks:** ESLint and TypeScript pass. The production build passes. Headline unit tests 3/3.
- **Dev server:** headline, hero-lighting, hero-intro, hero-scene, hero-crowd, hero-cleanup, visual-identity and cinematic-motion: 56/57 passed. The failure is `cinematic-motion` "scenes are scrubbed by scroll position" (the Specials photo). It is a pre-existing intermittent failure: it also fails 2 of 3 runs on the committed code with this change stashed, and is outside this change.
- **Production build** (:3100): headline and hero suites 44/45. The one failure was the two-cycle recording test exceeding its 60 s limit during the long run; it passed twice when re-run alone (about 35 s each).

**Recordings** (production build), in `artifacts/headline-reflection/`:
- `spotlight-glints-1440.webm`: intro, about 25 s at rest across several beam sweeps, scroll through the hold and back.
- `spotlight-glints-1440-closeup.webm`: the same frames, enlarged 1.5× on the headline; frame sheet `spotlight-glints-1440-closeup-frames.jpg`.
- `spotlight-glints-390.webm`: phone.

**Visual review:**
- At rest the lettering reads as polished smoked mirror: ivory, crisp, with a fine horizon.
- When a beam swings through its catch angle, a warm streak catches a letter or two and fades.
- "AFTER DARK." catches more than "DEL MAR".
- Nothing flashes, and the CTAs, crowd and beams remain the main motion.
- On phones the glints are gentler and the lettering stays clean.

Files changed in this revision:
- `apps/web/src/lib/motion/headlineReflection.ts`
- `apps/web/src/components/motion/HomeMotion.tsx` (catch points only)
- `apps/web/src/app/globals.css` (reflection overlay only)
- the two headline test files
- `scripts/visual/headline-review.mjs`, `headline-record.mjs`, `closeup.mjs`, and `frames.mjs` (new crop option)
