// Live body tracking (pure logic, no camera, no React).
//
// Feed it the Hunter's body profile (from the T-pose + motion calibration) and
// a stream of landmarks; it returns smoothed joint positions, joint angles and
// per-body-part movement. Everything is normalised by the Hunter's OWN body
// height, so the same numbers mean the same motion for a tall or short person
// standing near or far from the camera.
//
// const tracker = createLiveTracker(profile, { aspect });
// const snapshot = stepLiveTracking(tracker, landmarks, Date.now());

import { BODY_PARTS, LANDMARK_COUNT, LM } from './landmarks.js';
import { angleAt, angleFromVertical, dist, mid, toPlane } from './poseMath.js';

export const LT_STATUS = {
  NO_PERSON: 'NO_PERSON', // nothing visible at all
  PARTIAL: 'PARTIAL', // tracking, but some body parts are lost
  TRACKING: 'TRACKING', // full body in view
};

export const DEFAULT_TRACKING_OPTIONS = {
  aspect: 9 / 16,
  minVisibility: 0.5,
  softMinVisibility: 0.35, // hands and feet are small and noisy
  frameMargin: 0.02,
  smoothAlpha: 0.4, // 0 = frozen, 1 = raw positions
  maxMissMs: 500, // a part lost longer than this counts as missing
  moveActiveSpeed: 0.05, // body heights per second for a part to count as moving
};

const visOf = (p) => (typeof p.visibility === 'number' ? p.visibility : 1);
const isPoint = (p) => p && typeof p.x === 'number' && typeof p.y === 'number';
const inFrame = (p, m) => p.x >= m && p.x <= 1 - m && p.y >= m && p.y <= 1 - m;

function joinLabels(labels) {
  if (labels.length <= 1) return labels.join('');
  return labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
}

function checkParts(lm, o) {
  const parts = {};
  for (const [name, def] of Object.entries(BODY_PARTS)) {
    const minVis = def.soft ? o.softMinVisibility : o.minVisibility;
    let out = false;
    let hidden = false;
    for (const i of def.points) {
      const p = lm[i];
      if (!isPoint(p)) hidden = true;
      else if (!inFrame(p, o.frameMargin)) out = true;
      else if (visOf(p) < minVis) hidden = true;
    }
    const reason = out ? 'OUT_OF_FRAME' : hidden ? 'NOT_VISIBLE' : null;
    parts[name] = { label: def.label, ok: reason === null, reason };
  }
  return parts;
}

// 0 = arm hanging down, 90 = horizontal, 180 = overhead (both sides positive).
function raiseAngle(shoulder, wrist, hipMid) {
  const side = Math.sign(shoulder.x - hipMid.x) || 1;
  const rad = Math.atan2((wrist.x - shoulder.x) * side, wrist.y - shoulder.y);
  return (rad * 180) / Math.PI;
}

export function createLiveTracker(profile, options = {}) {
  return {
    profile: profile || {},
    options: { ...DEFAULT_TRACKING_OPTIONS, ...options },
    prev: null, // smoothed landmarks from the previous frame
    movement: null, // per part { speed, active } from the previous frame
    lastStepAt: null,
    snapshot: null,
  };
}

