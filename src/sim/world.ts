import { ACTOR_DEFS, DEMOLISH_REFUND, MIN_ACTOR_DISTANCE } from './defs';
import { routeLength } from './geo';
import { inWater, MAPS, type MapId } from './maps';
import { addPiece, cleanup, connect, planRoute, removeRoad } from './network';
import type { ActorKind, Command, World } from './types';

export { addPiece, planRoute, routeLength };

const WATER_MARGIN = 28;

export function createWorld(seed: number, map: MapId = 'plaine'): World {
  return {
    map,
    time: 0,
    rng: seed >>> 0,
    nextId: 1,
    budget: MAPS[map].budget,
    actors: [],
    routes: [],
    junctions: [],
    trucks: [],
    activeRes: ['plastique', 'verre'],
    contamination: 0.1,
    emitRate: 0.5,
    log: [],
    over: null,
    cash: [],
  };
}

/** Raison (en clair, pour le joueur) du refus d'une pose ou d'une route ; null si la commande est possible. */
export function refusal(w: World, c: Command): string | null {
  if (c.type === 'place') {
    if (inWater(w.map, c, WATER_MARGIN)) return 'Impossible de construire sur l’eau';
    if (w.actors.some(a => Math.hypot(a.x - c.x, a.y - c.y) < MIN_ACTOR_DISTANCE))
      return 'Trop près d’un autre bâtiment';
    if (w.budget < ACTOR_DEFS[c.kind].cost) return 'Pas assez d’argent';
  }
  if (c.type === 'route') {
    const plan = planRoute(w, c.from, c.to);
    if (plan.error) return plan.error;
    if (w.budget < plan.cost) return `Pas assez d’argent (${Math.ceil(plan.cost)} €)`;
  }
  if (c.type === 'demolish' && w.actors.find(a => a.id === c.id)?.kind === 'quartier')
    return 'On ne démolit pas un quartier';
  return null;
}

/** Une amélioration coûte cette part de la valeur du bâtiment. */
export const UPGRADE_RATIO = 0.75;

/** Prix de l'amélioration d'un bâtiment depuis `level` : sa valeur (achat + améliorations déjà payées) × la part. */
export function upgradeCost(kind: ActorKind, level: number): number {
  let value = ACTOR_DEFS[kind].cost;
  for (let l = 1; l < level; l++) value += Math.round(value * UPGRADE_RATIO);
  return Math.round(value * UPGRADE_RATIO);
}

export const RENOVATE_COST = 50,
  MAX_LEVEL = 3;

function leak(w: World, n: number) {
  for (let i = 0; i < n; i++) w.log.push({ t: w.time, ev: 'leak' });
}

/** true si appliquée ; refus => false et monde inchangé (tout est vérifié avant mutation). */
export function applyCommand(w: World, c: Command): boolean {
  switch (c.type) {
    case 'place': {
      if (refusal(w, c)) return false;
      w.budget -= ACTOR_DEFS[c.kind].cost;
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
        priority: 0,
      });
      connect(w, w.actors[w.actors.length - 1]); // posé sur une route : il y est raccordé
      return true;
    }
    case 'route': {
      if (refusal(w, c)) return false;
      const plan = planRoute(w, c.from, c.to);
      w.budget -= plan.cost;
      for (const piece of plan.pieces) addPiece(w, piece);
      cleanup(w);
      return true;
    }
    case 'removeRoute': {
      if (!w.routes.some(r => r.id === c.id)) return false;
      removeRoad(w, c.id);
      cleanup(w);
      return true;
    }
    case 'upgrade': {
      const a = w.actors.find(x => x.id === c.id);
      if (!a || a.kind === 'quartier' || a.kind === 'decharge' || a.level >= MAX_LEVEL) return false;
      const price = upgradeCost(a.kind, a.level);
      if (w.budget < price) return false;
      w.budget -= price;
      a.level += 1;
      return true;
    }
    case 'priority': {
      const a = w.actors.find(x => x.id === c.id);
      if (!a || a.kind === 'quartier') return false;
      a.priority = (a.priority + 1) % 3;
      return true;
    }
    case 'demolish': {
      const a = w.actors.find(x => x.id === c.id);
      if (!a || refusal(w, c)) return false;
      leak(w, a.queue.length + a.out.length + w.trucks.filter(t => t.to === a.id).length);
      w.trucks = w.trucks.filter(t => t.to !== a.id);
      w.budget += ACTOR_DEFS[a.kind].cost * DEMOLISH_REFUND;
      w.actors.splice(w.actors.indexOf(a), 1);
      // les routes qui passaient par lui restent ; ses impasses disparaissent
      w.junctions.push({ id: a.id, x: a.x, y: a.y });
      cleanup(w);
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
