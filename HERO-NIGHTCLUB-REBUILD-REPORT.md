# Hero rebuild — inside the club

November 16, 2026. The homepage hero rebuilt so the first screen feels like being inside a premium nightclub: light, people, music and depth, with the headline and the two CTAs still leading. Built on the Midnight Ember identity (PREMIUM-NIGHTCLUB-VISUAL-IDENTITY-REPORT.md) and on the existing hero mechanics, which are kept: fluted glass, flowing light, logo orb, intro sequence, Skip, pointer-reactive light, the desktop hold-and-recede, and the reduced-motion and no-JavaScript fallbacks.

## 1. The references

Both pins were opened in Chromium (`scripts/motion/pinterest-recon.mjs`, `pin-image.mjs`); their media were saved for analysis only, in `artifacts/hero-rebuild/reference/`, and are not used on the site. Neither is a nightclub, so the adaptation borrows mood and motion language, not content.

**Pin 1 (hero mood):** pinterest.com/pin/864339353532840736. A dark "Echo Agency" website hero from a Dribbble shot. What it does:
- two warm volumetric light shafts fall from above into haze;
- light pools on a glowing floor that fades into black, with soft reflections;
- a few small silhouetted people stand at different depths for scale;
- the type is large and low, the interface minimal;
- the palette is black, deep red-orange and amber.

The light is the subject, and the people give it scale and life.

**Pin 2 (scroll light):** pinterest.com/pin/725290715041219508. A 35-second, code-built isometric "gold vault" animation, analysed frame by frame (`artifacts/hero-rebuild/reference/pin2/frames.jpg`). As the story advances step by step, the camera dollies continuously and the light travels: the active part blooms into glow while the rest stays dim line-art. Nothing flashes or cuts; each glow rises and falls smoothly.

**What was taken:**

