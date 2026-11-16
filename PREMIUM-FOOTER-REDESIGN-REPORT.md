# Footer Redesign Report

**Date:** November 15, 2026 · **Scope:** the site-wide footer only (`components/Footer.tsx`, its styles and its reveal).
**Final direction:** a short, minimal closing signature, as requested after review. It replaces both the original footer and the first, full-screen "closing scene" iteration.

## 1. Reference
- The requested pin (420171840258591043) is a **static image**, not an animation: a Canva presentation slide.
- I inspected it in Playwright without logging in and measured it.
- The full analysis is in [`FOOTER-REFERENCE-MOTION.md`](FOOTER-REFERENCE-MOTION.md): 9 fluted light columns, a large light headline, one hairline rule over a three-part base row, and no motion to copy.
- The final footer keeps only the reference's quietest ideas: a hairline divider above a slim base row, dark space, one restrained glow and small spaced labels.

## 2. Iterations
1. **First implementation (superseded):**
   - a near-full-screen scene: fluted violet light, a huge "See you tonight.", full navigation, booking buttons and opening hours;
   - about 880 px on desktop and 1,100 px on phones.
2. **Final, after your review:**
   - removed the stripes, the giant heading, the duplicated navigation, the booking buttons and the hours;
   - result: a compact footer of about 250 px on desktop.

## 3. The final footer
| Area | Content | Destination |
|---|---|---|
| Left | Original Jimmy O's logo (unchanged image) and the existing tagline "Coastal California by day. Electric nightlife after dark." | Logo → `/` |
| Right | **Visit:** 225 15th Street, Del Mar, CA 92014 | The same Google Maps directions link as the homepage "Find your way here" section |
| | **Call:** (858) 350-3735 | `tel:+18583503735` |
| | **Email:** chelsea@jodelmar.com | `mailto:` |
| Bottom row | © 2026 Jimmy O's Del Mar · Privacy Policy · Back to top ↑ | `/privacy`, `#top` (a smooth 1.3 s Lenis scroll; a native jump under reduced motion) |

- **Single source of truth:** all venue facts come from the shared `venue` record (`packages/shared`), the same one the Visit and Contact sections use. Nothing was invented, and no social profiles exist to link.
- **Nothing was lost from the site:**
  - all 12 routes the old footer listed remain in the header navigation and its menu;
  - the opening hours, phone, email and booking remain in the homepage Visit section and on the Contact page.

  `footer.spec.ts` checks both.
- **Typography:**
  - Manrope throughout: labels 11px uppercase at 0.24em in the readable violet; contact details 15px; legal 12px;
  - no Syne heading at all, so nothing oversized.
- **Colour:** existing tokens only:
  - near-black `--background`;
  - one faint `--button` violet glow in the bottom-right corner and a fainter `--purple` one at the top left;
  - a hairline top edge fading violet to `--border`;
  - `--accent-readable` labels, `--muted` secondary text.

  No new colours. The `--night-blue` token added during the first iteration was reverted.
- **Height (measured):**

  | Viewport | Height |
  |---|---|
  | 1280×800 | **235 px** |
  | 1440×900 | **250 px** |
  | 1920×1080 | **255 px** |
  | 1024 | **273 px** |
  | 768 | **269 px** |
  | 360/390 | **395 px** (stacked naturally) |

  Previous footer: about 500 px; first iteration: 880 px.
- **Interaction:**
  - links sweep a 1px underline in from the left and turn violet;
  - the directions arrow nudges diagonally;
  - the Back to top arrow lifts;
  - a visible focus outline;
  - all targets are at least 24 px tall (WCAG 2.5.8), which **the old footer did not meet**.
- **Motion:** one subtle reveal, once, as the footer comes into view:
  - the logo and tagline settle (14px, 0.9 s);
  - address, phone and email follow 0.08 s apart;
  - the legal row fades in;
  - no scrubbing, pinning, parallax, pointer effects or large movement;
  - keyboard focus completes it at once; nothing runs under reduced motion; the footer is complete without JavaScript.

