/** Réseau routier sur la grille : la boucle fixe plus les routes construites, toutes à double sens. */
import { ROAD_COST } from './defs';
import { around, COLS, inGrid, LOOP, loopIndex } from './grid';
import type { Actor, Cell, World } from './types';

const key = ({ c, r }: Cell) => r * COLS + c;

export const isRoad = (w: World, c: number, r: number): boolean =>
  loopIndex(c, r) >= 0 || w.roads.some(x => x.c === c && x.r === r);
export const actorOn = (w: World, c: number, r: number): Actor | undefined =>
  w.actors.find(a => a.c === c && a.r === r);
/** Un bâtiment collé à une route (haut, bas, gauche, droite) y est raccordé. */
export const connected = (w: World, a: Cell): boolean => around(a).some(n => isRoad(w, n.c, n.r));

/** Plus courts chemins par la route depuis le bâtiment a : pour chaque case de route atteinte, la case d'avant. */
export function paths(w: World, a: Actor): Map<number, Cell | null> {
  const road = new Set([...LOOP, ...w.roads].map(key)),
    prev = new Map<number, Cell | null>(),
    queue: Cell[] = [];
  const visit = (n: Cell, from: Cell | null) => {
    if (!inGrid(n.c, n.r) || !road.has(key(n)) || prev.has(key(n))) return;
    prev.set(key(n), from);
    queue.push(n);
  };
  for (const n of around(a)) visit(n, null);
  for (const cur of queue) for (const n of around(cur)) visit(n, cur);
  return prev;
}

/** Trajet le plus court de a à b par la route (cases de a et de b incluses) ; null s'ils ne sont pas reliés. */
export function route(prev: Map<number, Cell | null>, a: Actor, b: Actor): Cell[] | null {
  let best: Cell[] | null = null;
  for (const n of around(b)) {
    if (!prev.has(key(n))) continue;
    const path: Cell[] = [];
    for (let x: Cell | null = n; x; x = prev.get(key(x))!) path.unshift(x);
    if (!best || path.length + 2 < best.length) best = [{ c: a.c, r: a.r }, ...path, { c: b.c, r: b.r }];
  }
  return best;
}

/** Cases d'une ligne droite de a à b, bouts compris (a et b sur la même ligne ou colonne). */
const line = (a: Cell, b: Cell): Cell[] =>
  Array.from({ length: Math.abs(b.c - a.c) + Math.abs(b.r - a.r) + 1 }, (_, k) => ({
    c: a.c + Math.sign(b.c - a.c) * k,
    r: a.r + Math.sign(b.r - a.r) * k,
  }));

export type RoadPlan = { path: Cell[]; cells: Cell[]; cost: number; error: string | null };

/**
 * Route tracée de `from` à `to`, chacun sur un bâtiment ou une route : un L, par le coude qui demande le moins de
 * cases neuves (les cases déjà en route sont gratuites). `path` : le tracé entier ; `cells` : les cases à construire ;
 * `error` : pourquoi c'est impossible, en clair pour le joueur (le tracé reste fourni pour l'aperçu).
 */
export function roadPlan(w: World, from: Cell, to: Cell): RoadPlan {
  const paths = [
    { c: to.c, r: from.r },
    { c: from.c, r: to.r },
  ].map(bend => [...line(from, bend), ...line(bend, to).slice(1)]);
  const fail = (error: string, path = paths[0]): RoadPlan => ({ path, cells: [], cost: 0, error });
  const anchor = (x: Cell) => inGrid(x.c, x.r) && (isRoad(w, x.c, x.r) || !!actorOn(w, x.c, x.r));
  if (from.c === to.c && from.r === to.r) return fail('Trop court');
  if (!anchor(from) || !anchor(to)) return fail('Une route part d’un bâtiment ou d’une route, et y arrive');
  let best: RoadPlan | null = null;
  for (const path of paths) {
    if (path.slice(1, -1).some(x => actorOn(w, x.c, x.r))) continue;
    const cells = path.filter(x => !isRoad(w, x.c, x.r) && !actorOn(w, x.c, x.r));
    if (!best || cells.length < best.cells.length) best = { path, cells, cost: cells.length * ROAD_COST, error: null };
  }
  if (!best) return fail('Un bâtiment est en travers');
  return best.cells.length ? best : { ...best, error: 'Déjà relié par la route' };
}
