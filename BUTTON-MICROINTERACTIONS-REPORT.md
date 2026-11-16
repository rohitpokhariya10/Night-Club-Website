# Button Micro-interactions Report

**Date:** November 15, 2026 · **Scope:** every link and button on the site that carries a directional arrow. Nothing else was redesigned: labels, destinations, fonts, colours, sizes and layout are unchanged.

## 1. The rule
**When a control is hovered, its arrow moves the way it points, then eases back when the pointer leaves.**

| Arrow | Movement |
|---|---|
| ↗ up-right | 4 px right, 4 px up |
| → right | 5 px right |
| ← left | 5 px left |
| ↑ up | 5 px up |
| ↓ down | 5 px down |

- **Timing:** 280 ms, `cubic-bezier(0.22, 1, 0.36, 1)`. It arrives quickly and settles without bounce or looping.
- **Trigger:** hovering anywhere on the control, not just the arrow.
- **Keyboard:** `:focus-visible` gives the same movement, and the site's focus ring stays.
- **Transform only:** it uses CSS `translate`, so nothing reflows.

## 2. What the audit found (before)
`scripts/motion/cta-audit.mjs` checked every link or button with an arrow on 16 pages in Chromium at 1440×900, including the open mobile menu and an event detail page: **73 controls**. Results are in `artifacts/buttons/before-audit.json`.

- **No arrow movement at all:**
  - header **Book a Table**;
  - all **12 mobile-menu links**;
  - the **event cards** ("Explore the evening");
  - **Explore Catering**;
  - the review's map link;
  - the Food & Drinks CTA on the After Dark card.
- **Wrong kind of movement:**
  - the Food & Drinks CTA circle and the night-out round link **rotated** their ↗ by 45°, so it pointed → instead of moving up-right;
  - "Discover Jimmy O's ↓" used a separate `transform` rule.
- **Inconsistent amounts:**
  - six hand-written rules moved arrows by 2–3 px, each with its own timing (0.35–0.5 s);
  - buttons moved ↗ by 3 px right and 3 px up.
- **Arrows leaving their link:** the Signature CTA and the footer address link pushed the arrow outside the link's box.
- **Text arrows that could not move:** "← Back to Jimmy O's" (privacy page) and "Back to Jimmy O's ↗" (404 page).
- **Sticky hover on touch:** button lift, sweep and fills, and the carousel/showcase/lightbox arrow buttons' fill, all applied on touch screens and stayed after a tap.

## 3. Shared implementation
**One component** (`apps/web/src/components/ui.tsx`):
- `Arrow({dir, size})`, with `dir` one of `'right' | 'up-right' | 'up' | 'left' | 'down'`.
- It renders the matching lucide icon with `class="arw"`, `data-arrow={dir}`, `aria-hidden` and `focusable="false"`.
- It has no state or handlers, so it works in server and client components alike.
- The shared `Button` uses it, so every `.button` CTA on every page gets the behaviour.

**One CSS block** (end of `apps/web/src/app/globals.css`):
- **Tokens:** `--arw-duration: 280ms`, `--arw-ease: cubic-bezier(.22,1,.36,1)`, `--arw-step: 5px`, `--arw-diagonal: 4px`.
- **Direction:** each `data-arrow` value sets two custom properties, `--arw-x` and `--arw-y`.
- **Trigger:** `:is(a, button):not(:disabled, [aria-disabled=true]):hover .arw` applies `translate: var(--arw-x) var(--arw-y)`. The hover form only applies inside `(hover: hover) and (pointer: fine)`. Both the hover and the `:focus-visible` forms only apply inside `(prefers-reduced-motion: no-preference)`.
- **No JavaScript and no GSAP** for any of this. GSAP still animates some of these controls (the hero buttons' entrance, the round link's reveal), but always the control itself, never its arrow, so the two never compete for the same property.

**Every directional icon now uses it.**
- Header (Book a Table, mobile menu).
- Hero (both buttons, Discover ↓).
- Night-out round link.
- Food & Drinks CTA and previous/next.
- Signature CTA and previous/next.
- Event cards, Explore Catering, the review link.
- Gallery lightbox previous/next.
- Footer address and Back to top.
- Every `Button`.
- The 404 button and the privacy back link.

