import gsap from 'gsap';

/**
 * The hero's crowd: silhouetted people against localized stage haze, seen from behind (facing the stage, the way a
 * guest at the back of the room sees them), in three depths: a far row (small, hazy, rim-lit), a middle row and a near
 * row (heads and shoulders, darkest, softest). Drawn on two canvases (far + middle, near) so each depth can carry its
 * own CSS blur (depth of field).
 *
 * People, not a pattern: builds, necks, clothing and hair vary; arms taper from shoulder to wrist with a soft elbow and
 * end in a hand (open, a fist or a pointed finger), never a stick. Everyone shares the tempo but not the phase or the
 * energy: about a quarter barely move, most groove, some dance hard, and some lift a hand for a while and lower it
 * again (slow, eased, never in unison). `energy` (0–1.4) scales all of it (intro, scroll); `still` draws one frame.
 *
 * Light: the ceiling beams (`lights`, fed by HomeMotion from the real rig angles) rim-light the people they pass behind,
 * in the beam's own colour and from its side. Phone screens glow softly; rarely, one phone fires a camera flash that
 * lights only the nearby silhouettes for a fraction of a second.
 * The layout is seeded, so every visit sees the same crowd. Runs only while started (the hero is visible).
 */
export const BPM = 124;
type Pose = 'down' | 'drink' | 'groove' | 'sway' | 'pump' | 'up' | 'reach' | 'phone';
type Hair = 'short' | 'long' | 'bun' | 'cap' | 'curls' | 'pony';
type Wear = 'tee' | 'hood' | 'collar';
type Hand = 'open' | 'fist' | 'point' | 'none';
type RGB = [number, number, number];
type Figure = {
  x: number; base: number; s: number; pose: Pose; side: 1 | -1; phase: number; half: boolean;
  shoulders: number; head: number; face: number; neck: number; hair: Hair; wear: Wear; lean: number; motion: number;
  tempo: number; elbow: number; wrist: number; reach: number; hand: Exclude<Hand, 'none'>; rim: number; phone: number;
  /** Occasional raised hand: 0 = never; else how far it rises, how slowly and when. */
  lift: number; liftRate: number; liftPhase: number;
  /** The phone's position when last drawn (the camera flash starts there). */
  hx: number; hy: number;
};
type Row = {figures: Figure[]; color: string; rim: RGB; rimAlpha: number; motion: number; detail: boolean; lightGain: number};
/** A ceiling beam as the crowd sees it: apex x as a fraction of the room width (the apex sits 6% above the room, as
 * the CSS rig does), total angle and half beam angle in degrees (positive tilts the foot of the cone left), colour,
 * and visible strength (0–1). */
export type StageLight = {x: number; angle: number; half: number; color: RGB; strength: number};

function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Rows for a canvas of css size w×h. Far and middle rows go on the back canvas, the near row on the front.
 * Real crowds mostly stand and move: only some hands are up (more in the back rows, where they read against the
 * light), a few hold a drink or a phone, and the near row is heads and shoulders.
 */
