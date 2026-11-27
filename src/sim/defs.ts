import type { ActorKind } from './types';

export const DT = 0.05;
export const MIN_ACTOR_DISTANCE = 60;
export const ROUTE_COST_PER_PX = 0.05;
export const ROUTE_SPEED = 120;
/** Supplément par px de route sur l'eau (pont). */
export const BRIDGE_COST_PER_PX = 0.4;
/** Carrefour (croisement de deux routes) : surcoût à la construction ; camions ralentis près des embranchements. */
export const CROSS_COST = 10,
  CROSS_RADIUS = 28,
  CROSS_SLOW = 0.35;
/** Part du prix récupérée en démolissant un bâtiment. */
export const DEMOLISH_REFUND = 0.5;
export const START_BUDGET = 260;
/** Réutiliser une route existante : poids de son trajet face au prix du neuf, et détour toléré (× le trajet direct). */
export const REUSE_WEIGHT = 0.3,
  MAX_DETOUR = 1.6;
/** Camions en route au maximum entre un même départ et une même arrivée. */
export const TRUCKS_PER_LINK = 8;
/** Gain par réparation : autant qu'un recyclage suivi d'une fabrication. */
export const REPAIR_REVENUE = 6;
/** Gain par paquet accepté par un recycleur, et par objet sorti d'un fabricant. */
export const RECYCLE_REVENUE = 4;
export const FABRICATE_REVENUE = 2;

export const ACTOR_DEFS: Record<ActorKind, { capacity: number; rate: number; cost: number; upkeep: number }> = {
  quartier: { capacity: 12, rate: 0.5, cost: 0, upkeep: 0 },
  tri: { capacity: 10, rate: 1, cost: 40, upkeep: 0.5 },
  recycleur: { capacity: 8, rate: 0.8, cost: 30, upkeep: 0.3 },
  fabricant: { capacity: 8, rate: 1.2, cost: 50, upkeep: 0.3 },
  reparateur: { capacity: 4, rate: 0.3, cost: 60, upkeep: 0.4 },
  decharge: { capacity: 1e9, rate: 10, cost: 25, upkeep: 0 },
};
