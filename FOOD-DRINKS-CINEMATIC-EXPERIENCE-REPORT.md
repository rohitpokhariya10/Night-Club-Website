# Food & Drinks Cinematic Experience Report

**Date:** November 15, 2026 · **Scope:** the homepage Food & Drinks area, now two sections:
- **A:** a categories carousel;
- **B:** Signature Selections.

They replace the static burger and cocktail cards. Nothing else on the site was redesigned.
**Reference:** https://eatnaked.co/ ("Designed for Your Taste, Built for Your Day." and "Ingredients that matter"). The measured breakdown is in [`FOOD-REFERENCE-MOTION.md`](FOOD-REFERENCE-MOTION.md).

## 1. Placement
The homepage flow is unchanged around the new sections:

hero → night-out film → nightlife → **A: Food & Drinks carousel** → **B: Signature Selections** → specials → events → celebrations → gallery → reviews → visit → footer.

Both sections render where the old `HomeFood` did (`components/SiteSections.tsx`), so `app/page.tsx` was untouched by this work. (The experience strip that used to sit after the film was later removed from the homepage on request; see HOMEPAGE-CINEMATIC-TRANSITION-REPORT.md.)

## 2. How the reference was studied
- **Captures:** both sections in Chromium at 1440 and 390 px (screenshots, structure, session videos) after waiting out the site's 11–45 s preloader.
- **Per-frame sampling:** because screenshot bursts were too slow for these transitions, a `requestAnimationFrame` sampler running inside the page recorded every frame:
  - about 90 frames per carousel drag;
  - 157 per showcase step;
  - an ancestor trace of what actually animates.
- **Fitted eases:** cubic-beziers were fitted to the samples:
  - carousel settle `cubic-bezier(.25,1.2,.2,1.1)` over 0.62 s (RMSE 0.016; about 6% overshoot);
  - showcase turn `cubic-bezier(.7,0,.05,1)` over 1.1 s (RMSE 0.008).

  Both live in `lib/motion/config.ts` (`MEASURED_EASE`) and drive our animations through GSAP `CustomEase`.
- **Verified vs. proposed:** everything in `FOOD-REFERENCE-MOTION.md` is measured. The adaptations (arrows, tabs, keyboard, masked card headlines, sequenced copy handoff) are listed there as our additions.

## 3. Section A: Food & Drinks carousel
- **Content:**
  - **Food:** "Good food. Great company." → `/food-menu`.
  - **Drinks:** "One more round?" → `/drink-menu`.
  - **After Dark:** "Late-night bites." The description lists the After Dark menu's own items and repeats the menu's verified note "Please ask the team when the after-dark menu is available." → `/food-menu#after-dark`.

  The eyebrow and headline ("Eat. Drink. Repeat." / "A taste of the good life.") are the existing copy.
- **Composition:**
  - **Desktop:** one featured card (16:9, up to 700 px) with its neighbours at the reference's **0.8×** behind it, their photographs dimmed. The featured card carries a violet hairline edge, a readability gradient, a category eyebrow, a Syne headline, a short description and an arrow CTA.
  - **Tablet:** the same at 62vw.
  - **Phones:** a portrait card (78vw), with only the neighbours' photographs peeking in at the edges.
- **The change** is one GSAP timeline:
  1. Every card moves to its new place with the **measured 0.62 s settle** (about 6% overshoot).
  2. The card that wraps around leaves past the edge and re-enters from the other side.
  3. The outgoing headline leaves upward through its mask, and its copy fades.
  4. The incoming headline rises line by line through its masks (0.07 s apart).
  5. The description and CTA follow.
  6. The section's light shifts tone: violet for Food, indigo for Drinks, purple for After Dark.
- **Controls:**
  - **Pointer and touch:** previous/next buttons, a click on a neighbour, mouse drag and touch swipe (more than 48 px).
  - **Keyboard:** category tabs (`role="tablist"`) with ←/→/Home/End.
  - **No scroll hijacking:** vertical page scrolling stays native (`touch-action: pan-y`; no wheel handling).
  - **Clean resting state:** a drag never follows a link, and rapid clicks finish each change before the next.
- **Entrance (once):** the heading rises through its masks, the neighbours fan out from behind the featured card and the controls follow.

