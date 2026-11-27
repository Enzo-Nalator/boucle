import { ACTOR_DEFS, SELL_REFUND, START_BUDGET } from './defs';
import { inGrid } from './grid';
import { actorOn, isRoad, roadPlan } from './roads';
import type { Command, World } from './types';

export function createWorld(seed: number): World {
  return {
    time: 0,
    rng: seed >>> 0,
    nextId: 1,
    budget: START_BUDGET,
    actors: [],
    roads: [],
    trucks: [],
    activeRes: ['plastique', 'verre'],
    contamination: 0.1,
    emitRate: 0.5,
    log: [],
    over: null,
    cash: [],
  };
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
      if (w.budget < cost || !inGrid(c.c, c.r) || isRoad(w, c.c, c.r) || actorOn(w, c.c, c.r)) return false;
      w.budget -= cost;
      w.actors.push({
        id: w.nextId++,
        kind: c.kind,
        c: c.c,
        r: c.r,
        ...(c.res ? { res: c.res } : {}),
        level: 1,
        queue: [],
        out: [],
        credit: 0,
        offlineUntil: 0,
        overflowT: 0,
        returns: [],
      });
      return true;
    }
    case 'road': {
      const plan = roadPlan(w, c.from, c.to);
      if (plan.error || w.budget < plan.cost) return false;
      w.budget -= plan.cost;
      w.roads.push(...plan.cells);
      return true;
    }
    case 'removeRoad': {
      const k = w.roads.findIndex(x => x.c === c.c && x.r === c.r);
      if (k < 0) return false;
      w.roads.splice(k, 1);
      // les camions qui devaient encore y passer sont perdus avec leur paquet ; ceux qui l'ont dépassée continuent
      const lost = w.trucks.filter(t => t.path.slice(Math.ceil(t.d)).some(x => x.c === c.c && x.r === c.r));
      leak(
        w,
        lost.reduce((n, t) => n + t.load.length, 0),
      );
      w.trucks = w.trucks.filter(t => !lost.includes(t));
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
    case 'renovate': {
      const a = w.actors.find(x => x.id === c.id);
      if (!a || w.budget < RENOVATE_COST) return false;
      w.budget -= RENOVATE_COST;
      leak(w, a.queue.length + a.out.length);
      a.queue = [];
      a.out = [];
      return true;
    }
    case 'sell': {
      const a = w.actors.find(x => x.id === c.id);
      if (!a || a.kind === 'quartier') return false;
      // son stock et les camions en route vers lui sont perdus ; ceux qu'il a déjà envoyés livrent quand même
      const inbound = w.trucks.filter(t => t.to === a.id);
      leak(w, a.queue.length + a.out.length + inbound.reduce((n, t) => n + t.load.length, 0));
      w.trucks = w.trucks.filter(t => t.to !== a.id);
      w.budget += ACTOR_DEFS[a.kind].cost * SELL_REFUND;
      w.actors.splice(w.actors.indexOf(a), 1);
      return true;
    }
  }
}