// Advances the tracker one frame and updates tracker.snapshot. Mutates the
// tracker (cheap, one per camera frame) and returns the snapshot.
export function stepLiveTracking(tracker, landmarks, now) {
  const o = tracker.options;
  const dtSec = tracker.lastStepAt ? Math.min(1, Math.max(0.001, (now - tracker.lastStepAt) / 1000)) : null;
  tracker.lastStepAt = now;

  const valid = Array.isArray(landmarks) && landmarks.length >= LANDMARK_COUNT;
  if (!valid) {
    tracker.snapshot = {
      status: LT_STATUS.NO_PERSON,
      message: 'Step into view, Hunter.',
      parts: null,
      joints: null,
      angles: null,
      movement: tracker.movement,
      ts: now,
    };
    return tracker.snapshot;
  }

  const parts = checkParts(landmarks, o);
  const missing = Object.values(parts).filter((p) => !p.ok).map((p) => p.label);

  // Smooth positions so the skeleton does not jitter between frames.
  const alpha = o.smoothAlpha;
  const smoothed = landmarks.map((p, i) => {
    const prev = tracker.prev ? tracker.prev[i] : null;
    if (!isPoint(p)) return prev ? { ...prev, visibility: 0 } : { x: 0.5, y: 0.5, visibility: 0 };
    if (prev && now - prev.at <= o.maxMissMs * 3) {
      return { x: prev.x + (p.x - prev.x) * alpha, y: prev.y + (p.y - prev.y) * alpha, visibility: visOf(p), at: now };
    }
    return { x: p.x, y: p.y, visibility: visOf(p), at: now };
  });
  tracker.prev = smoothed;

  // Movement per body part, in the Hunter's own body heights per second.
  const unit = tracker.profile.bodyHeight || 0.5;
  const movement = {};
  for (const [name, def] of Object.entries(BODY_PARTS)) {
    let speed = 0;
    if (dtSec && tracker.prev) {
      let d = 0;
      let seen = 0;
      for (const i of def.points) {
        if (isPoint(landmarks[i]) && isPoint(tracker.prev[i])) {
          d += dist(toPlane(landmarks[i], o.aspect), toPlane(tracker.prev[i], o.aspect));
          seen += 1;
        }
      }
      if (seen) speed = d / seen / unit / dtSec;
    }
    const prevSpeed = tracker.movement && tracker.movement[name] ? tracker.movement[name].speed : 0;
    const smooth = prevSpeed + (speed - prevSpeed) * 0.5;
    movement[name] = { speed: smooth, active: smooth >= o.moveActiveSpeed };
  }
  tracker.movement = movement;

  // Joint angles for form checks (null when a needed part is not visible).
  const P = (i) => toPlane(smoothed[i], o.aspect);
  const angles = {};
  const okPoints = (...idx) => idx.every((i) => isPoint(smoothed[i]) && visOf(smoothed[i]) >= o.softMinVisibility);
  if (okPoints(LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE)) angles.kneeL = angleAt(P(LM.LEFT_HIP), P(LM.LEFT_KNEE), P(LM.LEFT_ANKLE));
  if (okPoints(LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE)) angles.kneeR = angleAt(P(LM.RIGHT_HIP), P(LM.RIGHT_KNEE), P(LM.RIGHT_ANKLE));
  if (okPoints(LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST)) angles.elbowL = angleAt(P(LM.LEFT_SHOULDER), P(LM.LEFT_ELBOW), P(LM.LEFT_WRIST));
  if (okPoints(LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST)) angles.elbowR = angleAt(P(LM.RIGHT_SHOULDER), P(LM.RIGHT_ELBOW), P(LM.RIGHT_WRIST));
  if (okPoints(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP)) {
    const sMid = mid(P(LM.LEFT_SHOULDER), P(LM.RIGHT_SHOULDER));
    const hMid = mid(P(LM.LEFT_HIP), P(LM.RIGHT_HIP));
    angles.torsoTilt = angleFromVertical(hMid, sMid);
    if (okPoints(LM.NOSE)) angles.headOffset = (P(LM.NOSE).x - sMid.x) / Math.max(dist(sMid, hMid), 1e-6);
  }
  if (okPoints(LM.LEFT_SHOULDER, LM.LEFT_WRIST, LM.LEFT_HIP, LM.RIGHT_HIP)) {
    angles.shoulderL = raiseAngle(P(LM.LEFT_SHOULDER), P(LM.LEFT_WRIST), mid(P(LM.LEFT_HIP), P(LM.RIGHT_HIP)));
  }
  if (okPoints(LM.RIGHT_SHOULDER, LM.RIGHT_WRIST, LM.LEFT_HIP, LM.RIGHT_HIP)) {
    angles.shoulderR = raiseAngle(P(LM.RIGHT_SHOULDER), P(LM.RIGHT_WRIST), mid(P(LM.LEFT_HIP), P(LM.RIGHT_HIP)));
  }

  let status = LT_STATUS.TRACKING;
  let message = 'Tracking active. The System is watching, Hunter.';
  if (missing.length === Object.keys(parts).length) {
    status = LT_STATUS.NO_PERSON;
    message = 'Step into view, Hunter.';
  } else if (missing.length) {
    status = LT_STATUS.PARTIAL;
    message = `The System cannot see your ${joinLabels(missing)}, Hunter.`;
  }

  tracker.snapshot = {
    status,
    message,
    parts,
    joints: smoothed.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility })),
    angles,
    movement,
    ts: now,
  };
  return tracker.snapshot;
}