## 4. Section B: Signature Selections (rebuilt for realism)
### Why the first version looked artificial (root cause)
A side-by-side at 1440×900 (`artifacts/signature-rebuild/compare-before.png`) showed the problem was the **photography and its framing, not the motion**:
- **Wrong kind of image.** The reference shows a **top-down plate photographed on its own**: its rim is the edge, and turning it reads as a plate turning. Ours were **angled scene photographs** (a burger on veined marble; nachos and wings on printed newspaper) **forced into a circular mask**, so turning them read as a wheel.
- **Too small.** The dish took about 44% of the viewport width against the reference's ~56%.
- **Pushed down by text.** Six stacked lines of text (eyebrow, headline, category, title, description, CTA) sat above the plate, against the reference's pill and title.

### What changed
- **Imagery** (details in section 6):
  - burger: Jimmy O's own photograph, re-processed;
  - nachos, wings and pitcher: openly licensed placeholders from Wikimedia Commons, chosen for plates on dark surfaces. The wings are a true top-down shot.
  - No newspaper or marble-in-a-circle remains.
- **Integration instead of a mask:**
  - each photo is art-directed (`scripts/assets/process-featured.mjs`): a crop centred on the dish, a gentle grade, and the surroundings sunk toward the page colour with a long, soft falloff;
  - on the page, a wide elliptical fade completes inside the image, so no rectangular or circular edge is ever visible; the **plate's own rim** is the edge;
  - the dish rises from the section's lower edge into a real bottom fade (the section's height covers the visible part; nothing overlaps the next section).
- **Scale like the reference:**
  - every dish is sized from its **measured plate width** (`image.plate`), so all four render at the same scale;
  - the plate is **60% of the viewport width at 1440×900** (864 px; 1037 px at 1728×1117), and also follows viewport height (1440×700 still fits). See "Rebuilt to reference quality" below.
