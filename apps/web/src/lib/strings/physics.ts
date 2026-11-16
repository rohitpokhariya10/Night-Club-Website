/**
 * A plucked string as a sum of its natural modes (modal synthesis). The displacement along the string's normal is
 *
 *   u(s, t) = Σ a_m(t) · sin(m π s),   s ∈ [0, 1], fixed at both ends,
 *
 * and every mode is its own damped spring, a_m'' = −ω_m² a_m − 2 ζ_m ω_m a_m'. That gives a restoring force (ω²),
 * damping (ζ), natural oscillation and smooth settling, and because higher modes are damped harder, a sharp pluck
 * rounds off into the fundamental before it fades: the way a real string sounds and looks. The mode count is small
 * (a dozen), so stepping all of them for every string costs a few hundred multiplications a frame.
 *
 * Framework-free and DOM-free, so it is unit-tested directly (tests/strings.test.ts).
 */
export type StringTuning = {
  /** Visual fundamental, in Hz (how fast the string swings, not the note it plays). */
  frequency: number;
  /** Damping ratio of the fundamental. ~0.06 rings for about two seconds. */
  damping: number;
  /** Extra damping per higher mode, so sharp shapes round off quickly. */
  modeDamping?: number;
  /** Largest displacement a hand can pull the string to, in layout units. */
  maxPull: number;
  modes?: number;
};

const SUBSTEP = 1 / 600;
/** Below this (in layout units, peak) the string is at rest and stops being simulated. */
const REST = 0.04;

export class StringModel {
  readonly modes: number;
  readonly samples: number;
  readonly maxPull: number;
  /** Mode amplitudes and velocities. */
  readonly a: Float64Array;
  readonly v: Float64Array;
  readonly omega: Float64Array;
  readonly zeta: Float64Array;
  /** basis[m * samples + i] = sin((m + 1) π s_i): the mode shapes at the sample points. */
  private readonly basis: Float64Array;
  private grab: {s: number; target: Float64Array} | null = null;

  constructor(samples: number, tuning: StringTuning) {
    this.modes = tuning.modes ?? 12;
    this.samples = samples;
    this.maxPull = tuning.maxPull;
    this.a = new Float64Array(this.modes);
    this.v = new Float64Array(this.modes);
    this.omega = new Float64Array(this.modes);
    this.zeta = new Float64Array(this.modes);
    const w1 = 2 * Math.PI * tuning.frequency;
    for (let m = 0; m < this.modes; m++) {
      const k = m + 1;
      // A touch of stiffness (inharmonicity): higher modes run slightly sharp, as on a real wound string.
      this.omega[m] = w1 * k * Math.sqrt(1 + 0.0015 * k * k);
      this.zeta[m] = tuning.damping + (tuning.modeDamping ?? 0.022) * m;
    }
    this.basis = new Float64Array(this.modes * samples);
    for (let m = 0; m < this.modes; m++) for (let i = 0; i < samples; i++) this.basis[m * samples + i] = Math.sin((m + 1) * Math.PI * (i / (samples - 1)));
  }

  /** True while held or still moving. */
  get active() {
    return this.grab !== null || this.peak() > REST;
  }

  /** An upper bound of the current displacement anywhere on the string, including stored kinetic energy. */
  peak() {
    let sum = 0;
    for (let m = 0; m < this.modes; m++) sum += Math.abs(this.a[m]) + Math.abs(this.v[m]) / this.omega[m];
    return sum;
  }

  displacementAt(s: number) {
    let u = 0;
    for (let m = 0; m < this.modes; m++) u += this.a[m] * Math.sin((m + 1) * Math.PI * s);
    return u;
  }

  /** du/ds: the string's slope in its own normal direction, per unit of s. */
  slopeAt(s: number) {
    let d = 0;
    for (let m = 0; m < this.modes; m++) d += this.a[m] * (m + 1) * Math.PI * Math.cos((m + 1) * Math.PI * s);
    return d;
  }