function layout(w: number, h: number, mobile: boolean): {back: Row[]; front: Row[]; phones: number; holders: Figure[]} {
  const rand = random(124);
  const pick = <T,>(options: [T, number][]) => {
    let r = rand();
    for (const [value, weight] of options) {if ((r -= weight) <= 0) return value;}
    return options[0][0];
  };
  const row = (scale: number, baseline: number, density: number, poses: [Pose, number][], color: string, rim: RGB, rimAlpha: number,
    motion: number, lightGain: number, detail: boolean, lifts: number): Row => {
    const s = scale * h;
    const step = s * density;
    const figures: Figure[] = [];
    for (let x = -step * 0.4 + rand() * step * 0.5; x < w + step * 0.6; x += step * (0.72 + rand() * 0.56)) {
      const pose = pick(poses);
      const wear = pick<Wear>([['tee', 0.6], ['hood', 0.18], ['collar', 0.22]]);
      const vibe = rand();
      const lifting = (pose === 'down' || pose === 'groove' || pose === 'drink') && rand() < lifts;
      figures.push({
        x, s: s * (0.84 + rand() * 0.3), base: baseline * h + rand() * s * 0.11, pose, side: rand() < 0.5 ? -1 : 1,
        phase: rand() * Math.PI * 2, half: rand() < 0.55,
        // Builds: narrow to broad shoulders (jackets read squarer), slim to thick necks, head size and shape.
        shoulders: (wear === 'collar' ? 0.172 : 0.152) + rand() * 0.052, head: 0.07 + rand() * 0.016, face: 0.76 + rand() * 0.15,
        neck: 0.029 + rand() * 0.016,
        hair: pick<Hair>([['short', 0.3], ['long', 0.24], ['bun', 0.1], ['cap', 0.09], ['curls', 0.15], ['pony', 0.12]]), wear,
        lean: (rand() - 0.5) * 0.1,
        // Energy: about a quarter barely move, most groove gently, about a third dance hard.
        motion: vibe < 0.24 ? 0.12 + rand() * 0.14 : vibe < 0.66 ? 0.45 + rand() * 0.25 : 0.95 + rand() * 0.3,
        tempo: 0.92 + rand() * 0.16, elbow: (rand() - 0.5) * 18, wrist: (rand() - 0.5) * 12, reach: 0.93 + rand() * 0.14,
        hand: pick<Figure['hand']>([['open', 0.45], ['fist', 0.4], ['point', 0.15]]),
        // Selected lit edges; most figures remain dark until a beam passes behind them.
        rim: rand() > 0.48 ? 0.28 + rand() * 0.4 : 0.06,
        phone: -1,
        lift: lifting ? 0.7 + rand() * 0.3 : 0, liftRate: 0.09 + rand() * 0.08, liftPhase: rand() * Math.PI * 2,
        hx: 0, hy: 0,
      });
    }
    return {figures, color, rim, rimAlpha, motion, detail, lightGain};
  };
  // Staggered baselines expose the smaller, hazier back row above the middle row; close heads fall into soft,
  // near-black foreground. Back rows carry more raised hands: they read against the light.
  const far = row(mobile ? 0.42 : 0.38, mobile ? 0.67 : 0.75, 0.25,
    [['down', 0.2], ['drink', 0.08], ['up', 0.12], ['pump', 0.18], ['sway', 0.14], ['reach', 0.11], ['groove', 0.17]],
    'rgb(18, 17, 25)', [139, 117, 193], 0.24, 0.82, 1.1, false, 0.36);
  const mid = row(mobile ? 0.62 : 0.58, mobile ? 0.88 : 0.98, 0.30,
    [['down', 0.25], ['drink', 0.1], ['pump', 0.16], ['up', 0.09], ['sway', 0.15], ['reach', 0.08], ['groove', 0.17]],
    'rgb(10, 11, 16)', [104, 131, 173], 0.25, 1, 0.95, true, 0.32);
  const near = row(0.88, mobile ? 1.16 : 1.24, 0.43, [['down', 0.84], ['drink', 0.06], ['groove', 0.07], ['sway', 0.03]],
    'rgb(5, 5, 6)', [100, 112, 150], 0.12, 0.35, 0.3, false, 0);
  // A few separated midground hands hold phones (one more far back on wide screens); never floating between figures
  // or outside the viewport.
  const holders: Figure[] = [];
  const assign = (list: Figure[], count: number) => {
    const candidates = list.filter(f => f.x > w * 0.08 && f.x < w * 0.92);
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const person = candidates[Math.floor((i + 0.5) * candidates.length / count)];
      person.pose = 'phone'; person.lift = 0; person.phone = holders.length; holders.push(person);
    }
  };
  assign(mid.figures, mobile ? 2 : 4);
  if (!mobile) assign(far.figures.filter(f => f.x > w * 0.6), 1);
  return {back: [far, mid], front: [near], phones: holders.length, holders};
}

/** Independent phone timers with a shared quiet interval: one brief camera flash at a time, never a burst.
 * Called by the existing draw loop (no timeouts). Time is visible-scene time, so hidden tabs never catch up. */
