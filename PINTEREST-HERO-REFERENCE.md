# Pinterest Hero Reference: Motion Breakdown

Inspected November 14, 2026.

## Access and method

- **Tools:** Computer Use was not available in this session. Both pins were opened in Chromium driven by Playwright 1.65 (`scripts/motion/pinterest-recon.mjs`).
- **Login prompt:** Pinterest showed its login prompt over each pin, but the pin video played underneath it. I did not log in and nothing was bypassed.
- **Video files:** each pin page itself references a public, unauthenticated MP4 on `v1.pinimg.com`. Those two files were saved to `artifacts/pinterest-reference/media/` for frame-accurate analysis only. They are not used on the website.
- **Frame extraction:** frames were extracted by seeking Chromium's `<video>` element to exact timestamps (`scripts/motion/video-frames.mjs`). The primary video was sampled every 0.5 s across its full 17.2 s and every 0.1 s across the intro, plus full-resolution keyframes. The secondary video was sampled every 0.25 s across its full 10 s.
- **Evidence:** `artifacts/pinterest-reference/`, specifically `sheet-primary-a.png`, `sheet-primary-b.png`, `sheet-primary-intro.png`, `sheet-primary-keyframes.png`, `sheet-secondary.png`, `primary-full/` and the recon JSON files.

---

## Primary: https://in.pinterest.com/pin/672725263127191910/ ("First screen")

**Video:** 728×532, 17.2 s. It shows a dark landing-page hero ("Meet! Recognito / Built for a secure Web3 future.") displayed on a device mockup.

**Looping:** the clip loops the page's load animation. The intro runs from about 2.8 s to 5.0 s in the clip; the rest is the ambient loop.

### Visual system

| Layer | Observation |
|---|---|
| **Fluted glass** | **11 vertical slats** span the full hero, separated by faint dark seams. Each slat shows its own slice of a light band. Inside a slat the band is flatter than the true curve, so the band visibly **steps** at every slat boundary, the way light does through reeded glass. |
| **Light band** | A soft horizontal band with a white-hot core, an orange body and long falloff into black. Its brightness varies along its length, and a warm haze spills toward the bottom. |
| **Emblem orb** | A dark glass disc (about 9.5% of hero width when centred, 11.6% at rest) containing a glowing ring logo, with an outer glow. |
| **Interface** | Centred composition: a pill badge at about 19% height, a two-line headline at about 31%, a subtitle, and two CTAs at about 52%. The nav sits at the top: logo left, links centre, CTA right. |
| **Floating labels** | Six small chips around the lower half, faint circuit lines and scattered twinkling dots. |
| **Resting composition** | The band rises diagonally from lower-left to upper-right behind the text. The orb sits at bottom centre (about 82% height), and the labels surround it. |

### Choreography (T0 = intro start, 2.8 s into the clip)

| Time after T0 | Light band | Orb | Typography and UI |
|---|---|---|---|
| **0.0 s** | Only the light exists: a **U-shaped band** with its lowest point at the centre and the right side slightly higher | Centred (≈50% height), at about 0.8 of resting size | None |
| **0.0 → 0.6 s** | The U **deepens and brightens**; the core thickens | Holds at centre | None |
| **≈1.0–1.1 s** | The band widens through the middle | **Begins to fall** (0.545 at 1.1 s) | **Headline ghosts in:** heavily blurred, about 15% opacity. The badge appears. |
| **1.1 → 1.6 s** | The band starts to **tilt**, and a large bright region forms centre-left | Falls fastest (0.72 at 1.6 s) | The headline sharpens with slight residual blur. **Nav, subtitle, CTAs and labels fade in.** |
| **1.6 → 2.1 s** | Morphs into the **rising diagonal** | Lands softly (0.80 at 2.1 s, 0.82 at rest) and reaches full size | Everything is sharp and fully opaque |
| **2.1 s onward** | **Ambient loop:** the band keeps undulating. It cycles through rising diagonal, wave with a bright left side, shallow U, and back to rising diagonal, roughly every 4–6 s. | Static | Static |

- **Easing:** the orb's fall is a classic ease-in-out. The text uses a blur-to-sharp ease-out. Band morphs are slow sine-like ease-in-out.
- **Total intro:** about 2.1 s to full composition, settling by about 2.4 s.
- **Scroll:** none. This is a load and time animation. There is no masking beyond the slat windows and no camera move other than the morph.
- **Loop:** the clip itself loops. On the page, only the ambient band loops.

---

## Secondary: https://in.pinterest.com/pin/939070959796023033/ ("Hero UI Animation for Metaldot")

**Video:** 720×540, 10.0 s. This is a different animation from the primary.

- A static diagonal field of soft, spiky streaks fills the right two-thirds of the hero. The text ("Achieve Excellence in Industrial Design") and nav do not move.
- **Motion is pointer-reactive:** a small white cursor dot travels across the field, and the iridescent colours (blue, violet, magenta, orange, green) shift and brighten around it. There is no intro, and no scale, mask or layout changes.
- **What Jimmy O's takes from it:** only the idea of **light that responds to the pointer**. On desktop, the brightest part of the Jimmy O's band drifts toward the pointer. The secondary pin's colours and shapes are not used.

---

## Mapping to Jimmy O's (brand assets only)

| Reference | Jimmy O's |
|---|---|
| Orange/white light band | The same band in **Jimmy O's tokens**: core `--text` #F8F4FF, then `--accent-readable` #D2A7FF, `--accent` #BD85FA, `--purple` #9259C5 and `--button` #6E32A8, over `--background` #090910 (navy-black) |
| 11 fluted slats | 11 slats on desktop, 8 on tablet, 6 on mobile |
| Ring-logo orb | Dark glass disc with a purple glow ring, holding the **Jimmy O's logo** |
| Badge, two-line headline, subtitle, two CTAs | The existing eyebrow (as a pill), **"DEL MAR AFTER DARK."** in the existing Kaushan Script, the existing description, and the existing **EXPLORE NIGHTLIFE** and **BOOK A TABLE** buttons and links |
| Floating labels | The existing experience labels: "DJ experiences", "Karaoke nights", "Catch the game", "Drinks & good company" (decorative, `aria-hidden`) |
| Nav appearing late | The existing Jimmy O's header fades in on the same beat |
| Previous hero background video | **Removed from the hero.** The video files stay in `public/videos/`. |
