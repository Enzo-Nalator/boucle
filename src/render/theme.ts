import type { ActorKind, Res } from '../sim/types';

export const BG = '#f4f1ea';
export const INK = 0x2b2f36;
export const GREY = 0x9aa0a6;
export const RES_COLOR: Record<Res, number> = {
  plastique: 0x3ba7ff, verre: 0x2fbf8a, metal: 0x8a94a6, bio: 0xe08a1e, papier: 0xd9c84a,
};
export const ACTOR_SHAPE: Record<ActorKind, 'cercle' | 'carre' | 'carre-arrondi' | 'triangle' | 'losange' | 'croix' | 'hexagone' | 'rond-barre'> = {
  quartier: 'cercle', collecteur: 'carre-arrondi', tri: 'carre', recycleur: 'triangle',
  fabricant: 'losange', reparateur: 'croix', decharge: 'hexagone',
};
