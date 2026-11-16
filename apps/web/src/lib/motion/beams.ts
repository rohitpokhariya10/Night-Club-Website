import {inlineRotation} from './headlineReflection';
import type {Crowd, StageLight} from './crowd';

/**
 * The ceiling fixtures' idle programs (final hero refinement). Real moving heads are not synchronised: each runs its
 * own sweep. Every beam here sums a main sweep (a, p: amplitude in degrees and period in seconds) and a slower drift
 * with an unrelated period (b, q), so the five never return to the same arrangement, every turn eases (a sum of sines
 * has no corners), and beams cross one another's paths now and then. Peak angular speed is bounded by
 * 2π(|a|/p + |b|/q), under 6.1°/s for all five, so nothing ever snaps. Opposite signs send neighbours different ways.
 */
export const BEAM_PROGRAMS = [
  {a: 9, p: 11.3, b: 3, q: 19.7},
  {a: -10, p: 12.4, b: 3.5, q: 23.1},
  {a: 8, p: 10.2, b: -3, q: 17.3},
  {a: -9.5, p: 11.8, b: 3.2, q: 21.4},
  {a: 10, p: 13.1, b: -3.5, q: 18.9},
] as const;

/** Seconds the fixtures take to reach full speed from the resting pose (no velocity jump when the room starts). */
export const BEAM_EASE_IN = 2.4;
const warp = (t: number) => (t < BEAM_EASE_IN ? (t * t) / (2 * BEAM_EASE_IN) : t - BEAM_EASE_IN / 2);

/** Beam i's idle angle (degrees) t seconds into the room's clock. Zero, at rest, when the clock starts. */
export function beamAngle(i: number, t: number) {
  const {a, p, b, q} = BEAM_PROGRAMS[i];
  const u = warp(Math.max(0, t));
  return a * Math.sin((2 * Math.PI * u) / p) + b * Math.sin((2 * Math.PI * u) / q);
}

/** The largest idle angle (degrees) a beam can reach, and its peak angular speed (degrees per second). */
export const beamReach = (i: number) => Math.abs(BEAM_PROGRAMS[i].a) + Math.abs(BEAM_PROGRAMS[i].b);
export const beamPeakSpeed = (i: number) => 2 * Math.PI * (Math.abs(BEAM_PROGRAMS[i].a) / BEAM_PROGRAMS[i].p + Math.abs(BEAM_PROGRAMS[i].b) / BEAM_PROGRAMS[i].q);

/** Light colours for the crowd's rims, per fixture tone (the CSS beam colours, as plain RGB). */
const TONES: Record<string, StageLight['color']> = {spot: [246, 206, 160], amber: [232, 150, 104], ember: [228, 100, 72], steel: [146, 176, 196]};

/**
 * Feeds the crowd the beams actually behind it: each fixture's position, its resting + scroll (rig) + idle (light)
 * angle, its beam angle and strength. Angles are read from the inline transforms GSAP already wrote (no layout reads,
 * no parsing through GSAP), static geometry from CSS once and again only after a resize.
 */
export function crowdLighting(rigs: HTMLElement[], lights: HTMLElement[], field: HTMLElement | null, crowd: Crowd) {
  let fixtures: {x: number; rest: number; half: number; color: StageLight['color']; strength: number; shown: boolean}[] | null = null;
  const read = () => {
    fixtures = rigs.map(rig => {
      const style = getComputedStyle(rig);
      const scale = parseFloat(style.getPropertyValue('--ba-scale')) || 1;
      return {
        x: parseFloat(style.getPropertyValue('--bx')) / 100, rest: parseFloat(style.getPropertyValue('--br')) || 0,
        half: (parseFloat(style.getPropertyValue('--ba')) || 8) * scale / 2, color: TONES[rig.dataset.tone ?? ''] ?? TONES.spot,
        strength: parseFloat(style.getPropertyValue('--bo')) || 0.6, shown: style.display !== 'none',
      };
    });
  };
  const invalidate = () => {fixtures = null;};
  addEventListener('resize', invalidate);
  const update = () => {
    if (!fixtures) read();
    const room = !field || field.style.opacity === '' ? 1 : Number(field.style.opacity);
    const out: StageLight[] = [];
    fixtures!.forEach((f, i) => {
      if (!f.shown) return;
      const own = lights[i].style.opacity === '' ? f.strength : Number(lights[i].style.opacity) * f.strength / 0.7;
      out.push({x: f.x, angle: f.rest + inlineRotation(rigs[i].style.transform) + inlineRotation(lights[i].style.transform),
        half: f.half, color: f.color, strength: Math.min(1, own * room)});
    });
    crowd.lights = out;
  };
  return Object.assign(update, {destroy: () => removeEventListener('resize', invalidate)});
}
