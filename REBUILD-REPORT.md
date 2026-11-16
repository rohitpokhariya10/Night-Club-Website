# Complete website delivery — November 14, 2026

The original landing page has been expanded into an independent multi-page Next.js application. All internal features stay on the new site; Google directions/review-location, telephone and email links remain external where appropriate. No live client-domain deployment was performed.

## Implemented pages

| Route | Delivered behavior |
|---|---|
| `/` | Poster-first cinematic video hero, layered photo composition, venue story, nightlife, menu previews, dated specials, upcoming events, parties/catering, gallery, attributed review, visit information |
| `/food-menu` | 21 verified items across 5 original categories, descriptions/options, prices, category navigation and photography |
| `/drink-menu` | 24 verified items across 5 categories, exact unit pricing, beers, wine, cocktail pitchers and trees |
| `/specials` | Verified dated offers, current/upcoming labels, start/end times and automatic expiry; truthful empty state |
| `/events` | Future published events with real venue photography, dates, descriptions and local detail links |
| `/events/[slug]` | Individual descriptions, Pacific start/end times, venue address, request actions, Event JSON-LD and 404 for unknown/unpublished slugs |
| `/nightlife` | Editorial stories for dancing/DJs, karaoke/live entertainment and group/bottle-service inquiries |
| `/catering` | Verified service occasions, process and PostgreSQL inquiry form |
| `/jobs` | Careers introduction and validated expression-of-interest form; no invented vacancy |
| `/private-parties` | Verified celebration types, private-party information and stored inquiry |
| `/reservations` | Required date, Pacific time, party size and contact details; stored request with honest unconfirmed status |
| `/gallery` | Asymmetric photo gallery with modal, next/previous controls, arrows, Escape and focus restoration |
| `/about` | Authentic venue story, offerings and attributed guest review |
| `/contact` | Address, hours, call/email/directions, reservation link and stored contact form |
| `/privacy` | Current operational privacy description, including career interest data |
| `/menu`, `/parties` | Permanent local aliases to the full menu and private parties pages |

The original primary categories are Menu, Drinks, Specials, Events, Catering, Jobs and Parties. Gallery is added as requested. The reported cropped “G” cannot be independently identified from the current source; it has no verified Gallery link. The full menu overlay and footer also expose Nightlife, About, Contact and Reservations.

## Design and motion

Navy-black (#090910), dark violet surfaces (#10101C), lavender (#BD85FA), purple buttons (#6E32A8), warm white (#F8F4FF), muted text (#B8B4C6). Tokens live in `src/styles/tokens.css`. Rubik, Rubik Dirt and Kaushan Script use the exact supplied binaries. Font metadata and original rendered styles were inspected; see MEDIA-UPDATE.md.

GSAP/ScrollTrigger supplies route-aware entrances, one-time section reveals and gentle photo parallax with cleanup. CSS supplies underline, button, image and event-tile interactions. Reduced motion disables animation and video. The gallery and navigation manage keyboard focus. Responsive media uses Next Image/getImageProps, local fonts and mobile video selection.

## API and data

Read endpoints: `GET /api/v1/health`, `/venue`, `/menu/highlights`, `/menus/food`, `/menus/drink`, `/specials`, `/events/upcoming`, `/events/:slug`.

Write endpoints: `POST /api/v1/inquiries`, `/catering-inquiries`, `/party-inquiries`, `/reservation-requests`, `/contact-inquiries`, `/job-applications` (all under `/api/v1`). Dedicated endpoints enforce their inquiry type. Zod validates lengths, contact data, consent, dates, time and counts. Reservations require scheduling; careers require availability. Operational and marketing consent are separate. PostgreSQL insert success is required for a success response. No email delivery or confirmed booking is implied.

Models: Venue, MenuCategory (kind/description/order), MenuItem (availability, featured, unit-price label, numeric price where applicable), Event, Special (publication/start/expiration), MediaAsset and Inquiry (type/status/contact, event date/time/count, career interest/availability, consents). Three tracked migrations and an idempotent verified-content seed are included. Existing placeholder category IDs are preserved when matching slugs. No admin dashboard is built.

## SEO

Every page has a title, description, canonical and social metadata, one H1 and server-rendered primary content. Sitemap covers all pages and current event details. Local BarOrPub structured data appears site-wide; event pages add valid factual Event data without invented offers/ratings. Staging remains noindex. Production indexing requires explicit environment configuration and rebuild. No external rich-result validator was run.

## Verification and launch limits

See QA.md for executed tests, responsive checks and measured Lighthouse results. Screenshots are under docs/screenshots/rebuild/.

No specific current job vacancies, verified social handles, full catering packages or recurring DJ schedule were available, so none is invented. Specials are bounded dated offers, not assumed weekly repeats. No booking-provider or email credentials were supplied. Staff must monitor the stored requests through restricted database tooling until admin/notification integration is added. Venue policy/retention, media rights, holiday schedules, high-resolution photographs, backup destination, DNS and production deployment remain client launch inputs.

Local start and Hostinger deployment instructions are in README.md. Docker remains a single web/API/PostgreSQL/Caddy stack with persistent database storage and no exposed public database/API ports.

Final local mobile Lighthouse: 83 performance, 100 accessibility, 100 best practices, 69 SEO (intentional staging noindex); CLS 0. Native build/lint/types, 12 API tests and 17 browser tests pass. Mobile performance remains an optimization opportunity; no production score is claimed.
