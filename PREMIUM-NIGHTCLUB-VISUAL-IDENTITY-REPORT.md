# Premium nightclub visual identity — report

**Status (November 16, 2026): implemented.** The client approved Midnight Ember and all four audit fixes (calmer hero, lifted photography, navigation and gaps, gallery burst and eyebrows). Sections 0–3 record the audit and the comparison that led to the decision; sections 4–9 record the implementation and its verification.

Review page from the decision stage, with every comparison image: https://claude.ai/artifact/YJQn7ufQ8TRmCVfeCDCbrF (private to the project owner).

## 0. Checkpoint

`artifacts/checkpoints/pre-visual-identity-2026-11-16.tar.gz` (81 MB): the whole project except `node_modules`, `.next`, `test-results`, `artifacts` and `docs/screenshots`, taken before any change. Restore with `tar -xzf` from the project root. (The project is not a git repository, so this archive is the checkpoint.)

## 1. Initial design audit (Phase 1)

**Method.** The running site (dev server, Chromium via Playwright) captured section by section as a visitor sees it, at the seven requested sizes (360×800, 390×844, 768×1024, 1024×768, 1440×900, 1728×1117, 1920×1080): 13 homepage sections, the open navigation menu and 10 internal pages per size, 175 captures, with a contact sheet per size. Scroll recordings of the whole homepage, intro included, on desktop (1440×900) and phone (390×844), plus a frame sheet of the desktop recording. No page errors in any capture. Tools: `scripts/visual/capture.mjs`, `record.mjs`, `frames.mjs`. Files: `artifacts/visual-identity/baseline/`.

**Findings**

1. **One colour does every job.** Purple is the primary CTA, eyebrow text, glows, strings, menu background, tags, active states and focus ring, so nothing is emphasised. It also clashes with the venue's own photography, which is warm: red neon, amber cocktails, skin tones, teal booths.
2. **Hero light.** The band behind the fluted glass reads as a flat purple-and-white gradient stripe. Its white core runs directly behind "AFTER DARK", so the headline relies on text shadow. The four floating labels with connector lines and the logo orb read as interface parts and compete with the two CTAs.
3. **Over-darkened photography.** The Specials photograph sits under a heavy purple overlay. Every internal page's intro photograph is darkened and tinted until the subject is hard to see (e.g. Gallery, Reservations, Private parties).
4. **Specials leaves a long empty band** of dark space before Events: about 170 px on desktop, more on phones.
5. **Gallery burst spills over.** The gallery ring's opening "burst" pushes large cropped cards across the bottom of the Celebrations section mid-scroll (desktop recording, 33 s).
6. **Navigation is split.** Desktop shows eight links plus a menu button holding the rest; Nightlife, About and Contact are reachable only through that menu.
7. **Design tokens.** Colour is mostly tokenised (`--accent` 104 uses, `--accent-readable` 49, 48 `color-mix` derivations), but hard-coded purples, lavenders and navy shades bypass the tokens (first estimated at about 25; measured during implementation: 89 uses of 73 distinct values); three tones are set from JavaScript (`FoodCarousel` category lights, `SignatureShowcase` guide-arc stops); and the button colour doubles as a light source in five places (Signature glow, footer glow, strings haze, round link shadow, hero band). A palette change therefore needs these routed through tokens first, and a separate glow token.
8. **Smaller inconsistencies.** Eyebrow treatments vary by section (plain tracked capitals, a leading rule, an index "01" with no "02").
9. **Keep as is.** The Syne and Manrope type system, the section choreography and handoffs, the interactive strings, Signature Selections, the night-out film, the compact footer, reduced-motion support and performance (Lighthouse mobile Performance 100, CLS 0, measured earlier today).

## 2. Three theme previews (Phase 2)

Each direction is a stylesheet injected over the live build (`artifacts/visual-identity/themes/`): it redefines the brand tokens, routes the hard-coded purples through them (`shared.css`), and art-directs the hero light. All three use the same hero changes: band 15% dimmer and narrower, deeper shade behind the headline. Same layout, photography, type and motion. Captured at 1440×900 and 390×844 on the hero, navigation bar and menu, buttons, Food & Drinks, Signature Selections, strings, night-out film, gallery, visit and footer, beside the current site. Files: `artifacts/visual-identity/preview-*`, comparison grids `compare-*.jpg`.

