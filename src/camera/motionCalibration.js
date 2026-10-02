// Motion calibration (the "movement scan"): after the T-pose scan locks the
// Hunter's body size, this measures how far each body part can move (range of
// motion). The result is stored in the Hunter's body profile, so live tracking
// can adapt to THIS person instead of using fixed averages.
//
// Pure logic: no camera, no React. Feed it landmarks from any pose library.
//
// Flow: T-pose CALIBRATED -> stepMotion() through MOTION_STEPS -> COMPLETE,
// with a profile { ranges, body } that liveTracking.js uses.

import { LM } from './landmarks.js';
import { angleAt, angleFromVertical, dist, mid, toPlane } from './poseMath.js';

export const MC_STATUS = {
  WAITING: 'WAITING', // no (fully visible) person detected
  SCANNING: 'SCANNING', // measuring the current step
  COMPLETE: 'COMPLETE', // all steps measured; profile is ready
};

// Each step asks the Hunter to move one body part. Every metric records the
// smallest and largest value seen during the step; the step is done when the
// measured span reaches its target.
// - span: the metric must move (max - min) across the target.
// - max:  the metric must reach the target at least once.
export const MOTION_STEPS = [
  {
    id: 'HEAD',
    label: 'Head',
    instruction: 'Slowly turn your head left and right, then look up and down, Hunter.',
    metrics: [
      { key: 'noseHoriz', type: 'span', target: 0.25 }, // head turn, in torso-length units
      { key: 'headNod', type: 'span', target: 0.12 }, // look up / down
    ],
  },
  {
    id: 'LEFT_ARM',
    label: 'Left arm',
    instruction: 'Raise your left arm up and down, Hunter.',
    metrics: [{ key: 'shoulderAngleL', type: 'span', target: 120 }],
  },
  {
    id: 'RIGHT_ARM',
    label: 'Right arm',
    instruction: 'Raise your right arm up and down, Hunter.',
    metrics: [{ key: 'shoulderAngleR', type: 'span', target: 120 }],
  },
  {
    id: 'TORSO',
    label: 'Torso',
    instruction: 'Keep your legs still and lean your upper body left and right, Hunter.',
    metrics: [{ key: 'torsoTilt', type: 'max', target: 15 }],
  },
  {
    id: 'LEGS',
    label: 'Legs',
    instruction: 'Lift each knee up, one at a time, Hunter.',
    metrics: [{ key: 'kneeBend', type: 'span', target: 60 }],
  },
];

// Signed arm raise angle: 0 = hanging down, 90 = horizontal, 180 = overhead.
// Both sides are flipped so "outward" is always positive.
function raiseAngle(shoulder, wrist, hipMid) {
  const side = Math.sign(shoulder.x - hipMid.x) || 1;
  const rad = Math.atan2((wrist.x - shoulder.x) * side, wrist.y - shoulder.y);
  return (rad * 180) / Math.PI;
}

// Values measured from one frame. All distances are normalised by the Hunter's
// own torso length, so a tall and a short person produce the same numbers.
export function measureMotion(lm, aspect = 9 / 16) {
  const P = (i) => toPlane(lm[i], aspect);
  const sMid = mid(P(LM.LEFT_SHOULDER), P(LM.RIGHT_SHOULDER));
  const hMid = mid(P(LM.LEFT_HIP), P(LM.RIGHT_HIP));
  const torso = Math.max(dist(sMid, hMid), 1e-6);

  const kneeL = angleAt(P(LM.LEFT_HIP), P(LM.LEFT_KNEE), P(LM.LEFT_ANKLE));
  const kneeR = angleAt(P(LM.RIGHT_HIP), P(LM.RIGHT_KNEE), P(LM.RIGHT_ANKLE));

  return {
    noseHoriz: (P(LM.NOSE).x - sMid.x) / torso, // signed: + right, - left
    headNod: P(LM.NOSE).y / torso,
    shoulderAngleL: raiseAngle(P(LM.LEFT_SHOULDER), P(LM.LEFT_WRIST), hMid),
    shoulderAngleR: raiseAngle(P(LM.RIGHT_SHOULDER), P(LM.RIGHT_WRIST), hMid),
    torsoTilt: angleFromVertical(hMid, sMid),
    // 0 = legs straight, grows as a knee bends
    kneeBend: 180 - Math.min(kneeL, kneeR),
  };
}

export function initialMotionState() {
  return {
    status: MC_STATUS.WAITING,
    stepIndex: 0,
    lastPoseAt: null,
    ranges: {}, // stepId -> metricKey -> { min, max }
    profile: null,
  };
}

function metricCoverage(metric, range) {
  const span = range.max - range.min;
  return metric.type === 'max' ? range.max / metric.target : span / metric.target;
}

// Moves the scan forward one frame. `poseOk` should be true only when a full
// body is visible (the caller usually gets this from evaluateTPose()).
export function stepMotion(state, landmarks, now, opts = {}) {
  const { aspect = 9 / 16, calibration = null, poseOk = false, graceMs = 600 } = opts;

  if (state.status === MC_STATUS.COMPLETE) return state;

  if (!poseOk) {
    // Measurements already taken stay valid; we just wait for the Hunter.
    const inGrace = state.status === MC_STATUS.SCANNING && state.lastPoseAt !== null && now - state.lastPoseAt <= graceMs;
    if (inGrace) return state;
    return { ...state, status: MC_STATUS.WAITING };
  }

  const step = MOTION_STEPS[state.stepIndex];
  const values = measureMotion(landmarks, aspect);

  // Grow this step's min/max ranges with today's measurements.
  const stepRanges = { ...(state.ranges[step.id] || {}) };
  for (const metric of step.metrics) {
    const value = values[metric.key];
    const range = stepRanges[metric.key] ? { ...stepRanges[metric.key] } : { min: value, max: value };
    range.min = Math.min(range.min, value);
    range.max = Math.max(range.max, value);
    stepRanges[metric.key] = range;
  }
  const ranges = { ...state.ranges, [step.id]: stepRanges };

  const stepProgress = Math.min(
    1,
    ...step.metrics.map((m) => Math.max(0, metricCoverage(m, stepRanges[m.key])))
  );
  const totalProgress = (state.stepIndex + stepProgress) / MOTION_STEPS.length;

  if (stepProgress >= 1) {
    const nextIndex = state.stepIndex + 1;
    if (nextIndex >= MOTION_STEPS.length) {
      return {
        status: MC_STATUS.COMPLETE,
        stepIndex: state.stepIndex,
        lastPoseAt: now,
        ranges,
        totalProgress: 1,
        profile: { ranges, body: calibration, capturedAt: now },
      };
    }
    return { ...state, status: MC_STATUS.SCANNING, stepIndex: nextIndex, lastPoseAt: now, ranges, totalProgress };
  }

  return { ...state, status: MC_STATUS.SCANNING, lastPoseAt: now, ranges, totalProgress };
}