export function createPhoneGlints(count: number) {
  const rand = random(816);
  const due = Array.from({length: count}, (_, i) => 6 + i * 6 + rand() * 3);
  let current = -1, started = -Infinity, quietUntil = 0;
  return (time: number, enabled: boolean): {phone: number; strength: number} => {
    if (!enabled || !count) return {phone: -1, strength: 0};
    if (time >= quietUntil) {
      let next = -1;
      for (let i = 0; i < due.length; i++) if (due[i] <= time && (next < 0 || due[i] < due[next])) next = i;
      if (next >= 0) {
        current = next; started = time;
        due[next] = time + 22 + rand() * 19;
        quietUntil = time + 5.5 + rand() * 3;
      }
    }
    const age = time - started;
    // 180ms soft-edged event; lights the phone and the silhouettes right beside it, never the whole scene.
    return age >= 0 && age < 0.18 ? {phone: current, strength: 0.48 * Math.sin(Math.PI * age / 0.18) ** 2} : {phone: -1, strength: 0};
  };
}

const RAD = Math.PI / 180;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
type Lit = {amount: number; r: number; g: number; b: number; dir: number};
type Prepared = {ax: number; ay: number; tanA: number; tanH: number; color: RGB; strength: number};

/** One person: a rim of light first (the backlit edge, offset toward the beam behind them), then the body over it. */
function drawFigure(ctx: CanvasRenderingContext2D, f: Figure, t: number, energy: number, row: Row, glint: {phone: number; strength: number}, warmth: number, lit: Lit) {
  const s = f.s;
  const beat = t * (BPM / 60) * Math.PI * 2 * (f.half ? 0.5 : 1) * f.tempo + f.phase;
  // People ease out of a phrase, then rejoin: a slow envelope avoids constant bobbing.
  const phrase = 0.5 + 0.5 * Math.sin(t * 0.43 * f.tempo + f.phase * 1.7);
  const e = energy * row.motion * f.motion * (0.35 + 0.65 * phrase * phrase);
  const pump = 0.5 - 0.5 * Math.cos(beat);
  // Knees on the beat (the whole upper body dips), a sway on the half-beat and a slower weight shift.
  const bounce = e * s * 0.016 * pump;
  const sway = e * s * (0.016 * Math.sin(beat / 2) + 0.007 * Math.sin(t * 0.67 + f.phase));
  const tilt = f.lean + e * 0.05 * Math.sin(beat / 2 + 1.1);
  const raise = f.lift ? f.lift * smooth(clamp01((Math.sin(t * f.liftRate + f.liftPhase) - 0.45) / 0.4)) : 0;
  const light = lit.amount * row.lightGain;
  const base = f.rim * warmth * row.rimAlpha;
  const share = light / (light + base + 1e-6);
  const rimOffset = Math.max(0.55, s * 0.004);
  const rx = lit.dir * rimOffset * Math.min(1, light) * 0.8, ry = rimOffset * (1 + Math.min(1, light) * 1.8);
  const flash = glint.phone === f.phone && f.phone >= 0 ? glint.strength : 0;
  // Rim pass: the beam's colour where a beam is behind this person, the room's faint cool haze elsewhere. Light comes from
  // above and behind, so the edge is brightest on the head and raised hands and fades out down the shoulders, instead
  // of outlining the whole silhouette.
  ctx.globalAlpha = Math.min(0.95, base + light * 0.72);
  const rgb = `${mix(row.rim[0], lit.r, share) | 0}, ${mix(row.rim[1], lit.g, share) | 0}, ${mix(row.rim[2], lit.b, share) | 0}`;
  const crown = f.base - bounce - 0.64 * s - f.head * s * 1.2;
  const fade = ctx.createLinearGradient(0, crown, 0, crown + 0.5 * s);
  if (fade) {fade.addColorStop(0, `rgb(${rgb})`); fade.addColorStop(0.45, `rgba(${rgb}, 0.55)`); fade.addColorStop(1, `rgba(${rgb}, 0)`);}
  ctx.fillStyle = fade ?? `rgb(${rgb})`;
  ctx.strokeStyle = ctx.fillStyle;
  body(ctx, f, f.x + sway + rx, f.base - bounce - ry, tilt, beat, e, pump, raise, row.detail, false, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = row.color;
  ctx.strokeStyle = row.color;
  body(ctx, f, f.x + sway, f.base - bounce, tilt, beat, e, pump, raise, row.detail, true, flash);
}

/** A tapered limb: wide at `a`, narrower at `b`, with a slight muscular swell between and rounded joints. */
function limb(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, wa: number, wb: number) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len / 2, ny = dx / len / 2;
  const mx = (ax + bx) / 2, my = (ay + by) / 2, wm = (wa + wb) * 0.6;
  ctx.beginPath();
  ctx.moveTo(ax + nx * wa, ay + ny * wa);
  ctx.quadraticCurveTo(mx + nx * wm, my + ny * wm, bx + nx * wb, by + ny * wb);
  ctx.lineTo(bx - nx * wb, by - ny * wb);
  ctx.quadraticCurveTo(mx - nx * wm, my - ny * wm, ax - nx * wa, ay - ny * wa);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); ctx.arc(ax, ay, wa / 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, wb / 2, 0, Math.PI * 2); ctx.fill();
}

