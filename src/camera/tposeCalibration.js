// T-pose calibration state machine (pure logic, no React).
//
// WAITING     no person detected
// ADJUSTING   person detected, but not in a valid T-pose yet
// HOLDING     valid T-pose, hold still until the timer fills
// CALIBRATED  done; body measurements captured

import { LM } from './landmarks.js';
import { dist, mid, toPlane } from './poseMath.js';

export const CAL_STATUS = {
  WAITING: 'WAITING',
  ADJUSTING: 'ADJUSTING',
  HOLDING: 'HOLDING',
  CALIBRATED: 'CALIBRATED',
};

export function initialCalibrationState() {
  return { status: CAL_STATUS.WAITING, holdStartedAt: null, lastReadyAt: null, progress: 0, calibration: null };
}

// Body proportions captured at calibration. Lengths are in "frame-height" units,
// so later logic (rep counting) can normalise against the user's own body size.
export function measureBody(lm, aspect = 9 / 16) {
  const P = (i) => toPlane(lm[i], aspect);
  const avg = (a, b) => (a + b) / 2;
  const shoulderMid = mid(P(LM.LEFT_SHOULDER), P(LM.RIGHT_SHOULDER));
  const hipMid = mid(P(LM.LEFT_HIP), P(LM.RIGHT_HIP));
  return {
    shoulderWidth: dist(P(LM.LEFT_SHOULDER), P(LM.RIGHT_SHOULDER)),
    torsoLength: dist(shoulderMid, hipMid),
    upperArm: avg(dist(P(LM.LEFT_SHOULDER), P(LM.LEFT_ELBOW)), dist(P(LM.RIGHT_SHOULDER), P(LM.RIGHT_ELBOW))),
    forearm: avg(dist(P(LM.LEFT_ELBOW), P(LM.LEFT_WRIST)), dist(P(LM.RIGHT_ELBOW), P(LM.RIGHT_WRIST))),
    thigh: avg(dist(P(LM.LEFT_HIP), P(LM.LEFT_KNEE)), dist(P(LM.RIGHT_HIP), P(LM.RIGHT_KNEE))),
    shin: avg(dist(P(LM.LEFT_KNEE), P(LM.LEFT_ANKLE)), dist(P(LM.RIGHT_KNEE), P(LM.RIGHT_ANKLE))),
    armSpan: dist(P(LM.LEFT_WRIST), P(LM.RIGHT_WRIST)),
    bodyHeight: dist(P(LM.NOSE), mid(P(LM.LEFT_ANKLE), P(LM.RIGHT_ANKLE))),
    aspect,
  };
}

// Moves the calibration forward. `now` is a millisecond timestamp (Date.now()).
export function stepCalibration(state, evaluation, landmarks, now, opts = {}) {
  const { holdMs = 1500, graceMs = 300, aspect = 9 / 16 } = opts;

  if (state.status === CAL_STATUS.CALIBRATED) return state;

  if (!evaluation || !evaluation.hasPose) {
    return { ...initialCalibrationState(), status: CAL_STATUS.WAITING };
  }

  if (evaluation.ready) {
    const holdStartedAt = state.holdStartedAt ?? now;
    const progress = Math.min(1, (now - holdStartedAt) / holdMs);
    if (progress >= 1) {
      return {
        status: CAL_STATUS.CALIBRATED,
        holdStartedAt,
        lastReadyAt: now,
        progress: 1,
        calibration: { ...measureBody(landmarks, aspect), capturedAt: now },
      };
    }
    return { status: CAL_STATUS.HOLDING, holdStartedAt, lastReadyAt: now, progress, calibration: null };
  }

  // Brief tracking dropouts should not restart the hold timer.
  if (state.status === CAL_STATUS.HOLDING && now - state.lastReadyAt <= graceMs) return state;

  return {
    status: CAL_STATUS.ADJUSTING,
    holdStartedAt: null,
    lastReadyAt: state.lastReadyAt ?? null,
    progress: 0,
    calibration: null,
  };
}
