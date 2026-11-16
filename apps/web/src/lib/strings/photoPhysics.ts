/** Small, DOM-free photo mechanics. Distances are in the active SVG's viewBox units. */
export const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
export type PhotoBody = {x: number; half: number};

/** Ordered mounts share the available rail. A dragged print gently pushes its neighbours, never passes through
 * them. Returns positions only; the renderer remains the sole owner of DOM transforms. */
export function slidePhotos(bodies: readonly PhotoBody[], selected: number, target: number, width: number, edge = 18, gap = 14) {
  const result = bodies.map(body => body.x);
  if (!bodies[selected]) return result;
  let left = edge + bodies[selected].half, right = width - edge - bodies[selected].half;
  for (let i = 0; i < selected; i++) left += bodies[i].half * 2 + gap;
  for (let i = selected + 1; i < bodies.length; i++) right -= bodies[i].half * 2 + gap;
  result[selected] = clamp(target, left, right);
  for (let i = selected - 1; i >= 0; i--) result[i] = Math.min(result[i], result[i + 1] - bodies[i].half - bodies[i + 1].half - gap);
  for (let i = selected + 1; i < bodies.length; i++) result[i] = Math.max(result[i], result[i - 1] + bodies[i].half + bodies[i - 1].half + gap);
  return result;
}

export class PhotoPendulum {
  angle = 0;
  velocity = 0;
  private lastTime = 0;
  private previous = 0;
  held = false;
  constructor(readonly length: number) {}
  get active() {return this.held || Math.abs(this.angle) > 0.01 || Math.abs(this.velocity) > 0.02;}
  grab(time: number) {this.held = true; this.lastTime = time; this.previous = this.angle; this.velocity = 0;}
  pull(angle: number, time: number, min = -18, max = 18) {
    const next = clamp(angle, min, max);
    const dt = clamp((time - this.lastTime) / 1000, 1 / 240, 0.08);
    this.velocity = clamp((next - this.previous) / dt, -95, 95);
    this.angle = next;
    this.previous = next;
    this.lastTime = time;
  }
  release(time: number, cancel = false) {
    // A pause before letting go should not resurrect the last fast pointer movement.
    if (cancel || time - this.lastTime > 90) this.velocity = 0;
    this.held = false;
  }
  step(dt: number, target = 0, min = -18, max = 18) {
    if (this.held) return;
    const h = Math.min(Math.max(dt, 0), 0.05) / 6;
    const gravity = 13000 / Math.max(100, this.length);
    for (let i = 0; i < 6; i++) {
      this.velocity += (-gravity * Math.sin((this.angle - target) * Math.PI / 180) * 180 / Math.PI - 4.8 * this.velocity) * h;
      this.angle += this.velocity * h;
      if (this.angle < min || this.angle > max) {
        this.angle = clamp(this.angle, min, max);
        this.velocity *= -0.12;
      }
    }
    if (Math.abs(this.angle) < 0.01 && Math.abs(this.velocity) < 0.02 && Math.abs(target) < 0.01) this.reset();
  }
  reset() {this.angle = 0; this.velocity = 0; this.held = false;}
}
