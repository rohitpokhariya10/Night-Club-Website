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
