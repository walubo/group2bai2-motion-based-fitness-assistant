// Fake poses for building and testing the UI WITHOUT a camera (works in Expo Go).
// Example:  const landmarks = makeTPose();  then  useTPoseCalibration(landmarks)

import { LANDMARK_COUNT, LM } from './landmarks.js';
import { BODY_MODEL, bodyToFrame, buildTemplate } from './tposeTemplate.js';

// Extra (non-key) landmarks as offsets from a base joint, in body-height units.
const EXTRAS = [
  [LM.LEFT_EYE, LM.NOSE, 0.02, 0.015],
  [LM.RIGHT_EYE, LM.NOSE, -0.02, 0.015],
  [1, LM.NOSE, 0.035, 0.015],
  [3, LM.NOSE, 0.01, 0.015],
  [4, LM.NOSE, -0.035, 0.015],
  [6, LM.NOSE, -0.01, 0.015],
  [LM.LEFT_EAR, LM.NOSE, 0.05, 0],
  [LM.RIGHT_EAR, LM.NOSE, -0.05, 0],
  [9, LM.NOSE, 0.015, -0.025],
  [10, LM.NOSE, -0.015, -0.025],
  [LM.LEFT_PINKY, LM.LEFT_WRIST, 0.045, -0.01],
  [LM.RIGHT_PINKY, LM.RIGHT_WRIST, -0.045, -0.01],
  [LM.LEFT_INDEX, LM.LEFT_WRIST, 0.06, 0.005],
  [LM.RIGHT_INDEX, LM.RIGHT_WRIST, -0.06, 0.005],
  [LM.LEFT_THUMB, LM.LEFT_WRIST, 0.04, 0.015],
  [LM.RIGHT_THUMB, LM.RIGHT_WRIST, -0.04, 0.015],
  [LM.LEFT_HEEL, LM.LEFT_ANKLE, 0, -0.04],
  [LM.RIGHT_HEEL, LM.RIGHT_ANKLE, 0, -0.04],
  [LM.LEFT_FOOT_INDEX, LM.LEFT_ANKLE, 0.03, -0.04],
  [LM.RIGHT_FOOT_INDEX, LM.RIGHT_ANKLE, -0.03, -0.04],
];

// A perfect T-pose sitting exactly on the outline.
// scale: 1 = outline size; shiftX: move left/right (frame fraction).
export function makeTPose(aspect = 9 / 16, { scale = 1, shiftX = 0 } = {}) {
  const s = buildTemplate(aspect).scale;
  const lm = Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));

  for (const [idx, [bx, by]] of Object.entries(BODY_MODEL)) {
    const p = bodyToFrame(bx, by, s, aspect);
    lm[idx] = { x: p.x, y: p.y, z: 0, visibility: 1 };
  }
  for (const [idx, base, dx, dy] of EXTRAS) {
    lm[idx] = {
      x: lm[base].x + (dx * s) / aspect,
      y: lm[base].y - dy * s,
      z: 0,
      visibility: 1,
    };
  }
  return lm.map((p) => ({
    ...p,
    x: 0.5 + (p.x - 0.5) * scale + shiftX,
    y: 0.5 + (p.y - 0.5) * scale,
  }));
}

const clone = (lms) => lms.map((p) => ({ ...p }));

// Library returned mirrored (selfie) coordinates but kept the left/right labels.
export function mirrorPose(lms) {
  return lms.map((p) => ({ ...p, x: 1 - p.x }));
}

// Pretend the System cannot see these landmark indexes (low visibility).
export function withMissing(lms, indices) {
  const out = clone(lms);
  indices.forEach((i) => { out[i].visibility = 0.05; });
  return out;
}

// Pretend these landmarks fell below the bottom edge of the frame.
export function withOutOfFrame(lms, indices) {
  const out = clone(lms);
  indices.forEach((i) => { out[i].y = 1.08; out[i].visibility = 0.2; });
  return out;
}

// Both arms hanging down.
export function withArmsDown(lms, aspect = 9 / 16) {
  const s = buildTemplate(aspect).scale;
  const out = clone(lms);
  [[LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST], [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST]].forEach(
    ([sh, el, wr]) => {
      out[el] = { ...out[el], x: out[sh].x, y: out[sh].y + 0.17 * s };
      out[wr] = { ...out[wr], x: out[sh].x, y: out[sh].y + 0.34 * s };
    }
  );
  return out;
}

// Knees pushed outward (bent legs).
export function withBentKnees(lms, aspect = 9 / 16) {
  const s = buildTemplate(aspect).scale;
  const out = clone(lms);
  [LM.LEFT_KNEE, LM.RIGHT_KNEE].forEach((k) => {
    out[k].x += (out[k].x > 0.5 ? 1 : -1) * ((0.12 * s) / aspect);
  });
  return out;
}
