import { ACTOR_DEFS, MIN_ACTOR_DISTANCE, ROUTE_COST_PER_PX, START_BUDGET } from './defs';
import type { Command, Pt, World } from './types';

export function createWorld(seed: number): World {
  return {
    time: 0,
    rng: seed >>> 0,
    nextId: 1,
    budget: START_BUDGET,
    actors: [],
    routes: [],
    activeRes: ['plastique', 'verre'],
    contamination: 0.1,
    emitRate: 0.5,
    log: [],
    over: null,
  };
}

export function routeLength(points: Pt[]): number {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return n;
}

export const UPGRADE_COST = 30,
  RENOVATE_COST = 50,
  MAX_LEVEL = 3;

function leak(w: World, n: number) {
  for (let i = 0; i < n; i++) w.log.push({ t: w.time, ev: 'leak' });
}

/** true si appliquée ; refus => false et monde inchangé (tout est vérifié avant mutation). */
export function applyCommand(w: World, c: Command): boolean {
  switch (c.type) {
    case 'place': {
      const cost = ACTOR_DEFS[c.kind].cost;
      if (w.budget < cost) return false;
      if (w.actors.some(a => Math.hypot(a.x - c.x, a.y - c.y) < MIN_ACTOR_DISTANCE)) return false;
      w.budget -= cost;
      w.actors.push({
        id: w.nextId++,
        kind: c.kind,
        x: c.x,
        y: c.y,
        ...(c.res ? { res: c.res } : {}),
        level: 1,
        queue: [],
        out: [],
        credit: 0,
        offlineUntil: 0,
        overflowT: 0,
        window: [],
        returns: [],
        rr: 0,
      });
      return true;
    }
    case 'route': {
      if (c.from === c.to || c.points.length < 2) return false;
      if (!w.actors.some(a => a.id === c.from) || !w.actors.some(a => a.id === c.to)) return false;
      if (w.routes.some(r => r.from === c.from && r.to === c.to)) return false;
      const inv = w.routes.find(r => r.from === c.to && r.to === c.from);
      if (inv) return applyCommand(w, { type: 'removeRoute', id: inv.id }); // tracé inverse = suppression (R19)
      const length = routeLength(c.points),
        cost = length * ROUTE_COST_PER_PX;
      if (w.budget < cost) return false;
      w.budget -= cost;
      w.routes.push({ id: w.nextId++, from: c.from, to: c.to, points: c.points, length, transit: [], priority: 0 });
      return true;
    }
    case 'removeRoute': {
      const i = w.routes.findIndex(r => r.id === c.id);
      if (i < 0) return false;
      leak(w, w.routes[i].transit.length);
      w.routes.splice(i, 1);
      return true;
    }
    case 'upgrade': {
      const a = w.actors.find(x => x.id === c.id);
      if (!a || a.kind === 'quartier' || a.kind === 'decharge' || a.level >= MAX_LEVEL || w.budget < UPGRADE_COST)
        return false;
      w.budget -= UPGRADE_COST;
      a.level += 1;
      return true;
    }
    case 'priority': {
      const r = w.routes.find(x => x.id === c.routeId);
      if (!r) return false;
      r.priority = (r.priority + 1) % 3;
      return true;
    }
    case 'renovate': {
      const a = w.actors.find(x => x.id === c.id);
      if (!a || w.budget < RENOVATE_COST) return false;
      w.budget -= RENOVATE_COST;
      leak(w, a.queue.length + a.out.length);
      a.queue = [];
      a.out = [];
      return true;
    }
  }
}
