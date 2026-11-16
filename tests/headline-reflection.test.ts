import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reflectedLight, inlineRotation} from '../apps/web/src/lib/motion/headlineReflection.ts';

test('reading GSAP rotation tolerates percent translations and never normalizes CSS transforms', () => {
  assert.equal(inlineRotation('translate(-50%, 0%) translate3d(0px, 0px, 0px) rotate(-12.4deg)'), -12.4);
  assert.equal(inlineRotation('translate(-50%, 0%)'), 0);
  assert.equal(inlineRotation('none'), 0);
  assert.equal(inlineRotation('matrix(0, 1, -1, 0, 0, 0)'), 90);
});

test('headline reflections project the real cone direction and fade when it misses the lettering', () => {
  const text = {x: 200, y: 300, width: 600, height: 80};
  const light = {x: 500, y: -50, width: 160, height: 1000, angle: 0, opacity: 0.8};
  assert.equal(reflectedLight(light, text).position, 50);
  const left = reflectedLight({...light, angle: 12}, text);
  const right = reflectedLight({...light, angle: -12}, text);
  assert.ok(left.position < 50 && right.position > 50, 'positive rotation tilts a downward cone to the left');
  assert.equal(left.angle, 102);
  assert.equal(reflectedLight({...light, x: -500}, text).intensity, 0);
  assert.equal(reflectedLight({...light, opacity: 0}, text).intensity, 0);
  assert.equal(reflectedLight(light, {...text, y: -300}).intensity, 0);
  for (let angle = -65; angle <= 65; angle += 0.1) {
    const r = reflectedLight({...light, angle}, text);
    assert.ok(Object.values(r).every(Number.isFinite));
    assert.ok(r.intensity >= 0 && r.intensity <= 0.8 && r.width >= 2 && r.width <= 8);
  }
});

test('the letters glint only while a beam passes its catch angle (the specular lobe), never brighter than the light', async () => {
  const {specular} = await import('../apps/web/src/lib/motion/headlineReflection.ts');
  assert.equal(specular(0), 1);
  assert.ok(specular(1.5, 1.5) > 0.6 && specular(6, 1.5) < 0.001, 'tight lobe: a glint, not a wash');
  const text = {x: 200, y: 300, width: 600, height: 80};
  const light = {x: 500, y: -50, width: 160, height: 1000, angle: -3, opacity: 0.8};
  const at = reflectedLight(light, text, {angle: -3, spread: 1.5});
  const off = reflectedLight({...light, angle: 3}, text, {angle: -3, spread: 1.5});
  assert.ok(at.glint > 0.6 && at.glint <= 0.8, 'full glint at the catch angle, capped by the light’s own strength');
  assert.ok(off.glint < 0.01, 'none once the beam has swung away');
  assert.equal(reflectedLight(light, text, null).glint, 0, 'a beam without a catch point only washes the letters');
  assert.equal(reflectedLight({...light, x: -500}, text, {angle: -3, spread: 1.5}).glint, 0, 'no glint when the cone misses the lettering');
});

test('the highlight slides across the letters as the beam turns through its catch angle, the way the footprint moves', async () => {
  const text = {x: 200, y: 300, width: 600, height: 80};
  const light = {x: 500, y: -50, width: 160, height: 1000, angle: -3, opacity: 0.8};
  const catchAt = {angle: -3, spread: 1.5, travel: 16};
  const at = reflectedLight(light, text, catchAt);
  assert.ok(Math.abs(at.glintPosition - at.position) < 1e-9, 'at the catch angle the highlight sits on the beam');
  const before = reflectedLight({...light, angle: -4}, text, catchAt), after = reflectedLight({...light, angle: -2}, text, catchAt);
  // A larger angle moves the footprint toward -x (x = light.x - depth·tan); the highlight leads it the same way.
  assert.ok(after.position < before.position && after.glintPosition < before.glintPosition);
  assert.ok(before.glintPosition - after.glintPosition > before.position - after.position, 'the highlight travels further than the footprint');
  assert.equal(reflectedLight(light, text, {angle: -3, spread: 1.5}).glintPosition, at.position, 'no travel: no slide');
});
