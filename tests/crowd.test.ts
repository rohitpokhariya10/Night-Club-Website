import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCrowd, createPhoneGlints} from '../apps/web/src/lib/motion/crowd.ts';

// apps/web has no type:module; use the same GSAP CJS instance as its tsx-compiled renderer.
const gsap = createRequire(new URL('../apps/web/package.json', import.meta.url))('gsap').gsap as typeof import('gsap').gsap;

test('phone glints stay local in time: bounded strength, brief duration, separated and irregular events', () => {
  const sample = createPhoneGlints(4);
  const events: {phone: number; start: number; end: number}[] = [];
  let previous = -1;
  for (let frame = 0; frame < 180 * 120; frame++) {
    const time = frame / 120;
    const glint = sample(time, true);
    assert.ok(glint.strength >= 0 && glint.strength <= 0.48);
    if (glint.strength > 0) {
      assert.ok(glint.phone >= 0 && glint.phone < 4);
      if (previous < 0) events.push({phone: glint.phone, start: time, end: time});
      events.at(-1)!.end = time;
      previous = glint.phone;
    } else previous = -1;
  }
  assert.ok(events.length >= 10 && events.length <= 30);
  assert.equal(new Set(events.map(e => e.phone)).size, 4);
  assert.ok(events[0].start >= 6);
  for (let i = 0; i < events.length; i++) {
    assert.ok(events[i].end - events[i].start < 0.18);
    if (i) assert.ok(events[i].start - events[i - 1].start >= 5.5);
  }
  assert.ok(new Set(events.slice(1).map((e, i) => Math.round((e.start - events[i].start) * 10))).size > 5);
});

test('reduced motion and empty crowds never emit decorative flashes', () => {
  const reduced = createPhoneGlints(4);
  const empty = createPhoneGlints(0);
  for (let frame = 0; frame < 30000; frame++) {
    assert.deepEqual(reduced(frame / 60, false), {phone: -1, strength: 0});
    assert.deepEqual(empty(frame / 60, true), {phone: -1, strength: 0});
  }
});

/** A Canvas operation recorder exercises the real renderer/lifecycle without pretending to rasterize pixels. */
function canvasHarness(width: number, height: number) {
  const operations: unknown[][] = [];
  let paints = 0;
  const context = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, name) => (...args: unknown[]) => {
      if (name === 'clearRect') {paints++; operations.length = 0;}
      else operations.push([name, ...args]);
      for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(name)} must have finite geometry`);
      if (name === 'arc') assert.ok(Number(args[2]) >= 0);
      if (name === 'ellipse') assert.ok(Number(args[2]) >= 0 && Number(args[3]) >= 0);
    },
    set: (_target, name, value) => {operations.push([name, value]); return true;},
  });
  const canvases = [0, 1].map(() => ({width: 0, height: 0, getContext: () => context}));
  const host = {querySelectorAll: () => canvases, getBoundingClientRect: () => ({width, height})} as unknown as HTMLElement;
  return {host, canvases, operations, paintCount: () => paints};
}

test('the renderer caps paints, avoids duplicate loops, resumes its own clock and releases observers', () => {
  const add = gsap.ticker.add, remove = gsap.ticker.remove;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  const callbacks = new Set<(time: number) => void>();
  let observers = 0;
  gsap.ticker.add = ((callback: (time: number) => void) => {callbacks.add(callback); return callback;}) as typeof gsap.ticker.add;
  gsap.ticker.remove = ((callback: (time: number) => void) => {callbacks.delete(callback);}) as typeof gsap.ticker.remove;
  Object.defineProperty(globalThis, 'window', {value: {devicePixelRatio: 3}, configurable: true});
  Object.defineProperty(globalThis, 'ResizeObserver', {value: class {observe() {observers++;} disconnect() {observers--; }}, configurable: true});
  try {
    for (const mobile of [false, true]) {
      const h = canvasHarness(mobile ? 390 : 1440, mobile ? 378 : 444);
      const crowd = createCrowd(h.host, {mobile});
      assert.equal(h.canvases[0].width, (mobile ? 390 : 1440) * (mobile ? 1.5 : 2));
      crowd.start(); crowd.start();
      assert.equal(callbacks.size, 1);
      const tick = [...callbacks][0];
      const startPaints = h.paintCount();
      for (let frame = 0; frame <= 120; frame++) tick(frame / 120);
      const paints = (h.paintCount() - startPaints) / 2;
      assert.ok(paints >= (mobile ? 29 : 59) && paints <= (mobile ? 31 : 61), `paint cap: ${paints}`);
      const pose = JSON.stringify(h.operations);
      crowd.stop(); crowd.stop();
      assert.equal(callbacks.size, 0);
      crowd.start();
      [...callbacks][0](1000); // Returning after a long absence must not advance the pose.
      assert.equal(JSON.stringify(h.operations), pose);
      [...callbacks][0](1000.04);
      assert.notEqual(JSON.stringify(h.operations), pose);
      crowd.destroy();
      assert.equal(callbacks.size, 0);
      assert.equal(observers, 0);
    }
    const h = canvasHarness(390, 378);
    const still = createCrowd(h.host, {mobile: true, still: true});
    const composition = JSON.stringify(h.operations);
    still.start();
    assert.equal(callbacks.size, 0);
    still.energy = 0;
    assert.equal(JSON.stringify(h.operations), composition);
    still.destroy();
    assert.equal(observers, 0);
  } finally {
    gsap.ticker.add = add; gsap.ticker.remove = remove;
    gsap.ticker.sleep();
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (originalObserver) Object.defineProperty(globalThis, 'ResizeObserver', originalObserver); else Reflect.deleteProperty(globalThis, 'ResizeObserver');
  }
});
