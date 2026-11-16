/**
 * Pure geometry for the hero light field: a soft band seen through vertical fluted-glass slats
 * (PINTEREST-HERO-REFERENCE.md). No browser APIs, so the server can render the resting
 * composition and the client engine can animate the same model.
 */
export type LightState = {
  /** Band centre line at the horizontal middle, as a fraction of hero height (0 = top). */
  mid: number;
  /** U-shape depth: edges rise by this much relative to the centre. */
  bow: number;
  /** Rising diagonal: the right edge sits this much higher than the left. */
  tilt: number;
  /** Undulation amplitude, frequency (cycles across the width) and travelling phase. */
  wave: number;
  freq: number;
  phase: number;
  /** Band thickness multiplier and overall light intensity (0–1). */
  thick: number;
  glow: number;
  /** Brightest region: horizontal position and spread. */
  core: number;
  spread: number;
  /** Pointer-reactive highlight (secondary reference): position and weight 0–1. */
  px: number;
  pw: number;
  /** How much flatter each slat's slice is than the true curve (reeded-glass stepping). */
  flatten: number;
};

/** Resting composition: the band rises from lower-left to upper-right behind the copy. */
export const RESTING: LightState = {
  mid: 0.6, bow: 0.05, tilt: 0.46, wave: 0.045, freq: 1.15, phase: 0.6,
  thick: 1, glow: 1, core: 0.84, spread: 0.32, px: 0.5, pw: 0, flatten: 0.42,
};

/** Intro opening frame: a U-shaped band, its lowest point behind the centred orb. */
export const INTRO_START: LightState = {
  ...RESTING, mid: 0.53, bow: 0.24, tilt: 0.06, wave: 0, thick: 0.8, glow: 0, core: 0.55, spread: 0.5,
};

export const bandY = (x: number, s: LightState) =>
  s.mid - s.bow * (2 * x - 1) ** 2 - s.tilt * (x - 0.5) + s.wave * Math.sin(2 * Math.PI * s.freq * x + s.phase);

const gauss = (d: number, w: number) => Math.exp(-((d / w) ** 2));

/** Small fixed per-slat refraction offsets give the stepped, hand-made reeded-glass look. */
const REFRACTION = [0.006, -0.008, 0.004, -0.003, 0.009, -0.006, 0.002, -0.009, 0.007, -0.004, 0.005];

export type Slat = {y: number; skew: number; thick: number; light: number};

/** Per-slat values for `count` slats on a hero with the given width/height ratio. */
export function slats(count: number, s: LightState, aspect = 1.6): Slat[] {
  // On tall (portrait) screens the same curve would turn into a steep V; keep its proportions.
  const amp = Math.min(1, Math.max(0.42, aspect / 1.6));
  const curve = (x: number) => s.mid + amp * (bandY(x, s) - s.mid);
  return Array.from({length: count}, (_, i) => {
    const x = (i + 0.5) / count;
    const y = curve(x) + REFRACTION[i % REFRACTION.length];
    // Slope inside the slat in screen space, flattened so the band steps at each seam.
    const d = 0.01;
    const slope = ((curve(x + d) - curve(x - d)) / (2 * d)) / aspect;
    const skew = (Math.atan(slope * s.flatten) * 180) / Math.PI;
    const g = Math.max(gauss(x - s.core, s.spread), s.pw * gauss(x - s.px, 0.16));
    // The whole band stays lit (as in the reference); the core region is hotter and thicker.
    return {y, skew, thick: s.thick * (0.84 + 0.3 * g), light: Math.min(1, s.glow * (0.88 + 0.12 * g))};
  });
}

/** CSS custom properties for one slat (shared by server markup and the client engine). */
export const slatVars = (v: Slat) => ({'--y': v.y.toFixed(4), '--k': `${v.skew.toFixed(2)}deg`, '--t': v.thick.toFixed(3), '--o': v.light.toFixed(3)});
