import type { ActorKind, Res } from '../sim/types';

export const BG = '#f4f1ea';
export const INK = 0x2b2f36;
export const GREY = 0x9aa0a6;
export const RES_COLOR: Record<Res, number> = {
  plastique: 0x3ba7ff,
  verre: 0x2fbf8a,
  metal: 0x8a94a6,
  bio: 0xe08a1e,
  papier: 0xd9c84a,
};

/** Direction « ville » : herbe, bitume, pastille de fond et libellé de chaque acteur. */
export const GRASS = 0xcfe8b8;
export const ROAD = 0x8a8f98;
export const ACTOR_BASE: Record<ActorKind, number> = {
  quartier: 0xfde8c8,
  tri: 0xdcd3ff,
  recycleur: 0xe3e6ec,
  fabricant: 0xffe9a8,
  reparateur: 0xffd3d3,
  decharge: 0xd9cfc4,
};
export const ACTOR_LABEL: Record<ActorKind, string> = {
  quartier: 'Quartier',
  tri: 'Tri',
  recycleur: 'Recycleur',
  fabricant: 'Fabricant',
  reparateur: 'Réparateur',
  decharge: 'Décharge',
};
