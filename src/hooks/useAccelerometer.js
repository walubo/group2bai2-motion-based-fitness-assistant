import { useEffect, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

export default function useAccelerometer(enabled = false, intervalMs = 100) {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    Accelerometer.isAvailableAsync().then(setAvailable);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    Accelerometer.setUpdateInterval(intervalMs);
    const sub = Accelerometer.addListener(setData);
    return () => sub.remove();
  }, [enabled, intervalMs]);

  // expo-sensors reports in g (about 1 at rest). Multiply by 9.81 for m/s².
  const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
  return { data, magnitude, available };
}