## 4. Verification
| Check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | passed |
| `npm run build` (production) | passed (build `1sG-o3yCNHwQqDbmQHE_k`) |
| `npm test` (API) | 12 passed |
| Playwright, full suite on the dev server (`artifacts/footer-redesign/e2e-dev.log`) | **77 passed, 0 failed**: the earlier 65 plus 12 new footer tests |
| Footer tests (`tests/browser/footer.spec.ts`) | covered below |
| Rest of the site unchanged | Reduced-motion screenshots of `<main>` and the header on 5 routes at 1440 and 390 px, before and after (`artifacts/footer-redesign/unchanged-before/` and `unchanged-after/`): all 10 headers and 6 page bodies are pixel-identical. The other 4 differ **only in their last pixel row** (0.01–0.05% of pixels), where the footer's new top edge meets the page on a sub-pixel boundary. |
| Lighthouse 13.6.0, production homepage | **Mobile: 100 / 100 / 100 / 69** in all 3 runs, LCP 0.9 s, TBT 30 ms, CLS 0, 446 KB. **Desktop: 100 / 100 / 100 / 69**, LCP 0.2 s, TBT 0 ms, CLS 0, 507 KB. This is in line with the previous build (100, LCP 0.9 s, TBT 0 ms, 446 KB); SEO 69 is the deliberate staging `noindex`. |

The footer tests cover:
- **Content:** exactly the six links in focus order, each with its destination; no nav, buttons, headings or hours; Manrope throughout; the original logo image.
- **Nothing lost:** all 12 routes are in the header menu; hours, phone and email are on the homepage Visit section and on `/contact`.
- **Six widths:** at 360, 390, 768, 1024, 1440 and 1920 px:
  - height ≤ 350 px on desktop, ≤ 320 px on tablet, ≤ 440 px on phones;
  - no overflow, overlapping links, clipped text or text under 11px;
  - every target at least 24 px tall.
- **Links:** Privacy and the logo navigate; Back to top is smooth (part-way after 250 ms, then at 0).
- **Keyboard:** reading order matches focus order, a solid focus outline on every link, and focus completes the reveal.
- **Reveal:** subtle and once-only; the logo leads the contact items; scrolling away and back never hides anything.
- **Fallbacks:** reduced motion and no-JS show the complete footer.

**Screenshots and recordings:**
- **Before/after:**
  - `artifacts/footer-redesign/before-after-desktop.png` and `before-after-mobile.png`
  - all widths: `artifacts/footer-redesign/before/footer-*.png` against `after/footer-*.png`
- **Recordings, production, verified playable:**
  - `artifacts/footer-redesign/after-capture/footer-scroll-desktop.webm` (12.5 s) and `footer-scroll-mobile.webm` (17.2 s)
  - before: `artifacts/footer-redesign/before/footer-scroll-{desktop,mobile}.webm`
- **Link inventories:** `before/inventory.json` and `after-capture/inventory.json`

## 5. Files
- **Rewritten:**
  - `apps/web/src/components/Footer.tsx`
  - the footer styles at the end of `apps/web/src/app/globals.css`; the 20 old footer rules were removed
- **New:**
  - `apps/web/src/lib/motion/footerScene.ts` (the reveal)
  - `tests/browser/footer.spec.ts` (12 tests)
  - `FOOTER-REFERENCE-MOTION.md` and this report
  - `scripts/motion/` additions:
    - `footer-capture.mjs`, `footer-probe.mjs`, `main-snapshots.mjs`
    - `pin-image.mjs`, `image-profile.mjs`
- **Modified:** `apps/web/src/components/Motion.tsx`. The old wordmark scrub was replaced by the footer reveal, in its own matchMedia context; nothing else in the file changed.
- **Untouched:**
  - the hero, gallery, night-out film and every other section;
  - navigation, routes, Lenis, the API, database, SEO metadata, sitemap, robots, JSON-LD and staging `noindex`.