| From | Took | Not taken, and why |
|---|---|---|
| Pin 1 | Light from above into a dark room; people as silhouettes for scale and life; depth; a warm, near-monochrome palette; type that owns the frame. | Its static figures (a nightclub needs movement), its orange floor (Jimmy O's identity is the fluted glass, kept as the backlit wall), its pixel serif (the site keeps Syne and Manrope). |
| Pin 2 | Light as the thing that moves the story on scroll: lights swing and converge, a glow travels across the room, the room dims as the next "step" (section) arrives; continuous, smooth transitions. | Line-art isometric drawing, magenta glow, step captions: wrong world for a bar. |

## 2. What the hero is now

**The idea: you are on the floor of the club, looking toward the DJ.** The fluted glass becomes the club's backlit feature wall. The existing flowing light band now runs behind it, low and nearly level, so it backlights a dancing crowd. Warm beams fall from the ceiling rig. The headline sits in the shadowed upper room.

Back to front, inside the hero's media layer:

1. **The feature wall** (`.lf`, existing engine `lightField.ts`): the light behind the fluted glass, moved down to sit behind the crowd (`RESTING.mid` 0.7 from 0.6, `tilt` 0.14 from 0.46), so it no longer crosses the headline. It keeps its flow, its pointer reaction, and its intro (the U-shaped light under the orb). It now breathes on the beat: a soft rise and fall every two beats at 124 BPM.
2. **Ceiling beams** (`.hero-beams`): five volumetric shafts in the palette (champagne, amber, ember, one cool steel), soft-edged and screen-blended. Each sways slowly on its own and has a rig that scroll can swing. The steel beam is dropped on phones.
3. **Ember wash and light sweep** (`.hero-wash`, `.hero-sweep`): invisible at rest, used only by the scroll choreography.
4. **The crowd** (`.hero-crowd`, `lib/motion/crowd.ts`): people in three depths in front of the wall (§3).
5. **Above them:** the existing shade keeps the headline in shadow, the orb, and the copy and CTAs (unchanged).

**Removed for a cleaner composition:** the four floating captions ("DJ experiences", "Karaoke nights" and the others). The dust in the light now sits in the upper room, where the beams are.

## 3. How the crowd was made

**Why not footage.** The client's hero video was checked frame by frame (`artifacts/hero-rebuild/reference/hero-video-frames.jpg`): cocktails, food, the bar and a daytime exterior, but no dancing or DJ footage. No licensed nightlife footage was supplied, and stock footage of another venue would misrepresent Jimmy O's. So the crowd is drawn as anonymous silhouettes: they show the mood without claiming to be specific people or another place.

**Drawing.** On two canvases (far and middle rows on one, the near row on the other), so each depth gets its own depth-of-field blur: 1.2 px behind, 3.4 px in front.
- Proportions follow a real figure: the arm, shoulder to wrist, is about 2.4 head-heights, tapered with a bent elbow; the shoulders slope; heads vary (short hair, long hair, a bun, a cap).
- Each person gets a thin warm rim of light along their top edges, as if backlit by the wall.
- **Poses:** most people stand and move. A share have hands up (more in the back rows, where they read against the light), a few pump a fist, a few hold up a phone whose screen catches a little cool light. The near row is heads and shoulders.
- The layout is seeded, so every visit sees the same room.

**Movement.**
- Everyone shares one tempo (124 BPM): a small bounce on the beat (2% of their height), a sway on the half-beat, a head tilt, and arms that pump or sway.
- About a third move at half-time, and every phase differs, so it reads as a room moving to the same track, not a synchronised loop.
- An `energy` value scales all movement: the intro raises it from 0.15 to 1 as the crowd rises into the light, and scroll lifts it, then lets it fade.

**First version and why it changed.** The first browser recording showed a crowd that read as clip art: arms about 50% too long and too thick, too many identical "V" poses, big blurred front-row arms, small heads. After it was rebuilt with real proportions, fewer raised arms, a heads-and-shoulders front row, rim light and varied heads, it reads as people at a distance. On phones the rows sit higher so the heads overlap the wall light and are backlit.

## 4. How the scroll lighting works

It runs in the existing scroll-scrubbed timelines: `hero-recede` (desktop and tablet, while the next section rises over the held hero) and `hero-exit` (phones, native scroll). Progress follows scroll position, so it reverses exactly and is never left half-played. Over that range:

- **Lighting cue:** the beams brighten to full as scrolling starts.
- **Converge:** the rigs swing inward (left of centre turn right, right of centre turn left; 70% as far on phones), so the beams cross over the section rising into view.
- **Sweep:** a soft champagne light travels across the upper room.
- **Wash:** ember rises from the ceiling, with crimson in the corners.
- **Crowd:** lifts its energy, then recedes and darkens.
- **Hand-off:** the beams dim to 40% as "Every night has a rhythm" takes over.

When the hero is fully covered, the light engine, the beam sway and the crowd stop drawing, and the existing `data-ambient` state reads `paused`. All start values are explicit and nothing renders early, so the scrub never fights the intro or the ambient sway.

## 5. Reduced motion and no JavaScript

- **Reduced motion:** no intro, no sway, no beat, no scroll lighting. The crowd is drawn once, standing, and the beams rest. This works at every width: it uncovered a latent issue, below.
- **No JavaScript:** the wall, beams, orb, headline and CTAs are server-rendered; the crowd canvases stay empty.
- **Latent issue fixed:** `gsap.matchMedia` only calls a conditions callback when at least one condition matches. On a wide screen with reduced motion, both `motion` and `mobile` were false, so the hero's reduced-motion branch had never run there; it had nothing visible to do until now. A `reduce` condition was added.
- All new layers are `aria-hidden` and ignore the pointer. Keyboard order, focus and Skip are unchanged.

## 6. Files

New: `apps/web/src/lib/motion/crowd.ts`; `tests/browser/hero-scene.spec.ts`; `scripts/visual/hero-capture.mjs`, `hero-motion.mjs`, `hero-record.mjs`.

Changed:
- `apps/web/src/components/HeroLight.tsx`: new `HeroScene` (beams, wash, sweep, crowd canvases); captions removed; dust moved into the upper room.
- `apps/web/src/components/SiteSections.tsx`: `HeroScene` inside the hero's media layer.
- `apps/web/src/lib/motion/lightShape.ts`: the wall light's resting shape.
- `apps/web/src/components/motion/HomeMotion.tsx`: the crowd and beams in the intro, ambient and visibility logic; scroll lighting; the reduced-motion still crowd and its matchMedia condition.
- `apps/web/src/app/globals.css`: scene layers; caption rules removed; new layers added to the intro's pre-paint state and its fail-safe.
- `tests/browser/visual-identity.spec.ts`: the earlier caption check now asserts no captions.

## 7. Verification

_Final numbers below._
