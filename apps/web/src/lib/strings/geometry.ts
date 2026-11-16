/**
 * Geometry for the "Strings of the Night" instrument. Pure functions, shared by the server render (rest paths,
 * card anchor points) and the client physics (sampled points and normals), so both always agree.
 * Units are the layout's own viewBox units.
 */
export type Point = readonly [number, number];
/** A string at rest: one cubic Bézier, P0 → P3, with two control points. */
export type Curve = readonly [Point, Point, Point, Point];

export function curvePoint([p0, p1, p2, p3]: Curve, t: number): [number, number] {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

export function curveTangent([p0, p1, p2, p3]: Curve, t: number): [number, number] {
  const u = 1 - t;
  const a = 3 * u * u, b = 6 * u * t, c = 3 * t * t;
  return [a * (p1[0] - p0[0]) + b * (p2[0] - p1[0]) + c * (p3[0] - p2[0]), a * (p1[1] - p0[1]) + b * (p2[1] - p1[1]) + c * (p3[1] - p2[1])];
}

/** The exact rest path, as server-rendered (two decimals, so server and client markup match). */
export function restPath([p0, p1, p2, p3]: Curve) {
  const f = (p: Point) => `${round(p[0])} ${round(p[1])}`;
  return `M${f(p0)}C${f(p1)} ${f(p2)} ${f(p3)}`;
}

export const round = (n: number, places = 2) => {
  const k = 10 ** places;
  return Math.round(n * k) / k;
};

/** Evenly spaced (in t) samples of a string at rest, with unit normals that point "down" the page. */
export type Samples = {x: Float64Array; y: Float64Array; nx: Float64Array; ny: Float64Array; length: number};

export function sampleCurve(curve: Curve, segments: number): Samples {
  const count = segments + 1;
  const x = new Float64Array(count), y = new Float64Array(count), nx = new Float64Array(count), ny = new Float64Array(count);
  let length = 0;
  for (let i = 0; i < count; i++) {
    const t = i / segments;
    const [px, py] = curvePoint(curve, t);
    const [tx, ty] = curveTangent(curve, t);
    const len = Math.hypot(tx, ty) || 1;
    // Rotate the tangent a quarter turn clockwise: a left-to-right string gets a downward normal.
    let ux = -ty / len, uy = tx / len;
    if (uy < 0) {ux = -ux; uy = -uy;}
    x[i] = px; y[i] = py; nx[i] = ux; ny[i] = uy;
    if (i) length += Math.hypot(px - x[i - 1], py - y[i - 1]);
  }
  return {x, y, nx, ny, length};
}

/**
 * A smooth path through sampled points: quadratic segments between midpoints (each sample is a control point),
 * so a bent string never shows facets. One decimal is plenty at the rendered scale.
 */
export function smoothPath(x: ArrayLike<number>, y: ArrayLike<number>) {
  const n = x.length;
  if (n < 3) return '';
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  let d = `M${f(x[0])} ${f(y[0])}L${f((x[0] + x[1]) / 2)} ${f((y[0] + y[1]) / 2)}`;
  for (let i = 1; i < n - 1; i++) d += `Q${f(x[i])} ${f(y[i])} ${f((x[i] + x[i + 1]) / 2)} ${f((y[i] + y[i + 1]) / 2)}`;
  return `${d}L${f(x[n - 1])} ${f(y[n - 1])}`;
}

/** A point on the same quadratic spline emitted by smoothPath, including its two straight end segments. */
export function smoothPoint(x: ArrayLike<number>, y: ArrayLike<number>, s: number): [number, number] {
  const last = x.length - 1, p = Math.max(0, Math.min(1, s)) * last;
  // smoothPath rounds its coordinates to tenths; match those rendered coordinates here as well.
  const r = (v: number) => Math.round(v * 10) / 10;
  const at = (values: ArrayLike<number>) => {
    if (p < 0.5) return r(values[0]) + (r((values[0] + values[1]) / 2) - r(values[0])) * p * 2;
    if (p > last - 0.5) return r((values[last - 1] + values[last]) / 2) + (r(values[last]) - r((values[last - 1] + values[last]) / 2)) * (p - last + 0.5) * 2;
    const i = Math.min(last - 1, Math.floor(p + 0.5)), t = p - i + 0.5, u = 1 - t;
    return u * u * r((values[i - 1] + values[i]) / 2) + 2 * u * t * r(values[i]) + t * t * r((values[i] + values[i + 1]) / 2);
  };
  return [at(x), at(y)];
}

/** Nearest sample index to a point (squared distance), with the distance itself. */
export function nearestSample(xs: ArrayLike<number>, ys: ArrayLike<number>, px: number, py: number) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - px, dy = ys[i] - py;
    const d = dx * dx + dy * dy;
    if (d < bestD) {bestD = d; best = i;}
  }
  // Refine between the neighbouring samples by projecting onto the two adjacent segments.
  let s = best, dist = Math.sqrt(bestD);
  for (const j of [best - 1, best]) {
    if (j < 0 || j + 1 >= xs.length) continue;
    const ax = xs[j], ay = ys[j], bx = xs[j + 1] - ax, by = ys[j + 1] - ay;
    const len2 = bx * bx + by * by || 1;
    const k = Math.max(0, Math.min(1, ((px - ax) * bx + (py - ay) * by) / len2));
    const d = Math.hypot(ax + k * bx - px, ay + k * by - py);
    if (d < dist) {dist = d; s = j + k;}
  }
  return {index: s, distance: dist};
}
