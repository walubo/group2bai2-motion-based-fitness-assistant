// Layer 2/3 hook: runs the motion scan (range-of-motion calibration) on live
// pose landmarks. Feed it landmarks from normalizeLandmarks() (real camera)
// or the mock generators in src/camera/mockMotion.js (works in Expo Go).
//
// Use it AFTER useTPoseCalibration is CALIBRATED, so the Hunter's body
// measurements can be stored into the profile.
//
// const { status, stepIndex, stepProgress, totalProgress, profile, message, reset } =
//   useMotionCalibration(landmarks, { aspect, calibration });

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { evaluateTPose } from '../camera/tposeValidator.js';
import { MC_STATUS, MOTION_STEPS, initialMotionState, stepMotion } from '../camera/motionCalibration.js';

const IDLE_VIEW = { status: MC_STATUS.WAITING, stepIndex: 0, stepProgress: 0, totalProgress: 0, profile: null };

export default function useMotionCalibration(landmarks, options = {}) {
  const { enabled = true, aspect = 9 / 16, calibration = null, graceMs = 600 } = options;

  // Reuse the T-pose validator only to know whether a full body is visible.
  const evaluation = useMemo(
    () => (enabled ? evaluateTPose(landmarks, { aspect }) : null),
    [landmarks, enabled, aspect]
  );
  const poseOk = !!(evaluation && evaluation.hasPose && evaluation.allPartsVisible);

  const poseOkRef = useRef(poseOk);
  const landmarksRef = useRef(landmarks);
  const calibrationRef = useRef(calibration);
  poseOkRef.current = poseOk;
  landmarksRef.current = landmarks;
  calibrationRef.current = calibration;

  const stateRef = useRef(initialMotionState());
  const [view, setView] = useState(IDLE_VIEW);

  const tick = useCallback(() => {
    const next = stepMotion(stateRef.current, landmarksRef.current, Date.now(), {
      aspect,
      calibration: calibrationRef.current,
      poseOk: poseOkRef.current,
      graceMs,
    });
    stateRef.current = next;
    const step = MOTION_STEPS[next.stepIndex];
    const stepProgress =
      next.status === MC_STATUS.COMPLETE
        ? 1
        : Math.min(
            1,
            ...step.metrics.map((m) => {
              const range = next.ranges[step.id] && next.ranges[step.id][m.key];
              if (!range) return 0;
              const span = range.max - range.min;
              const cover = m.type === 'max' ? range.max / m.target : span / m.target;
              return Math.max(0, cover);
            })
          );
    setView((v) =>
      v.status === next.status &&
      v.stepIndex === next.stepIndex &&
      Math.abs(v.stepProgress - stepProgress) < 0.02 &&
      v.profile === next.profile
        ? v
        : { status: next.status, stepIndex: next.stepIndex, stepProgress, totalProgress: next.totalProgress || 0, profile: next.profile }
    );
  }, [aspect, graceMs]);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [enabled, tick]);

  const reset = useCallback(() => {
    stateRef.current = initialMotionState();
    setView(IDLE_VIEW);
  }, []);

  const step = MOTION_STEPS[view.stepIndex];
  let message = step ? step.instruction : '';
  if (view.status === MC_STATUS.WAITING) {
    message =
      evaluation && evaluation.issues.length ? evaluation.issues[0].message : 'Step into view, Hunter.';
  } else if (view.status === MC_STATUS.COMPLETE) {
    message = 'Motion scan complete. Your body profile is locked in, Hunter.';
  }

  return {
    status: view.status,
    stepIndex: view.stepIndex,
    step, // current MOTION_STEPS entry (id, label, instruction)
    steps: MOTION_STEPS,
    stepProgress: view.stepProgress, // 0..1 for the current step
    totalProgress: view.totalProgress, // 0..1 across the whole scan
    profile: view.profile, // { ranges, body } once COMPLETE
    message,
    reset,
  };
}
