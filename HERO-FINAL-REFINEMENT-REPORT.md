# Final cinematic hero refinement — 17 November 2026

Targeted refinement of the existing homepage hero. No rebuild, no new dependencies, no new canvas or animation loop. Nothing outside the hero was changed.

## 1. Inspected

Git state and history (`5d0f25d` back to the initial commit), `HERO-VIBE-REFINEMENT-REPORT.md` (untracked, earlier pass), `app/page.tsx`, `components/SiteSections.tsx`, `components/HeroLight.tsx`, `components/Header.tsx`, `components/ui.tsx`, `components/motion/HomeMotion.tsx`, `lib/motion/crowd.ts`, `lib/motion/headlineReflection.ts`, `styles/tokens.css`, the hero rules in `app/globals.css`, every hero browser spec, `tests/crowd.test.ts`, `tests/headline-reflection.test.ts` and `playwright.config.ts`. I also checked which servers were running: Next dev on :3000, and no API on :4000.

What I found: the old headline/copy ("DEL MAR AFTER DARK." / "Leave with a story."), no hero CTA (an earlier pass had removed it), five blurred trapezoid beams on single-sine sweeps (±6.4–9.4°), and a three-depth crowd of 59 / 20 people with straight "stick" arms and uniform rims.

## 2. Files modified

Application:
- `apps/web/src/components/SiteSections.tsx`: `HomeHero` markup only (headline, copy, CTA, `aria-labelledby`).
- `apps/web/src/components/HeroLight.tsx`: beam data now uses a fixture angle per beam.
- `apps/web/src/app/globals.css`: hero rules only: beams, intro pre-paint states, headline/copy sizing, CTA, centre shade.
- `apps/web/src/components/motion/HomeMotion.tsx`: hero scene only: fixture programs, CTA intro step, crowd lighting.
- `apps/web/src/lib/motion/crowd.ts`: crowd renderer.
- `apps/web/src/lib/motion/headlineReflection.ts`: adds the CTA border catch.
- `apps/web/src/lib/motion/beams.ts` (new): fixture programs and crowd-lighting feed.

Tests:
- `tests/beams.test.ts` (new).
- `tests/browser/hero-cta.spec.ts` (rewritten for the one CTA).
- Expectation updates for the approved copy/CTA/sweep range in `hero-cleanup`, `hero-crowd`, `hero-gallery`, `hero-lighting`, `hero-scene` and `headline-reflection`.

Review tooling (new): `scripts/visual/hero-sizes.mjs`, `hero-final-motion.mjs`, `hero-final-record.mjs`, `crowd-cost.mjs`.

Note: I briefly overwrote the tracked `scripts/visual/hero-motion.mjs` and `hero-record.mjs` with my new scripts. I restored both from HEAD (verified identical) and saved mine under the `hero-final-*` names.

## 3. Preserved

The header (logo, navigation, Book a Table), DJ console, demo tracks, audio provider, mini player and tonearm work were not touched. The uncommitted `dj-console.spec.ts` changes were left as found. Strings, hanging photographs, Food & Drinks, Signature Selections, Specials, Events, Gallery, Footer, backend, SEO and deployment are also untouched. Kept as they were: the GSAP intro/skip/session logic, the scroll hold and recede, offscreen pause, the reduced-motion and no-JS paths, the paint caps (60/30 fps) and the DPR limits (2/1.5). No discontinued elements came back (no fluted bands, no circular logo).

## 4. Headline and copy

- H1: **DEL MAR. / TURN IT UP.**, one semantic H1 in two deliberate lines. The hero section is now labelled by it.
- Size: `clamp(44px, min(11.6vw, 13.2svh), 116px)`, so short laptop screens keep the crowd in view. No clipping at any reviewed size.
- **TURN IT UP.** is the louder line: a fuller reflective surface plus a faint warm stage glow.
- Copy: **Come for the drinks. Stay for the music. / Make the night yours.**, 16px (15px on phones), line height 1.7.

## 5. Booking CTA

**Book a Table ↗** links to the existing `/reservations` route. It sits under the copy and is centred: 56px tall (52px on phones), 198px wide at desktop.