A test checks there is no stray arrow left.

**The six old per-component arrow rules were deleted**, along with the two 45° rotations.

## 4. Feedback around the arrow (restrained)
- **Existing feedback kept as it was:** the purple fill and sweep on buttons, the 2 px lift, outline buttons' violet sweep, the footer links' underline grow, the Signature CTA's underline, and the carousel and showcase arrow buttons' fill.
- **Hover-only now:** all of the above (and the lightbox buttons' and round link's fills) now apply only where hover exists, so nothing sticks after a tap.
- **Added keyboard twins:** the carousel/showcase/lightbox arrow buttons, the round link, event cards, Book a Table, Explore Catering and the mobile menu now get their hover look on `:focus-visible` too.
- **Added where there was nothing:**
  - **Book a Table (header):** a soft purple fill and a lighter border.
  - **Explore Catering:** the text and its rule shift to the light violet.
  - **Mobile-menu links:** the text shifts to the light violet.
- **Food & Drinks CTA:** the circle still fills purple, now with a matching border; the arrow moves instead of spinning.
- **No glows, no scaling, no new colours:** every colour is an existing token (`--button`, `--accent`, `--accent-readable`).

## 5. Edge cases
- **Arrows stay inside their control.** Where an arrow sat flush with its link's edge (footer address, Signature CTA, Explore Catering, mobile-menu links, privacy back link), the link's box reaches 4–5 px further: padding paid back by an equal negative margin, so nothing on screen moves. The audit and the tests check every moved arrow lies inside its control.
- **The review's map link** was only its 17 px icon. It now has a 29 px target in the same place.
- **Disabled and sending:** the enquiry forms' submit button is disabled while sending. It does not lift, sweep or move its arrow, and it already showed "Sending…" and could not be submitted twice. Form logic is untouched.
- **Touch:** no movement and no hover styling on touch screens, and tap targets are unchanged (carousel arrows 44–52 px).
- **Reduced motion:** arrows never move. Hover and focus colour changes still apply, and so do focus rings.
- **Screen readers:** arrows are hidden from assistive technology. The 404 button and privacy link no longer read the arrow character as part of their names ("Back to Jimmy O's").

## 6. Destinations and labels
- **Unchanged.** The after-audit (`artifacts/buttons/after-audit.json`) lists the same 72 controls with the same labels, the same destinations and the same element types as before.
- **The one difference** is the homepage "Our Story" button. It was removed at your request in the previous task (HOMEPAGE-CINEMATIC-TRANSITION-REPORT.md); the round link on the night-out film is the About page's CTA there.
- **Visible label change:** the 404 page's "↗" is now the same icon every other button uses, instead of a text character.

## 7. Verification
Final combined run, November 15, 2026. It covers the buttons, the night-out handoff (HOMEPAGE-CINEMATIC-TRANSITION-REPORT.md) and the Signature Selections changes (FOOD-DRINKS-CINEMATIC-EXPERIENCE-REPORT.md).

| Check | Result |
|---|---|
| Lint (`npm run lint`) | clean |
| Typecheck (`npm run typecheck`, web and API) | 0 errors |
| Production build (`npm run build`, API and web) | passed; 18 routes; build `eIUwDnWPmPdH1ayh-v8F1` |
| API integration tests (`npm test`) | 12/12 |
| Browser suite on dev (`npx playwright test`) | **107/107** |
| Browser suite on the production build | **102/107** (see below) |
| Lighthouse, homepage, mobile ×3 | Performance 100 / 100 / 100 · Accessibility 100 · Best Practices 100 · CLS 0 · LCP 0.9 s · TBT 30–40 ms |
| Lighthouse, homepage, desktop | 100 / 100 / 100 · LCP 0.2 s · TBT 0 |
| Lighthouse, `/privacy`, mobile | 100 / 100 / 100 · no accessibility failures |

