# Food & Drinks imagery: asset manifest

The homepage Food & Drinks carousel and Signature Selections read their photographs from one data file:
`apps/web/src/lib/featured.ts` (`foodCategories` and `featuredItems`). **No animation code refers to an image**, so
a replacement never touches the components or motion.

## Signature Selections (processed files in this folder)
The processed files are made by `scripts/assets/process-featured.mjs`:
- an art-directed crop that centres the dish;
- a gentle grade;
- **plates with a clean, round rim are cut out** along that rim (a measured ellipse with a light feather) into a
  transparent WebP, so the dish stands on the page as an isolated object with a soft drop shadow (`cutout: true` in
  `featured.ts`);
- **the others keep their surroundings**, sunk into the page's near-black with a wide radial falloff, so the plate's
  rim reads as the visible edge.

| File | Source | Licence | Used for | Size | Treatment | `plate` (size, x, y) | Status |
|---|---|---|---|---|---|---|---|
| `classic-burger.jpg` | Jimmy O's own `public/images/burger.jpg` (official site; ASSETS.md) | Client imagery | Jimmy O's Classic Burger | 800×768 | falloff (JPEG) | 0.93, 0.47, 0.5 | **approved** (low resolution) |
| `loaded-nachos.webp` | [Castle, North Acton, London](https://commons.wikimedia.org/wiki/File:Castle,_North_Acton,_London_(3316039116).jpg) by Ewan Munro | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | Jimmy O's Loaded Nachos | 2400×1693 (from 2847×2136) | rim cutout (transparent WebP) | 0.976, 0.503, 0.522 | **placeholder** |
| `house-wings.webp` | [Home-made chicken wings](https://commons.wikimedia.org/wiki/File:Home-made_chicken_wings.jpg) by JIP | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | House Tossed Wings (8) | 2600×1828 (from 4608×3456) | rim cutout (transparent WebP) | 0.922, 0.489, 0.516 | **placeholder** |
| `cocktail-pitchers.jpg` | [La Casa Restaurant, September 20 2022](https://commons.wikimedia.org/wiki/File:La_Casa_Restaurant_-_September_20_2022_-_Sarah_Stierch_03.jpg) by Missvain | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Cocktail Pitchers | 2200×2247 (from 3024×4032) | falloff (JPEG; a glass pitcher has no rim to cut along) | 1.55, 0.5, 0.75 | **placeholder** |

- **The placeholders are openly licensed photographs of other venues' food and drink.** They stand in for Jimmy O's dishes until the client's own photographs arrive.
- **Credited in full on the site's legal page**, [`/privacy#image-credits`](../../../src/app/privacy/page.tsx), as their licences require: title, author, source link, licence link and the changes made. The page is linked from every page's footer. The credit is not shown over the food, since a small credit line made the showcase read like a stock mock-up. Licences were confirmed against Wikimedia Commons' own metadata (`AttributionRequired: true` for all three) on November 15, 2026.
- **ShareAlike:** the two CC BY-SA images are adapted (cropped, graded and cut out), so those adapted files are themselves CC BY-SA.
- **Originals:** unmodified copies are in `artifacts/signature-rebuild/originals/`.

How they were found:
- Unsplash refuses automated browsing ("Access Denied"), so it was not used.
- Openverse's thumbnail service was failing.
- The images were chosen from **Wikimedia Commons** through its public API, keeping only CC0, public-domain, CC BY and CC BY-SA files at least 1600×1200.

## Carousel (unchanged, all approved client photographs)
| File | Used for | Size | Status |
|---|---|---|---|
| `public/images/flatbread.jpg` | Carousel: Food | 800×800 | approved, low resolution |
| `public/images/gallery-6.jpg` | Carousel: Drinks | 800×800 | approved, low resolution |
| `public/images/gallery-4.jpg` | Carousel: After Dark | 800×800 | approved, low resolution |

## Needed from the client (to replace every placeholder)
- **Top-down (overhead) photographs** of the Classic Burger, Loaded Nachos, House Tossed Wings and a Cocktail Pitcher (Margarita, Paloma or Moscow Mule):
  - the dish centred on a **dark surface** (slate, dark wood or black), soft directional light;
  - the plate filling about **80% of a square frame**, nothing else in shot;
  - at least **2400×2400 px**.

  Top-down shots turn naturally in the showcase's transition; angled shots are given a smaller swing.
- **High-resolution originals** of the carousel photographs (at least 1600 px on the short side).

## How to replace an image
1. Put the new file in `apps/web/public/media/featured/`. A JPEG or WebP is fine; Next.js serves optimised sizes.
2. Optionally run it through `scripts/assets/process-featured.mjs`: add a job with its crop, to centre the dish and sink the surroundings into the page colour. For a plate with a clean round rim, also give the job a `cut` ellipse (centre, radii, rotation, in fractions of the output) to produce a transparent WebP cutout, and set `cutout: true` on the image in `featured.ts`.
3. In `apps/web/src/lib/featured.ts`, update that item's `image`:
   - `src`, `width`, `height`;
   - an accurate `alt`;
   - `status: 'approved'`;
   - **remove `credit`** (client photos need none; the legal page's list updates by itself);
   - `plate`: the plate's width as a fraction of the image width, and its centre (`x`, `y` as fractions). The showcase sizes every dish from this, so they render at the same scale and turn about the plate's centre. For a cutout, these are the `cut` ellipse's diameter (2 × `rx`) and centre.
4. Optionally set the item's `turn`: **90** for a top-down shot, **12–16** for an angled one.
5. Nothing else changes. Names, descriptions and detail labels come from the verified menu data (`packages/shared/src/content.ts`); `tests/browser/food-drinks.spec.ts` checks every label against it.