- **Hierarchy like the reference:**
  - a compact pill (the section's h2), the dish name in Syne, one line of verified description, the menu CTA and a restrained four-dash selection indicator;
  - the separate large "SIGNATURE SELECTIONS" heading and the category line were removed.
- **Labels:**
  - three per side on the reference's arc (40°, 51°, 63° from vertical), at 1.24× the plate radius so they never cover the food (checked by test);
  - Manrope chips (13–15 px, 48 px tall) with a violet dot;
  - extremely faint spokes and dashed rings.
- **Controls:** round 62 px previous/next buttons on the lower spokes (78°) at the plate's sides.
- **Tablets and phones (≤1100 px):** the whole dish, its details as a chip row, the arrows and a counter.

### Rebuilt to reference quality (the latest pass)
The second request asked for the dish to be bigger, more realistic and more premium, with a stronger title and the reference's composition, without breaking the layout.

- **Realism: plates cut out along their rim.**
  - The nachos and wings are now **isolated objects**: `scripts/assets/process-featured.mjs` cuts each along its plate's measured rim (an ellipse, feathered by about 0.15% of the width) into a **transparent WebP**.
  - On the page they carry a **two-layer drop shadow** instead of a soft-edged mask, so they sit on the page like the reference's bowl rather than fading into it.
  - The burger and the pitcher keep the radial falloff and soft elliptical fade. The pitcher is glass with no rim to cut along, and the burger is the client's own low-resolution photograph.
- **Scale:**
  - `--d: clamp(560px, min(60vw, 96svh), 1060px)`, up from `clamp(520px, min(56vw, 94svh), 860px)`;
  - **864 px at 1440×900** (60% of the width, up from 806 px) and **1037 px at 1728×1117**;
  - tablets `min(70vw, 560px)`, phones `min(84vw, 400px)`.
- **Title:** the dish name is set in Syne at the display weight, `clamp(32px, 3.5vw, 62px)` with tighter tracking (50 px at 1440, up from 45 px at the heading weight).
- **Detail chips and controls:** larger and calmer:
  - chips 48 px tall (from 40 px) with 14 px corners and 13–15 px text;
  - arrows 62 px (from 56 px).
- **Layout stays stable at the new size:**
  - the stage reserves `0.8 × d` and the scene fades out inside it (the collapse fix below);
  - the boundary script and the never-collapses test were rerun at the new scale.
- **Evidence:**
  - `artifacts/signature-rebuild/reference-before-after-1440.png`: the reference, the first rebuild and this pass;
  - `artifacts/signature-rebuild/final-v3/`: every dish at rest and mid-change, at each test size, from the production build.

### The change (measured choreography kept)
- **Timing and direction:** the fitted **1.1 s** ease, direction-aware (next turns clockwise; previous reverses, checked both ways by test).
- **Turn about the plate's centre:** each dish turns around its **plate centre** (`transform-origin` from the measured geometry), not the photo's centre.
  - **The wings** (top-down) turn the reference's full **90°**.
  - **The angled burger and nachos** swing **16°**, and the pitcher **12°**, so they read as a plate or glass turning rather than a photograph spinning.
- **Depth and handoff:**
  - the outgoing dish eases back in depth (0.93×) as it fades;
  - a soft light swells behind the plate at the changeover (no flash, no empty frame);
  - labels swap with the reference's 10 px outward drift;
  - the copy hands off in sequence.

  Frames at rest and mid-change for every dish are in `artifacts/signature-rebuild/states/`.
- **A bug found and fixed while rebuilding:** the change's cleanup cleared the dish's *entire* inline style (`clearProps: 'all'`), which also removed React's plate-geometry variables and collapsed the next dish to 0×0. It now clears only the animated properties, and a regression test cycles all four dishes and checks each keeps its geometry and image.

### The collapse into the next section (found in review, fixed at the layout level)
- **What it looked like:** at desktop widths, the bright burger and fries were cut off mid-dish exactly where the next section ("Make an early night of it", the specials photo) begins, so the food appeared to collapse into it.
- **What it was not:** the boxes never overlapped (measured gap 0 at every width and scroll position), and nothing translated the next section.
- **Root cause:** the scene was larger than its layout box. The stage reserved only the top 64% of the dish's height (`0.64 × d`). The remaining ~295 px of the dish layer hung below the section and was cut by `overflow: hidden` at the boundary. A short 190 px overlay fade started too late to hide the cut, and the next section's full-bleed photo begins flush against that edge.
- **Fix (`app/globals.css`, `components/SignatureShowcase.tsx`):**
  1. The stage now **reserves the visible dish and its entire fade** (`0.8 × d`).
  2. The dish lives in its own static layer (`.sig-scene`), whose **mask fades it to fully transparent before the stage ends**, so nothing visible reaches the section edge. The overlay fade was removed.
  3. Labels, spokes and arrows sit in an unmasked layer above it. Masks clip to their box, so a first attempt that masked the whole stage had clipped the top labels.
  4. The licence credit moved into normal flow after the stage. (It has since left the composition for the legal page; see below.)
  5. The section has **real bottom padding** before the next one starts.
  6. `overflow: clip` remains only as a safety net, so the transparent part of the layer can't catch clicks meant for the next section.
- **Verification (`scripts/motion/food-boundary.mjs`, plus a new test at 1440, 1024, 768, 390 and 360 px; forward, reverse and after a fast jump):**
  - the next section starts exactly where this one ends;
  - every heading, description, CTA, label, arrow, credit and counter lies inside the section with spacing;
  - no horizontal overflow and no console errors.
- **Evidence:**
  - `artifacts/food-boundary/before-after-1440.png`
  - `artifacts/food-boundary/before/` and `after/`
- **Later:** the join itself was art-directed; see "The section's ending and the join with specials" below.

### The section's ending and the join with specials (latest pass)
**The request:**
- remove the visible "Illustrative photo: …" line;
- let the dish fade naturally into near-black;
- leave intentional space before the next section;
- have no hard seam, no overlap and no collapse;
- use real layout, not negative margins, overflow clipping or a spacer.

**How the reference ends:** captured fresh from eatnaked.co at 1440×900 (`artifacts/food-reference/section-bottom/`, for comparison only):
- the bowl stays fully visible almost to the section's edge, then fades into near-black over a short distance;
- the grid stops;
- faint concentric dashed arcs continue through generous dark space before the next section's content.

**What caused our seam (root cause, measured in the browser):**
1. **The showcase's violet glow was centred on its own bottom edge** (`ellipse … at 50% 100%`), so it was brightest exactly at the boundary and was cut flat there.
2. **The specials photograph began at full strength.** Its tint darkened the top by only about 31%, so its top edge was a hard line against the glow.
3. **The showcase did not finish its own composition:**
   - the dish started fading a third of the way up the plate;
   - the square that holds the labels and guide arcs (`.sig-orbit`, as tall as the dish) reached **past the section's edge** (by 74 px at 1440×900, measured by `food-boundary.mjs`), and the section's `overflow: clip` was hiding it;
   - only 44–68 px of padding came after the credit line.

   So the next section arrived while the showcase was still "in progress".

   Brightness across the join in the old build: a step of **5.7** (phones) and **1.8** (tablets), and a **1.35** single-row edge on desktop.
4. **An interim cross-dissolve was replaced, not shipped.** Before this request, a version that slid the specials section up under the showcase (a negative margin with a shared fade zone) was built and verified. It removed the line, but it is exactly the overlap this request rules out, so it was taken out entirely.

**The fix: real layout, in `globals.css` and `SignatureShowcase.tsx`:**
- **Real breathing space inside the section.** `.sig` now ends with `--sig-air`:
  - on desktop: the 0.2 × dish height that the label/arc square already occupies below the stage, plus 12–28 px;
  - on tablets and phones: 56–96 px.

  The square now ends inside the section, so **nothing reaches past its edge**, and `overflow: clip` is no longer needed. It stays only to guard against horizontal overflow.

  | Size | Space below the dish/controls |
  |---|---|
  | 1440×900 | 196 px |
  | 1440×700 | 157 px |
  | 1920×1080 | 235 px |
  | 1024×768 | 96 px |
  | 768×1024 | 77 px |
  | 390×844 | 56 px |
  | 360×800 | 56 px |

- **The dish fades later and more naturally.** The scene's fade now runs from 74% to 99% of its height (it was 62%), about 190 px at 1440. More of the food stays visible, then it sinks into the near-black, as the reference's bowl does.
- **Guides continue underneath, then fade:**
  - the dashed rings now fade by height through a gradient in their own stroke (`#sig-arc-fade`); a CSS mask would have clipped the rings' sides where they extend past their box;
  - they sweep down on both sides beneath the plate, slightly stronger there, and are gone before the edge;
  - the grid fades out inside the breathing space (an intersected mask).
- **The glow sits under the plate** and fades out before the breathing space ends, so the section ends on the page colour.
- **The specials section starts in normal flow,** with no gap, no overlap and no negative margin. Its photograph rises out of the same near-black within its own box (a top fade in its own tint, 110–200 px). Its content, copy position and the rest of the homepage are unchanged.

**Attribution:** see section 6. The credit line is gone from the composition; full credits are on the legal page.

**Checked in the browser, not just in CSS** (`scripts/motion/seam-capture.mjs`, `seam-profile.mjs`; the new boundary test):
- at 1440×900, 1440×700, 1920×1080, 1024×768, 768×1024, 390×844 and 360×800, the specials section starts exactly at the showcase's edge;
- nothing of the showcase extends past it;
- the specials copy stays 130 px (95 px on phones) below the join;
- the showcase's controls are on top and clickable;
- no horizontal scroll, no console errors;
- brightness across the join: a step of 0.14 (desktop), 0.24 (phone) and 0 (tablet), with no row-to-row edge.

  The boundary test fails the old build at every width and passes the new one.
- **Side by side with the reference:** `artifacts/seam/v3-vs-reference-1440.png` (left: eatnaked.co; right: Jimmy O's).
- **Before/after sheets:** `artifacts/seam/before-after-desktop.png` and `before-after-mobile.png`. "Before" is the build without these changes.
- **Recordings:** `artifacts/seam/recordings/` (forward, reverse and a fast flick through the join, on production).

### Content and controls (unchanged)
- **Verified content:**
  - the four items come from the verified menu records;
  - labels are phrases from each dish's own description (pitchers: the verified pitcher names) and are checked by test against the menu data;
  - no prices, allergens, dietary claims or availability.
- **Controls:** buttons, the dash indicator (named buttons), Enter and Space, and touch swipe on the dish.
- **Announcements and clicks:** a polite announcement fires on user changes only, and rapid clicks always end in one clean state.
- **Scroll:** one scrubbed timeline sets the plate down as the section arrives and eases it back as it leaves. No pinning, no wheel handling.

## 5. Data model and replacing photographs
- **`apps/web/src/lib/featured.ts`:**
  - `FoodCategory` (`id`, `label`, `eyebrow`, `title`, `description`, `image`, `cta`);
  - `FeaturedItem` (`id`, `menuId`, `category`, `title`, `description`, `labels`, `image`, `cta`, `turn`);
  - `FeaturedImage` (`src`, `alt`, `focus`, `status: 'approved' | 'placeholder'`, `width`, `height`, optional `credit` (`title`, `author`, `source`, `license`, `licenseUrl`, `changes`), `plate` and `cutout`).

  Titles and descriptions are derived from the verified `fullMenus` by id, and it throws if an id is not in the menu. Plain data, ready for a future CMS.
- **Replacing a photograph** means editing that entry's `image`. Set `plate` (the plate's width and centre as fractions of the image) so the dish renders at the shared scale and turns about its plate. Remove `credit` and set `status: 'approved'` for client photographs. No animation code references images.

  The step-by-step guide, and exactly what to photograph, is in `apps/web/public/media/featured/ASSET-MANIFEST.md`.

## 6. Imagery
- **Carousel (A):** three approved Jimmy O's photographs (flatbread, gallery-6, gallery-4), unchanged.
- **Signature Selections (B):**
  - **The burger:** Jimmy O's own photograph, re-processed.
  - **Placeholders:** three **openly licensed photographs from Wikimedia Commons**, marked `status: 'placeholder'` in the data:
    - nachos: Ewan Munro, CC BY-SA 2.0;
    - wings: JIP, CC BY-SA 4.0;
    - margarita pitcher: Missvain, CC BY 4.0.

  Full sources, licences and sizes are in `apps/web/public/media/featured/ASSET-MANIFEST.md`.
- **Attribution (changed in the latest pass):**
  - **Licences checked at the source.** All three licences were confirmed against Wikimedia Commons' own file metadata (November 15, 2026): CC BY-SA 2.0, CC BY-SA 4.0 and CC BY 4.0, each with `AttributionRequired: true`. Attribution therefore stays, and so does ShareAlike for the two adapted BY-SA files.
  - **Moved off the food.** It no longer appears over or under the dish. The small "Illustrative photo: …" line made the showcase read like a stock mock-up.
  - **Full credits on the legal page.** The site's legal page (**`/privacy#image-credits`**, linked from every page's footer) now lists, for each placeholder:
    - the dish it illustrates;
    - the original title, linked to its Commons page;
    - the author;
    - the licence, linked;
    - the changes made (cropped, colour-graded and cut out; the BY-SA adaptations are stated to be under the same licence).

    The list is generated from the same data (`featuredItems[].image.credit`), so it cannot drift, and the client's own burger photograph is correctly absent.
  - **Why this is enough.** Creative Commons licences allow credit "in any reasonable manner", including a page that carries the required information. The cleanest fix is still replacing the placeholders with the client's own photographs before launch; the manifest says exactly what to shoot. If the client's counsel prefers on-page credits, the data is unchanged and the line can return.
