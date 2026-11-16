import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {BEAM_PROGRAMS, BEAM_EASE_IN, beamAngle, beamPeakSpeed, beamReach} from '../apps/web/src/lib/motion/beams.ts';
import {createCrowd} from '../apps/web/src/lib/motion/crowd.ts';

const gsap = createRequire(new URL('../apps/web/package.json', import.meta.url))('gsap').gsap as typeof import('gsap').gsap;
const beams = BEAM_PROGRAMS.map((_, i) => i);
const sample = (i: number, from: number, to: number, step = 1 / 60) => {
  const out: number[] = [];
  for (let t = from; t <= to; t += step) out.push(beamAngle(i, t));
  return out;
};

test('every fixture starts at its resting pose and eases up to speed (no velocity jump when the room starts)', () => {
  for (const i of beams) {
    assert.equal(beamAngle(i, 0), 0);
    // After 1/60 s the beam has barely moved: the first frame's speed is a small fraction of its cruising speed.
    assert.ok(Math.abs(beamAngle(i, 1 / 60)) / (1 / 60) < 0.2, `beam ${i} first-frame speed`);
    // Continuous through the end of the ease-in.
    const a = beamAngle(i, BEAM_EASE_IN - 1e-4), b = beamAngle(i, BEAM_EASE_IN + 1e-4);
    assert.ok(Math.abs(a - b) < 0.01);
  }
});

test('sweeps are wider than before but bounded, and never faster than 6.5°/s, with no corners', () => {
  for (const i of beams) {
    assert.ok(beamReach(i) >= 11 && beamReach(i) <= 14, `beam ${i} reach ${beamReach(i)}`);
    assert.ok(beamPeakSpeed(i) < 6.5, `beam ${i} peak speed ${beamPeakSpeed(i)}`);
    const step = 1 / 120, values = sample(i, 0, 240, step);
    let fastest = 0, sharpest = 0;
    for (let k = 2; k < values.length; k++) {
      const v1 = (values[k - 1] - values[k - 2]) / step, v2 = (values[k] - values[k - 1]) / step;
      fastest = Math.max(fastest, Math.abs(v2));
      sharpest = Math.max(sharpest, Math.abs(v2 - v1) / step);
    }
    assert.ok(fastest < 6.5, `beam ${i} sampled speed ${fastest}`);
    assert.ok(sharpest < 6, `beam ${i} acceleration ${sharpest}°/s² (a snap would be thousands)`);
    // It really sweeps both ways within any 30 seconds.
    const window = sample(i, 30, 60);
    assert.ok(Math.min(...window) < -5 && Math.max(...window) > 5);
  }
});

test('the fixtures move independently: neighbours are uncorrelated and the arrangement does not repeat', () => {
  const series = beams.map(i => sample(i, 0, 300, 0.1));
  const correlation = (a: number[], b: number[]) => {
    const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length;
    let ab = 0, aa = 0, bb = 0;
    for (let k = 0; k < a.length; k++) {ab += (a[k] - ma) * (b[k] - mb); aa += (a[k] - ma) ** 2; bb += (b[k] - mb) ** 2;}
    return ab / Math.sqrt(aa * bb);
  };
  for (let i = 0; i + 1 < series.length; i++) assert.ok(Math.abs(correlation(series[i], series[i + 1])) < 0.35, `beams ${i}/${i + 1} move in step`);
  // Neighbours swing opposite ways at times (paths that cross), and sometimes the same way.
  assert.ok(series[0].some((v, k) => v * series[1][k] < -4) && series[0].some((v, k) => v * series[1][k] > 4));
  // Compare the room 30 s in against every later moment up to ten minutes: it never returns to that arrangement.
  const at = (t: number) => beams.map(i => beamAngle(i, t));
  const reference = at(30);
  let closest = Infinity;
  for (let t = 40; t < 600; t += 0.05) closest = Math.min(closest, Math.max(...at(t).map((v, i) => Math.abs(v - reference[i]))));
  assert.ok(closest > 0.8, `the arrangement repeats within ${closest.toFixed(2)}°`);
});

