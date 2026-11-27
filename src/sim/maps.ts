import type { Pt } from './types';
import { START_BUDGET } from './defs';

export type MapId = 'plaine' | 'riviere' | 'lacs';
export type Rect = { x: number; y: number; w: number; h: number };
export type MapDef = { name: string; hint: string; budget: number; water: Rect[] };

export const MAP_W = 1280,
  MAP_H = 720;

export const MAPS: Record<MapId, MapDef> = {
  plaine: {
    name: 'La plaine',
    hint: 'Terrain libre : attention surtout aux carrefours.',
    budget: START_BUDGET,
    water: [],
  },
  riviere: {
    name: 'La rivière',
    hint: 'Un fleuve coupe la carte. Les ponts coûtent cher : un réseau par rive ?',
    budget: START_BUDGET + 80,
    water: [{ x: 590, y: 0, w: 100, h: MAP_H }],
  },
  lacs: {
    name: 'Les lacs',
    hint: 'Peu de terrain : contourne les lacs ou paie des ponts.',
    budget: START_BUDGET + 40,
    water: [
      { x: 250, y: 90, w: 220, h: 210 },
      { x: 790, y: 150, w: 190, h: 260 },
      { x: 430, y: 440, w: 280, h: 170 },
    ],
  },
};
export const MAP_IDS = Object.keys(MAPS) as MapId[];

/** Vrai si le point est sur l'eau, ou à moins de `margin` px d'elle. */
export const inWater = (map: MapId, p: Pt, margin = 0): boolean =>
  MAPS[map].water.some(
    r => p.x > r.x - margin && p.x < r.x + r.w + margin && p.y > r.y - margin && p.y < r.y + r.h + margin,
  );
