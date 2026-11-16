# "Every night has a rhythm" — the playable strings section

November 16, 2026. A new homepage section, `#experience`, placed immediately after the hero: four violet strings cross a dark room with seven Jimmy O's photographs clipped onto them. Every string can be pulled, plucked, strummed or played from the keyboard. It answers with movement, light and — only if the visitor turns sound on — a soft plucked note. Each photograph links to the page it represents.

The hero, header, navigation, fonts, colour tokens and every other section are unchanged, with one exception: the hero's small "Discover Jimmy O's ↓" link now leads to this section, the first one after the hero, instead of skipping it (§2).

## 1. What changed

**New files**

| File | Responsibility |
|---|---|
| `apps/web/src/components/strings/ExperienceStringsSection.tsx` | Section layout, heading, sound control, the four "peg" buttons, lifecycle (client component, fully server-rendered). |
| `apps/web/src/components/strings/InteractiveStrings.tsx` | One layout's strings as SVG (rest paths, glow layers, hover highlight, pulse dashes, hit area). |
| `apps/web/src/components/strings/ExperiencePhotoCard.tsx` | A photograph clipped onto a string: bead, thread, print, caption link; per-layout placement as CSS variables. |
| `apps/web/src/lib/experience.ts` | Verified content (photos, labels, destinations), the four string voices, the three compositions (desktop, tablet, phone). |
| `apps/web/src/lib/strings/geometry.ts` | Bézier sampling, normals, smooth paths, nearest point. Shared by server render and physics. |
| `apps/web/src/lib/strings/physics.ts` | `StringModel`: the modal spring–damper string (§4). DOM-free. |
| `apps/web/src/lib/strings/instrument.ts` | Binds a layout's SVG and cards to the physics: pointer, touch, strum, hover, responses, one ticker callback. |
| `apps/web/src/lib/strings/scene.ts` | Scroll choreography: entrance, depth, exit. |
| `apps/web/src/lib/strings/audio.ts` | `PluckSynth`: Karplus–Strong plucked string over Web Audio (§5). |
| `apps/web/src/hooks/useStringInstrument.ts` | Builds instrument + scene per layout and motion preference inside `gsap.matchMedia`; tears everything down. |
| `apps/web/src/hooks/usePluckAudio.ts` | Sound on/off state; creates audio only on the visitor's click; closes it on unmount. |
| `tests/strings.test.ts` | Unit tests: physics, geometry, tuning of every note, content and destinations. |
| `tests/browser/experience-strings.spec.ts` | Browser tests (§8). |
| `scripts/motion/strings-capture.mjs`, `strings-layout.mjs`, `strings-entrance.mjs`, `strings-heap.mjs` | Evidence scripts: section screenshots, composition check across 16 widths, entrance contact sheet, memory/listener check. |

**Modified files**

| File | Change |
|---|---|
| `apps/web/src/app/page.tsx` | Renders `<ExperienceStringsSection/>` as the first section of the panel that rises over the hero. |
| `apps/web/src/components/SiteSections.tsx` | The hero's "Discover Jimmy O's" link: `#discover` → `#experience`. Text, look and motion unchanged. |
| `apps/web/src/app/globals.css` | A new block at the end (`.night-strings`, `.ns-*`), brand tokens only; one scoped rule fades the next section's lights in below its top edge (§2). |
| `package.json` | `npm test` also runs `tests/strings.test.ts`. |
| `tests/browser/cinematic-motion.spec.ts`, `tests/browser/buttons.spec.ts` | The Discover link's expected target is now `#experience`; the "hold has ended" check reads the panel's first section rather than `#discover` by name. |

No dependency was added: the physics, the sound and the SVG are written for this section with what the project already had (React, GSAP/ScrollTrigger, Lenis, Next Image, Lucide).

## 2. Placement and joins

The section is the top of `.scene-cover`, the full-bleed panel that rises over the held hero on desktop and tablet (`.hero-hold`). As the panel rises, the section's own entrance plays, so the hero hands over to a dark room in which the strings appear. "More than a night out" (`#discover`) follows unchanged.

Joins follow the project's rule (real layout, no overlaps, no negative margins; see the night-out and Signature reports):

- **Top:** the panel's top edge is dark; the section's light rises inside it (a vertical mask on `.ns-atmos` brings the glows in from 16% and out again by 97% of the section).
- **Bottom:** strings fade into the dark at both sides (horizontal mask) and the section ends on breathing space. The film section's own lights used to start at its top edge, which was fine while that edge was the rising panel's but would now be a visible line between two dark sections. One scoped rule, `.night-strings + .night-out .night-out-light`, fades those lights in over the first 160–260 px of that section instead. Measured on screenshots at 1440 and 390 px: the brightness step across the join is 0.42 and 0.37 (of 255), i.e. no seam.

