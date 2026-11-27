import type { ActorKind } from './types';

export const DT = 0.05;
export const START_BUDGET = 400;
/** Gain par paquet accepté par un recycleur, et par objet sorti d'un fabricant. */
export const RECYCLE_REVENUE = 3;
export const FABRICATE_REVENUE = 1.5;
/** Prix payé par paquet jeté à la décharge. */
export const DUMP_COST = 2.5;

/** Part du prix d'achat récupérée en vendant un bâtiment (repris de la démolition de gameplay). */
export const SELL_REFUND = 0.5;
/** Prix d'une case de route construite. */
export const ROAD_COST = 4;
/** Camions : vitesse en cases/s, et au plus `perLink` en route entre un même départ et une même arrivée. */
export const TRUCK = { speed: 2, perLink: 8 };
/** Garage : par niveau du meilleur garage relié à la route, +25 % de vitesse et +1 paquet par camion. */
export const GARAGE = { speed: 0.25, load: 1 };
/** Temps minimal (s) qu'un paquet passe dans les cases d'un bâtiment avant d'en repartir, pour qu'on l'y voie. */
export const DWELL = 0.5;

export const ACTOR_DEFS: Record<ActorKind, { capacity: number; rate: number; cost: number; upkeep: number }> = {
  quartier: { capacity: 12, rate: 0.5, cost: 0, upkeep: 0 },
  tri: { capacity: 10, rate: 1, cost: 40, upkeep: 0.5 },
  recycleur: { capacity: 8, rate: 0.8, cost: 30, upkeep: 0.3 },
  fabricant: { capacity: 8, rate: 0.6, cost: 50, upkeep: 0.3 },
  reparateur: { capacity: 4, rate: 0.3, cost: 60, upkeep: 0.4 },
  decharge: { capacity: 1e9, rate: 10, cost: 25, upkeep: 0 },
  garage: { capacity: 0, rate: 0, cost: 50, upkeep: 0.3 },
};
