// Capability test (pure logic, layer 2): after the full-body scan, the System
// verifies the live tracking pipeline by counting guided movements:
// right hand up/down, left hand up/down, then jumping jacks.
// The screen only displays progress — all counting lives here.

import { LM } from './landmarks.js';
import { dist, mid, toPlane } from './poseMath.js';

export const ACTIVITIES = [
  {
    id: 'RIGHT_ARM',
    label: 'RIGHT HAND',
    verb: 'Raise your RIGHT hand UP and DOWN',
    target: 2,
    metric: 'rightArm',
    upAt: 110, // degrees above hip line counts as "up"
    downAt: 40, // back near the hip counts as one full rep
    demo: 'rightArm',
  },
  {
    id: 'LEFT_ARM',
    label: 'LEFT HAND',
    verb: 'Raise your LEFT hand UP and DOWN',
    target: 2,
    metric: 'leftArm',
    upAt: 110,
    downAt: 40,
    demo: 'leftArm',
  },
  {
    id: 'JACK',
    label: 'JUMPING JACKS',
    verb: 'Both arms overhead — JUMP!',
    target: 2,
    metric: 'jack',
    upAt: 140,
    downAt: 60,
    demo: 'jack',
  },
];

// Signed arm raise angle: 0 = hanging down, 90 = horizontal, 180 = overhead.
function raiseAngle(shoulder, wrist, hipMid) {
  const side = Math.sign(shoulder.x - hipMid.x) || 1;
  const rad = Math.atan2((wrist.x - shoulder.x) * side, wrist.y - shoulder.y);
  return (rad * 180) / Math.PI;
}

// Live metrics for the current activity, from one frame of landmarks.
export function measureCapabilityMetrics(landmarks, aspect = 9 / 16) {
  const P = (i) => toPlane(landmarks[i], aspect);
  const hipMid = mid(P(LM.LEFT_HIP), P(LM.RIGHT_HIP));
  const rightArm = Math.max(0, raiseAngle(P(LM.RIGHT_SHOULDER), P(LM.RIGHT_WRIST), hipMid));
  const leftArm = Math.max(0, raiseAngle(P(LM.LEFT_SHOULDER), P(LM.LEFT_WRIST), hipMid));
  // jumping jack needs BOTH arms up at the same time
  return { rightArm, leftArm, jack: Math.min(rightArm, leftArm) };
}

export function createCapabilityState() {
  return { index: 0, counts: {}, phase: 'down' };
}

// Hysteresis rep counter: a rep = up past `upAt`, then back down past `downAt`.
export function stepCapability(state, metrics) {
  const act = ACTIVITIES[state.index];
  if (!act) return state;
  const value = Math.max(0, metrics[act.metric] || 0);
  let phase = state.phase;
  let count = state.counts[act.id] || 0;
  if (phase === 'down' && value >= act.upAt) phase = 'up';
  else if (phase === 'up' && value <= act.downAt) {
    phase = 'down';
    count += 1;
  }
  return { ...state, phase, counts: { ...state.counts, [act.id]: count } };
}

export function activityRepCount(state) {
  const act = ACTIVITIES[state.index];
  return act ? state.counts[act.id] || 0 : 0;
}

export function activityDone(state) {
  const act = ACTIVITIES[state.index];
  return !!act && activityRepCount(state) >= act.target;
}

// Live tracking normalises movement by the Hunter's body height. Without the
// old T-pose outline we measure it straight from the detected skeleton.
export function measureBodyQuick(landmarks, aspect = 9 / 16) {
  const P = (i) => toPlane(landmarks[i], aspect);
  const ankleMid = mid(P(LM.LEFT_ANKLE), P(LM.RIGHT_ANKLE));
  return { bodyHeight: Math.max(dist(P(LM.NOSE), ankleMid), 1e-6) };
}
