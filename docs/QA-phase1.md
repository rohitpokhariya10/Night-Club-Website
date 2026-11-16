# Verification — November 14, 2026

Executed locally on macOS (Node 26.3.0) with PostgreSQL 17 in Docker. Deployment targets Node 24 LTS.

- Production Next.js and Express builds: passed.
- TypeScript workspace checks: passed.
- ESLint source checks: passed. Generated build output is excluded.
- Prisma schema validation: passed.
- Initial migration applied to actual PostgreSQL; migration status up to date.
- Verified venue, menu and future event seed: persisted successfully.
- 7 API tests: passed. Actual database readiness, seeded reads, future-only events, empty event UI data contract, persistent inquiries, invalid email/consent/honeypot, origin restrictions, 429 limit, malformed JSON, 404 and unavailable database behavior.
- 8 Playwright tests: passed. Widths 390, 768, 1024, 1440 and 1920; all images loaded; no horizontal overflow; Rubik computed font; working menu links; mobile modal Escape and focus return; anchor navigation; real inquiry submission; reduced motion; JSON-LD presence; staging noindex; no-JavaScript content.
- Full-page screenshots captured at all five widths under `test-results/`; 390 and 1440 screenshots visually inspected.
- npm production dependency audit: 0 known vulnerabilities at verification. Initial full dependency audit reported 7 moderate findings in development tooling.
- In-app browser handoff unavailable in this environment; Playwright browser verification completed successfully.

Lighthouse was executed on the local production build with default mobile throttling. Initial run: performance 87, accessibility 96, best practices 100, SEO 69. SEO reduction is due to intentionally blocked staging indexing. Contrast issues identified by Lighthouse were fixed by darkening filled buttons and brightening the inquiry label; image quality and responsive size hints were refined. Final measured scores are recorded below after retesting. These are local lab measurements, not promises of live-site performance.

Limitations: no public Hostinger deployment, DNS/TLS issuance, remote backup restore, external rich-results validator or mail delivery test. Native mobile devices and assistive technology were not tested. No claim of production launch readiness without client review of assets, policies, hours and operational inquiry handling.

Final Lighthouse mobile run on the optimized production build: **Performance 100, Accessibility 100, Best Practices 100, SEO 69**. LCP 0.8 seconds in this local run; all audited contrast checks passed. SEO remains reduced by deliberate staging `noindex` and robots blocking. Production-domain crawlability and real hosting performance have not been measured. Raw reports were generated in `/tmp/jimmy-lighthouse*.json`.

Docker Compose configuration validated, and both images built successfully with Node 24 on Linux ARM64. PostgreSQL and compiled Express readiness checks passed inside Docker. Hostinger’s x86 target and public Caddy certificate issuance still require deployment verification.

Additional final checks: 360px layout passed. Explicit Tab cycling exposed a browser-dialog edge case; a focus wrap handler was added and the stricter mobile test passed. All nine browser cases passed across the final suite and targeted rerun (the 1440px image-decoding check was changed from a fixed delay to condition polling). Persistent copies of all six viewport screenshots are in `docs/screenshots/`.

Docker web HTTP and optimized image endpoints both returned 200 as the non-root runtime user. Final images were rebuilt after the keyboard fix. The public proxy was not started.