- Look: a smoked charcoal gradient fill, a champagne hairline, an ivory label and a champagne north-east arrow. It has a quiet top sheen and a soft amber ambient shadow.
- Hover, focus and press: only the inner glow layer (opacity), the border tone and the arrow change. The anchor has no transform and no size change.
  - Verified: the bounding box moves 0px on hover and press.
  - A test samples `elementFromPoint` on every frame of the hover transition, starting from a pointer 3px inside the top edge. The pointer stays on the target throughout, so the earlier flicker cannot recur.
- Spotlight catch: the hairline brightens briefly where a beam's footprint actually crosses the button. This is computed from the real beam geometry, not a loop. Over 30 s at 1440px it peaked at 0.70 and was lit about 20% of the time; when the hero is covered or paused, the catch holds.
- Accessibility: Tab order is skip link → main → CTA → Discover. The focus ring is a solid 2px outline. Label contrast is at least 7:1, even against the warmest beam behind it.

## 6. Spotlights

- **Geometry:** each beam is now a point source. It is drawn as a conic cone whose spread is the fixture's own beam angle (7–15°), so it widens with distance.
  - The volume falls off with distance, a narrower hot core fades sooner, and a small lens bloom marks the source at the top edge.
  - The soft edges come from the gradients. All five 10–13px `filter: blur` layers were removed.
  - Widths come from `cqh` and `tan()` inside `@supports`, with the old `vw` widths as a fallback.
- **Haze:** one static, room-fixed haze texture (an SVG turbulence mask, rasterized once) sits over the beams. A sweeping beam therefore lights uneven smoke instead of a clean shape.
- **Motion:** each fixture runs its own program, a main sweep plus a slower drift with an unrelated period.
  - Reach goes from ±6.4–9.4° to about ±11–13.5° (×0.65 on phones). It eases in from the resting pose with no velocity jump.
  - Measured peak speed: 5.9–6.2°/s, under the existing 7°/s no-snap bound, which was not changed.
  - Neighbouring beams are uncorrelated (|r| < 0.35), the arrangement does not repeat within 10 minutes, and paths cross now and then.
  - Scroll still owns the outer rigs.
- **Presence:** brightness was raised selectively: beam opacity +0.08, the mid-room volume and cores, and the centre shade over the headline (78% → 68%). Over time the headline's glyph contrast test stays above 4.5:1.

## 7. Crowd

- **Same architecture:** two canvases, a seeded layout and three depths. Density barely changed: 59 → 60 people at 1440px and 20 → 22 at 390px.
- **Bodies:** arms taper from shoulder to wrist with a slight swell and rounded joints, about 2.4 head-heights long.
  - Hands are open, fists or pointing, and only detailed in the middle row.
  - Builds vary: narrow to broad shoulders, neck widths, egg-shaped heads with jaws and ears.
  - Clothing varies: tee, hood or collar. Hair includes short, long, bun, cap, curls and ponytail.
- **Motion:** energy classes: about a quarter barely move, most groove, and about a third dance hard.
  - Moves: a knee dip on the beat, a half-beat sway, a slower weight shift and a head nod.
  - Some people slowly raise a hand and lower it again (37–70 s cycles, eased, never in unison).
  - "Both hands up" is asymmetric, so the crowd no longer forms repeated V shapes.
- **Light:** the beams now rim-light the people they pass behind, in each beam's colour and from its side. The rim fades down from the crown, so figures are no longer outlined. In reduced motion, the resting beams light the still crowd.

## 8. Atmosphere

The room-fixed haze texture, beam volume reaching the crowd line, and beam-coloured rims give the depth. The far row is hazier, the middle row crisper and the near row near-black and blurred. The existing stage glow, scroll wash and sweep are unchanged.

## 9. Phones and flashes

- **Phone screens:** 5 on desktop (4 in the middle row, 1 far back) and 2 on phones. Each is held in a gripping hand and tilts gently.
- **Camera flashes:** the existing rare timer (first ≥6 s; each phone every 22–41 s; at least 5.5 s between any two; 180 ms each) now drives a real flash. It lights only the silhouettes right beside the phone (a `source-atop` falloff of half a body), plus a tiny bloom at the lens.
  - Never full-screen and never strobing.
  - Unit test: 8–32 flashes in 3 minutes, each a fraction of a second, none when still.
  - Reduced motion: none.

## 10. Headline reflection

