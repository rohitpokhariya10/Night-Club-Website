import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {StringModel} from '../apps/web/src/lib/strings/physics.ts';
import {curvePoint, nearestSample, restPath, sampleCurve, smoothPath, type Curve} from '../apps/web/src/lib/strings/geometry.ts';
import {renderPluck} from '../apps/web/src/lib/strings/audio.ts';
import {cardAnchor, cardParam, experienceMoments, instrumentLayouts, layoutKeys, stringVoices} from '../apps/web/src/lib/experience.ts';

/** Unit tests for the playable strings section (EXPERIENCE-STRINGS-REPORT.md): physics, geometry, sound, content. */
const tuning = {frequency: 3.4, damping: 0.085, maxPull: 90};
const run = (model: StringModel, seconds: number, onFrame?: (t: number) => void) => {
  for (let t = 0; t < seconds; t += 1 / 60) {model.step(1 / 60); onFrame?.(t);}
};

test('a held string takes the pulled shape, fixed at both ends and clamped to its reach', () => {
  const model = new StringModel(57, tuning);
  assert.equal(model.hold(0.3, 60), 60);
  run(model, 0.4);
  assert.ok(Math.abs(model.displacementAt(0.3) - 60) < 0.5, `held at ${model.displacementAt(0.3)}`);
  assert.ok(Math.abs(model.displacementAt(0)) < 1e-9 && Math.abs(model.displacementAt(1)) < 1e-9, 'ends stay fixed');
  // The bend is a single smooth bulge: the pull point is the furthest from rest.
  for (const s of [0.1, 0.5, 0.8]) assert.ok(model.displacementAt(s) < model.displacementAt(0.3));
  assert.equal(model.hold(0.3, 500), 90, 'a hand cannot pull past maxPull');
  assert.equal(model.hold(0.3, -500), -90);
});

test('released, it oscillates through rest with decaying swings, then settles and stops simulating', () => {
  const model = new StringModel(57, tuning);
  model.hold(0.5, 80);
  run(model, 0.5);
  assert.ok(model.release() > 79);
  const swings: number[] = [];
  let last = model.displacementAt(0.5), extreme = 0;
  run(model, 6, () => {
    const u = model.displacementAt(0.5);
    extreme = Math.max(extreme, Math.abs(u));
    if (Math.sign(u) !== Math.sign(last) && last !== 0) {swings.push(extreme); extreme = 0;}
    last = u;
  });
  assert.ok(swings.length >= 4, `crossed rest ${swings.length} times`);
  for (let i = 1; i < 4; i++) assert.ok(swings[i] < swings[i - 1], 'every swing is smaller than the last (damping)');
  assert.equal(model.active, false, 'settled within six seconds');
  assert.equal(model.peak(), 0, 'and is exactly at rest');
});

test('a strike bulges the string by about the requested amplitude, and stronger strikes go further', () => {
  const reach = (amplitude: number) => {
    const model = new StringModel(57, tuning);
    model.strike(0.35, amplitude);
    let max = 0;
    run(model, 0.3, () => {max = Math.max(max, Math.abs(model.displacementAt(0.35)));});
    return max;
  };
  const soft = reach(10), hard = reach(40);
  assert.ok(soft > 6 && soft < 14, `soft strike reached ${soft}`);
  assert.ok(hard > 3 * soft, 'proportional response');
  assert.ok(reach(1000) <= 90 * 1.05, 'never beyond the string’s reach');
});

test('geometry: samples follow the curve, normals point down the page, nearest point is found', () => {
  const curve: Curve = [[0, 100], [300, 200], [700, 0], [1000, 100]];
  const samples = sampleCurve(curve, 40);
  assert.deepEqual([samples.x[0], samples.y[0]], [0, 100]);
  assert.deepEqual([samples.x[40], samples.y[40]], [1000, 100]);
  for (let i = 0; i <= 40; i++) {
    assert.ok(samples.ny[i] > 0, 'normal points down');
    assert.ok(Math.abs(Math.hypot(samples.nx[i], samples.ny[i]) - 1) < 1e-9, 'unit normal');
  }
  const [mx, my] = curvePoint(curve, 0.5);
  const near = nearestSample(samples.x, samples.y, mx, my + 30);
  assert.ok(Math.abs(near.index - 20) < 0.6 && Math.abs(near.distance - 30) < 2);
  const d = smoothPath(samples.x, samples.y);
  assert.ok(d.startsWith('M0 100') && d.endsWith('L1000 100'));
  assert.equal(restPath(curve), 'M0 100C300 200 700 0 1000 100');
});

test('sound: each string’s plucked note is in tune, never clips, and fades away', () => {
  const rate = 48000;
  for (const voice of stringVoices) {
    const samples = renderPluck(rate, voice.frequency, 2, 11);
    assert.ok(samples.every(v => Math.abs(v) <= 1), `${voice.name} stays within full scale`);
    // Pitch by autocorrelation over a window after the attack.
    const start = Math.floor(rate * 0.2), size = 4096;
    const period = rate / voice.frequency;
    let best = 0, bestLag = 0;
    for (let lag = Math.floor(period * 0.8); lag < Math.ceil(period * 1.2); lag++) {
      let sum = 0;
      for (let i = 0; i < size; i++) sum += samples[start + i] * samples[start + i + lag];
      if (sum > best) {best = sum; bestLag = lag;}
    }
    // Refine the peak (parabolic interpolation) and compare in cents.
    const at = (lag: number) => {let s = 0; for (let i = 0; i < size; i++) s += samples[start + i] * samples[start + i + lag]; return s;};
    const [a, b, c] = [at(bestLag - 1), at(bestLag), at(bestLag + 1)];
    const lag = bestLag + (a - c) / (2 * (a - 2 * b + c));
    const cents = 1200 * Math.log2((rate / lag) / voice.frequency);
    assert.ok(Math.abs(cents) < 3, `${voice.name} is ${cents.toFixed(1)} cents off`);
    const rms = (from: number, to: number) => Math.sqrt(samples.slice(from, to).reduce((s, v) => s + v * v, 0) / (to - from));
    assert.ok(rms(rate * 1.5, rate * 1.8) < rms(0, rate * 0.1) * 0.25, `${voice.name} decays`);
  }
});

test('content: real photographs, real destinations, alt text, and every card hangs on its string inside the stage', () => {
  const web = new URL('../apps/web/', import.meta.url);
  for (const moment of experienceMoments) {
    assert.ok(existsSync(new URL(`public${moment.src}`, web)), `${moment.src} exists`);
    assert.ok(existsSync(new URL(`src/app${moment.href}/page.tsx`, web)), `${moment.href} is a real page`);
    assert.ok(moment.alt.length > 15 && !/^image|photo of/i.test(moment.alt), `${moment.id} has meaningful alt text`);
  }
  for (const key of layoutKeys) {
    const layout = instrumentLayouts[key];
    assert.equal(layout.strings.length, stringVoices.length);
    assert.equal(layout.cards.length, experienceMoments.length);
    for (const placement of layout.cards) {
      if (!placement) continue;
      const t = cardParam(layout, placement);
      assert.ok(t > 0.05 && t < 0.95, `${key}: card sits on its string (t=${t})`);
      assert.ok(Math.abs(curvePoint(layout.strings[placement.string], t)[0] - placement.x) < 0.01, `${key}: anchor at the requested x`);
      const {x, y} = cardAnchor(layout, placement);
      assert.ok(x - (placement.w / layout.w) * 50 > 0 && x + (placement.w / layout.w) * 50 < 100, `${key}: card inside the stage`);
      assert.ok(y > 0 && y < 100);
    }
  }
});
