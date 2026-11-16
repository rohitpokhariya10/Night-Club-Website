import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CENTER, PIVOT, RECORD_RADIUS, LABEL_RADIUS, OUTER_GROOVE, INNER_GROOVE, MAX_ANGLE, REST_ANGLE, stylusAt, radiusAt, angleForRadius, angleForProgress,
  progressAtAngle, progressAtRadius, pointerAngle, clampAngle} from '../apps/web/src/lib/music/tonearm.ts';

test('the arm is rigid about a fixed pivot: the stylus keeps one distance from it at every angle', () => {
  const lengths = [0, 5, 12, 20, 30, MAX_ANGLE].map(a => {const s = stylusAt(a); return Math.hypot(s.x - PIVOT.x, s.y - PIVOT.y);});
  for (const l of lengths) assert.ok(Math.abs(l - lengths[0]) < 1e-9);
});

test('at rest the stylus is off the record; at the furthest swing it stops in the run-out, clear of the label', () => {
  assert.ok(radiusAt(REST_ANGLE) > RECORD_RADIUS + 5);
  assert.equal(progressAtAngle(REST_ANGLE), null);
  assert.ok(radiusAt(MAX_ANGLE) > LABEL_RADIUS + 2 && radiusAt(MAX_ANGLE) < INNER_GROOVE);
  assert.equal(clampAngle(MAX_ANGLE + 20), MAX_ANGLE);
  assert.equal(clampAngle(-15), REST_ANGLE);
  assert.ok(MAX_ANGLE > 30 && MAX_ANGLE < 50, `max angle ${MAX_ANGLE}`);
});

test('grooves map to the timeline from the outside in, through the arm’s real arc, and back again', () => {
  assert.equal(progressAtRadius(OUTER_GROOVE), 0);
  assert.equal(progressAtRadius(INNER_GROOVE), 1);
  assert.equal(progressAtRadius(RECORD_RADIUS - 0.5), 0, 'the lead-in plays from the start');
  assert.equal(progressAtRadius(RECORD_RADIUS + 0.5), null, 'beyond the edge is not a groove');
  for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const a = angleForProgress(p);
    assert.ok(Math.abs(progressAtAngle(a)! - p) < 1e-6, `p ${p}`);
    assert.ok(Math.abs(radiusAt(angleForRadius(OUTER_GROOVE - p * (OUTER_GROOVE - INNER_GROOVE))) - (OUTER_GROOVE - p * (OUTER_GROOVE - INNER_GROOVE))) < 1e-6);
  }
  // Monotonic: further in is always later in the track, and the arm moves inward as the track plays.
  const angles = [0, 0.2, 0.4, 0.6, 0.8, 1].map(angleForProgress);
  for (let i = 1; i < angles.length; i++) assert.ok(angles[i] > angles[i - 1]);
});

test('pointer angle about the pivot follows the arm convention (down = 0, clockwise positive)', () => {
  assert.ok(Math.abs(pointerAngle({x: PIVOT.x, y: PIVOT.y + 10})) < 1e-9);
  assert.ok(pointerAngle({x: PIVOT.x - 10, y: PIVOT.y + 10}) > 44 && pointerAngle({x: PIVOT.x - 10, y: PIVOT.y + 10}) < 46);
  // Pointing the arm at its own stylus position gives back (about) the arm angle.
  const s = stylusAt(25);
  assert.ok(Math.abs(pointerAngle(s) - 25 - pointerAngle(stylusAt(0))) < 1e-9);
  assert.ok(Math.hypot(CENTER.x - 50, CENTER.y - 50) === 0);
});