| Role | A · Midnight Ember | B · Midnight Chrome | C · Velvet Noir | Current |
|---|---|---|---|---|
| Page | `#090B0D` | `#07090C` | `#0A0708` | `#090910` |
| Surface | `#17191D` | `#10151B` | `#150F11` | `#10101c` |
| Text | `#F6F3EE` (17.8:1) | `#EEF2F5` (17.7:1) | `#F4EDE4` (17.3:1) | `#f8f4ff` |
| Muted text | `#A9A49C` (8.0:1) | `#9AA6B2` (8.0:1) | `#AB9F95` (7.8:1) | `#b8b4c6` |
| Detail and labels | champagne `#D1AF88` / `#E3C7A2` (12.2:1) | muted cyan `#8FB7C6` / `#B9D5DF` (13.0:1) | gold `#B8955F` / `#D8BE91` (11.2:1) | `#bd85fa` / `#d2a7ff` |
| CTA fill / text | ember `#C2412E` / ivory **4.64:1** | silver `#DDE3E8` / ink 15.1:1 | burgundy `#7B1F2E` / ivory 8.7:1 | `#6e32a8` / 7.2:1 |
| CTA against page | 3.8:1 | 15.4:1 | **2.0:1** | 2.5:1 |
| Glow | ember light `#E6533F`, crimson `#7E2A1F` | midnight blue `#1C3550` | deep burgundy `#5C1626` | `#9259c5` |
| Cool depth | steel `#52758A` | `#3E6E86` | plum-charcoal `#4A3A44` | indigo `#4b5bd6` |

Contrast is WCAG 2 relative luminance, computed for each pair.

**One correction to the brief's palette.** Ember `#E6533F` with ivory text is 3.34:1, which fails AA for the 12 px button labels. Midnight Ember therefore uses a deeper ember, `#C2412E`, for CTA fills (4.64:1) and keeps `#E6533F` for light, glow and large type.

**Fairness note.** In Chrome the button is silver, and the site derives five glows from the button colour, so the first Chrome render showed grey fog (strings, Signature, footer). Those glows were re-pointed to Chrome's cool light and Chrome was re-captured before comparing.

## 3. Recommendation

**Midnight Ember**, validated against the other two:

| Criterion | Ember | Chrome | Velvet |
|---|---|---|---|
| Fit with the venue's photos | Strong | Weak (cool against warm images) | Good (echoes the red neon) |
| Nightlife energy | Strong | Medium (polished, a little cold) | Medium (lounge pace) |
| Coastal California bar | Strong (sunset warmth, sea-night steel) | Medium (reads as a city club) | Weak (hotel bar, wine lounge) |
| CTA clarity | Clear (4.6:1, distinct hue) | High contrast, but reads as a secondary control | Recedes (2.0:1 against the page) |
| Hero light | Believable stage light | Elegant but icy | Rich but heavy |
| Main risk | Reads as "red" if ember spreads beyond action | Generic dark-tech look | Hotel, casino or fine dining |

With four rules, so it never becomes "purple replaced by red":

