// Checks a set of pose landmarks against the T-pose requirements.
// Pure logic: no camera, no React, no sensors. Feed it landmarks from any pose library.
//
// Input: array of 33 landmarks { x, y, z?, visibility? } with x/y normalized 0..1.

import { BODY_PARTS, KEY_JOINTS, LANDMARK_COUNT, LM, MIRROR_INDEX } from './landmarks.js';
import { angleAt, angleFromHorizontal, angleFromVertical, dist, mid, toPlane } from './poseMath.js';
import { buildTemplate } from './tposeTemplate.js';

export const DEFAULT_OPTIONS = {
  aspect: 9 / 16, // frame width / height (portrait phone camera)
  minVisibility: 0.5,
  softMinVisibility: 0.35, // hands and feet are small, so be more forgiving
  frameMargin: 0.02, // landmarks closer than this to the edge count as out of frame
  armAngleMax: 20, // arms must be within 20 degrees of horizontal
  elbowMinAngle: 155, // arms straight
  kneeMinAngle: 160, // legs straight
  torsoTiltMax: 15, // torso upright
  shoulderTiltMax: 12, // shoulders level
  minShoulderToTorso: 0.5, // facing the camera (shoulder width / torso length)
  fitJointTol: 0.14, // joint distance to outline, as a fraction of the outline's body height
  fitRatioMin: 0.8, // share of key joints that must sit on the outline
  scaleMin: 0.75, // user size / outline size
  scaleMax: 1.3,
  centerMax: 0.12, // max horizontal offset from the frame centre
};

const visOf = (p) => (typeof p.visibility === 'number' ? p.visibility : 1);
const isPoint = (p) => p && typeof p.x === 'number' && typeof p.y === 'number';
const inFrame = (p, m) => p.x >= m && p.x <= 1 - m && p.y >= m && p.y <= 1 - m;

function joinLabels(labels) {
  if (labels.length <= 1) return labels.join('');
  return labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
}

