# Gallery Reference: Motion Breakdown

**Reference:** https://in.pinterest.com/pin/145311525471662996/ ("Layout ideas for web | Collage web page …"), inspected November 14, 2026.

## Access and method
- **Tools:** the pin was opened in Playwright-driven Chromium (`scripts/motion/pinterest-recon.mjs`). Pinterest showed its login prompt and the pin video played underneath. No login, and nothing was bypassed.
- **Video file:** the page references a public MP4 (`v1.pinimg.com/…/3328e3c4…_720w.mp4`, 576×720, 27.0 s, no login needed). It was saved to `artifacts/gallery-reference/media/` for frame analysis only and is not used on the site.
- **Frames:** extracted by seeking Chromium's `<video>`: every 0.5 s across the whole clip (`sheet-a.png`, `sheet-b.png`), every 0.2 s for 0–5 s (`sheet-open.png`), every 0.25 s for 5–8 s (`sheet-orbit.png`) and every 0.08 s for 6.4–7.7 s (`sheet-fine.png`), all in `artifacts/gallery-reference/`.

## What the reference is
Eight photographs on black, arranged as **cards evenly spaced around a ring with an empty centre**: a car, a portrait, red spheres, an orange silhouette, a blue silhouette, a modernist house, a reaching hand and warm wood. The cards are about 20% of the frame wide, with mixed proportions (landscape 4:3, square, portrait 3:4), and neighbours overlap slightly at the edges. There is no text in the clip.

## Choreography (all time-based; it is a motion-design loop)
| Time | Behaviour | Detail |
|---|---|---|
| 0 → 1.6 s | **Breathing zoom, out** | The ring's radius and card scale grow about 1.35× and neighbours overlap more. The ring **rotates counter-clockwise** (the car travels from top centre to the left side, about 60°). Cards stay upright as they orbit. |
| 1.6 → 3.4 s | **Breathing zoom, in** | Radius and cards shrink back past rest to about 0.85×, with the counter-clockwise rotation continuing. |
| 3.4 → 4.2 s | **Swirl burst** | Every card abruptly enlarges (about 1.6–2×), pushes outward and **tilts to different angles (±20–40°)**, as if the camera spins inward. It's the most energetic moment. |
| 4.2 → 5.0 s | **Settle** | Cards shrink back into a clean ring, upright, in a fast ease-out. |
| 5.0 → 27 s | **Steady orbit** | The ring keeps rotating counter-clockwise, about 90° every 8 s, punctuated by the events below. |
| e.g. 6.6 → 7.6 s | **Ripple wave** (signature) | One card after another, **counter-clockwise around the ring**, tilts (−30° to +40°), grows about 1.1× and pops above its neighbours, then settles. About **0.13 s between neighbours**, about 1 s per lap, ease-out. |
| Throughout | **Brightness ripple** | Cards dim to about 30–40% and re-light in sequence, giving depth (the dim ones read as further away). |
| e.g. 9.0 s, 15–16.5 s | Single-card pops | Isolated tilts and pops (the same move as the ripple, one card at a time) |

- **Easing:** the burst eases in sharply; the settle and the pops use a strong ease-out; the orbit and breathing are slow sine-like motions.
- **Final arrangement:** the clean ring of eight upright cards around an empty centre.
- **Hover and pointer:** none visible (it's a video).
- **Mobile:** the reference is a single portrait composition.
- **What makes it distinctive:** the **circular orbit around an empty centre**, cards that stay upright while orbiting, the **counter-clockwise ripple of tilting, popping cards**, the burst-and-settle, and dimmed depth layering.

## Mapping to the Jimmy O's gallery
| Reference | Jimmy O's implementation | Why |
|---|---|---|
| Ring of 8 cards around an empty centre | **8 authentic Jimmy O's photographs** in a ring. On desktop and tablet, **the eyebrow and "THE NIGHTS WE LIVE FOR." sit in the empty centre**, with "Enter the Gallery" just below the ring. On phones the title sits above the ring and the call to action becomes a round button in its centre. Mixed card proportions as in the reference: landscape or square cards orbit past the title's top and bottom, portrait cards the sides. | Uses the composition itself; the photos stay the star. A measured check keeps every card clear of the title at every point of the orbit. |
| Burst → settle (3.4–5.0 s) | **The entrance:** cards start in the burst state (enlarged, pushed out, tilted) and settle into the ring, **scrubbed by scroll** as the section arrives, so it reverses exactly and is never left half-hidden | A page load can't wait for a 27 s loop; scroll gives the same progression under the visitor's control |
| Counter-clockwise orbit, upright cards | **Scroll-linked orbit:** the ring turns counter-clockwise as the page moves, and each card counter-rotates to stay upright | Content that moves on its own for more than 5 s needs a pause control (WCAG 2.2.2); tying the orbit to scroll keeps it calm and clickable |
| Breathing zoom | Subtle ring scale (1 → 1.06 → 1) across the section's scroll | The same character, restrained so captions stay readable |
| Ripple wave (counter-clockwise tilt-and-pop) | Plays **once each time the ring settles**, and again when the pointer enters the ring (desktop, starting from the card nearest the pointer). 0.1 s between neighbours, about 1.7 s in total. Tilts are restrained to ±12–18° (the reference reaches −30° to +40°). | The signature move. Short one-off waves need no pause control. |
| Brightness ripple | Cards start dimmed (never below about 40% brightness) and re-light as they settle; during the ripple each card dims just before its pop and re-lights as it pops | Depth without hiding photos |
| Single-card pops | **Hover or focus** pops that card (tilt, slight scale, raised above its neighbours) and shows its caption | Pointer and keyboard interaction (the reference has none) |

## Differences that remain (deliberate)
- **Scroll-linked, not time-based.** The reference is a 27 s loop; on the site, the burst → settle and the orbit follow the scroll position, so they reverse exactly and nothing moves on its own except the short ripple.
- **An elliptical ring on wide screens.** The reference is a circle in a portrait frame. Desktop and tablet use a wider ellipse around the title, and phones use a slightly tall one.
- **Restrained amplitudes:** burst tilts of ±22–38° with 1.6–1.9× scale, ripple tilts of ±12–18° with 1.1× scale, and 1 → 1.06 breathing (the reference breathes about 0.85 → 1.35×), so captions and faces stay readable.
- **Text and interaction.** The reference has no text and no interaction; the site adds the title, captions, hover and focus pops, and the viewer.