  /** Writes the displacement at every sample point into `out`. */
  fill(out: Float64Array) {
    const n = this.samples;
    out.fill(0);
    for (let m = 0; m < this.modes; m++) {
      const am = this.a[m];
      if (am === 0) continue;
      const row = m * n;
      for (let i = 0; i < n; i++) out[i] += am * this.basis[row + i];
    }
  }

  /**
   * The shape of a string pulled aside at s0 to displacement d: two straight runs to the fixed ends (a triangle),
   * expanded in the model's modes. The truncated series rounds the corner (a finger, not a knife edge), so it is
   * scaled to pass exactly through d at s0.
   */
  shape(s0: number, d: number, out: Float64Array = new Float64Array(this.modes)) {
    const s = Math.min(0.97, Math.max(0.03, s0));
    let at = 0;
    for (let m = 0; m < this.modes; m++) {
      const k = (m + 1) * Math.PI;
      out[m] = (2 * Math.sin(k * s)) / (k * k * s * (1 - s));
      at += out[m] * Math.sin(k * s);
    }
    const scale = at ? d / at : 0;
    for (let m = 0; m < this.modes; m++) out[m] *= scale;
    return out;
  }

  /** Holds the string at s0, pulled to d (clamped to maxPull). The string follows the hand elastically. */
  hold(s0: number, d: number) {
    const pull = Math.max(-this.maxPull, Math.min(this.maxPull, d));
    if (!this.grab) this.grab = {s: s0, target: new Float64Array(this.modes)};
    this.grab.s = s0;
    this.shape(s0, pull, this.grab.target);
    return pull;
  }

  get held() {
    return this.grab !== null;
  }

  /** Lets go: the string keeps its shape and starts to ring from rest. Returns the released displacement. */
  release() {
    if (!this.grab) return 0;
    const at = this.displacementAt(this.grab.s);
    this.grab = null;
    this.v.fill(0);
    return at;
  }

  /**
   * A strike at s0 (a tap, a key, a strum): adds velocity to the modes so the string bulges out smoothly to about
   * `amplitude` units at s0 a quarter of a swing later. Higher modes are tapered, like a soft fingertip.
   */
  strike(s0: number, amplitude: number) {
    const s = Math.min(0.97, Math.max(0.03, s0));
    const weights = new Float64Array(this.modes);
    let reach = 0;
    for (let m = 0; m < this.modes; m++) {
      const k = m + 1;
      weights[m] = Math.sin(k * Math.PI * s) * Math.exp(-((k - 1) * (k - 1)) / 14);
      reach += (weights[m] / this.omega[m]) * Math.sin(k * Math.PI * s);
    }
    if (!reach) return;
    const target = Math.max(-this.maxPull, Math.min(this.maxPull, amplitude));
    const scale = target / reach;
    for (let m = 0; m < this.modes; m++) this.v[m] += weights[m] * scale;
  }

  /** Advances the simulation by dt seconds (semi-implicit Euler in fixed substeps: stable for every mode). */
  step(dt: number) {
    const steps = Math.max(1, Math.ceil(Math.min(dt, 1 / 20) / SUBSTEP));
    const h = Math.min(dt, 1 / 20) / steps;
    const grab = this.grab;
    for (let k = 0; k < steps; k++) {
      if (grab) {
        // Elastic follow: each mode eases toward the held shape (critically damped, ~70 ms), with no ringing.
        const follow = 1 - Math.exp(-h * 32);
        for (let m = 0; m < this.modes; m++) {
          this.a[m] += (grab.target[m] - this.a[m]) * follow;
          this.v[m] = 0;
        }
        continue;
      }
      for (let m = 0; m < this.modes; m++) {
        const w = this.omega[m];
        this.v[m] += (-w * w * this.a[m] - 2 * this.zeta[m] * w * this.v[m]) * h;
        this.a[m] += this.v[m] * h;
      }
    }
    if (!grab && this.peak() <= REST) this.reset();
  }

  reset() {
    this.a.fill(0);
    this.v.fill(0);
    this.grab = null;
  }
}
