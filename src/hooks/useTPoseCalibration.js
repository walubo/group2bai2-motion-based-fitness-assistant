// Layer 2/3 hook: turns live pose landmarks into T-pose calibration status.
// It does NOT touch the camera or any sensor library. Feed it landmarks from
// normalizeLandmarks() (real camera) or makeTPose() (mock, works in Expo Go).
//
// const { status, progress, message, parts, fit, template, calibration, reset } =
//   useTPoseCalibration(landmarks, { aspect: 9 / 16 });

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { evaluateTPose } from '../camera/tposeValidator.js';
import { buildTemplate } from '../camera/tposeTemplate.js';
import { CAL_STATUS, initialCalibrationState, stepCalibration } from '../camera/tposeCalibration.js';

const IDLE_VIEW = { status: CAL_STATUS.WAITING, progress: 0, calibration: null };

export default function useTPoseCalibration(landmarks, options = {}) {
  const { enabled = true, aspect = 9 / 16, holdMs = 1500, graceMs = 300, thresholds } = options;

  const evaluation = useMemo(
    () => (enabled ? evaluateTPose(landmarks, { aspect, ...thresholds }) : null),
    [landmarks, enabled, aspect, thresholds]
  );
  const template = useMemo(() => buildTemplate(aspect), [aspect]);

  const evaluationRef = useRef(evaluation);
  const landmarksRef = useRef(landmarks);
  evaluationRef.current = evaluation;
  landmarksRef.current = landmarks;

  const stateRef = useRef(initialCalibrationState());
  const [view, setView] = useState(IDLE_VIEW);

  const tick = useCallback(() => {
    const next = stepCalibration(stateRef.current, evaluationRef.current, landmarksRef.current, Date.now(), {
      holdMs,
      graceMs,
      aspect,
    });
    stateRef.current = next;
    setView((v) =>
      v.status === next.status && Math.abs(v.progress - next.progress) < 0.02 && v.calibration === next.calibration
        ? v
        : { status: next.status, progress: next.progress, calibration: next.calibration }
    );
  }, [holdMs, graceMs, aspect]);

  // Runs 10 times a second so the hold timer advances even if landmarks arrive slowly.
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [enabled, tick]);

  const reset = useCallback(() => {
    stateRef.current = initialCalibrationState();
    setView(IDLE_VIEW);
  }, []);

  let message = evaluation ? evaluation.message : '';
  if (view.status === CAL_STATUS.CALIBRATED) {
    message = 'Calibration complete. The System has locked your body profile, Hunter.';
  } else if (view.status === CAL_STATUS.HOLDING) {
    message = 'Hold still, Hunter. Scanning...';
  }

  return {
    status: view.status,
    progress: view.progress, // 0..1 while holding the pose
    ready: view.status === CAL_STATUS.CALIBRATED,
    calibration: view.calibration, // body measurements once calibrated
    message, // System-style instruction for the user
    issues: evaluation ? evaluation.issues : [],
    parts: evaluation ? evaluation.parts : null, // per body part: { label, ok, reason }
    checks: evaluation ? evaluation.checks : null,
    fit: evaluation ? evaluation.fit : null, // per-joint results to colour the outline
    template, // outline geometry for the overlay (frame coordinates 0..1)
    reset,
  };
}