1. Ember appears only where there is something to press (CTAs, the selected tab, the active state).
2. Champagne carries detail: eyebrows, strings, rings, hairlines, focus.
3. Steel blue is depth only (hero haze, the film's cool light), never text.
4. A separate glow token, so lighting no longer depends on the button colour.

## 4. Final colour tokens

`apps/web/src/styles/tokens.css`. Token names that components already use are kept, so every component picked up the palette from one place; three were renamed for meaning (`--purple` → `--crimson`, the night-out section's `--night-blue` → `--steel`, now global) and five were added.

| Token | Value | Role |
|---|---|---|
| `--background` | `#090B0D` | Midnight: the page |
| `--surface` / `--elevated` | `#17191D` / `#202328` | Carbon: cards, panels, inputs |
| `--text` | `#F6F3EE` | Ivory (17.8:1) |
| `--muted` | `#A9A49C` | Secondary copy (8.0:1) |
| `--accent` | `#D1AF88` | Champagne: rules, rings, strings, hairlines, highlights |
| `--accent-readable` | `#E3C7A2` | Champagne for small text: eyebrows, labels (12.2:1) |
| `--button` | `#C2412E` | Ember, **actions only** (ivory label 4.64:1, AA) |
| `--button-hover` | `#A9372A` | Ember, pressed |
| `--glow` *(new)* | `#E6533F` | Ember light: glows and display gradients, never small text |
| `--crimson` *(renamed)* | `#7E2A1F` | Deep warm glow |
| `--steel` *(renamed, now global)* | `#52758A` | Cool depth: hero haze, carousel drinks light; never text |
| `--amber`, `--spot`, `--spot-core` *(new)* | `#D9714A`, `#EFBE8C`, `#F8E3C6` | The hero's stage light |
| `--border` | `#2A2C31` | Hairlines |
| `--focus` | `#F0D3AC` | Focus ring |

Of the 89 tinted colour literals in `globals.css` (73 distinct purples, lavenders and navy shades; the audit's first count of about 25 missed the single-use ones), 86 now derive from these tokens. The three left are the semantic success and error colours and the photo viewer's neutral near-black dim. The carousel's three category lights (`FoodCarousel.tsx`, literal because GSAP interpolates them) and Signature's guide-arc stops (`SignatureShowcase.tsx`, now `var(--accent-readable)`) follow the palette. Lighting no longer borrows the button colour: the Signature glow, footer glow, strings haze and the film's round-link shadow use `--glow` or `--crimson`.

## 5. Typography and component treatments

- **Type system unchanged:** Syne for display, Manrope for text; sizes, weights and line heights as before.
- **One eyebrow system.** Every section label is the same object: Manrope 600, 12 px (11 px on phones), 0.24 em tracking (0.2 em on phones), uppercase, readable champagne. Left-aligned labels lead with a 28 px champagne rule (22 px on phones); centred labels sit between two. This replaces five variants: plain labels, a leading rule at a different size, the night-out "01" index (no sequence followed it, so the number is gone and its rule kept), Signature's pill and the ✦ glyph.
- **Buttons:** ember fill with ivory label; outline buttons have a champagne edge on a translucent carbon fill; the hover sweep and the directional arrows are unchanged.
- **Headline gradients:** "RHYTHM." and "OUT." run champagne → ember light (they previously ended in purple and indigo).
- **Surfaces and overlays:** carbon panels, page-colour overlays without a colour cast, champagne hairlines; the menu dialog takes a faint crimson glow in its corner.

## 6. Hero art direction

**Superseded the same day by the hero rebuild (HERO-NIGHTCLUB-REBUILD-REPORT.md),** which keeps this palette and these mechanics and goes further: the light band moves behind a dancing crowd, ceiling beams and scroll lighting are added, and the captions are removed. Kept for the record:

The fluted glass, light motion, logo orb, intro sequence and CTAs are unchanged in mechanics (`HeroLight.tsx`, `lightField.ts`, `HomeMotion.tsx` timing untouched).

- **Light:** the band behind the glass is now stage light: a warm champagne core through amber into crimson edges, with a faint steel fringe. It is narrower (54% of the hero, 36% on phones, from 62% and 40%) and 15% dimmer.
- **Haze:** steel blue rising from the floor on the left, a little ember on the right.
- **Shade:** the darkening behind the headline is deeper (78% from 64%) and wider, so the light frames the headline instead of crossing it.
- **Less clutter:** the four connector lines are gone; the four labels ("DJ experiences", "Karaoke nights", "Catch the game", "Drinks & good company") are quiet tracked captions with a small warm light instead of boxed chips; the drifting dots are dimmer (0.36 from 0.5).

## 7. Photography, navigation, gallery and spacing

- **Photography:** internal page intros at 82% brightness (from 55%), with darkening only where the text sits (lower left) and under the header. The Specials photograph keeps its subject visible down to a short fade at its foot; its side tint covers the copy, evenly on tablets and phones, where the copy spans the photograph. No saturation or sharpening was added.
- **Specials → Events:** the Specials copy's bottom padding is 104 px (from 130 px), and with the shorter fade the photograph carries further, so the dark band between the sections is gone. The section join is unchanged (no overlap, no negative margin).
- **Header bar:** nine destinations: Menu, Drinks, Nightlife, Events, Specials, Parties, Gallery, About, Contact, plus Book a Table (Reservations). Catering and Jobs moved to the full menu, which still lists all twelve pages unchanged. The compact footer stays free of navigation, as designed earlier (its tests require that). Fit, measured by `scripts/visual/header-fit.mjs` at 12 desktop widths: one line everywhere, 12 px type from 1280 px (62–259 px of space on each side), 11 px from 1100 to 1279 px (at least 54 px each side); below 1100 px the menu button carries the links, as on tablets. Before, 10 px type was used between 1001 and 1200 px.
- **Gallery burst:** fixed in the animation (`HomeGalleryMotion.tsx`), not by clipping. Each card's start state is fitted to its own section: from its slot at the burst, its vertical push and, only where there is no room, its enlargement are limited so the enlarged, tilted card stays inside the section with 16 px to spare. Horizontal push, tilt, dimming, spin and orbit are unchanged, and the fit is re-measured before every ScrollTrigger refresh. Measured by `scripts/visual/gallery-burst.mjs` through the settle: before, cards reached 152 px (1440×900), 173 px (1920×1080), 106 px (1024×768) and 68 px (768×1024) above the section's top and up to 49 px below its bottom; after, at every size every card stays inside.

## 8. Verification

All in Chromium via Playwright on macOS, November 16, 2026.

- **Lint, typecheck, production build:** pass. Unit tests (`tests/strings.test.ts`): 6/6.
- **Full browser suite on the dev server** after the identity work: **113 passed, 5 failed**. The 5 failures are the real form submissions (`site.spec.ts` "real submission …"), which need the API on :4000 and its PostgreSQL database; neither was running (Docker was not started in this session). No existing test was changed for the redesign, apart from the two that encode the hero link's target (earlier today) and the caption check rewritten for the hero rebuild.
- **New `tests/browser/visual-identity.spec.ts`** (5 tests):
  - the header's nine links on one line, with at least 40 px either side and type of at least 11 px, at seven widths from 1100 to 1920 px;
  - the menu button with all twelve links below 1100 px;
  - the gallery burst inside its section through the settle at four sizes;
  - the ember CTA's label contrast of at least 4.5:1;
  - every homepage eyebrow identical in font, size, weight, tracking, colour and case;
  - the hero clear of connector lines and captions;
  - the internal page intros at 82% brightness.
- **Production build** (:3100), full suite after the identity work: **118 passed, 5 failed**, the same five form submissions (in production they also meet the API's :3000-only origin allowlist).
- **Measured scripts:** header fit (`scripts/visual/header-fit.mjs`) and gallery containment (`scripts/visual/gallery-burst.mjs`), §7; colour literals counted from the checkpoint, §4.
- **Lighthouse:** measured after the hero rebuild, on the combined result (HERO-NIGHTCLUB-REBUILD-REPORT.md §7).

## 9. Screenshots and recordings

- **Before:** `artifacts/visual-identity/baseline/`, with 175 captures (13 homepage sections, the open menu and 10 internal pages at each of the seven sizes), a contact sheet per size, and the desktop and phone scroll recordings with a frame sheet.
- **After the identity work:** `artifacts/visual-identity/after/` (the same 175 captures and sheets), plus side-by-side pairs `artifacts/visual-identity/before-after-*.jpg` for the hero, the menu, Celebrations (the gallery overlap), the Gallery page intro, and the phone hero and strings.
- **Theme previews:** `artifacts/visual-identity/preview-*` and `compare-*.jpg`.
- **Final hero and recordings:** `artifacts/hero-rebuild/`.

## 10. Remaining issues and client dependencies

- **Photography the client should supply:** karaoke, game-day and DJ-booth photos (none exist in the project), and high-resolution originals of the venue photos (most are 800 px).
- **Navigation change to confirm:** Catering and Jobs moved from the header bar to the full menu (still one tap from every page). Reverting is one array in `lib/navigation.ts`.
- **Not verified:** Safari, Firefox, real devices and a screen-reader pass; real form submissions this round (the API and database were not running).
- **Environment:** the dev server process was restarted twice during the session by something outside it (new `next-server` processes at 20:17 and 21:57). One in-flight test logged connection-refused errors from the first restart and passed when re-run.
