import type { Cell } from './types';

/** Plateau de COLS × ROWS cases ; la route est l'anneau rectangulaire RING, déjà construit. */
export const COLS = 16,
  ROWS = 7;
export const RING = { c0: 2, r0: 1, c1: 13, r1: 5 };

/** Cases de la boucle dans le sens de circulation (horaire à l'écran), depuis le coin haut-gauche. */
export const LOOP: Cell[] = (() => {
  const { c0, r0, c1, r1 } = RING,
    out: Cell[] = [];
  for (let c = c0; c <= c1; c++) out.push({ c, r: r0 });
  for (let r = r0 + 1; r <= r1; r++) out.push({ c: c1, r });
  for (let c = c1 - 1; c >= c0; c--) out.push({ c, r: r1 });
  for (let r = r1 - 1; r > r0; r--) out.push({ c: c0, r });
  return out;
})();

export const loopIndex = (c: number, r: number): number => LOOP.findIndex(x => x.c === c && x.r === r);
export const inGrid = (c: number, r: number): boolean =>
  Number.isInteger(c) && Number.isInteger(r) && c >= 0 && c < COLS && r >= 0 && r < ROWS;
/** Les 4 cases voisines (haut, bas, gauche, droite). */
export const around = ({ c, r }: Cell): Cell[] => [
  { c, r: r - 1 },
  { c, r: r + 1 },
  { c: c - 1, r },
  { c: c + 1, r },
];
