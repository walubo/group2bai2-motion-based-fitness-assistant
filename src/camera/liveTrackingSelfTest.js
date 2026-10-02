// Run with:  node src/camera/liveTrackingSelfTest.js
// Tests the motion scan and live tracking with fake moving poses.
// No phone or camera needed.

import assert from 'node:assert/strict';
import { measureBody } from './tposeCalibration.js';
import {
  MC_STATUS, MOTION_STEPS, initialMotionState, stepMotion,
} from './motionCalibration.js';
import {
  LT_STATUS, createLiveTracker, stepLiveTracking,
} from './liveTracking.js';
import { LM } from './landmarks.js';
import {
  armRaise, freeMove, headScan, kneeLift, restPose, torsoLean, withHiddenPart,
} from './mockMotion.js';

const PORTRAIT = 9 / 16;
const STEP_MS = 100;
let passed = 0;
const test = (name, fn) => { fn(); passed += 1; console.log('PASS', name); };

// Drives the motion scan through every step with the matching fake movement.
function runMotionScan({ aspect = PORTRAIT, scale = 1, interruptAfter = null } = {}) {
  const generators = {
    HEAD: (a, t) => headScan(a, t, { scale }),
    LEFT_ARM: (a, t) => armRaise(a, t, 'left', { scale }),
    RIGHT_ARM: (a, t) => armRaise(a, t, 'right', { scale }),
    TORSO: (a, t) => torsoLean(a, t, { scale }),
    LEGS: (a, t) => kneeLift(a, t, { scale }),
  };
  const body = measureBody(makeAny(aspect, scale), aspect);
  let state = initialMotionState();
  let t = 0;
  let now = 0;
  let interrupted = false;
  for (let i = 0; i < MOTION_STEPS.length; i += 1) {
    for (let f = 0; f < 80; f += 1) {
      if (interruptAfter !== null && !interrupted && state.stepIndex === interruptAfter && f === 40) {
        // lose the Hunter for over a second, mid-step
        for (let g = 0; g < 12; g += 1) {
          now += STEP_MS;
          state = stepMotion(state, null, now, { aspect, poseOk: false });
        }
        interrupted = true;
      }
      t += 0.02;
      now += STEP_MS;
      state = stepMotion(state, generators[MOTION_STEPS[state.stepIndex].id](aspect, t), now, {
        aspect,
        poseOk: true,
        calibration: body,
      });
      if (state.stepIndex > i) break;
    }
    assert.ok(state.stepIndex > i || state.status === MC_STATUS.COMPLETE, `step ${MOTION_STEPS[i].id} did not finish: ${JSON.stringify(state.ranges)}`);
  }
  return state;
}

function makeAny(aspect, scale) {
  return restPose(aspect, 0, { scale });
}

test('motion scan completes every step and produces a profile', () => {
  const state = runMotionScan();
  assert.equal(state.status, MC_STATUS.COMPLETE);
  assert.ok(state.profile, 'profile missing');
  assert.equal(Object.keys(state.profile.ranges).length, MOTION_STEPS.length);
  assert.ok(state.profile.body && state.profile.body.bodyHeight > 0);
  const headRange = state.profile.ranges.HEAD.noseHoriz;
  assert.ok(headRange.max - headRange.min > 0.25, `head turn span too small: ${headRange.max - headRange.min}`);
});

test('scan waits when the Hunter is not visible', () => {
  let state = initialMotionState();
  state = stepMotion(state, null, 1000, { poseOk: false });
  assert.equal(state.status, MC_STATUS.WAITING);
  state = stepMotion(state, restPose(PORTRAIT, 0), 2000, { poseOk: true });
  assert.equal(state.status, MC_STATUS.SCANNING);
});

test('scan survives a dropout and still finishes (ranges are kept)', () => {
  const state = runMotionScan({ interruptAfter: 1 });
  assert.equal(state.status, MC_STATUS.COMPLETE);
  assert.ok(state.profile);
});

test('smaller person produces the same normalised head measurements', () => {
  const big = runMotionScan();
  const small = runMotionScan({ scale: 0.6 });
  const bigSpan = big.profile.ranges.HEAD.noseHoriz.max - big.profile.ranges.HEAD.noseHoriz.min;
  const smallSpan = small.profile.ranges.HEAD.noseHoriz.max - small.profile.ranges.HEAD.noseHoriz.min;
  assert.ok(Math.abs(bigSpan - smallSpan) < 0.1, `spans differ: ${bigSpan} vs ${smallSpan}`);
});

