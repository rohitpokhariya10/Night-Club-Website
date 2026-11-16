import gsap from 'gsap';

/**
 * The hero's crowd: silhouetted people against localized stage haze,
 * in three depths — a far row (small, hazy, rim-lit), a middle row and a near row (heads and shoulders, darkest,
 * softest) — moving to one tempo, some at half-time. Proportions follow a real figure (arms about 2.4 head-heights). Drawn on two canvases (far + middle, near) so each depth can carry its own CSS blur (depth of field).
 *
 * Motion is deliberately small: a bounce on the beat, a sway on the half-beat, a head tilt, and arms that pump, sway
 * or rest depending on the person. Everyone shares the tempo but not the phase, so it reads as a room moving to the
 * same track, not as a synchronised loop. `energy` (0–1) scales all of it (intro, scroll); `still` draws one frame.
 * The layout is seeded, so every visit sees the same crowd. Runs only while started (the hero is visible).
 */
export const BPM = 124;
type Pose = 'down' | 'up' | 'pump' | 'sway' | 'phone';
type Hair = 'short' | 'long' | 'bun' | 'cap' | 'curls';
type Figure = {
  x: number; base: number; s: number; pose: Pose; side: 1 | -1; phase: number; half: boolean;
  shoulders: number; head: number; face: number; hair: Hair; lean: number; motion: number;
  tempo: number; elbow: number; wrist: number; rim: number; phone: number;
};
type Row = {figures: Figure[]; color: string; rim: string; motion: number; detail: boolean};

function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Rows for a canvas of css size w×h. Far and middle rows go on the back canvas, the near row on the front.
 * Real crowds mostly stand and move: only some hands are up (far more in the back rows, where they read against the
 * light), a few hold a phone, and the near row is heads and shoulders.
 */
function layout(w: number, h: number, mobile: boolean): {back: Row[]; front: Row[]; phones: number} {
  const rand = random(124);
  const pick = <T,>(options: [T, number][]) => {
    let r = rand();
    for (const [value, weight] of options) {if ((r -= weight) <= 0) return value;}
    return options[0][0];
  };
  const row = (scale: number, baseline: number, density: number, poses: [Pose, number][], color: string, rim: string, motion: number, detail = false): Row => {
    const s = scale * h;
    const step = s * density;
    const figures: Figure[] = [];
    for (let x = -step * 0.4 + rand() * step * 0.5; x < w + step * 0.6; x += step * (0.72 + rand() * 0.56)) {
      figures.push({
        x, s: s * (0.88 + rand() * 0.24), base: baseline * h + rand() * s * 0.07, pose: pick(poses), side: rand() < 0.5 ? -1 : 1,
        phase: rand() * Math.PI * 2, half: rand() < 0.55, shoulders: 0.17 + rand() * 0.045, head: 0.072 + rand() * 0.014,
        face: 0.76 + rand() * 0.15,
        hair: pick<Hair>([['short', 0.32], ['long', 0.28], ['bun', 0.13], ['cap', 0.1], ['curls', 0.17]]), lean: (rand() - 0.5) * 0.1,
        motion: 0.55 + rand() * 0.45, tempo: 0.92 + rand() * 0.16,
        elbow: (rand() - 0.5) * 18, wrist: (rand() - 0.5) * 12,
        // Selected lit edges; most figures remain dark instead of wearing an orange outline.
        rim: rand() > 0.48 ? 0.24 + rand() * 0.38 : 0.06,
        phone: -1,
      });
    }
    return {figures, color, rim, motion, detail};
  };
  const far = row(mobile ? 0.42 : 0.38, mobile ? 0.7 : 0.86, 0.36, [['down', 0.58], ['up', 0.08], ['pump', 0.15], ['sway', 0.19]], 'rgb(32, 25, 23)', 'rgba(239, 190, 140, 0.34)', 0.65);
  const mid = row(mobile ? 0.6 : 0.56, mobile ? 0.88 : 1.0, 0.4, [['down', 0.56], ['pump', 0.16], ['up', 0.08], ['sway', 0.2]], 'rgb(14, 12, 12)', 'rgba(217, 150, 103, 0.38)', 1, true);
  const near = row(0.86, mobile ? 1.16 : 1.24, 0.51, [['down', 0.94], ['sway', 0.06]], 'rgb(5, 5, 6)', 'rgba(217, 113, 74, 0.16)', 0.35);
  // A few separated midground hands hold phones; never floating between figures or outside the viewport.
  const candidates = mid.figures.filter(f => f.x > w * 0.08 && f.x < w * 0.92);
  const phones = Math.min(mobile ? 2 : 4, candidates.length);
  for (let i = 0; i < phones; i++) {
    const person = candidates[Math.floor((i + 0.5) * candidates.length / phones)];
    person.pose = 'phone'; person.phone = i;
  }
  return {back: [far, mid], front: [near], phones};
}

