import type { Pt } from './types';

const EPS = 1e-6;

export function routeLength(points: Pt[]): number {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return n;
}

/**
 * Rencontres entre deux polylignes : `overlap` si elles se superposent sur un tronçon, `points` aux croisements,
 * avec la distance parcourue sur chacune (da, db).
 */
export function meet(a: Pt[], b: Pt[]): { overlap: boolean; points: (Pt & { da: number; db: number })[] } {
  const points: (Pt & { da: number; db: number })[] = [];
  let overlap = false,
    sa = 0;
  for (let i = 1; i < a.length; i++) {
    const p = a[i - 1],
      rx = a[i].x - p.x,
      ry = a[i].y - p.y,
      la = Math.hypot(rx, ry);
    let sb = 0;
    for (let j = 1; j < b.length; j++) {
      const q = b[j - 1],
        sx = b[j].x - q.x,
        sy = b[j].y - q.y,
        lb = Math.hypot(sx, sy),
        den = rx * sy - ry * sx,
        qx = q.x - p.x,
        qy = q.y - p.y;
      if (Math.abs(den) < EPS) {
        if (la > 0 && Math.abs(qx * ry - qy * rx) / la < 1) {
          const t0 = (qx * rx + qy * ry) / la,
            t1 = t0 + (sx * rx + sy * ry) / la;
          if (Math.min(la, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1)) > 2) overlap = true;
        }
      } else {
        const t = (qx * sy - qy * sx) / den,
          u = (qx * ry - qy * rx) / den;
        if (t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS) {
          const hit = { x: p.x + t * rx, y: p.y + t * ry, da: sa + t * la, db: sb + u * lb };
          if (!points.some(o => Math.hypot(o.x - hit.x, o.y - hit.y) < 12)) points.push(hit);
        }
      }
      sb += lb;
    }
    sa += la;
  }
  return { overlap, points };
}

export const distToPolyline = (p: Pt, points: Pt[]): number => project(p, points).dist;

/** [from, coude, to] : course droite puis diagonale à 45° ; deux points si aligné (axe ou diagonale). */
export function snap45(from: Pt, to: Pt): Pt[] {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    ax = Math.abs(dx),
    ay = Math.abs(dy);
  const a = { x: from.x, y: from.y },
    b = { x: to.x, y: to.y }; // pas de champs en trop (acteurs passés tels quels)
  if (dx === 0 || dy === 0 || ax === ay) return [a, b];
  const bend = ax > ay ? { x: to.x - Math.sign(dx) * ay, y: from.y } : { x: from.x, y: to.y - Math.sign(dy) * ax };
  return [a, bend, b];
}

/** Position à la distance d le long de la polyligne, bornée à ses extrémités. */
export function pointAt(points: Pt[], d: number): Pt {
  let left = Math.max(0, d);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      len = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= len && len > 0) return { x: a.x + ((b.x - a.x) * left) / len, y: a.y + ((b.y - a.y) * left) / len };
    left -= len;
  }
  return { ...points[points.length - 1] };
}

/** Point de la polyligne le plus proche de p : position, distance parcourue (d) et écart à p. */
export function project(p: Pt, points: Pt[]): Pt & { d: number; dist: number } {
  let best = { x: points[0].x, y: points[0].y, d: 0, dist: Infinity },
    run = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      vx = b.x - a.x,
      vy = b.y - a.y,
      len = Math.hypot(vx, vy);
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / (len * len)));
    const x = a.x + t * vx,
      y = a.y + t * vy,
      dist = Math.hypot(p.x - x, p.y - y);
    if (dist < best.dist) best = { x, y, d: run + t * len, dist };
    run += len;
  }
  return best;
}

/** Morceau de la polyligne entre les distances d0 < d1. */
export function slice(points: Pt[], d0: number, d1: number): Pt[] {
  const out = [pointAt(points, d0)];
  let run = 0;
  for (let i = 1; i < points.length - 1; i++) {
    run += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (run > d0 + 0.5 && run < d1 - 0.5) out.push({ x: points[i].x, y: points[i].y });
  }
  out.push(pointAt(points, d1));
  return out;
}
