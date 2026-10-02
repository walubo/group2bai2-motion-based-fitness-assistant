// Fake MOVING poses for the motion scan and live tracking, so they can be
// built and tested WITHOUT a camera (works in Expo Go).
// Every generator takes (aspect, t) where t is a 0..1 phase; the dev screen
// advances t with a timer so the fake Hunter keeps moving.

import { LM } from './landmarks.js';
import { makeTPose, withArmsDown, withMissing } from './mockPose.js';
import { templateScale } from './tposeTemplate.js';

// Segment lengths from the body model, in body-height units.
const UPPER_ARM = 0.185; // shoulder -> elbow
const FULL_ARM = 0.37; // shoulder -> wrist
const LEG_SEG = 0.245; // hip -> knee and knee -> ankle

const clone = (lms) => lms.map((p) => ({ ...p }));
const pingpong = (t) => 1 - Math.abs(1 - 2 * (((t % 1) + 1) % 1));

// Shifts landmarks by (dx, dy) given in body-height units (x is multiplied
// out through the aspect so distances look the same in plane units).
function shift(lms, indices, dxUnits, dyUnits, s, aspect) {
  for (const i of indices) {
    lms[i].x += (dxUnits * s) / aspect;
    lms[i].y += dyUnits * s;
  }
}

const HEAD_POINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 0 = nose

// Turn the head left/right and nod up/down.
export function headScan(aspect, t, { scale = 1 } = {}) {
  const lm = makeTPose(aspect, { scale });
  const s = buildScale(aspect, scale);
  const yaw = Math.sin(2 * Math.PI * t);
  const nod = Math.sin(2 * Math.PI * t + Math.PI / 2);
  shift(lm, HEAD_POINTS, yaw * 0.09, nod * 0.035, s, aspect);
  return lm;
}

// Raise one arm from the side ('left' | 'right') up past horizontal.
export function armRaise(aspect, t, side = 'left', { scale = 1 } = {}) {
  const lm = makeTPose(aspect, { scale });
  const s = buildScale(aspect, scale);
  const theta = (150 * pingpong(t) * Math.PI) / 180; // 0 = down, 150 deg = raised
  const [sh, el, wr] = side === 'left'
    ? [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST]
    : [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST];
  const hand = side === 'left'
    ? [LM.LEFT_PINKY, LM.LEFT_INDEX, LM.LEFT_THUMB]
    : [LM.RIGHT_PINKY, LM.RIGHT_INDEX, LM.RIGHT_THUMB];
  const sgn = Math.sign(lm[sh].x - 0.5) || 1; // outward direction
  const oldWrist = { x: lm[wr].x, y: lm[wr].y };
  lm[el] = {
    ...lm[el],
    x: lm[sh].x + sgn * Math.sin(theta) * UPPER_ARM * s / aspect,
    y: lm[sh].y + Math.cos(theta) * UPPER_ARM * s,
  };
  lm[wr] = {
    ...lm[wr],
    x: lm[sh].x + sgn * Math.sin(theta) * FULL_ARM * s / aspect,
    y: lm[sh].y + Math.cos(theta) * FULL_ARM * s,
  };
  const dx = lm[wr].x - oldWrist.x;
  const dy = lm[wr].y - oldWrist.y;
  for (const i of hand) {
    lm[i].x += dx;
    lm[i].y += dy;
  }
  return lm;
}

// Lean the upper body left and right (hips and legs stay still).
export function torsoLean(aspect, t, { scale = 1 } = {}) {
  const lm = makeTPose(aspect, { scale });
  const s = buildScale(aspect, scale);
  const lean = Math.sin(2 * Math.PI * t) * 0.13;
  shift(lm, [...HEAD_POINTS, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_PINKY, LM.RIGHT_PINKY, LM.LEFT_INDEX, LM.RIGHT_INDEX, LM.LEFT_THUMB, LM.RIGHT_THUMB], lean, 0, s, aspect);
  return lm;
}

// Lift each knee up, one at a time.
export function kneeLift(aspect, t, { scale = 1 } = {}) {
  const lm = makeTPose(aspect, { scale });
  const s = buildScale(aspect, scale);
  const phase = Math.sin(2 * Math.PI * t);
  const lifts = { left: Math.max(0, phase), right: Math.max(0, -phase) };
  for (const side of ['left', 'right']) {
    const lift = lifts[side];
    if (lift <= 0.02) continue;
    const [hip, knee, ankle] = side === 'left'
      ? [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE]
      : [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE];
    const foot = side === 'left' ? [LM.LEFT_HEEL, LM.LEFT_FOOT_INDEX] : [LM.RIGHT_HEEL, LM.RIGHT_FOOT_INDEX];
    const dy = -lift * 0.34 * LEG_SEG * 2 * s; // raise the foot
    // Knee sits on the circle between hip and the raised ankle, bent outward.
    const hipP = { x: lm[hip].x * aspect, y: lm[hip].y };
    const ankP = { x: lm[ankle].x * aspect + 0, y: lm[ankle].y + dy };
    const midP = { x: (hipP.x + ankP.x) / 2, y: (hipP.y + ankP.y) / 2 };
    const d = Math.hypot(ankP.x - hipP.x, ankP.y - hipP.y);
    const L = LEG_SEG * s; // one segment: hip->knee and knee->ankle
    const h = Math.sqrt(Math.max(0, L * L - (d / 2) * (d / 2)));
    const ux = (ankP.x - hipP.x) / (d || 1);
    const uy = (ankP.y - hipP.y) / (d || 1);
    const outward = Math.sign(lm[hip].x - 0.5) || 1;
    const perp = { x: -uy * outward, y: ux * outward };
    const kneeP = { x: midP.x + perp.x * h, y: midP.y + perp.y * h };
    const oldAnkle = { x: lm[ankle].x, y: lm[ankle].y };
    lm[knee] = { ...lm[knee], x: kneeP.x / aspect, y: kneeP.y };
    lm[ankle] = { ...lm[ankle], x: ankP.x / aspect, y: ankP.y };
    const ddx = lm[ankle].x - oldAnkle.x;
    const ddy = lm[ankle].y - oldAnkle.y;
    for (const i of foot) {
      lm[i].x += ddx;
      lm[i].y += ddy;
    }
  }
  return lm;
}

// Standing still, arms relaxed at the sides (the "ready" stance).
export function restPose(aspect, t, options = {}) {
  return withArmsDown(makeTPose(aspect, { scale: options.scale }), aspect);
}

// Everything moving at once, for live-tracking demos.
export function freeMove(aspect, t, options = {}) {
  const lm = armRaise(aspect, t, 'left', options);
  const right = armRaise(aspect, t + 0.5, 'right', options);
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST, LM.RIGHT_PINKY, LM.RIGHT_INDEX, LM.RIGHT_THUMB].forEach((i) => {
    lm[i] = { ...right[i] };
  });
  const head = headScan(aspect, t, options);
  [LM.NOSE, LM.LEFT_EYE, LM.RIGHT_EYE, LM.LEFT_EAR, LM.RIGHT_EAR].forEach((i) => {
    lm[i] = { ...head[i] };
  });
  return lm;
}

// A pose where the System loses a body part (default: the left hand).
export function withHiddenPart(aspect, t, indices) {
  return withMissing(restPose(aspect, t), indices || [LM.LEFT_WRIST, LM.LEFT_INDEX, LM.LEFT_PINKY, LM.LEFT_THUMB]);
}

function buildScale(aspect, scale) {
  // outline scale used by makeTPose, times the person's size factor
  return templateScale(aspect) * scale;
}