/** A context that records what matters here: fills with their style, composite modes, gradients. */
function recorder(width: number, height: number) {
  const log: {op: string; value?: unknown}[] = [];
  const state: Record<string, unknown> = {};
  const context = new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, name) => {
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => ({addColorStop: () => {}, kind: name});
      if (typeof name === 'string' && name in state && !['fill', 'stroke'].includes(name)) return state[name];
      return (...args: unknown[]) => {log.push({op: String(name), value: name === 'fill' ? state.fillStyle : args[0]});};
    },
    set: (_t, name, value) => {state[name as string] = value; log.push({op: `set:${String(name)}`, value}); return true;},
  });
  const canvases = [0, 1].map(() => ({width: 0, height: 0, getContext: () => context}));
  const host = {querySelectorAll: () => canvases, getBoundingClientRect: () => ({width, height})} as unknown as HTMLElement;
  return {host, log};
}

function withFakeRuntime(run: (tick: (time: number) => void) => void) {
  const add = gsap.ticker.add, remove = gsap.ticker.remove;
  const callbacks = new Set<(time: number) => void>();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  gsap.ticker.add = ((cb: (time: number) => void) => {callbacks.add(cb); return cb;}) as typeof gsap.ticker.add;
  gsap.ticker.remove = ((cb: (time: number) => void) => {callbacks.delete(cb);}) as typeof gsap.ticker.remove;
  Object.defineProperty(globalThis, 'window', {value: {devicePixelRatio: 1}, configurable: true});
  Object.defineProperty(globalThis, 'ResizeObserver', {value: class {observe() {} disconnect() {}}, configurable: true});
  try {run(time => callbacks.forEach(cb => cb(time)));} finally {
    gsap.ticker.add = add; gsap.ticker.remove = remove; gsap.ticker.sleep();
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (originalObserver) Object.defineProperty(globalThis, 'ResizeObserver', originalObserver); else Reflect.deleteProperty(globalThis, 'ResizeObserver');
  }
}

test('a beam behind the crowd lights the rims of the people in front of it, in its own colour', () => {
  withFakeRuntime(() => {
    const dark = recorder(1440, 495), lit = recorder(1440, 495);
    createCrowd(dark.host, {mobile: false, still: true}).destroy();
    const crowd = createCrowd(lit.host, {mobile: false, still: true});
    lit.log.length = 0;
    crowd.lights = [{x: 0.47, angle: 0, half: 4, color: [246, 206, 160], strength: 0.8}];
    crowd.destroy();
    const alphas = (log: typeof dark.log) => log.filter(e => e.op === 'set:globalAlpha').map(e => Number(e.value)).filter(a => a < 1);
    const before = alphas(dark.log), after = alphas(lit.log);
    assert.ok(before.length > 40 && after.length === before.length, 'one rim pass per person');
    // People under the beam carry a much brighter rim; everyone else keeps the room's faint one.
    const raised = after.map((a, i) => a - before[i]);
    const underBeam = raised.filter(d => d > 0.15).length;
    assert.ok(Math.max(...raised) > 0.3, 'a clearly brighter rim under the beam');
    assert.ok(underBeam >= 3 && underBeam < after.length / 3, `${underBeam} of ${after.length} people lit by one beam`);
    assert.ok(raised.every(d => d >= -1e-9), 'light only ever adds');
  });
});

test('camera flashes are rare, brief, local (drawn only over silhouettes) and absent when the crowd is still', () => {
  withFakeRuntime(tick => {
    const {host, log} = recorder(1440, 495);
    const crowd = createCrowd(host, {mobile: false});
    crowd.start();
    let frames = 0, events = 0, previous = false;
    for (let k = 0; k <= 180 * 60; k++) {
      log.length = 0;
      tick(k / 60);
      const flashing = log.some(e => e.op === 'set:globalCompositeOperation' && e.value === 'source-atop');
      if (flashing) {
        frames++;
        if (!previous) events++;
        // Each flash is wrapped in save/restore, so no composite mode leaks into the next person.
        const ops = log.map(e => e.op);
        assert.ok(ops.lastIndexOf('restore') > ops.lastIndexOf('set:globalCompositeOperation'));
      }
      previous = flashing;
    }
    crowd.destroy();
    assert.ok(events >= 8 && events <= 32, `${events} flashes in three minutes`);
    assert.ok(frames / events <= 12, 'each lasts a fraction of a second');
    const still = recorder(1440, 495);
    const quiet = createCrowd(still.host, {mobile: false, still: true});
    quiet.start();
    for (let k = 0; k <= 30 * 60; k++) tick(k / 60);
    quiet.destroy();
    assert.ok(!still.log.some(e => e.op === 'set:globalCompositeOperation'));
  });
});
