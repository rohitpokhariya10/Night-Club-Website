/**
 * Tonearm geometry for the DJ console (DJ-CONSOLE-REPORT.md). Units are the turntable's own 100 × 100 SVG box.
 *
 * The arm is rigid and turns about a fixed pivot. Its angle θ (degrees, clockwise) is 0 when it hangs straight down
 * into its rest. The stylus is a fixed point on the arm (`STYLUS`, relative to the pivot at θ = 0), so it always stays
 * the same distance from the pivot. Where it lands on the record is its distance from the record's centre: a real
 * record plays from the outside in, so the outer groove is the start of a track and the inner groove its end. The
 * mapping goes through the arm's actual arc (law of cosines), not through the pointer's x or y.
 */
export type Point = {x: number; y: number};

export const CENTER: Point = {x: 50, y: 50};
export const PIVOT: Point = {x: 92, y: 11};
/** Stylus tip relative to the pivot with the arm at rest (the headshell's offset puts it slightly inboard). */
export const STYLUS: Point = {x: -1.5, y: 75};
export const RECORD_RADIUS = 42.7;
export const LABEL_RADIUS = 16.3;
/** Playable band: the lead-in groove (track start) and the run-out (track end). */
export const OUTER_GROOVE = 40.5;
export const INNER_GROOVE = 20;

const rad = (deg: number) => deg * Math.PI / 180;
const deg = (r: number) => r * 180 / Math.PI;
const ARM = Math.hypot(STYLUS.x, STYLUS.y);
const SPAN = Math.hypot(CENTER.x - PIVOT.x, CENTER.y - PIVOT.y);
/** The stylus's own angle offset from the arm axis, and the stylus angle that points straight at the centre. */
const OFFSET = deg(Math.atan2(-STYLUS.x, STYLUS.y));
const TOWARD_CENTER = deg(Math.atan2(-(CENTER.x - PIVOT.x), CENTER.y - PIVOT.y));

export function stylusAt(angle: number): Point {
  const a = rad(angle), c = Math.cos(a), s = Math.sin(a);
  return {x: PIVOT.x + STYLUS.x * c - STYLUS.y * s, y: PIVOT.y + STYLUS.x * s + STYLUS.y * c};
}
export const radiusAt = (angle: number) => {const p = stylusAt(angle); return Math.hypot(p.x - CENTER.x, p.y - CENTER.y);};

/** The arm angle that puts the stylus at `radius` from the centre, on the arm's inward swing. */
export function angleForRadius(radius: number) {
  const cos = (SPAN * SPAN + ARM * ARM - radius * radius) / (2 * SPAN * ARM);
  return TOWARD_CENTER - deg(Math.acos(Math.min(1, Math.max(-1, cos)))) - OFFSET;
}
/** Furthest inward the arm can travel: the stylus stops in the run-out, clear of the label. */
export const MAX_ANGLE = angleForRadius(LABEL_RADIUS + 2.8);
export const REST_ANGLE = 0;

/** Track progress (0 start … 1 end) for a stylus radius; null when the stylus is off the record. */
export function progressAtRadius(radius: number): number | null {
  if (radius > RECORD_RADIUS) return null;
  return Math.min(1, Math.max(0, (OUTER_GROOVE - radius) / (OUTER_GROOVE - INNER_GROOVE)));
}
export const progressAtAngle = (angle: number) => progressAtRadius(radiusAt(angle));
export const angleForProgress = (progress: number) => angleForRadius(OUTER_GROOVE - Math.min(1, Math.max(0, progress)) * (OUTER_GROOVE - INNER_GROOVE));
/** Pointer angle about the pivot, in the arm's convention (0 = straight down, clockwise positive). */
export const pointerAngle = (p: Point) => deg(Math.atan2(-(p.x - PIVOT.x), p.y - PIVOT.y));
export const clampAngle = (angle: number) => Math.min(MAX_ANGLE, Math.max(REST_ANGLE, angle));
