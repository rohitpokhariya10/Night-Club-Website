# Content verification — November 14, 2026

The official Jimmy O’s website was read with browser search/open tools and its HTML downloaded for link verification. The original client content is the source for the redesign; internal pages must use local application routes, not the source URLs below.

## Menus

- https://jimmyodelmar.com/food-menu — 21 entries in Appetizers (6), Food (5), Flatbreads (4), Salads (1), After Dark Menu (5).
- https://jimmyodelmar.com/drink-menu — 24 entries in Bottled Beer (7), Draft Beer (6), Wine & Bubbles (5), Cocktail Pitchers (3), Cocktail Tree Stand (3).

`packages/shared/src/content.ts` preserves every published item, price and option. Price labels retain pint/pitcher, single/bucket and glass/bottle units. No additional brands or ingredients are inferred. Some source wording is lightly normalized for punctuation. The official source lists Michelob Ultra draft as 4.8%; preserved without independently correcting it. The After Dark Wings price is $1.50 but no portion basis is stated, so no per-wing claim is added. Carne Asada Tacos has an ambiguous list of filling/topping choices; preserved rather than inventing a choice policy. The official site supplies no after-dark service hours. Availability and prices should be confirmed by staff.

## Specials

https://jimmyodelmar.com/specials currently publishes:

- Friday November 13: Early Night Special — Bottle + Booth — $150; 5 PM–10 PM.
- Saturday November 14: same special, noon–10 PM.

Both are recorded as bounded 2026 occurrences in America/Los_Angeles (PST, UTC−8), with startsAt and endsAt in UTC. There is no verified weekly recurrence, so none is inferred. Upcoming specials may be shown if marked clearly; active specials must be between start and end, and expired occurrences must be excluded. No bottle brand, included quantities, guaranteed booth, tax, gratuity or additional terms are invented. An inquiry is not confirmation.

## Events

https://jimmyodelmar.com/events verifies Thanksgiving on November 26, Christmas December 25, New Year’s Eve December 31 (all 2026), and National Pizza Day February 9, 2027. Published time for each is 11 AM–2 AM the following day, venue Pacific Time. These holiday times differ from ordinary published hours; keep the caveat to confirm details with staff. No DJ name or ticket price is supplied. The expired Opening Day July 17 promotion on the home page must remain excluded.

## About, catering, parties, jobs

- https://jimmyodelmar.com/ — original venue story, services, generic hiring message, catering and celebrations information.
- https://jimmyodelmar.com/catering — catering form link, no package menu or prices.
- https://jimmyodelmar.com/party — Group Reservations and Private Parties, no capacity or room specifications.
- Original Jobs link: https://tmt.spotapps.co/job-listings?spot_id=208933&callback_url=http://jimmyodelmar.com/ — could not be opened by web tool. The site's generic hiring invitation does not verify an individual current vacancy. Use a general expression-of-interest flow, with no invented positions, salary or hiring promise.

Catering occasions verified on the homepage: birthday parties, holiday parties, corporate events, wedding festivities. Party occasions include birthdays, anniversaries, rehearsal dinners, corporate events and special gatherings. Bottle service, karaoke, DJs, weekend dancing and football Sundays appear in the venue description. No precise recurring performance time was verified.

## Reviews

The homepage features Google-attributed reviews by Hal J., Sonny T. and Oscar R. One short excerpt from Oscar R. is stored for use, with explicit attribution as a Google review featured on the official website. No star rating, aggregate rating, independent direct Google-review verification or review date is claimed. The source page has a Google business/reviews link; the known place ID is `ChIJjdm5G7UI3IARHyJ60DOCAEQ`. Do not add aggregate review JSON-LD.

## Navigation and social accounts

Downloaded original HTML confirms Menu, Drinks, Specials, Events, Catering, Jobs, Parties. No Gallery navigation link is present in the current HTML. The cropped “G” mentioned in the brief cannot be identified conclusively without the screenshot; a Google review link exists, but that is insufficient evidence to identify the crop. Gallery should be added because the user explicitly requests it.

No Instagram, Facebook or other social-profile URL was found in the official HTML. `socialLinks` is intentionally empty until the client supplies or verifies profiles. Do not fabricate handles. Google directions is a verified functional link and remains external.

## Contact and hours

225 15th Street, Del Mar, CA 92014; (858) 350-3735; chelsea@jodelmar.com. Monday closed; Tuesday–Thursday 5 PM–2 AM; Friday–Sunday noon–2 AM. Hours are Pacific Time; holiday exceptions may apply.
