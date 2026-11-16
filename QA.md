# Full-site verification — November 14, 2026

This report supersedes the original landing-page QA report, archived in docs/QA-phase1.md. It records the full-site baseline before the later hero/gallery revision. See [Hero and gallery verification](HERO-GALLERY-UPGRADE.md) for the latest scoped checks; the Lighthouse scores below were not remeasured for that revision.

**Strings section (November 16, 2026):** lint, typecheck, production build, 6 new unit tests, 11/11 new browser tests on dev and production, the affected existing specs 37/37 on production, Lighthouse mobile Performance 100 ×3 and Accessibility 100. The full dev suite at that time: 110/116 (five form submissions without the API/database; one test hit a dev-server restart and passed on re-run). See [EXPERIENCE-STRINGS-REPORT.md](EXPERIENCE-STRINGS-REPORT.md) §8.

**Latest verification (November 15, 2026):** lint, typecheck, production build, 12 API tests, 107/107 browser tests on dev (102/107 on the production build; the 5 are real form submissions refused by the API's origin allowlist for the :3100 server) and Lighthouse (mobile Performance 100 ×3, Accessibility 100). It covers the Food & Drinks sections and Signature Selections' art-directed ending and image credits, the night-out handoff and the button micro-interactions. See [BUTTON-MICROINTERACTIONS-REPORT.md](BUTTON-MICROINTERACTIONS-REPORT.md) §7, [FOOD-DRINKS-CINEMATIC-EXPERIENCE-REPORT.md](FOOD-DRINKS-CINEMATIC-EXPERIENCE-REPORT.md) §7 and [HOMEPAGE-CINEMATIC-TRANSITION-REPORT.md](HOMEPAGE-CINEMATIC-TRANSITION-REPORT.md) §4.

An earlier verification, for the homepage gallery ring and the Syne/Manrope type system (lint, typecheck, build, 12 API tests, 65 browser tests, Lighthouse, frame timing, recordings), is in [GALLERY-TYPOGRAPHY-REDESIGN-REPORT.md](GALLERY-TYPOGRAPHY-REDESIGN-REPORT.md). Body-font and collage checks described below reflect earlier phases.

The subsequent [homepage collage motion report](HOMEPAGE-GALLERY-MOTION.md) records its production tests, original-layout comparisons and screenshots. The homepage cinematic scroll choreography (November 14, 2026) and its verification — 52 browser tests, 12 API tests, Lighthouse, memory checks across repeated navigation, and recordings — are recorded in [DELTA-CINEMATIC-MOTION-IMPLEMENTATION.md](DELTA-CINEMATIC-MOTION-IMPLEMENTATION.md). The animated light hero that replaced the hero video (58 browser tests, Lighthouse, recordings) is verified in [PINTEREST-HERO-IMPLEMENTATION.md](PINTEREST-HERO-IMPLEMENTATION.md).

## Executed checks

- Lint: passed with no errors.
- Frontend/backend TypeScript: passed.
- Production Next and compiled Express builds: passed. Fourteen primary page routes plus privacy, dynamic event details, robots and sitemap are included.
- Prisma validation: passed. Three migrations applied; migration status up to date.
- Seed: all 45 verified menu items, categories, venue, four events and dated specials saved to local PostgreSQL 17. Initial category IDs are preserved by slug.
- 12 API integration tests passed: real DB health; seeded reads; future events; empty event contract; inquiry persistence; invalid consent/email/honeypot; origin restrictions; rate limit; malformed JSON; 404; unavailable DB; all full menu counts; special expiry; event details; all five dedicated form types; required reservation/career fields; failed write honesty.
- 17 Playwright tests passed: all 18 exercised URLs at 360, 390, 768, 1024, 1440 and 1920 widths; one H1; canonical path; Rubik body; no horizontal overflow; no links back to the original site; mobile focus containment and navigation; gallery next/previous/Escape/focus restore; five real form submissions; honest service failure; reduced motion; no-JS menu; muted video/play-pause; 21 food/24 drink rows; event JSON-LD; sitemap; alias and unknown-event 404.
- Follow-up media tests passed after deferred-video changes.
- Additional 390/1440 capture runs passed after adding full image loading checks. Every visible image was scrolled into view and verified complete with a nonzero intrinsic width. Screenshots are retained in docs/screenshots/rebuild/.
- Desktop hero, mobile homepage, mobile reservation and desktop menu screenshots were visually reviewed. The mobile/desktop composition uses one coherent navy-purple design system and original fonts.
- Exact WOFF2 metadata inspected with Fontkit; original site rendered fonts inspected with Playwright. Details in MEDIA-UPDATE.md.
- Docker API and web images built successfully using Node 24 Linux ARM64. Production code compilation is verified; no live VPS deployment was performed.

## Lighthouse

A real mobile Lighthouse run was performed against the production homepage on localhost:3002. Initial rebuilt-site run: Performance 81, Accessibility 96, Best Practices 100, SEO 69, CLS 0. A decorative text contrast issue was corrected, hero image priority improved, its opacity animation removed and video startup deferred further. The final run is recorded below. Staging intentionally blocks indexing; SEO is not a production score. No rankings or live performance guarantees are made.

## Limits

Actual Chrome/Playwright on macOS and PostgreSQL in Docker were used. No native iOS/Android device, screen-reader session, external rich-result validator, public TLS, Hostinger x86 runtime, remote restore, email delivery or real booking integration was verified. Staff inquiry monitoring and final operational/privacy/media review are required before launch. No public deployment occurred.

Final measured mobile Lighthouse result: **Performance 83, Accessibility 100, Best Practices 100, SEO 69**. LCP 4.8 seconds under Lighthouse mobile simulation; CLS 0. All contrast checks pass. The full original Rubik Dirt asset and cinematic media remain part of the experience; mobile LCP still has room for improvement. Staging noindex/robots restrictions account for the SEO reduction. These are local lab results, not production-host guarantees. The final raw report is retained as docs/lighthouse-rebuild.json.
