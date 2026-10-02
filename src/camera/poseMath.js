// Small geometry helpers. All angles are in degrees.
// Points must be in "plane" units: x multiplied by the frame aspect (width/height)
// so that x and y use the same scale. Use toPlane() to convert.

export const toPlane = (p, aspect) => ({ x: p.x * aspect, y: p.y });

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const deg = (rad) => (rad * 180) / Math.PI;

// Angle at point b formed by a-b-c (180 = a straight line).
export function angleAt(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (m === 0) return 0;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / m));
  return deg(Math.acos(cos));
}

// 0 = perfectly horizontal line, 90 = vertical.
export function angleFromHorizontal(a, b) {
  return deg(Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)));
}

// 0 = perfectly vertical line, 90 = horizontal.
export function angleFromVertical(a, b) {
  return deg(Math.atan2(Math.abs(b.x - a.x), Math.abs(b.y - a.y)));
}
