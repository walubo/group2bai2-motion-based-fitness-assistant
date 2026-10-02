// The T-pose outline the user must fit their body into.
// The template is built for the camera frame's aspect ratio, so the same
// positions can be drawn by the UI (Torres) and used by the validator (Aries).
//
// Frame coordinates: x and y are 0..1 across the frame (y grows downward).

import { LM, KEY_JOINTS, SKELETON_CONNECTIONS } from './landmarks.js';

// Body model with body height H = 1.
// x = distance from the body's centre line, y = height above the ground.
export const BODY_MODEL = {
  [LM.NOSE]: [0, 0.93],
  [LM.LEFT_SHOULDER]: [0.13, 0.82],
  [LM.RIGHT_SHOULDER]: [-0.13, 0.82],
  [LM.LEFT_ELBOW]: [0.315, 0.82],
  [LM.RIGHT_ELBOW]: [-0.315, 0.82],
  [LM.LEFT_WRIST]: [0.5, 0.82],
  [LM.RIGHT_WRIST]: [-0.5, 0.82],
  [LM.LEFT_HIP]: [0.09, 0.53],
  [LM.RIGHT_HIP]: [-0.09, 0.53],
  [LM.LEFT_KNEE]: [0.1, 0.285],
  [LM.RIGHT_KNEE]: [-0.1, 0.285],
  [LM.LEFT_ANKLE]: [0.1, 0.04],
  [LM.RIGHT_ANKLE]: [-0.1, 0.04],
};

const HEAD_MODEL = { cx: 0, cy: 0.945, radius: 0.065 };

// How big the outline is: limited by frame height and by arm span (with room
// for the hands). Portrait frames give a smaller outline, so the user stands further back.
export function templateScale(aspect, { maxHeightFrac = 0.9, maxSpanFrac = 0.8 } = {}) {
  return Math.min(maxHeightFrac, maxSpanFrac * aspect);
}

// Converts body-model units to frame coordinates (0..1).
export function bodyToFrame(bx, by, scale, aspect) {
  const bottom = 0.5 + scale / 2;
  return { x: 0.5 + (bx * scale) / aspect, y: bottom - by * scale };
}

export function buildTemplate(aspect = 9 / 16, options = {}) {
  const scale = templateScale(aspect, options);
  const points = {};
  for (const idx of KEY_JOINTS) {
    const [bx, by] = BODY_MODEL[idx];
    points[idx] = bodyToFrame(bx, by, scale, aspect);
  }
  const c = bodyToFrame(HEAD_MODEL.cx, HEAD_MODEL.cy, scale, aspect);
  return {
    aspect,
    scale, // body height as a fraction of frame height
    bodyHeight: (BODY_MODEL[LM.NOSE][1] - BODY_MODEL[LM.LEFT_ANKLE][1]) * scale, // nose to ankles
    points, // landmark index -> { x, y } in frame coordinates
    head: { x: c.x, y: c.y, rx: (HEAD_MODEL.radius * scale) / aspect, ry: HEAD_MODEL.radius * scale },
    connections: SKELETON_CONNECTIONS,
    keyJoints: KEY_JOINTS,
  };
}