The same system, still driven by the real beam angles. The glints now ride the wider, independent sweeps: peak about 0.78, lit about 31% of the time over 40 s, with long clean stretches. The baseline surface keeps no band (the row-to-row step test passes) and there is no independent shimmer.

## 11. Responsive (Chromium)

Reviewed at 1920×1080, 1440×900, 1024×768, 768×1024, 390×844 and 375×812:
- Two-line headline everywhere, with no clipping and no horizontal overflow.
- The CTA is centred above the crowd, and the crowd's highest hand stays at least 24px below it (tested).
- Phones show 4 beams crossing behind a larger headline and a visible crowd.

## 12. Accessibility

- One H1 and the hero region labelled by it; the scene is `aria-hidden` and has no pointer events.
- Keyboard order, skip link and visible focus all work; reduced motion gives a complete still scene with no reflections, flashes or transitions.
- In forced colours, the decorative CTA layers are hidden.

## 13. Performance

- No new canvas, loop, listener churn or ticker. One clock tween replaces five yoyo tweens, and five blur filters are gone.
- Crowd draw submission (Chromium, DPR 1, excludes raster/composite; `artifacts/hero-final/crowd-cost.json`):
  - 1440px: median 0.2 → 0.4 ms, p95 0.3 → 0.5 ms.
  - 390px: median 0.1 → 0.1 ms, p95 0.2 → 0.3 ms.
- New GPU work: the haze mask on the beam layer (it already had its own compositing surface for the screen blend) and gradient masks on the beam pseudo-elements.
- No physical-device FPS or battery measurement was made.

## 14. Checks (all run, results as observed)

- TypeScript (workspace `npm run typecheck`): passed.
- ESLint on every edited and new file: passed. Full-project ESLint: 1 error, the pre-existing `apps/web/src/components/music/MusicDock.tsx:24` (`react-hooks/set-state-in-effect`); not mine, left untouched.
- Unit tests (`tests/beams.test.ts`, `tests/crowd.test.ts`, `tests/headline-reflection.test.ts`): 12/12 passed.
- Browser, dev :3000: 11 specs (hero-lighting, headline-reflection, hero-scene, hero-crowd, hero-cleanup, hero-intro, hero-gallery, buttons, site, visual-identity, cinematic-motion) gave 93 passed, 5 failed. Plus hero-cta: 11/11.
  - The 5 failures are `site.spec.ts` "real submission" (reservations, private-parties, catering, contact, jobs). Cause: no API is listening on :4000 in this session, so the `/api/v1` rewrite returns "Internal Server Error". This has nothing to do with the hero.
- Production `npm run build` (API + web): passed.
- Browser, production :3100: hero-cta, hero-scene (including layout shift at 1440 and 390), hero-crowd, hero-intro and headline-reflection gave 37/37 passed.

## 15. Evidence (`artifacts/`, ignored by git)

- `hero-final/before/` and `hero-final/after/`: all six sizes, three frames each.
- `hero-final/production/`: production captures and the 2× CTA border catch.
- `hero-final/recordings/`:
  - `session-1440.webm`, `session-390.webm`: fresh load with the full intro, 28 s of the room (two cycles of the slowest sweep), CTA hover (desktop), keyboard focus, scroll through the hand-off and reverse.
  - `reduced-1440.webm`, `reduced-390.webm`.
  - Stills for each step.
- `hero-final/motion/`: 40 s angle/glint/CTA samples (`motion-1440.json`), hover and glint stills.
- Recorded by the test runs: `hero-lighting/recordings/after-{1440,390}.webm` (two cycles, scroll, pause/resume, reduced motion) and `headline-reflection/two-cycles-{1440,390}.webm`.

## 16. Known limitations

- **The crowd is still procedural.** It is clearly more human than before (proportions, hands, independent energy, beam-driven light), but at close inspection it remains a stylised silhouette illustration, not photographic footage. If the client wants a truly photographic crowd, the next step is licensed nightlife footage or real Jimmy O's footage, never presented as the venue unless it is.
- **Browser coverage:** only Chromium was used (Playwright headless, phones emulated). Safari, Firefox and real devices were not tested; the `cqh`/`tan()` beam widths have a `vw` fallback.
- **API down:** the 5 form-submission tests need the API on :4000, which was not running.
- **Nothing committed or pushed.** `tests/beams.test.ts` is not in the root `npm test` script; neither was `tests/crowd.test.ts`.