- **How they were sourced:**
  - Unsplash refuses automated browsing ("Access Denied"), so it was not used;
  - the Openverse thumbnail service was failing;
  - Commons' public API was used with licence filtering (commercial-use licences only, ≥1600×1200).
- **No image generation was available in this environment**, so no generated imagery was used. SEO and indexing settings are untouched.
- **Limitations:**
  - **The placeholders show other venues' food.** They must be replaced with the client's own overhead photographs before launch.
  - **Mixed angles.** Only the wings are truly top-down; the burger and nachos are angled shots and the pitcher is a side view.
  - **The burger is low resolution.** It is only 800 px, so it is slightly soft on high-density screens at full size.

  The manifest lists exactly what to shoot and how to swap it in.

## 7. Verification
Final run on November 15, 2026, after all of this report's passes (the rebuild to reference quality, the attribution move and the art-directed ending).

| Check | Result |
|---|---|
| Lint | clean |
| Typecheck (web and API) | 0 errors |
| Production build | passed; build `eIUwDnWPmPdH1ayh-v8F1` |
| `tests/browser/food-drinks.spec.ts` | **21/21** on dev and on the production build |
| Full browser suite | **107/107** on dev; **102/107** on production (the 5 are real form submissions refused by the API's origin allowlist for the :3100 server; they pass on dev) |
| API integration tests | 12/12 |
| Lighthouse, homepage (production) | mobile ×3: Performance 100 / 100 / 100, Accessibility 100, Best Practices 100, CLS 0, LCP 0.9 s; desktop 100 |
| Lighthouse, `/privacy` (with the new credits) | 100 / 100 / 100; no accessibility failures |

SEO is 69 in every Lighthouse run: only `is-crawlable` fails, which is the staging `noindex` (kept).

**What the 21 Food & Drinks tests cover:**
- **Content:** verified menu content and labels.
- **Carousel:** changes by arrow, tab, keyboard, drag and swipe, with the measured timing.
- **Signature Selections:**
  - the turntable direction both ways;
  - rapid clicks;
  - keyboard and touch;
  - the full cycle (geometry kept, no attribution over the food).
- **Credits (new):** the legal page lists all three placeholders with title, author, source, licence link and changes, and not the client's own photo.
- **Reduced motion and no-JS.**
- **No layout shift.**
- **The boundary at 1440, 1024, 768, 390 and 360 px, forward, reverse and after a fast jump.** It now requires:
  - no gap, no overlap, no negative margin;
  - nothing of the showcase past its edge;
  - at least 140 px (desktop) or 52 px (stacked) of breathing space;
  - the specials copy 90 px or more below the join;
  - the showcase's controls on top;
  - the specials photo rising from the page colour;
  - **no visible seam in the rendered pixels:** brightness step below 1.0 and row-to-row edge below 0.9.

  The same test fails the previous build at every width.
- **Rebuilding after navigating away and back.**

**Evidence (all from the production build unless noted):**
- **The ending and join:**
  - `artifacts/seam/v3-vs-reference-1440.png` (eatnaked.co | Jimmy O's);
  - `artifacts/seam/before-after-desktop.png` and `before-after-mobile.png`;
  - `artifacts/seam/final-dev/` (all seven sizes at three scroll positions, reverse and reload; dev);
  - `artifacts/seam/recordings/join-{1440x900,768x1024,390x844}.webm` (a slow scroll through the join, back up, then a fast flick), with stills;
  - forward and reverse stills are identical, with the same measured step.
- **The showcase:**
  - `artifacts/signature-rebuild/final-v3/`: every dish at rest and mid-change at 1440×900, 1728×1117, 1024×768, 768×1024 and 390×844, plus `sheet.png`;
  - `artifacts/signature-rebuild/reference-before-after-1440.png`.
- **Both sections:** `artifacts/food-redesign/recordings-final/food-drinks-{desktop,mobile}.webm`, scrolling in, changing categories and dishes, and scrolling on into specials.

## 8. Files
- **New:**
  - `apps/web/src/components/FoodCarousel.tsx` and `SignatureShowcase.tsx`
  - `apps/web/src/lib/featured.ts`
  - `apps/web/public/media/featured/`: the processed photographs and `ASSET-MANIFEST.md`
  - `tests/browser/food-drinks.spec.ts` (21 tests)
  - `FOOD-REFERENCE-MOTION.md` and this report
  - `scripts/assets/`:
    - `process-featured.mjs` (crop, grade, rim cut-outs);
    - the licensed-image search and contact-sheet tools: `commons-search.py`, `openverse-search.py`, `candidate-sheets.mjs`, `local-sheet.mjs`, `grid-view.mjs`.
  - `scripts/motion/`:
    - reference study: `eatnaked-recon.mjs`, `eatnaked-sample.mjs`, `eatnaked-ancestors.mjs`, `eatnaked-section-bottom.mjs`;
    - captures and recordings: `food-probe.mjs`, `food-record.mjs`, `signature-states.mjs`, `food-boundary.mjs`, `seam-capture.mjs`, `seam-profile.mjs`, `compare-sheet.mjs`, `video-sheet.mjs`.
- **Modified:**
  - `components/SiteSections.tsx`: `HomeFood` renders the two sections.
  - `components/motion/HomeMotion.tsx`: the old `foodScene` was removed.
  - `lib/motion/config.ts`: `MEASURED_EASE`.
  - `app/globals.css`: the two sections' styles (including the showcase's breathing space, fades and grid/arc fades); the specials photo's rise from the page colour (homepage only); the legal page's credits list; 17 retired editorial-card rules removed.
  - `app/privacy/page.tsx`: the "Image credits" section, generated from `featuredItems`.
  - `tests/browser/cinematic-motion.spec.ts`: its reduced-motion layer list names the new layers.
- **Untouched:**
  - the hero, night-out film, gallery, footer, header and navigation, routes and the content of internal pages;
  - the specials content;
  - Lenis and the global ScrollTrigger set-up;
  - the API, database, forms, SEO metadata, sitemap, robots, JSON-LD and staging `noindex`.