function body(ctx: CanvasRenderingContext2D, f: Figure, x: number, base: number, tilt: number, beat: number, e: number, pump: number, raise: number, detail: boolean, finalPass: boolean, flash: number) {
  const s = f.s;
  const shoulderY = base - 0.5 * s;
  const sw = f.shoulders * s;
  const shoulderRoll = e * Math.sin(beat / 2 + f.phase) * s * 0.008;
  const neck = f.neck * s;
  const square = f.wear === 'collar' ? 1.12 : 1;
  // Rounded deltoids, sloping shoulders and a neck, flowing into a stable torso.
  ctx.beginPath();
  ctx.moveTo(x - sw * 1.04, base + 0.5 * s);
  ctx.bezierCurveTo(x - sw * 0.94, shoulderY + 0.22 * s, x - sw * 1.08 * square, shoulderY + 0.055 * s / square, x - sw * 0.78, shoulderY + shoulderRoll);
  ctx.bezierCurveTo(x - sw * 0.5, shoulderY - 0.025 * s, x - neck * 1.25, shoulderY - 0.025 * s, x - neck, shoulderY - 0.08 * s);
  ctx.quadraticCurveTo(x, shoulderY - 0.092 * s, x + neck, shoulderY - 0.08 * s);
  ctx.bezierCurveTo(x + neck * 1.25, shoulderY - 0.025 * s, x + sw * 0.5, shoulderY - 0.025 * s, x + sw * 0.78, shoulderY - shoulderRoll);
  ctx.bezierCurveTo(x + sw * 1.08 * square, shoulderY + 0.055 * s / square, x + sw * 0.94, shoulderY + 0.22 * s, x + sw * 1.04, base + 0.5 * s);
  ctx.closePath();
  ctx.fill();
  // A hood gathered behind the neck, or a jacket collar.
  if (f.wear === 'hood') {ctx.beginPath(); ctx.ellipse(x, shoulderY - 0.035 * s, 0.088 * s, 0.05 * s, 0, 0, Math.PI * 2); ctx.fill();}
  else if (f.wear === 'collar') {ctx.beginPath(); ctx.ellipse(x, shoulderY - 0.05 * s, neck * 1.7, 0.035 * s, 0, 0, Math.PI * 2); ctx.fill();}

  // Head and hair, tilting with the groove and nodding a little on the beat (seen from behind).
  const r = f.head * s;
  const rw = r * (f.face + e * 0.035 * Math.sin(beat / 3));
  ctx.save();
  ctx.translate(x + Math.sin(tilt) * 0.06 * s, shoulderY - 0.125 * s + e * s * 0.007 * pump);
  ctx.rotate(tilt);
  ctx.beginPath(); ctx.ellipse(0, 0, rw, r * 1.06, 0, 0, Math.PI * 2); ctx.fill();
  // The jaw narrows the skull into an egg shape instead of a disc.
  ctx.beginPath(); ctx.ellipse(0, r * 0.42, rw * 0.8, r * 0.68, 0, 0, Math.PI * 2); ctx.fill();
  if (f.hair === 'short' || f.hair === 'cap') for (const side of [-1, 1]) {ctx.beginPath(); ctx.ellipse(side * rw * 0.97, r * 0.14, r * 0.13, r * 0.23, 0, 0, Math.PI * 2); ctx.fill();}
  if (f.hair === 'short') {ctx.beginPath(); ctx.ellipse(0, -r * 0.3, rw * 1.04, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();}
  else if (f.hair === 'long') {
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.35);
    ctx.bezierCurveTo(-r * 1.15, r * 0.4, -r * 1.05, r * 1.35, -r * 0.72, r * 1.55);
    ctx.quadraticCurveTo(r * 0.1, r * 1.7, r * 0.93, r * 1.3);
    ctx.bezierCurveTo(r * 0.78, r * 0.6, r, -r * 0.3, r * 0.55, -r * 0.7); ctx.fill();
  }
  else if (f.hair === 'pony') {
    ctx.beginPath(); ctx.ellipse(0, -r * 0.2, rw * 1.03, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
    // The tail swings a little after the head.
    ctx.beginPath(); ctx.ellipse(f.side * r * 0.12 + e * r * 0.25 * Math.sin(beat / 2 - 0.8), r * 1.0, r * 0.3, r * 0.72, f.side * 0.12, 0, Math.PI * 2); ctx.fill();
  }
  else if (f.hair === 'bun') {ctx.beginPath(); ctx.arc(-r * 0.15, -r * 1.12, r * 0.42, 0, Math.PI * 2); ctx.fill();}
  else if (f.hair === 'cap') {
    ctx.beginPath(); ctx.ellipse(0, -r * 0.42, rw * 1.08, r * 0.7, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.55 * f.side, -r * 0.42, r * 0.75, r * 0.17, 0, 0, Math.PI * 2); ctx.fill();
  }
  else if (f.hair === 'curls') {
    // Volume close to the skull: small irregular bumps, not a cloud.
    ctx.beginPath(); ctx.ellipse(0, -r * 0.18, rw * 1.14, r * 1.02, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI * 1.04 + i * Math.PI * 0.92 / 6;
      ctx.beginPath(); ctx.arc(Math.cos(angle) * rw * 1.08, Math.sin(angle) * r * 0.98 - r * 0.18, r * (0.2 + 0.06 * ((i * 5) % 3)), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // Upper arm and forearm taper from shoulder to wrist (about 2.4 head-heights together), then the hand.
  const arm = (side: 1 | -1, upper: number, fore: number, hand: Hand, phone = false) => {
    const sx = x + side * sw * 0.8, sy = shoulderY + 0.04 * s - side * shoulderRoll;
    const lu = 0.205 * s * f.reach, lf = 0.19 * s * f.reach;
    const ex = sx + Math.cos(upper * RAD) * lu, ey = sy + Math.sin(upper * RAD) * lu;
    const ux = Math.cos(fore * RAD), uy = Math.sin(fore * RAD);
    const hx = ex + ux * lf, hy = ey + uy * lf;
    limb(ctx, sx, sy, ex, ey, 0.074 * s, 0.054 * s);
    limb(ctx, ex, ey, hx, hy, 0.052 * s, 0.034 * s);
    const turn = (fore + 90 + f.wrist) * RAD;
    const raised = hy < shoulderY - 0.05 * s;
    if (phone) {
      // A loose grip around the phone's lower edge.
      ctx.beginPath(); ctx.ellipse(hx + ux * 0.016 * s, hy + uy * 0.016 * s, 0.022 * s, 0.026 * s, turn, 0, Math.PI * 2); ctx.fill();
    } else if (!detail || !raised || hand === 'none') {
      ctx.beginPath(); ctx.ellipse(hx + ux * 0.02 * s, hy + uy * 0.02 * s, 0.021 * s, 0.029 * s, turn, 0, Math.PI * 2); ctx.fill();
    } else {
      // A readable hand against the light: a palm or fist, with fingers that spread, point or close.
      const px = hx + ux * 0.026 * s, py = hy + uy * 0.026 * s;
      ctx.beginPath(); ctx.ellipse(px, py, hand === 'fist' ? 0.026 * s : 0.023 * s, hand === 'fist' ? 0.028 * s : 0.03 * s, turn, 0, Math.PI * 2); ctx.fill();
      const finger = (spread: number, from: number, length: number, width: number) => {
        const a = (fore + spread) * RAD, ox = -uy * from, oy = ux * from;
        const fx = px + ux * 0.02 * s + ox, fy = py + uy * 0.02 * s + oy;
        ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * length, fy + Math.sin(a) * length); ctx.stroke();
      };
      if (hand === 'open') {
        for (let k = -1.5; k <= 1.5; k++) finger(k * 9 * side, k * 0.0075 * s, (k === -1.5 || k === 1.5 ? 0.03 : 0.038) * s, 0.0085 * s);
        finger(-58 * side, -0.016 * s * side, 0.026 * s, 0.01 * s);
      } else if (hand === 'point') finger(4 * side, 0.004 * s * side, 0.044 * s, 0.009 * s);
    }
    if (phone && finalPass) {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(side * 0.12 + e * 0.05 * Math.sin(beat / 3));
      f.hx = hx; f.hy = hy - 0.046 * s;
      const screen = 0.22 + 0.1 * (0.5 + 0.5 * Math.sin(beat / 3 + f.phase));
      // The lower edge sits inside the gripping palm. A little spill stays local to that hand.
      ctx.fillStyle = `rgba(198, 218, 231, ${screen * 0.12})`;
      ctx.beginPath(); ctx.ellipse(0, -0.018 * s, 0.032 * s, 0.045 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgb(10, 12, 15)';
      ctx.beginPath(); ctx.roundRect(-0.018 * s, -0.052 * s, 0.036 * s, 0.059 * s, 0.005 * s); ctx.fill();
      ctx.fillStyle = `rgba(202, 221, 235, ${screen + flash * 0.4})`;
      ctx.beginPath(); ctx.roundRect(-0.013 * s, -0.046 * s, 0.026 * s, 0.043 * s, 0.003 * s); ctx.fill();
      if (flash > 0) {
        ctx.fillStyle = `rgba(238, 243, 246, ${flash})`;
        ctx.beginPath(); ctx.arc(0.009 * s, -0.046 * s, Math.min(1.8, 0.007 * s), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  };
  const half = Math.sin(beat / 2);
  for (const side of [-1, 1] as const) {
    // Angles are for the right arm and mirror for the left; -90 is straight up, 90 straight down.
    const deg = (outward: number) => (side === 1 ? outward : 180 - outward);
    const lead = side === f.side;
    let upper = 72 + f.elbow * 0.5 - e * 3 * half, fore = 103 + f.wrist, hand: Hand = 'none', phone = false;
    if (f.pose === 'drink' && lead) {upper = 62 + f.elbow * 0.5; fore = 170 + f.wrist + e * 4 * half;}
    else if (f.pose === 'groove') {upper = 48 + f.elbow + e * 7 * half; fore = (lead ? -52 : -24) + f.wrist - e * 12 * Math.sin(beat / 2 + side * 0.8);}
    else if (f.pose === 'sway' && lead) {upper = -18 + f.elbow + e * 9 * half; fore = -92 + f.wrist + e * 12 * Math.sin(beat / 2 + 0.9); hand = f.hand;}
    else if (f.pose === 'pump' && lead) {upper = -32 + f.elbow; fore = -99 + f.wrist - e * 16 * pump; hand = 'fist';}
    // Both hands up, but never a mirrored V: the lead arm higher, the other bent lower and out of step.
    else if (f.pose === 'up') {
      if (lead) {upper = -46 + f.elbow - e * 5 * half; fore = -108 + f.wrist + e * 9 * Math.sin(beat / 2); hand = f.hand;}
      else {upper = -26 + f.elbow * 0.6 - e * 4 * half; fore = -78 + f.wrist + e * 10 * Math.sin(beat / 2 + 0.9); hand = f.hand === 'open' ? 'fist' : 'open';}
    }
    else if (f.pose === 'reach' && lead) {upper = -64 + f.elbow + e * 5 * half; fore = -82 + f.wrist + e * 9 * Math.sin(beat / 2 + 0.6); hand = f.hand;}
    else if (f.pose === 'phone' && lead) {upper = -36 + f.elbow + e * 3 * half; fore = -102 + f.wrist + e * 4 * half; phone = true;}
    // A hand that rises for a while: out through the side and up, easing, then back down.
    if (raise > 0 && lead) {
      upper = mix(upper, -60 + f.elbow + e * 5 * half, raise); fore = mix(fore, -86 + f.wrist + e * 10 * Math.sin(beat / 2 + 0.6), raise);
      if (raise > 0.55) hand = f.hand;
    }
    arm(side, deg(upper), deg(fore), hand, phone);
  }
}

export function createCrowd(host: HTMLElement, {mobile, still = false}: {mobile: boolean; still?: boolean}) {
  const [back, front] = Array.from(host.querySelectorAll<HTMLCanvasElement>('canvas'));
  const contexts = [back, front].map(canvas => canvas?.getContext('2d')).filter(Boolean) as CanvasRenderingContext2D[];
  let rows: ReturnType<typeof layout> = {back: [], front: [], phones: 0, holders: []};
  let width = 0, height = 0, room = 0, top = 0;
  let energy = still ? 0 : 1;
  let running = false;
  let elapsed = 0;
  let previousTick: number | null = null;
  let paintedAt = -Infinity;
  let glints = createPhoneGlints(0);
  let lights: StageLight[] = [];

  function measure() {
    const box = host.getBoundingClientRect();
    width = box.width; height = box.height;
    if (!width || !height) return;
    // The room is the hero (the crowd host's offset parent); beams hang from 6% above its top.
    const parent = host.offsetParent as HTMLElement | null | undefined;
    room = parent?.offsetHeight || height / 0.55;
    top = typeof host.offsetTop === 'number' ? host.offsetTop : room - height;
    const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    for (const canvas of [back, front]) {
      if (!canvas) continue;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    const previousPhones = rows.phones;
    rows = layout(width, height, mobile);
    if (rows.phones !== previousPhones) glints = createPhoneGlints(rows.phones);
  }

  // Each beam in canvas coordinates, once per frame; then a few multiplications per person.
  const prepared: Prepared[] = [];
  const lit: Lit = {amount: 0, r: 0, g: 0, b: 0, dir: 0};
  function prepare() {
    prepared.length = 0;
    for (const light of lights) if (light.strength > 0.01) prepared.push({
      ax: light.x * width, ay: -0.06 * room - top, tanA: Math.tan(Math.max(-70, Math.min(70, light.angle)) * RAD),
      tanH: Math.tan(Math.max(0.5, light.half) * RAD), color: light.color, strength: light.strength,
    });
  }
  function lightOn(f: Figure) {
    lit.amount = 0; lit.r = 0; lit.g = 0; lit.b = 0; lit.dir = 0;
    const headY = f.base - 0.62 * f.s;
    for (const p of prepared) {
      const depth = headY - p.ay;
      const across = f.x - (p.ax - depth * p.tanA);
      const reach = Math.max(6, depth * p.tanH);
      const w = p.strength * Math.exp(-1.3 * (across / reach) ** 2);
      if (w < 0.002) continue;
      lit.amount += w; lit.r += p.color[0] * w; lit.g += p.color[1] * w; lit.b += p.color[2] * w;
      lit.dir += (across > 0 ? -1 : 1) * w;
    }
    if (lit.amount > 0) {lit.r /= lit.amount; lit.g /= lit.amount; lit.b /= lit.amount; lit.dir = Math.max(-1, Math.min(1, lit.dir / lit.amount));}
    lit.amount = Math.min(1, lit.amount);
    return lit;
  }

  /** A camera flash: a brief cool light that touches only the silhouettes right beside the phone (source-atop). */
  function flash(ctx: CanvasRenderingContext2D, glint: {phone: number; strength: number}) {
    const holder = glint.strength > 0 ? rows.holders[glint.phone] : undefined;
    if (!holder) return;
    const k = glint.strength / 0.48, R = holder.s * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const near = ctx.createRadialGradient(holder.hx, holder.hy, 0, holder.hx, holder.hy, R);
    if (near) {
      near.addColorStop(0, `rgba(228, 236, 244, ${0.42 * k})`); near.addColorStop(0.32, `rgba(214, 224, 234, ${0.13 * k})`); near.addColorStop(1, 'rgba(214, 224, 234, 0)');
      ctx.fillStyle = near; ctx.fillRect(holder.hx - R, holder.hy - R, R * 2, R * 2);
    }
    ctx.globalCompositeOperation = 'lighter';
    const bloom = holder.s * 0.06;
    const point = ctx.createRadialGradient(holder.hx, holder.hy, 0, holder.hx, holder.hy, bloom);
    if (point) {
      point.addColorStop(0, `rgba(240, 244, 248, ${0.55 * k})`); point.addColorStop(1, 'rgba(240, 244, 248, 0)');
      ctx.fillStyle = point; ctx.fillRect(holder.hx - bloom, holder.hy - bloom, bloom * 2, bloom * 2);
    }
    ctx.restore();
  }

  /** Low-opacity scattering follows the same projected fixtures as the rims, behind all silhouettes.
   * Uses the existing capped canvas loop; no extra canvas, texture, blur filter or layout sampling. */
  function haze(ctx: CanvasRenderingContext2D) {
    if (!prepared.length) return;
    const y = height * .32;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const p of prepared) {
      const depth = y - p.ay, x = p.ax - depth * p.tanA;
      const radius = Math.max(width * .13, depth * p.tanH * 2.5);
      if (x + radius < 0 || x - radius > width) continue;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, .65);
      const fog = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      const rgb = p.color.join(',');
      fog.addColorStop(0, `rgba(${rgb},${p.strength * .18})`);
      fog.addColorStop(.4, `rgba(${rgb},${p.strength * .07})`);
      fog.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = fog; ctx.fillRect(-radius, -radius, radius * 2, radius * 2); ctx.restore();
    }
    ctx.restore();
  }

  function draw(t: number) {
    if (!width || contexts.length < 2) return;
    const glint = glints(t, !still && energy > 0);
    // One low-cost illumination value for the room's haze, plus the beams actually behind each person.
    const warmth = still ? 0.9 : 0.85 + 0.1 * Math.sin(t * 0.37);
    prepare();
    const paint = (ctx: CanvasRenderingContext2D, list: Row[], scatter = false) => {
      ctx.clearRect(0, 0, width, height);
      if (scatter) haze(ctx);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const row of list) for (const figure of row.figures) drawFigure(ctx, figure, t, energy, row, glint, warmth, lightOn(figure));
    };
    paint(contexts[0], rows.back, true);
    flash(contexts[0], glint);
    paint(contexts[1], rows.front);
  }

  // Cap actual paint frequency, including 90/120Hz screens. Hidden time never advances the dancers or glints.
  const tick = (time: number) => {
    if (previousTick !== null) elapsed += Math.min(0.05, Math.max(0, time - previousTick));
    previousTick = time;
    if (elapsed - paintedAt < 1 / (mobile ? 30 : 60) - 0.001) return;
    paintedAt = elapsed;
    draw(elapsed);
  };

  const observer = new ResizeObserver(() => {measure(); draw(elapsed);});
  observer.observe(host);
  measure();
  draw(0);

  return {
    get energy() {return energy;},
    set energy(value: number) {energy = Math.max(0, Math.min(1.4, value)); if (!running) draw(elapsed);},
    /** The beams behind the crowd (see StageLight). Read on the next paint; the still (reduced-motion) crowd repaints
     * at once, while a paused one simply keeps its last frame (no hidden work). */
    set lights(value: StageLight[]) {lights = value; if (still) draw(elapsed);},
    start() {if (!running && !still) {previousTick = null; gsap.ticker.add(tick); running = true;}},
    stop() {if (running) {gsap.ticker.remove(tick); running = false; previousTick = null;}},
    destroy() {gsap.ticker.remove(tick); running = false; observer.disconnect(); contexts.forEach(ctx => ctx.clearRect(0, 0, width, height));},
  };
}

export type Crowd = ReturnType<typeof createCrowd>;
