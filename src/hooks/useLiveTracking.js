// Layer 2/3 hook: live body tracking. Feed it landmarks from
// normalizeLandmarks() (real camera) or the mock generators (Expo Go), plus
// the Hunter's calibrated body profile, and it returns smoothed joints,
// angles and per-body-part movement for the UI.
//
// const { snapshot } = useLiveTracking(landmarks, { aspect, profile });
// snapshot: { status, message, parts, joints, angles, movement, ts }

import { useEffect, useRef, useState } from 'react';
import { createLiveTracker, stepLiveTracking } from '../camera/liveTracking.js';

export default function useLiveTracking(landmarks, options = {}) {
  const { enabled = true, aspect = 9 / 16, profile = null } = options;

  const trackerRef = useRef(null);
  if (trackerRef.current === null) {
    trackerRef.current = createLiveTracker(profile, { aspect });
  }
  // A new body profile (re-calibration) restarts the tracker cleanly.
  useEffect(() => {
    trackerRef.current = createLiveTracker(profile, { aspect });
  }, [profile, aspect]);

  const landmarksRef = useRef(landmarks);
  landmarksRef.current = landmarks;

  // Step on every new frame of landmarks.
  useEffect(() => {
    if (!enabled || !landmarks) return;
    stepLiveTracking(trackerRef.current, landmarks, Date.now());
  }, [landmarks, enabled]);

  // Publish the latest snapshot to React state 10 times a second, so fast
  // camera frames do not flood the UI with re-renders.
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      return undefined;
    }
    const id = setInterval(() => setSnapshot(trackerRef.current.snapshot), 100);
    return () => clearInterval(id);
  }, [enabled]);

  return { snapshot };
}