function evaluateParts(lm, o) {
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

function evaluateShape(lm, o) {
  const P = (i) => toPlane(lm[i], o.aspect);
  const sL = P(LM.LEFT_SHOULDER);
  const sR = P(LM.RIGHT_SHOULDER);
  const hL = P(LM.LEFT_HIP);
  const hR = P(LM.RIGHT_HIP);
  const shoulderMid = mid(sL, sR);
  const hipMid = mid(hL, hR);

  const armSide = (shoulder, otherShoulder, wrist) => {
    const angle = angleFromHorizontal(shoulder, wrist);
    const outward = (wrist.x - shoulder.x) * (shoulder.x - otherShoulder.x) > 0;
    return { angle, ok: angle <= o.armAngleMax && outward };
  };
  const armL = armSide(sL, sR, P(LM.LEFT_WRIST));
  const armR = armSide(sR, sL, P(LM.RIGHT_WRIST));

  const elbowL = angleAt(sL, P(LM.LEFT_ELBOW), P(LM.LEFT_WRIST));
  const elbowR = angleAt(sR, P(LM.RIGHT_ELBOW), P(LM.RIGHT_WRIST));
  const kneeL = angleAt(hL, P(LM.LEFT_KNEE), P(LM.LEFT_ANKLE));
  const kneeR = angleAt(hR, P(LM.RIGHT_KNEE), P(LM.RIGHT_ANKLE));

  const torsoTilt = angleFromVertical(hipMid, shoulderMid);
  const shoulderTilt = angleFromHorizontal(sL, sR);
  const torsoLength = dist(shoulderMid, hipMid);
  const shoulderToTorso = torsoLength === 0 ? 0 : dist(sL, sR) / torsoLength;

  return {
    armsLevel: { ok: armL.ok && armR.ok, value: Math.max(armL.angle, armR.angle) },
    armsStraight: { ok: Math.min(elbowL, elbowR) >= o.elbowMinAngle, value: Math.min(elbowL, elbowR) },
    legsStraight: { ok: Math.min(kneeL, kneeR) >= o.kneeMinAngle, value: Math.min(kneeL, kneeR) },
    torsoUpright: { ok: torsoTilt <= o.torsoTiltMax, value: torsoTilt },
    shouldersLevel: { ok: shoulderTilt <= o.shoulderTiltMax, value: shoulderTilt },
    facingCamera: { ok: shoulderToTorso >= o.minShoulderToTorso, value: shoulderToTorso },
  };
}

function computeFit(lm, o) {
  const tpl = buildTemplate(o.aspect);
  const tol = o.fitJointTol * tpl.scale;

  const scoreOrientation = (mirror) => {
    const perJoint = {};
    let within = 0;
    for (const idx of KEY_JOINTS) {
      const tIdx = mirror ? (MIRROR_INDEX[idx] ?? idx) : idx;
      const d = dist(toPlane(lm[idx], o.aspect), toPlane(tpl.points[tIdx], o.aspect));
      const ok = d <= tol;
      if (ok) within += 1;
      perJoint[idx] = { ok, dist: d };
    }
    return { ratio: within / KEY_JOINTS.length, perJoint };
  };

  const normal = scoreOrientation(false);
  const mirrored = scoreOrientation(true);
  const best = mirrored.ratio > normal.ratio ? mirrored : normal;

  const ankleMid = mid(toPlane(lm[LM.LEFT_ANKLE], o.aspect), toPlane(lm[LM.RIGHT_ANKLE], o.aspect));
  const userHeight = dist(toPlane(lm[LM.NOSE], o.aspect), ankleMid);
  const scaleRatio = tpl.bodyHeight === 0 ? 0 : userHeight / tpl.bodyHeight;

  const centerX =
    (lm[LM.LEFT_SHOULDER].x + lm[LM.RIGHT_SHOULDER].x + lm[LM.LEFT_HIP].x + lm[LM.RIGHT_HIP].x) / 4;
  const centerOffset = Math.abs(centerX - 0.5);

  const scaleOk = scaleRatio >= o.scaleMin && scaleRatio <= o.scaleMax;
  const centerOk = centerOffset <= o.centerMax;
  const alignedOk = best.ratio >= o.fitRatioMin;

  return {
    ok: scaleOk && centerOk && alignedOk,
    ratio: best.ratio,
    perJoint: best.perJoint, // landmark index -> { ok, dist } so the UI can colour each joint
    orientation: best === mirrored && mirrored.ratio > normal.ratio ? 'mirrored' : 'normal',
    scaleRatio,
    centerOffset,
    tolerance: tol,
  };
}

export function evaluateTPose(landmarks, options = {}) {
  const o = { ...DEFAULT_OPTIONS, ...options };

  if (!Array.isArray(landmarks) || landmarks.length < LANDMARK_COUNT) {
    const message = 'No Hunter detected. Step into the scan area.';
    return {
      hasPose: false,
      ready: false,
      allPartsVisible: false,
      parts: null,
      checks: null,
      fit: null,
      issues: [{ code: 'NO_POSE', message }],
      message,
    };
  }

  const parts = evaluateParts(landmarks, o);
  const partList = Object.values(parts);
  const allPartsVisible = partList.every((p) => p.ok);

  const issues = [];
  const outLabels = partList.filter((p) => p.reason === 'OUT_OF_FRAME').map((p) => p.label);
  const hiddenLabels = partList.filter((p) => p.reason === 'NOT_VISIBLE').map((p) => p.label);
  if (outLabels.length) {
    issues.push({
      code: 'OUT_OF_FRAME',
      message: `Step back, Hunter. The System cannot scan your ${joinLabels(outLabels)}.`,
    });
  }
  if (hiddenLabels.length) {
    issues.push({
      code: 'NOT_VISIBLE',
      message: `The System cannot see your ${joinLabels(hiddenLabels)}. Clear the view and check the lighting.`,
    });
  }

  let checks = null;
  let poseOk = false;
  let fit = null;

  if (allPartsVisible) {
    checks = evaluateShape(landmarks, o);
    if (!checks.facingCamera.ok) issues.push({ code: 'NOT_FACING', message: 'Face the camera, Hunter.' });
    if (!checks.armsLevel.ok) issues.push({ code: 'ARMS_NOT_LEVEL', message: 'Raise both arms out to your sides at shoulder height.' });
    if (!checks.armsStraight.ok) issues.push({ code: 'ARMS_BENT', message: 'Straighten your arms, Hunter.' });
    if (!checks.legsStraight.ok) issues.push({ code: 'LEGS_BENT', message: 'Stand with your legs straight.' });
    if (!checks.torsoUpright.ok) issues.push({ code: 'TORSO_TILTED', message: 'Stand upright, Hunter.' });
    if (!checks.shouldersLevel.ok) issues.push({ code: 'SHOULDERS_UNLEVEL', message: 'Keep your shoulders level.' });
    poseOk = Object.values(checks).every((c) => c.ok);
  }

  if (allPartsVisible) {
    fit = computeFit(landmarks, o);
    if (poseOk) {
      if (fit.scaleRatio > o.scaleMax) issues.push({ code: 'TOO_CLOSE', message: 'Step back, Hunter. You are too close to the scan.' });
      else if (fit.scaleRatio < o.scaleMin) issues.push({ code: 'TOO_FAR', message: 'Step closer, Hunter. Your body is too small for the scan.' });
      else if (fit.centerOffset > o.centerMax) issues.push({ code: 'OFF_CENTER', message: 'Center your body on the outline.' });
      else if (fit.ratio < o.fitRatioMin) issues.push({ code: 'NOT_ALIGNED', message: 'Match your body to the outline, Hunter.' });
    }
  }

  const ready = allPartsVisible && poseOk && fit !== null && fit.ok;

  return {
    hasPose: true,
    ready,
    allPartsVisible,
    parts,
    checks,
    fit,
    issues,
    message: issues.length ? issues[0].message : 'Hold still, Hunter. Scanning...',
  };
}
