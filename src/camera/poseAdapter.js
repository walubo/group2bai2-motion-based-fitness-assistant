// The ONLY file that should know about the shape of your pose library's output.
// It converts whatever the library returns into the standard format used everywhere else:
//   array of 33 landmarks: { x: 0..1, y: 0..1, z, visibility: 0..1 }
//
// Accepts: an array of landmarks, { landmarks: [...] }, or a list of poses ([[...]]; first pose is used).
// If the library returns pixel coordinates, pass { width, height } of the analysed frame.

import { LANDMARK_COUNT } from './landmarks.js';

export function normalizeLandmarks(raw, { width, height } = {}) {
  let list = raw;
  if (list && !Array.isArray(list) && Array.isArray(list.landmarks)) list = list.landmarks;
  if (Array.isArray(list) && Array.isArray(list[0])) list = list[0];
  if (!Array.isArray(list) || list.length < LANDMARK_COUNT) return null;

  const out = [];
  for (let i = 0; i < LANDMARK_COUNT; i += 1) {
    const p = list[i];
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return null;
    const confidence = [p.visibility, p.presence, p.likelihood, p.inFrameLikelihood].find(
      (v) => typeof v === 'number'
    );
    out.push({
      x: width ? p.x / width : p.x,
      y: height ? p.y / height : p.y,
      z: typeof p.z === 'number' ? p.z : 0,
      visibility: confidence ?? 1,
    });
  }
  return out;
}