/** Independent phone timers with a shared quiet interval: one tiny glint, never a burst of flashes.
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
    // 180ms soft-edged event; only a phone-sized white glint, with no full-scene exposure change.
    return age >= 0 && age < 0.18 ? {phone: current, strength: 0.48 * Math.sin(Math.PI * age / 0.18) ** 2} : {phone: -1, strength: 0};
  };
}

const RAD = Math.PI / 180;

/** One person: a soft rim of light first (the backlit edge), then the body over it, a little lower. */
function drawFigure(ctx: CanvasRenderingContext2D, f: Figure, t: number, energy: number, row: Row, glint: {phone: number; strength: number}, warmth: number) {
  const s = f.s;
  const beat = t * (BPM / 60) * Math.PI * 2 * (f.half ? 0.5 : 1) * f.tempo + f.phase;
  // People ease out of a phrase, then rejoin: a slow envelope avoids constant bobbing.
  const phrase = 0.5 + 0.5 * Math.sin(t * 0.43 * f.tempo + f.phase * 1.7);
  const e = energy * row.motion * f.motion * (0.35 + 0.65 * phrase * phrase);
  const bounce = e * s * 0.01 * (0.5 - 0.5 * Math.cos(beat));
  const sway = e * s * (0.012 * Math.sin(beat / 2) + 0.006 * Math.sin(t * 0.67 + f.phase));
  const tilt = f.lean + e * 0.045 * Math.sin(beat / 2 + 1.1);
  const rimOffset = Math.max(0.55, s * 0.004);
  for (const pass of [0, 1] as const) {
    const dy = pass ? rimOffset : 0;
    ctx.globalAlpha = pass ? 1 : f.rim * warmth;
    ctx.fillStyle = pass ? row.color : row.rim;
    ctx.strokeStyle = ctx.fillStyle;
    body(ctx, f, f.x + sway, f.base - bounce + dy, tilt, beat, e, row.detail, pass === 1, glint.phone === f.phone && f.phone >= 0 ? glint.strength : 0);
  }
  ctx.globalAlpha = 1;
}