- **The 5 production-suite failures** are the five real form-submission tests. The API answered "Origin not allowed": it only accepts `WEB_ORIGIN=http://localhost:3000`, and the production server runs on :3100. They pass on dev. The API and its configuration were left alone.
- **SEO is 69 in every Lighthouse run.** The only failing audit is `is-crawlable`, the staging `noindex` (kept on purpose).
- **Lighthouse reports:** `artifacts/seam/lighthouse/`.

**Button-specific results:**
- **Interaction tests** (`tests/browser/buttons.spec.ts`, 8/8 on dev and production):
  - every directional icon on 7 representative pages is the shared arrow, decorative, inside a link or button, and pointing the way its icon does;
  - hovering moves each arrow the right way and it eases back: hero buttons, Discover ↓, header Book a Table, carousel and showcase previous/next, an event card, Explore Catering, Enter the Gallery, Back to top, the footer address, the night-out round link, a Nightlife button, the mobile menu, the 404 button, the privacy back link and lightbox previous/next;
  - keyboard focus gives the same movement with the focus ring intact;
  - destinations are unchanged;
  - reduced motion: no movement, colour feedback kept;
  - touch: no moved arrow and no stuck fill after a tap, 44 px targets;
  - a disabled submit does not animate.
- **Audit on the production build** (`artifacts/buttons/after-audit-prod.json`):
  - 72 controls; 61 of the 65 measurable arrows move exactly as specified;
  - the other 4 are explained in section 8: the hero link measured while the page covers it, the round link mid-scale, and the inactive carousel cards;
  - 0 leave their control, and all return to rest.
- **Destinations:** identical to the before-audit apart from two expected differences:
  - the removed "Our Story" button;
  - `/specials` showing its empty state ("Explore Drinks"). The specials API has no current specials today (the dated "Bottle + Booth" special ended), so that page shows its no-specials state. That is data, not a code change.
- **Nothing changes at rest.** Reduced-motion snapshots of `/contact`, `/gallery`, `/food-menu` and `/private-parties` (main and header, 1440 and 390 px) are **pixel-identical** to the morning's build (0% differing pixels). Only the homepage differs, as intended.
- **Visual review:** `artifacts/buttons/states/sheet.png` shows each kind of control at rest, hovered and keyboard-focused.

## 8. Notes
- **The 404 button's underline is pre-existing.** It comes from the legal pages' link style (`.legal a`), which already applied to it, so it was left alone.
- **"Our Story" no longer exists on the homepage**, so it is not in the audit.
- **Arrows on inactive Food & Drinks cards move at their card's 0.8× scale** (3.2 px). The card behind the active one cannot be hovered until it comes forward.
- **Two audit readings are measuring artefacts, confirmed separately:**
  - "Discover Jimmy O's ↓" reads 0 in the audit because scrolling it into view lets the page rise over the sticky hero. At the top of the page it moves 5 px down (test and sheet).
  - The night-out round link reads 3 px because GSAP is still scaling it at the audit's scroll position. Once its reveal has finished, it moves 4/−4 px (test).

## 9. Files
- **Modified:**
  - `apps/web/src/components/ui.tsx`: the `Arrow` component; `Button` uses it.
  - `apps/web/src/app/globals.css`: the shared arrow block and feedback; six old arrow rules and two rotations removed; button, card and arrow-button hover rules gated to hover-capable pointers, with focus twins.
  - **Arrow swaps** (`Arrow` instead of a lucide arrow): `components/Header.tsx`, `SiteSections.tsx`, `Footer.tsx`, `InquiryForm.tsx`, `FoodCarousel.tsx`, `SignatureShowcase.tsx` and `LightboxGallery.tsx`.
  - `app/not-found.tsx` (uses `Button`) and `app/privacy/page.tsx` (`back-link`).
- **New:**
  - `tests/browser/buttons.spec.ts`: 8 tests.
  - `scripts/motion/cta-audit.mjs`: the before/after audit.
  - `scripts/motion/button-states.mjs`: the rest/hover/focus sheet.
  - this report.
