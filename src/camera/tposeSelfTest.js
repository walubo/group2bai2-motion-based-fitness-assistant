// Run with:  node src/camera/tposeSelfTest.js
// Tests the T-pose logic with fake poses. No phone or camera needed.

import assert from 'node:assert/strict';
import { evaluateTPose } from './tposeValidator.js';
import { CAL_STATUS, initialCalibrationState, stepCalibration } from './tposeCalibration.js';
import { normalizeLandmarks } from './poseAdapter.js';
import { LM } from './landmarks.js';
import {
  makeTPose, mirrorPose, withArmsDown, withBentKnees, withMissing, withOutOfFrame,
} from './mockPose.js';

const PORTRAIT = 9 / 16;
const LANDSCAPE = 16 / 9;
const codes = (ev) => ev.issues.map((i) => i.code);
let passed = 0;
const test = (name, fn) => { fn(); passed += 1; console.log('PASS', name); };

test('perfect T-pose is ready (portrait)', () => {
  const ev = evaluateTPose(makeTPose(PORTRAIT), { aspect: PORTRAIT });
  assert.equal(ev.ready, true, JSON.stringify(ev.issues));
  assert.equal(ev.issues.length, 0);
});

test('perfect T-pose is ready (landscape)', () => {
  const ev = evaluateTPose(makeTPose(LANDSCAPE), { aspect: LANDSCAPE });
  assert.equal(ev.ready, true, JSON.stringify(ev.issues));
});

test('mirrored coordinates still pass', () => {
  const ev = evaluateTPose(mirrorPose(makeTPose(PORTRAIT)), { aspect: PORTRAIT });
  assert.equal(ev.ready, true, JSON.stringify(ev.issues));
  assert.equal(ev.fit.orientation, 'mirrored');
});

test('no landmarks -> NO_POSE', () => {
  const ev = evaluateTPose(null);
  assert.equal(ev.hasPose, false);
  assert.deepEqual(codes(ev), ['NO_POSE']);
});

test('feet not visible -> NOT_VISIBLE and not ready', () => {
  const lm = withMissing(makeTPose(PORTRAIT), [LM.LEFT_HEEL, LM.RIGHT_HEEL, LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX]);
  const ev = evaluateTPose(lm, { aspect: PORTRAIT });
  assert.equal(ev.ready, false);
  assert.ok(codes(ev).includes('NOT_VISIBLE'));
  assert.equal(ev.parts.leftFoot.ok, false);
  assert.equal(ev.parts.head.ok, true);
  console.log('     message:', ev.message);
});

test('feet below the frame -> OUT_OF_FRAME', () => {
  const lm = withOutOfFrame(makeTPose(PORTRAIT), [LM.LEFT_HEEL, LM.RIGHT_HEEL, LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX]);
  const ev = evaluateTPose(lm, { aspect: PORTRAIT });
  assert.ok(codes(ev).includes('OUT_OF_FRAME'));
  console.log('     message:', ev.message);
});

test('arms down -> ARMS_NOT_LEVEL', () => {
  const ev = evaluateTPose(withArmsDown(makeTPose(PORTRAIT), PORTRAIT), { aspect: PORTRAIT });
  assert.equal(ev.ready, false);
  assert.ok(codes(ev).includes('ARMS_NOT_LEVEL'));
  console.log('     message:', ev.message);
});

test('bent knees -> LEGS_BENT', () => {
  const ev = evaluateTPose(withBentKnees(makeTPose(PORTRAIT), PORTRAIT), { aspect: PORTRAIT });
  assert.ok(codes(ev).includes('LEGS_BENT'));
});

test('standing too far -> TOO_FAR', () => {
  const ev = evaluateTPose(makeTPose(PORTRAIT, { scale: 0.6 }), { aspect: PORTRAIT });
  assert.deepEqual(codes(ev), ['TOO_FAR']);
});

test('standing too close -> TOO_CLOSE', () => {
  const ev = evaluateTPose(makeTPose(PORTRAIT, { scale: 1.05 }), { aspect: PORTRAIT, scaleMax: 1.02 });
  assert.deepEqual(codes(ev), ['TOO_CLOSE']);
});

test('off to the side -> OFF_CENTER', () => {
  const ev = evaluateTPose(makeTPose(LANDSCAPE, { shiftX: 0.15 }), { aspect: LANDSCAPE });
  assert.deepEqual(codes(ev), ['OFF_CENTER']);
});

test('hold 1.5 s -> CALIBRATED with measurements', () => {
  const lm = makeTPose(PORTRAIT);
  const ev = evaluateTPose(lm, { aspect: PORTRAIT });
  let s = initialCalibrationState();
  s = stepCalibration(s, ev, lm, 0);
  assert.equal(s.status, CAL_STATUS.HOLDING);
  s = stepCalibration(s, ev, lm, 750);
  assert.ok(Math.abs(s.progress - 0.5) < 1e-9);
  s = stepCalibration(s, ev, lm, 1600);
  assert.equal(s.status, CAL_STATUS.CALIBRATED);
  assert.ok(s.calibration.bodyHeight > 0 && s.calibration.armSpan > 0);
  console.log('     calibration:', JSON.stringify(s.calibration, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v)));
});

test('short dropout keeps the hold, long dropout resets it', () => {
  const good = makeTPose(PORTRAIT);
  const evGood = evaluateTPose(good, { aspect: PORTRAIT });
  const bad = withArmsDown(good, PORTRAIT);
  const evBad = evaluateTPose(bad, { aspect: PORTRAIT });
  let s = initialCalibrationState();
  s = stepCalibration(s, evGood, good, 0);
  s = stepCalibration(s, evGood, good, 1000);
  s = stepCalibration(s, evBad, bad, 1100); // 100 ms dropout: within grace
  assert.equal(s.status, CAL_STATUS.HOLDING);
  s = stepCalibration(s, evBad, bad, 1500); // 500 ms dropout: reset
  assert.equal(s.status, CAL_STATUS.ADJUSTING);
  assert.equal(s.progress, 0);
});

test('person leaves -> WAITING', () => {
  const lm = makeTPose(PORTRAIT);
  let s = stepCalibration(initialCalibrationState(), evaluateTPose(lm, { aspect: PORTRAIT }), lm, 0);
  s = stepCalibration(s, evaluateTPose(null), null, 100);
  assert.equal(s.status, CAL_STATUS.WAITING);
});

test('adapter handles nested lists, other confidence names and pixel coords', () => {
  const raw = [makeTPose(PORTRAIT).map((p) => ({ x: p.x * 1080, y: p.y * 1920, z: 0, presence: 0.9 }))];
  const lm = normalizeLandmarks(raw, { width: 1080, height: 1920 });
  assert.equal(lm.length, 33);
  assert.ok(Math.abs(lm[LM.NOSE].x - 0.5) < 1e-9);
  assert.equal(lm[0].visibility, 0.9);
  assert.equal(normalizeLandmarks([]), null);
});

console.log(`\nAll ${passed} tests passed.`);