function body(ctx: CanvasRenderingContext2D, f: Figure, x: number, base: number, tilt: number, beat: number, e: number, detail: boolean, finalPass: boolean, flash: number) {
  const s = f.s;
  const shoulderY = base - 0.5 * s;
  const sw = f.shoulders * s;
  const shoulderRoll = e * Math.sin(beat / 2 + f.phase) * s * 0.008;
  // Rounded deltoids, sloping shoulders and a short neck, flowing into a stable torso.
  ctx.beginPath();
  ctx.moveTo(x - sw * 1.04, base + 0.5 * s);
  ctx.bezierCurveTo(x - sw * 0.94, shoulderY + 0.22 * s, x - sw * 1.08, shoulderY + 0.055 * s, x - sw * 0.78, shoulderY + shoulderRoll);
  ctx.bezierCurveTo(x - sw * 0.5, shoulderY - 0.025 * s, x - 0.044 * s, shoulderY - 0.025 * s, x - 0.035 * s, shoulderY - 0.08 * s);
  ctx.quadraticCurveTo(x, shoulderY - 0.092 * s, x + 0.035 * s, shoulderY - 0.08 * s);
  ctx.bezierCurveTo(x + 0.044 * s, shoulderY - 0.025 * s, x + sw * 0.5, shoulderY - 0.025 * s, x + sw * 0.78, shoulderY - shoulderRoll);
  ctx.bezierCurveTo(x + sw * 1.08, shoulderY + 0.055 * s, x + sw * 0.94, shoulderY + 0.22 * s, x + sw * 1.04, base + 0.5 * s);
  ctx.closePath();
  ctx.fill();

  // Head and hair, tilting with the groove.
  const r = f.head * s;
  ctx.save();
  ctx.translate(x + Math.sin(tilt) * 0.06 * s, shoulderY - 0.125 * s);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * (f.face + e * 0.035 * Math.sin(beat / 3)), r * 1.06, 0, 0, Math.PI * 2);
  ctx.fill();
  if (f.hair === 'long') {
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.35);
    ctx.bezierCurveTo(-r * 1.15, r * 0.4, -r * 1.05, r * 1.35, -r * 0.72, r * 1.55);
    ctx.quadraticCurveTo(r * 0.1, r * 1.7, r * 0.93, r * 1.3);
    ctx.bezierCurveTo(r * 0.78, r * 0.6, r, -r * 0.3, r * 0.55, -r * 0.7); ctx.fill();
  }
  else if (f.hair === 'bun') {ctx.beginPath(); ctx.arc(-r * 0.15, -r * 1.12, r * 0.42, 0, Math.PI * 2); ctx.fill();}
  else if (f.hair === 'cap') {ctx.beginPath(); ctx.ellipse(r * 0.55 * f.side, -r * 0.35, r * 0.75, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();}
  else if (f.hair === 'curls') {
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI + i * Math.PI / 4;
      ctx.beginPath(); ctx.arc(Math.cos(angle) * r * 0.7, Math.sin(angle) * r * 0.85 - r * 0.12, r * 0.38, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // Articulated upper arm / forearm: rounded elbow, tapering wrist and a small palm, never a straight pole.
  const arm = (side: 1 | -1, upper: number, fore: number, phone = false) => {
    const sx = x + side * sw * 0.82, sy = shoulderY + 0.035 * s - side * shoulderRoll;
    const ex = sx + Math.cos(upper * RAD) * 0.19 * s, ey = sy + Math.sin(upper * RAD) * 0.19 * s;
    const hx = ex + Math.cos(fore * RAD) * 0.175 * s, hy = ey + Math.sin(fore * RAD) * 0.175 * s;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineWidth = 0.056 * s; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.lineWidth = 0.038 * s; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx, hy, 0.018 * s, 0.027 * s, (fore + 90 + f.wrist) * RAD, 0, Math.PI * 2); ctx.fill();
    if (!phone && detail && hy < shoulderY - 0.1 * s) {
      // One thumb and a joined finger shape; far-row hands stay soft and undetailed.
      ctx.save(); ctx.translate(hx, hy); ctx.rotate((fore + 90 + f.wrist) * RAD);
      ctx.beginPath(); ctx.ellipse(-0.018 * s, -0.005 * s, 0.007 * s, 0.016 * s, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(-0.013 * s, -0.04 * s, 0.025 * s, 0.031 * s, 0.009 * s); ctx.fill();
      ctx.restore();
    }
    if (phone && finalPass) {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(side * 0.12 + e * 0.045 * Math.sin(beat / 3));
      const screen = 0.22 + 0.1 * (0.5 + 0.5 * Math.sin(beat / 3 + f.phase));
      // The lower edge sits inside the gripping palm. A little spill stays local to that hand.
      ctx.fillStyle = `rgba(198, 218, 231, ${screen * 0.12})`;
      ctx.beginPath(); ctx.ellipse(0, -0.018 * s, 0.032 * s, 0.045 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgb(10, 12, 15)';
      ctx.beginPath(); ctx.roundRect(-0.018 * s, -0.052 * s, 0.036 * s, 0.059 * s, 0.005 * s); ctx.fill();
      ctx.fillStyle = `rgba(202, 221, 235, ${screen})`;
      ctx.beginPath(); ctx.roundRect(-0.013 * s, -0.046 * s, 0.026 * s, 0.043 * s, 0.003 * s); ctx.fill();
      if (flash > 0) {
        ctx.fillStyle = `rgba(230, 237, 240, ${flash * 0.08})`;
        ctx.beginPath(); ctx.arc(0.009 * s, -0.046 * s, 0.038 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(238, 243, 246, ${flash})`;
        ctx.beginPath(); ctx.arc(0.009 * s, -0.046 * s, Math.min(1.8, 0.007 * s), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  };
  const half = Math.sin(beat / 2), pump = 0.5 - 0.5 * Math.cos(beat);
  for (const side of [-1, 1] as const) {
    // Angles mirror for the left arm; -90 is straight up, 90 straight down.
    const deg = (outward: number) => (side === 1 ? outward : 180 - outward);
    const lead = side === f.side;
    if (f.pose === 'up') arm(side, deg(-44 + f.elbow - e * 5 * half), deg(-112 + f.wrist + e * 7 * half));
    else if (f.pose === 'pump' && lead) arm(side, deg(-32 + f.elbow), deg(-99 + f.wrist - e * 14 * pump));
    else if (f.pose === 'sway' && lead) arm(side, deg(-18 + f.elbow + e * 9 * half), deg(-92 + f.wrist + e * 12 * Math.sin(beat / 2 + 0.9)));
    else if (f.pose === 'phone' && lead) arm(side, deg(-36 + f.elbow + e * 3 * half), deg(-102 + f.wrist + e * 4 * half), true);
    else arm(side, deg(72 + f.elbow - e * 3 * half), deg(103 + f.wrist));
  }
}

export function createCrowd(host: HTMLElement, {mobile, still = false}: {mobile: boolean; still?: boolean}) {
  const [back, front] = Array.from(host.querySelectorAll<HTMLCanvasElement>('canvas'));
  const contexts = [back, front].map(canvas => canvas?.getContext('2d')).filter(Boolean) as CanvasRenderingContext2D[];
  let rows: {back: Row[]; front: Row[]; phones: number} = {back: [], front: [], phones: 0};
  let width = 0, height = 0;
  let energy = still ? 0 : 1;
  let running = false;
  let elapsed = 0;
  let previousTick: number | null = null;
  let paintedAt = -Infinity;
  let glints = createPhoneGlints(0);

  function measure() {
    const box = host.getBoundingClientRect();
    width = box.width; height = box.height;
    if (!width || !height) return;
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

  function draw(t: number) {
    if (!width || contexts.length < 2) return;
    const glint = glints(t, !still && energy > 0);
    // One low-cost illumination value for the room, not a per-person spotlight simulation.
    const warmth = still ? 0.9 : 0.85 + 0.1 * Math.sin(t * 0.37);
    const paint = (ctx: CanvasRenderingContext2D, list: Row[]) => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const row of list) for (const figure of row.figures) drawFigure(ctx, figure, t, energy, row, glint, warmth);
    };
    paint(contexts[0], rows.back);
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
    start() {if (!running && !still) {previousTick = null; gsap.ticker.add(tick); running = true;}},
    stop() {if (running) {gsap.ticker.remove(tick); running = false; previousTick = null;}},
    destroy() {gsap.ticker.remove(tick); running = false; observer.disconnect(); contexts.forEach(ctx => ctx.clearRect(0, 0, width, height));},
  };
}

export type Crowd = ReturnType<typeof createCrowd>;
