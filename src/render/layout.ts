import type { Pt } from '../sim/types';

/** [from, coude, to] : course droite puis diagonale à 45° ; deux points si aligné (axe ou diagonale). */
export function snap45(from: Pt, to: Pt): Pt[] {
  const dx = to.x - from.x, dy = to.y - from.y, ax = Math.abs(dx), ay = Math.abs(dy);
  const a = { x: from.x, y: from.y }, b = { x: to.x, y: to.y }; // pas de champs en trop (acteurs passés tels quels)
  if (dx === 0 || dy === 0 || ax === ay) return [a, b];
  const bend = ax > ay
    ? { x: to.x - Math.sign(dx) * ay, y: from.y }
    : { x: from.x, y: to.y - Math.sign(dy) * ax };
  return [a, bend, b];
}

/** Position à la distance d le long de la polyligne, bornée à ses extrémités. */
export function pointAt(points: Pt[], d: number): Pt {
  let left = Math.max(0, d);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= len && len > 0) return { x: a.x + ((b.x - a.x) * left) / len, y: a.y + ((b.y - a.y) * left) / len };
    left -= len;
  }
  return { ...points[points.length - 1] };
}

export function distToPolyline(p: Pt, points: Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2));
    best = Math.min(best, Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy));
  }
  return best;
}
