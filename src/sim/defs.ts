import type { ActorKind } from './types';

export const DT = 0.05;
export const MIN_ACTOR_DISTANCE = 60;
export const ROUTE_COST_PER_PX = 0.05;
export const ROUTE_SPEED = 120;
export const START_BUDGET = 260;
/** Gain par paquet accepté par un recycleur, et par objet sorti d'un fabricant. */
export const RECYCLE_REVENUE = 3;
export const FABRICATE_REVENUE = 1.5;

export const ACTOR_DEFS: Record<ActorKind, { capacity: number; rate: number; cost: number; upkeep: number }> = {
  quartier: { capacity: 12, rate: 0.5, cost: 0, upkeep: 0 },
  collecteur: { capacity: 6, rate: 2, cost: 20, upkeep: 0.2 },
  tri: { capacity: 10, rate: 1, cost: 40, upkeep: 0.5 },
  recycleur: { capacity: 8, rate: 0.8, cost: 30, upkeep: 0.3 },
  fabricant: { capacity: 8, rate: 0.6, cost: 50, upkeep: 0.3 },
  reparateur: { capacity: 4, rate: 0.3, cost: 60, upkeep: 0.4 },
  decharge: { capacity: 1e9, rate: 10, cost: 25, upkeep: 0 },
};
