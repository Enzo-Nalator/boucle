import type { Cell, Pt } from '../sim/types';

/** Taille d'une case à l'écran ; la ligne 0 commence sous le HUD (TOP), la barre d'outils garde la dernière bande. */
export const CELL = 80,
  TOP = 80;

export const cellCenter = ({ c, r }: Cell): Pt => ({ x: (c + 0.5) * CELL, y: TOP + (r + 0.5) * CELL });
export const cellAt = (p: Pt): Cell => ({ c: Math.floor(p.x / CELL), r: Math.floor((p.y - TOP) / CELL) });

/** Position à l'écran à d cases du début d'un trajet de cases (bornée à ses bouts). */
export function pathPoint(path: Cell[], d: number): Pt {
  const k = Math.max(0, Math.min(path.length - 2, Math.floor(d))),
    f = Math.max(0, Math.min(1, d - k)),
    a = cellCenter(path[k]),
    b = cellCenter(path[k + 1]);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/** Nombre de pastilles affichées pour un niveau (rien au niveau 1). */
export const levelPips = (level: number): number => Math.max(0, Math.min(2, level - 1));
