# Jimmy O’s Del Mar

Complete independent multi-page website: Next.js App Router, React/TypeScript, Tailwind, GSAP, Express and Prisma/PostgreSQL. [Delivery report](REBUILD-REPORT.md) lists every route and feature. [QA](QA.md) records actual verification; [content sources](CONTENT-SOURCES.md) and [media verification](MEDIA-UPDATE.md) document provenance.

**Homepage hero:** the background video has been replaced by an animated light hero (fluted-glass light band, Jimmy O's logo orb, measured intro with Skip and reduced-motion fallbacks) modelled on a Pinterest reference; see [PINTEREST-HERO-REFERENCE.md](PINTEREST-HERO-REFERENCE.md) and [PINTEREST-HERO-IMPLEMENTATION.md](PINTEREST-HERO-IMPLEMENTATION.md). The video files remain in `public/videos/` but are not used.

**"More than a night out" section:** a film section (nightlife cut of the supplied Jimmy O's footage) with Syne/Manrope editorial typography; see [NIGHT-OUT-SECTION-REPORT.md](NIGHT-OUT-SECTION-REPORT.md).

**Food & Drinks:** a categories carousel and a Signature Selections showcase (plated dishes turning with measured motion, verified menu labels), modelled on eatnaked.co; three dish photographs are credited, openly licensed placeholders until the client's own arrive. See [FOOD-DRINKS-CINEMATIC-EXPERIENCE-REPORT.md](FOOD-DRINKS-CINEMATIC-EXPERIENCE-REPORT.md), [FOOD-REFERENCE-MOTION.md](FOOD-REFERENCE-MOTION.md) and the [asset manifest](apps/web/public/media/featured/ASSET-MANIFEST.md).

**Night-out handoff:** the text block, Our Story button, outlined type and icon row under the night-out film were removed from the homepage; the film now hands off to the nightlife section with a quiet scroll-driven close. See [HOMEPAGE-CINEMATIC-TRANSITION-REPORT.md](HOMEPAGE-CINEMATIC-TRANSITION-REPORT.md).

**Buttons:** every arrow on a link or button moves the way it points on hover and keyboard focus (one shared `Arrow` component and CSS block). See [BUTTON-MICROINTERACTIONS-REPORT.md](BUTTON-MICROINTERACTIONS-REPORT.md).

**Footer:** a compact closing signature (logo and tagline; address, phone and email; copyright, privacy and back to top). See [PREMIUM-FOOTER-REDESIGN-REPORT.md](PREMIUM-FOOTER-REDESIGN-REPORT.md).

**Homepage gallery and site typography:** the gallery is now a ring of eight venue photographs orbiting the title (burst → settle, counter-clockwise orbit, ripple), modelled on a Pinterest reference. The whole site uses two families, Syne (display) and Manrope (text), in place of the script and Rubik faces. See [GALLERY-REFERENCE-MOTION.md](GALLERY-REFERENCE-MOTION.md) and [GALLERY-TYPOGRAPHY-REDESIGN-REPORT.md](GALLERY-TYPOGRAPHY-REDESIGN-REPORT.md).

The homepage's cinematic scroll choreography: [DELTA-MOTION-REFERENCE.md](DELTA-MOTION-REFERENCE.md) records what was measured on the reference site, and [DELTA-CINEMATIC-MOTION-IMPLEMENTATION.md](DELTA-CINEMATIC-MOTION-IMPLEMENTATION.md) records the implementation, recordings and verification. It supersedes the threshold-based collage entrance described in the earlier [homepage collage motion report](HOMEPAGE-GALLERY-MOTION.md); the [hero and full gallery upgrade](HERO-GALLERY-UPGRADE.md) remains documented separately.

Motion architecture: `src/lib/motion/` (config, Lenis smooth scroll, shared reveal/settle primitives), `src/components/motion/` (`SmoothScroll` in the root layout, `HomeMotion` for homepage scenes A–F), `HomeGalleryMotion` (scene E) and `Motion` (route intros, footer settle). All scenes run inside `gsap.matchMedia()` and revert on unmount, breakpoint change or reduced-motion preference; content is server-rendered and visible without JavaScript. Re-run the motion evidence with the scripts in `scripts/motion/` (see the implementation report).

## Local setup

Use Node 24 LTS (24.11+) and Docker Compose. Dependencies are pinned in package-lock.json. Prisma 7.10.1 is retained because Prisma 8 was a release candidate when verified.

```sh
npm ci
cp .env.example .env
# Example database credentials are local-development values only.
docker compose -f compose.yaml -f compose.dev.yaml up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Web: http://localhost:3000. API: http://localhost:4000/api/v1/health. Development database listens only on 127.0.0.1:5433. Prisma and the API read root `.env`; Next uses localhost defaults. Add `apps/web/.env.local` for nondefault API_URL/NEXT_PUBLIC_SITE_URL/INDEXING_ENABLED settings.

```sh
npm run lint
npm run typecheck
npm test
npm exec -- playwright install chromium
npm run test:e2e
npm run build
npm run start -w @jimmy/web
# Supply DATABASE_URL as an environment variable for compiled API startup:
npm run start -w @jimmy/api
```

Tests require the local seeded database; browser tests also require running web/API servers. Never run tests against production. Integration tests clean up `integration@example.invalid`; browser tests use `browser-rebuild@example.invalid`. The public API limits five inquiries/hour/IP across all form types. Restart the development API between full browser submission-test runs to reset its in-memory limiter. This does not affect saved records. Production limits reset on process restart; stronger persistent abuse controls can be added if needed.

## Architecture

- `apps/web/src/app`: real page routes, page metadata, sitemap, robots and event structured data.
- `apps/web/src/components`: shared navigation/footer, editorial sections, page intros, menus, accessible gallery, adaptive hero media and typed inquiry forms.
- `apps/web/src/lib`: server API reads, navigation inventory and metadata helper.
- `apps/api/src`: Express security middleware, structured logging, validated read/write endpoints and database client.
- `apps/api/prisma`: schema, three additive migrations, idempotent seed.
- `packages/shared/src`: shared Zod schema/types and verified content snapshots.
- `infra`: Node 24 Docker images, Caddy proxy and off-server backup helper.

Public read data is cached for 60 seconds. During a read outage, the server uses the verified bundled snapshot, filters expired dates and preserves empty successful event responses. Event detail 404 responses are respected. Writes never have a fake fallback. PostgreSQL credentials stay server-side. All routes render primary content on the server. Interactive client code is limited to navigation, forms, gallery, video and motion.

All form types are stored in Inquiry with an internal status, separate operational/marketing consent, and type-specific fields. No automatic email provider or booking integration is configured; venue staff must monitor inquiries via restricted database access until notification/admin integration is added. The full CMS/CRM UI is intentionally outside this phase.

## Deploy to Hostinger KVM 2

No public deployment has occurred. The application Docker images build locally on Linux ARM64; validate on the VPS architecture before launch.

1. Install Docker/Compose, point approved DNS to the VPS, and permit SSH/80/443 only.
2. Create `.env`. Use a strong URL-safe POSTGRES_PASSWORD, set DOMAIN to the hostname, and keep INDEXING_ENABLED=false on staging. Never commit secrets.
3. Initialize:

```sh
docker compose build
docker compose up -d db
docker compose run --rm api npm run db:migrate
docker compose run --rm api npm run db:seed
docker compose up -d
```

Caddy obtains HTTPS when public DNS resolves. Only Caddy exposes public ports. `/api/*` goes to Express, with incoming forwarding headers overwritten; Express trusts exactly one proxy only with TRUST_PROXY=1. Do not expose the API directly in that mode. Readiness checks verify the database and HTTP services. Persistent volumes retain PostgreSQL and Caddy certificates.

Verify actual requests, staff monitoring, hours, privacy/retention, media rights and TLS. Enable INDEXING_ENABLED=true only for the approved production hostname, then rebuild web. NEXT_PUBLIC_SITE_URL is a build-time metadata origin. No live-domain deployment without client approval.

For updates: back up, build, apply `db:migrate`, then recreate services. Apply `db:seed` intentionally: it updates the original verified content snapshot. Never run `docker compose down -v` against production. No Redis or extra infrastructure is required.

## Backups

Supply an encrypted off-server destination and restricted SSH key, then schedule daily:

```sh
BACKUP_DEST=user@backup-host:/encrypted/backups bash infra/backup.sh
```

The script fails on dump or transfer errors and keeps seven days locally. Configure remote retention, failure alerts and restore drills. No remote destination was provided, so backup scheduling and off-server recovery are not activated.

Test a restore into an isolated database:

```sh
gunzip -c backups/your-backup.sql.gz | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

## Remaining launch inputs

Verified social handles, current specific vacancies, catering package details and recurring entertainment schedules were unavailable and have not been invented. The site now renders Syne and Manrope only; the supplied Rubik, Rubik Dirt and Kaushan Script files remain in `public/fonts` unused (confirm the change with the client; see GALLERY-TYPOGRAPHY-REDESIGN-REPORT.md). original gallery photos remain limited to roughly 800px. Obtain high-resolution originals and confirm media rights. Email notifications, booking confirmation, remote backups and production DNS/TLS need real service credentials and deployment setup. The privacy policy requires venue operational review. See REBUILD-REPORT.md and QA.md for precise coverage and limits.
