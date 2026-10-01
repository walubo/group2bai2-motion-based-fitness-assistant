import { useEffect, useRef, useState } from 'react';

// Counts a rep when motion rises above `high`, then falls below `low`.
export default function useRepCounter(
  magnitude,
  active,
  { high = 1.25, low = 1.05, minGapMs = 400 } = {}
) {
  const [reps, setReps] = useState(0);
  const armed = useRef(false);
  const lastRep = useRef(0);

  useEffect(() => {
    if (!active) {
      armed.current = false;
      return;
    }
    if (magnitude > high) {
      armed.current = true;
    } else if (magnitude < low && armed.current) {
      const now = Date.now();
      if (now - lastRep.current > minGapMs) {
        setReps((r) => r + 1);
        lastRep.current = now;
      }
      armed.current = false;
    }
  }, [magnitude, active]);

  const reset = () => {
    setReps(0);
    armed.current = false;
    lastRep.current = 0;
  };

  return { reps, reset };
}