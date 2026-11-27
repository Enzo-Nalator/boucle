import type { ActorKind, Res } from '../sim/types';

export const INK = 0x2b2f36;
export const GREY = 0x9aa0a6;
export const RES_COLOR: Record<Res, number> = {
  plastique: 0x3ba7ff,
  verre: 0x2fbf8a,
  metal: 0x8a94a6,
  bio: 0xe08a1e,
  papier: 0xd9c84a,
};

/** Direction « ville » : bitume et tuile de fond de chaque acteur (l'herbe est le fond du jeu, voir game.ts). */
export const ROAD = 0x8a8f98;
export const ACTOR_BASE: Record<ActorKind, number> = {
  quartier: 0xfde8c8,
  tri: 0xdcd3ff,
  recycleur: 0xe3e6ec,
  fabricant: 0xffe9a8,
  reparateur: 0xffd3d3,
  decharge: 0xd9cfc4,
  garage: 0xd6e4f0,
};