test('live tracker: standing still is quiet and fully tracked', () => {
  const profile = measureBody(makeAny(PORTRAIT, 1), PORTRAIT);
  const tracker = createLiveTracker(profile, { aspect: PORTRAIT });
  let snap = null;
  let now = 1000;
  for (let f = 0; f < 30; f += 1) {
    now += STEP_MS;
    snap = stepLiveTracking(tracker, restPose(PORTRAIT, f * 0.02), now);
  }
  assert.equal(snap.status, LT_STATUS.TRACKING);
  for (const [name, m] of Object.entries(snap.movement)) {
    assert.ok(m.speed < 0.05, `${name} speed should be near zero, got ${m.speed}`);
    assert.equal(m.active, false);
  }
});

test('live tracker: raising an arm lights up the arm, not the legs', () => {
  const profile = measureBody(makeAny(PORTRAIT, 1), PORTRAIT);
  const tracker = createLiveTracker(profile, { aspect: PORTRAIT });
  let snap = null;
  let now = 1000;
  for (let f = 0; f <= 40; f += 1) {
    now += STEP_MS;
    snap = stepLiveTracking(tracker, armRaise(PORTRAIT, f * 0.02, 'left'), now);
  }
  assert.equal(snap.status, LT_STATUS.TRACKING);
  assert.ok(snap.movement.leftArm.active, 'left arm should be active');
  assert.ok(snap.movement.leftArm.speed > 0.1, `arm speed too low: ${snap.movement.leftArm.speed}`);
  assert.ok(!snap.movement.leftLeg.active, 'left leg should be still');
  assert.ok(!snap.movement.torso.active, 'torso should be still');
  assert.ok(typeof snap.angles.shoulderL === 'number');
  assert.ok(snap.angles.shoulderL > 30, `arm should be rising, angle ${snap.angles.shoulderL}`);
});

test('live tracker adapts to body size (same motion, same normalised speed)', () => {
  const run = (scale) => {
    const profile = measureBody(makeAny(PORTRAIT, scale), PORTRAIT);
    const tracker = createLiveTracker(profile, { aspect: PORTRAIT });
    let snap = null;
    let now = 1000;
    for (let f = 0; f <= 40; f += 1) {
      now += STEP_MS;
      snap = stepLiveTracking(tracker, armRaise(PORTRAIT, f * 0.02, 'left', { scale }), now);
    }
    return snap.movement.leftArm.speed;
  };
  const big = run(1);
  const small = run(0.6);
  assert.ok(Math.abs(big - small) / big < 0.25, `speeds differ too much: ${big} vs ${small}`);
});

test('live tracker reports missing parts with a System message', () => {
  const profile = measureBody(makeAny(PORTRAIT, 1), PORTRAIT);
  const tracker = createLiveTracker(profile, { aspect: PORTRAIT });
  let snap = stepLiveTracking(tracker, restPose(PORTRAIT, 0), 1000);
  snap = stepLiveTracking(tracker, withHiddenPart(PORTRAIT, 0), 1100);
  assert.equal(snap.status, LT_STATUS.PARTIAL);
  assert.equal(snap.parts.leftHand.ok, false);
  assert.match(snap.message, /left hand/);
});

test('live tracker handles a missing Hunter', () => {
  const profile = measureBody(makeAny(PORTRAIT, 1), PORTRAIT);
  const tracker = createLiveTracker(profile, { aspect: PORTRAIT });
  const snap = stepLiveTracking(tracker, null, 1000);
  assert.equal(snap.status, LT_STATUS.NO_PERSON);
  assert.match(snap.message, /Step into view/);
});

test('live tracker smooths jitter instead of flickering', () => {
  const profile = measureBody(makeAny(PORTRAIT, 1), PORTRAIT);
  const tracker = createLiveTracker(profile, { aspect: PORTRAIT });
  let snap = null;
  let now = 1000;
  const still = restPose(PORTRAIT, 0);
  for (let f = 0; f < 40; f += 1) {
    now += STEP_MS;
    const jittered = still.map((p, i) => (i === LM.LEFT_WRIST ? { ...p, x: p.x + (f % 2 ? 0.01 : -0.01) } : p));
    snap = stepLiveTracking(tracker, jittered, now);
  }
  assert.ok(snap.movement.leftArm.speed < 0.3, `jitter should be damped, got ${snap.movement.leftArm.speed}`);
  assert.equal(snap.movement.leftArm.active, false, 'jitter must not count as movement');
});

console.log(`\nAll ${passed} tests passed.`);
