import type { Actor, Command, Pt, Route, World } from '../sim/types';
import type { Tool } from '../ui/store.svelte';
import { distToPolyline, snap45 } from './layout';

export const GRAB = 28, ROUTE_GRAB = 12;

export function hitActor(w: World, p: Pt, r = GRAB): Actor | null {
  let best: Actor | null = null, bd = r;
  for (const a of w.actors) {
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d <= bd) { best = a; bd = d; }
  }
  return best;
}

function hitRoute(w: World, p: Pt, r: number): Route | null {
  let best: Route | null = null, bd = r;
  for (const rt of w.routes) {
    const d = distToPolyline(p, rt.points);
    if (d <= bd) { best = rt; bd = d; }
  }
  return best;
}

/** Appui simple : outil (hors `route`) + point → commande éventuelle. */
export function tapCommand(tool: Tool, p: Pt, w: World): Command | null {
  if (tool.startsWith('place:')) {
    const kind = tool.slice(6) as Extract<Command, { type: 'place' }>['kind'];
    if (kind !== 'recycleur') return { type: 'place', kind, x: p.x, y: p.y };
    const taken = new Set(w.actors.filter(a => a.kind === 'recycleur').map(a => a.res));
    const res = w.activeRes.find(r => !taken.has(r)) ?? w.activeRes[0];
    return { type: 'place', kind, x: p.x, y: p.y, res };
  }
  if (tool === 'delete') { const r = hitRoute(w, p, ROUTE_GRAB); return r && { type: 'removeRoute', id: r.id }; }
  if (tool === 'priority') { const r = hitRoute(w, p, GRAB); return r && { type: 'priority', routeId: r.id }; }
  if (tool === 'upgrade' || tool === 'renovate') { const a = hitActor(w, p); return a && { type: tool, id: a.id }; }
  return null;
}

/** Relâchement d'un glisser depuis l'acteur `fromId` : route vers un AUTRE acteur, sinon annulé. */
export function routeCommand(w: World, fromId: number, p: Pt): Command | null {
  const a = w.actors.find(x => x.id === fromId), b = hitActor(w, p);
  if (!a || !b || a.id === b.id) return null;
  return { type: 'route', from: a.id, to: b.id, points: snap45(a, b) };
}