## 3. Content and media

Seven approved client photographs (ASSETS.md: retrieved from the official Jimmy O's site; rights to be confirmed by the client before launch, as for the rest of the site). No stock, no generated imagery, no new claims: every label restates content already verified for the site (CONTENT-SOURCES.md, menus, page copy).

| # | Photograph | Label | Destination |
|---|---|---|---|
| 01 | `gallery-1.jpg` — dance floor under the disco ball | Nightlife · DJs & weekend dancing | `/nightlife` |
| 02 | `hero.jpg` — a cocktail being poured | Drinks · Pitchers, pints & pours | `/drink-menu` |
| 03 | `burger.jpg` — Classic Burger with seasoned fries | Food · Burgers, tacos & flatbreads | `/food-menu` |
| 04 | `gallery-2.jpg` — friends under red lights | Specials · Good timing. Great nights. | `/specials` |
| 05 | `venue.jpg` — teal booths in the lounge | Reservations · Request a table | `/reservations` |
| 06 | `gallery-6.jpg` — a lively night at the bar | Events · What's coming up | `/events` |
| 07 | `gallery-4.jpg` — a celebration under the neon sign | Private parties · Big moments. Your people. | `/private-parties` |

Alt texts reuse the site's existing descriptions where they exist. Every destination is an existing route (checked by the unit test and by HTTP 200 in the browser test).

**Still needed from the client**

- **Karaoke** and **game-day / football Sunday** photographs. Both are verified experiences, but no photograph of either exists in the project, so neither has a card (no stand-in imagery was used). A new card is one entry in `experienceMoments` plus a placement per layout in `instrumentLayouts`.
- **Live entertainment / DJ booth** photography: "DJs & weekend dancing" currently uses the dance-floor photo, which shows the crowd and lighting rather than a DJ.
- **High-resolution originals** of all seven (the supplied files are 800 px, or 1200–1280 px for the two landscape images). They are sharp at the sizes used (at most about 300 px wide on desktop, 210 px on phones), but 1600 px originals would be better on high-density screens.

## 4. The strings — physics

Each string is a cubic Bézier at rest, sampled at 57 points with a unit normal at each. Its displacement along those normals is a sum of its first twelve natural modes,

  u(s, t) = Σ aₘ(t) · sin(m π s),  s ∈ [0, 1], fixed at both ends,

and every mode is an independent damped spring, aₘ″ = −ωₘ² aₘ − 2 ζₘ ωₘ aₘ′ (modal synthesis). This gives, by construction:

- **Elastic displacement and restoring force:** ω² pulls every mode back to rest.
- **Natural oscillation:** mode frequencies are multiples of the fundamental (with a touch of stiffness, so higher modes run slightly sharp, as on a wound string).
- **Damping and smooth settling:** ζ₁ = 0.085, plus 0.022 per higher mode, so a sharp pluck rounds off into the fundamental within a few swings and fades over about three seconds. When nothing is left to see, the string snaps back to its exact server-rendered curve and stops being simulated.
- **Different intensities:** a click is a fingertip strike (≈42% of the string's reach); a drag holds the string in the pulled shape (a triangle expanded in the modes, scaled to pass exactly through the pointer, and followed with a 70 ms critically damped lag) and releases it from there; a pull beyond the reach makes the string slip from the finger, a full pluck; a strum strikes each crossed string by the pointer's speed; a tap on a phone is a medium strike.
- **Limits:** the reach is 92 units on desktop, 80 on tablet and 46 on phones, so prints never collide (checked by the layout test with prints at rest and their row spacing).

Integration is semi-implicit Euler in fixed 1/600 s substeps (stable for every mode). Stepping four strings costs a few hundred multiplications per frame.

**Prints** are clipped on: a print follows its string's displacement at its anchor rigidly (the bead stays on the string), and its angle follows the string's local slope through its own spring (ω ≈ 1.5 Hz, damping ratio ≈ 0.4), so it lags, sways a few degrees and settles. Angles are capped at ±7°.

**Rendering:** one GSAP ticker callback runs only while something moves and removes itself when everything is still; an idle section costs nothing per frame. It writes SVG `d` attributes and `transform`s only, never React state. Strokes stay the same thickness on screen at any size (`--u`, units per pixel, from a ResizeObserver). Off screen (IntersectionObserver), nothing runs and everything is reset to rest.

## 5. The sound

- **Off by default.** No `AudioContext` exists until the visitor presses **Enable sound**, a user gesture, so no browser blocks it and nothing can autoplay. The button shows its state (icon, "Enable sound" / "Sound on", `aria-pressed`); pressing it again fades out and suspends the context. Without Web Audio the button reads "Sound unavailable" and is disabled; everything else works.
- **Only intentional plucks play:** a click, drag-release, strum or tap on a string, or a peg button. Hover, scrolling (wheel or touch) and the entrance's shimmer never play.
- **Voice:** each note is rendered once, on enable, with the **Karplus–Strong** plucked-string algorithm (softened noise in a one-period delay line, low-passed on every pass), with a first-order all-pass for exact tuning (all four notes within 0.02 cents, unit-tested). Lower strings ring longer. Nothing is sampled or licensed.
- **Notes:** B3, F♯3, D3, A2, top to bottom: a D6/9 voicing, so any combination is consonant.
- **Playback:** a velocity-dependent low-pass (soft plucks are darker), a small body resonance, stereo placement from where the string was plucked, a short synthetic room, a compressor, and a quiet master level. Re-plucking a ringing string damps its previous note first (as a finger does); other strings ring on; at most eight voices. Nodes are disconnected when each note ends; the context is closed when the section unmounts.
- The page's other media (the muted film) are untouched.

## 6. Interaction map

| Input | Result |
|---|---|
| Pointer near a string | It brightens; a highlight follows the pointer along it. No sound. Cursor: grab. |
| Hover or focus a print | The print straightens and brightens; its own string answers with light and a tiny movement. No sound. |
| Click a string | A pluck where you clicked. |
| Drag a string | It bends to the pointer; release to pluck (strength = how far). Past its reach it slips and plucks. |
| Press on empty stage and drag across strings | Strum: each crossed string is plucked by your speed. |
| Click a print | Navigates to its page. A press on a print never plucks; a drag that starts on a string or the stage and ends on a print never navigates (pointer capture). |
| Tap a string (touch) | A pluck. Swipes scroll natively and never pluck (a pluck needs a still, short tap). |
| Peg buttons B, F♯, D, A (keyboard, touch, mouse) | Pluck that string. |

"The Night Responds": every pluck rings the string, sends a pulse of light from the pluck to both ends, sways and lights its prints, and brightens the room around the pluck for about a second and a half.

## 7. Choreography, responsiveness and accessibility

- **Entrance** (once, when the section's top reaches 72% of the viewport): the room's light comes up; the eyebrow wipes in and the headline words rise through their masks; lede and controls follow; the strings draw themselves left to right, one after another; each print is clipped on in reading order (bead, thread, the print unrolling downward and swinging into place under the physics); captions settle; the hint appears and the strings shimmer once. Jumping past the section, or focusing anything inside it, completes it at once.
- **Depth:** only the light and the headline drift with scroll (desktop and tablet). The instrument never moves with scroll, so prints stay exactly on their strings. As the next section arrives, the room's light dims. No pinning, no scroll hijacking.
- **Three compositions:** desktop (≥1025 px: three prints on the top string, two on the next two, the low string open), tablet (701–1024 px: the same score with larger prints and taller rows) and phones (≤700 px: two prints per string, the last one alone; the composition stays at phone scale up to 480 px wide and is centred beyond). Each layout has its own SVG and its own per-card CSS variables, so the server-rendered page is already composed with no JavaScript. Composition is checked at 16 widths from 320 to 1920 px: no two prints closer than 12 px, at least 16 px from the screen edge, no horizontal scrolling.
- **Keyboard:** Enable sound, four labelled peg buttons ("Pluck the first string (B3)" …), then the seven print links in reading order, each with a focus ring drawn around the whole print. The strings themselves are decorative SVG (`aria-hidden`); the pegs are the accessible instrument.
- **Reduced motion:** no entrance, parallax, oscillation or sway; the composition is complete and still. A pluck brightens the string and its prints without moving them, and still plays a note if sound is on.
- **Touch:** `touch-action: manipulation` on the stage (native scrolling and pinch-zoom stay; only the double-tap delay goes); 46 px string hit areas; 44 px buttons.
- **Without JavaScript:** strings at rest, prints in place, every link works; the controls do nothing.

## 8. Verification

All runs on November 16, 2026, Chromium via Playwright on macOS, against the dev server (:3000) and the production build (:3100).

- **Lint, typecheck, production build:** pass (`npm run lint`, `npm run typecheck`, `npm run build`: API `tsc` and Next build of all 18 routes).
- **Unit tests** (`tests/strings.test.ts`, 6 tests): pass. Held shape, fixed ends and reach clamp; release rings through rest with every swing smaller than the last and settles exactly to rest within six seconds; strikes scale with intensity and never exceed the reach; geometry; every note in tune (measured within 0.02 cents; the test allows 3) without clipping and decaying; every photo file and destination route exists and every card hangs on its string inside the stage. The tuning test caught a real off-by-one sample in the first version of the delay line (B3 was 9 cents sharp); fixed.
- **Browser tests** (`tests/browser/experience-strings.spec.ts`, 11 tests): **11/11 on dev and 11/11 on the production build.** Placement and content (seven links, HTTP 200 for each destination, images loaded, alt text, click on a photo navigates); drag bends the string ≥ 45 px, its prints follow, release swings through rest and settles exactly on the curve; sound: no audio context or note before enabling, none from muted plucks or wheel scrolling over the strings, notes from a peg (keyboard), a click and a strum after enabling, none after muting; pressing a print plucks nothing and hovering it straightens it and lights its string; keyboard order and focus ring; reduced motion (complete and still, a pluck lights without moving); phones (a tap plucks; a touch swipe starting on a string scrolls the page and plucks nothing; no horizontal overflow); compositions at 8 widths (no overlapping prints, on screen); no layout shift from the section (< 0.01); off screen a peg plays light and sound but queues no motion, and `touch-action` keeps pinch-zoom; the strings draw on progressively and pulses travel.
- **Existing suite** (full run on dev, 116 tests including the new ones at that time): 110 passed. The 6 failures: the five real form submissions (the API on :4000 and its database were not running — Docker was off — unrelated to this change), and this section's keyboard test, whose assertions all passed but whose page logged `ERR_CONNECTION_REFUSED` when the dev server process restarted mid-run (a new `next-server` started at 20:17:59; no configuration file had changed). It passed on its own and in every later run. The specs touched by this change (`cinematic-motion`, `buttons`, `night-out`, plus this section's) then passed 37/37 on the production build.
- **Composition** (`scripts/motion/strings-layout.mjs`, 16 widths from 320 to 1920 px): every width passes; the tightest values are 12 px between prints and 16 px from the screen edge, both at 320 px.
- **Joins** (`scripts/motion/seam-profile.mjs` on screenshots): brightness step across the join into "More than a night out" 0.42 (1440 px) and 0.37 (390 px) of 255: no seam. The rising panel's top edge is unchanged.
- **Memory** (`scripts/motion/strings-heap.mjs`: ten home ⇄ gallery round trips, each time enabling sound, playing a peg and pulling a string; full GC by heap snapshot): live DOM 1,212 elements every visit, detached DOM nodes 15 → 15, event listeners 895 → 890. (A first version of the script reported growing nodes and listeners; the retainer chain ended in the inspector's remote-object group: the script's own undisposed `waitForSelector` ElementHandle pinned each old page. The script now waits with a locator.)
- **Lighthouse 13.6** on the production homepage (`scripts/motion/lighthouse-run.sh`): mobile Performance 100 ×3 (LCP 0.9 s, TBT 0–30 ms, CLS 0), desktop 100 (LCP 0.2 s), Accessibility 100, Best Practices 100. SEO 69 is the staging `noindex`, as before.
- **Visual review:** section screenshots at 1440, 768 and 390 px (`strings-capture.mjs`), the entrance as a frame sheet (`strings-entrance.mjs`), a held string, a released string ringing, and the response frames.

**Fixed during verification**

- Pulse and draw-on: GSAP rounds pixel-valued properties to whole pixels by default (`autoRound`). The dashes are measured in `pathLength="1"` units, so the rounding snapped them to the ends: the pulse never travelled and the draw-on would pop. Both tweens now set `autoRound: false`; a browser test samples the offsets mid-animation.
- Moving the pointer over a print re-ran the proximity check and cancelled the print's "string answers" light. Over a print, its own string's answer now stands.
- `touch-action: pan-y` on the stage would have blocked pinch-zoom when a gesture began over it. Touch only uses taps, so the stage uses `manipulation` (scrolling and zoom stay native; only the double-tap delay goes).
- A peg pressed while the strings were scrolled off screen queued a strike that would have played out later. Off screen, a pluck now gives light and sound only; coming back into view, the instrument settles anything pending.
- Phones: the second row read 04 before 03 (tab order runs 03 then 04). Reordered.

## 9. Limits

- Karaoke and game-day photographs are missing (§3).
- Sound was verified structurally in Chromium (context created only after enabling, notes started on plucks and never on hover/scroll/muted plucks, every note in tune offline). It was not listened to on speakers; level and timbre should get a listen on a real device before launch.
- Browsers tested: Chromium (desktop, and an emulated phone with touch). Safari/iOS, Firefox and real touch devices were not tested; the CSS used (container units, `color-mix`, individual transform properties, masks with `-webkit-` prefixes) is supported by current Safari, but that is not a substitute for a device check.
- No screen-reader session was run; the structure (labelled buttons, `aria-pressed`, decorative SVG hidden, figure + link per print) was checked in the DOM only.
- The full suite's five form-submission tests need the API and database running; they were not part of this change and were not re-run with them.
