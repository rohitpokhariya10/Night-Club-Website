import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PhotoPendulum, slidePhotos} from '../apps/web/src/lib/strings/photoPhysics.ts';
import {curvePoint, sampleCurve, smoothPoint} from '../apps/web/src/lib/strings/geometry.ts';
import {cardParam, experienceMoments, instrumentLayouts, layoutKeys} from '../apps/web/src/lib/experience.ts';

test('a released photograph carries momentum, crosses rest, damps and sleeps', () => {
  const photo = new PhotoPendulum(300);
  photo.grab(0);
  photo.pull(-8, 80);
  photo.pull(-12, 140);
  photo.release(140);
  assert.ok(photo.velocity < 0);
  const angles: number[] = [];
  for (let i = 0; i < 600; i++) {photo.step(1 / 60); angles.push(photo.angle);}
  assert.ok(Math.min(...angles) < -12, 'momentum continues the pull before gravity reverses it');
  assert.ok(Math.max(...angles) > 1, 'swing crosses through rest');
  assert.ok(angles.every(a => Math.abs(a) <= 18), 'never spins or leaves the angular envelope');
  assert.equal(photo.active, false);
  assert.equal(photo.angle, 0);
});

test('holding still or cancelling removes stale release velocity; long frames stay stable', () => {
  for (const cancel of [false, true]) {
    const photo = new PhotoPendulum(180);
    photo.grab(0); photo.pull(12, 30); photo.release(cancel ? 30 : 500, cancel);
    assert.equal(photo.velocity, 0);
    for (let i = 0; i < 300; i++) photo.step(i % 7 ? 1 / 144 : 2, 0, -9, 13);
    assert.ok(Number.isFinite(photo.angle) && photo.angle >= -9 && photo.angle <= 13);
  }
});

test('sliding pushes neighbours continuously and uses the available span without overlap', () => {
  const bodies = [{x: 180, half: 100}, {x: 550, half: 140}, {x: 980, half: 110}];
  let last = bodies.map(b => b.x);
  for (let target = 180; target <= 1400; target += 2) {
    const next = slidePhotos(bodies, 0, target, 1440);
    assert.ok(next.every((x, i) => Math.abs(x - last[i]) <= 2.001), 'no teleport when a neighbour meets its boundary');
    assert.ok(next[0] - bodies[0].half >= 18 && next[2] + bodies[2].half <= 1422);
    for (let i = 1; i < bodies.length; i++) assert.ok(next[i] - next[i - 1] >= bodies[i].half + bodies[i - 1].half + 14);
    last = next;
  }
  assert.ok(last[0] - bodies[0].x > 500, 'not a small displacement around the original position');
  const left = slidePhotos(bodies, 2, -10000, 1440);
  assert.equal(left[0] - bodies[0].half, 18);
});

test('each responsive rail fits; repeated edge-to-edge rearrangement preserves order and safe bounds', () => {
  for (const key of layoutKeys) {
    const layout = instrumentLayouts[key];
    for (let string = 0; string < layout.strings.length; string++) {
      const bodies = layout.cards.flatMap((p, i) => {
        if (!p || p.string !== string) return [];
        const [rw, rh] = experienceMoments[i].ratio.split('/').map(Number);
        const length = p.drop + p.w * rh / rw + 100;
        return [{x: p.x, half: p.w / 2 + Math.sin(Math.abs(p.r) * Math.PI / 180) * length + 3}];
      }).sort((a, b) => a.x - b.x);
      const gap = layout.w < 500 ? 10 : 20;
      assert.ok(bodies.reduce((sum, b) => sum + b.half * 2, 28) + Math.max(0, bodies.length - 1) * gap <= layout.w, `${key} rail ${string} has usable space`);
      for (let step = 0; step < 100 && bodies.length; step++) {
        const next = slidePhotos(bodies, step % bodies.length, step % 2 ? -500 : layout.w + 500, layout.w, 14, gap);
        for (let i = 0; i < bodies.length; i++) {
          assert.ok(next[i] - bodies[i].half >= 14 - 1e-8 && next[i] + bodies[i].half <= layout.w - 14 + 1e-8);
          if (i) assert.ok(next[i] - next[i - 1] >= bodies[i].half + bodies[i - 1].half + gap - 1e-8);
          bodies[i].x = next[i];
        }
      }
    }
  }
});

test('sliding anchors follow the actual curved string across its usable span', () => {
  for (const layout of Object.values(instrumentLayouts)) {
    for (const p of layout.cards) {
      if (!p) continue;
      let lastY = 0, variation = 0;
      for (let x = p.w / 2 + 18; x < layout.w - p.w / 2 - 18; x += 7) {
        const t = cardParam(layout, {...p, x});
        const point = curvePoint(layout.strings[p.string], t);
        assert.ok(Math.abs(point[0] - x) < 1e-7);
        if (lastY) variation += Math.abs(point[1] - lastY);
        lastY = point[1];
      }
      assert.ok(variation > 5, 'anchor must move vertically as well as horizontally');
    }
  }
});

test('the live mounting point lies on the same quadratic spline as the rendered vibrating string', () => {
  const {x, y} = sampleCurve(instrumentLayouts.desktop.strings[0], 56);
  for (let i = 0; i < y.length; i++) y[i] += Math.sin(i / 56 * Math.PI) * 9;
  const round = (v: number) => Math.round(v * 10) / 10;
  for (let i = 1; i < 56; i++) {
    const point = smoothPoint(x, y, i / 56);
    for (const [axis, values] of [x, y].entries()) {
      const expected = 0.25 * round((values[i - 1] + values[i]) / 2) + 0.5 * round(values[i]) + 0.25 * round((values[i] + values[i + 1]) / 2);
      assert.ok(Math.abs(point[axis] - expected) < 1e-8);
    }
  }
  assert.deepEqual(smoothPoint(x, y, 0), [round(x[0]), round(y[0])]);
  assert.deepEqual(smoothPoint(x, y, 1), [round(x[56]), round(y[56])]);
});
