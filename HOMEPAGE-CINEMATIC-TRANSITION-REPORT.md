# Homepage Cinematic Transition Report

**Date:** November 15, 2026 · **Scope:** the homepage between "More than a night out" (the night-out film, `#discover`) and "Find your other side" (the nightlife section).

## 1. What was removed (from the homepage, not hidden)
The text-heavy presentation under the night-out film is gone from the document. None of it is rendered and then hidden with CSS.

| Removed | Where it lived |
|---|---|
| "A neighborhood bar. A coastal hangout. A dance floor after dark. Right in the heart of Del Mar, Jimmy O's brings every side of a good night together." | `.night-out-lede` in `HomeAbout` |
| "Catch the game, sing karaoke, or dance with friends on the weekend. A laid-back coastal spirit with a little more volume." | `.night-out-aside` in `HomeAbout` |
| The **OUR STORY** button | `.night-out-aside` in `HomeAbout` |
| The large outlined background type ("GOOD COMPANY") | `.night-out-ghost` in `HomeAbout` |
| The icon row: DJ EXPERIENCES · KARAOKE NIGHTS · CATCH THE GAME · DRINKS & GOOD COMPANY | `<ExperienceStrip/>` in `app/page.tsx` |

**What went with it:**
- **Markup** (`components/SiteSections.tsx`): the `night-out-ghost` paragraph and the whole `night-out-copy` block. `HomeAbout` now ends on the film.
- **Homepage composition** (`app/page.tsx`): the `<ExperienceStrip/>` element and its import.
- **Animation code** (`components/motion/HomeMotion.tsx`):
  - the copy block's entrance timeline (lede and aside);
  - the outlined type's scroll parallax;
  - the whole `stripScene` function (the icon row's scroll drift) and its call.
- **Styles** (`app/globals.css`): every `.night-out-copy`, `.night-out-lede`, `.night-out-aside` and `.night-out-ghost` rule (base, `@media` 1024 px and 700 px variants), and `.night-out .button`, which only styled the Our Story button.

**What deliberately stays:**
- **The About page is still one click away.** The round arrow link on the film ("Discover the Jimmy O's story", `/about`) remains, so the Our Story button was a duplicate.
- **`ExperienceStrip` is still a component.** The About and Nightlife pages use it, so it stays exported (with a comment saying the homepage no longer shows it), and its `.experience-strip` styles stay. Those pages are unchanged; checked below.
- **All routes and anchors.** `#discover` is unchanged. Nothing linked to the removed elements.

## 2. The transition
The goal was a quiet, cinematic handoff from the film into the next section, with no filler, pinning or scroll hijacking.

- **What happens:** as the film scrolls away (from the moment its lower edge reaches the middle of the viewport until it leaves at the top), it:
  - recedes slightly (scale 1 → 0.94, as before);
  - darkens (the existing grade, as before);
  - **new:** narrows from the sides (4% each side on desktop, 3% on phones) while its corners soften (to an 18 px radius on desktop, 10 px on phones).

  The film settles back into the page instead of being cut off by the viewport, and "When the sun goes down / Find your other side." rises into the space below it with that section's own, unchanged entrance.
- **Why only the sides close:** the round link sits across the film's lower edge. Closing the bottom would have left the button floating below the picture, so the bottom edge stays where it is.
- **How it's built:**
  - one extra tween on the existing scrubbed `night-out-exit` timeline;
  - an explicit start value with `immediateRender: false`, so it never fights the entrance's clip-path reveal on the same element;
  - fully scrubbed and reversible;
  - no pinning, no wheel or touch handling, no extra DOM;
  - nothing runs with reduced motion: the existing `prefers-reduced-motion` branch builds no scroll scenes, and the film shows its poster.
- **Spacing:** the section's existing bottom padding gives the round link clear air before the next section's eyebrow or photograph (121–202 px, measured below). No spacer elements were added.
- **A latent bug fixed in the same scene:** the night-out entrance used a `once: true` ScrollTrigger. A passed once-trigger can kill itself during a refresh and crash GSAP (seen earlier in this project with the Food & Drinks scenes). It now plays once through `toggleActions`, which looks the same.

## 3. Unchanged
- The hero and its intro, the night-out heading and film (loading, playback, poster fallbacks, pointer lean), the nightlife section, the Food & Drinks carousel, Signature Selections, specials, events, celebrations, gallery, reviews, visit and footer.
- Navigation, Lenis and the global ScrollTrigger set-up.
- The API, database, forms, SEO metadata, sitemap, robots, JSON-LD and the staging `noindex`.

## 4. Verification
**Boundary at every required size** (`scripts/motion/transition-boundary.mjs`; the film's lower edge at 40% of the viewport):

| Size | Overlap with next section | Round link → next content | Leftovers | Horizontal scroll | Console errors |
|---|---|---|---|---|---|
| 360×800 | 0 | 121 px | 0 | no | 0 |
| 390×844 | 0 | 121 px | 0 | no | 0 |
| 768×1024 | 0 | 160 px | 0 | no | 0 |
| 1024×768 | 0 | 149 px | 0 | no | 0 |
| 1440×900 | 0 | 175 px | 0 | no | 0 |
| 1920×1080 | 0 | 202 px | 0 | no | 0 |
| 1280×640 (short) | 0 | 161 px | 0 | no | 0 |
| 1440×700 (short) | 0 | 166 px | 0 | no | 0 |

- **"Leftovers"** counts any removed element still in the document: 0 everywhere, against 5 in the old build.
- **The 1024×768 console errors in the old build** were two 500s from its stale image references, not from this section; the new build has none.

**Tests** (`tests/browser/night-out.spec.ts`, 7/7):
- **Removal:** the removed copy, button, outlined type and icon row are absent from the homepage (not hidden).
- **Section shape:** the section ends on the film, and the next sibling is the nightlife section.
- **About link:** the round link leads to `/about`, where the icon row still appears.
- **New test, the handoff:** at 360, 390, 768, 1024, 1440, 1920 and 1440×700:
  - the film's clip narrows as it leaves;
  - the round link still sits across its edge;
  - at least 80 px of clear space before the next section's content;
  - no overlap and no horizontal overflow.

**The strip's other homes:** `/about` and `/nightlife` still render the strip with its original styles (flex on desktop, a two-column grid on phones, Manrope 600). An intermediate edit had dropped its shared typography rule; it was restored and checked.

**Whole site:** see section 7 of BUTTON-MICROINTERACTIONS-REPORT.md, which records the final combined run covering this change, the Food & Drinks changes and the buttons: lint, typecheck, production build, the browser suite on dev and production, the API tests and Lighthouse.

**Evidence:**
- `artifacts/transition/before-after-desktop.png` and `before-after-mobile.png`;
- `artifacts/transition/before/` and `after/`: screenshots through the section's scroll range, plus `section-scroll-{desktop,tablet,mobile}.webm` recordings;
- `artifacts/transition/before-boundary/` and `after-boundary/`.

## 5. Files
- **Modified:**
  - `apps/web/src/components/SiteSections.tsx`: copy block and outlined type removed from `HomeAbout`; `ExperienceStrip` kept for About and Nightlife.
  - `apps/web/src/app/page.tsx`: `<ExperienceStrip/>` removed from the homepage.
  - `apps/web/src/components/motion/HomeMotion.tsx`: copy entrance, outlined-type parallax and `stripScene` removed; the side-closing handoff added to `night-out-exit`; the entrance no longer uses `once: true`.
  - `apps/web/src/app/globals.css`: obsolete night-out copy, outlined-type and button rules removed.
  - `tests/browser/night-out.spec.ts`: the content test now checks the removal (not hidden: absent) and the round link to `/about`; a new test checks the handoff at seven sizes.
- **New:**
  - `scripts/motion/transition-boundary.mjs`: measures and captures the boundary at each size.
  - `scripts/motion/compare-sheet.mjs`: builds the before/after sheets (shared with the other reports).
  - this report.
