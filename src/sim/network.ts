/** Réseau routier : tronçons à double sens entre bâtiments et embranchements. */
import { BRIDGE_COST_PER_PX, CROSS_COST, MAX_DETOUR, REUSE_WEIGHT, ROUTE_COST_PER_PX } from './defs';
import { meet, pointAt, project, routeLength, slice, snap45 } from './geo';
import { inWater } from './maps';
import type { Actor, Pt, Route, Truck, World } from './types';

const SNAP = 14, // deux points si proches sont le même nœud
  GRAB_ACTOR = 28,
  GRAB_ROAD = 20;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const nodes = (w: World) => [...w.actors, ...w.junctions];
const ends = (r: Route, n: number) => r.a === n || r.b === n;

export function degrees(w: World): Map<number, number> {
  const deg = new Map<number, number>();
  for (const r of w.routes) for (const n of [r.a, r.b]) deg.set(n, (deg.get(n) ?? 0) + 1);
  return deg;
}

// --- plus courts chemins -------------------------------------------------------------------------------------------

/** Cache par état du réseau : toute modification remplace le tableau `w.routes`. */
const cache = new WeakMap<Route[], Map<number, Map<number, number>>>();

/** Distance par la route de chaque nœud jusqu'à `to` (absent = pas relié). */
export function distancesTo(w: World, to: number): Map<number, number> {
  let byDest = cache.get(w.routes);
  if (!byDest) cache.set(w.routes, (byDest = new Map()));
  let d = byDest.get(to);
  if (d) return d;
  d = new Map([[to, 0]]);
  const todo = new Set([to]);
  while (todo.size) {
    // ponytail: Dijkstra sans tas, le réseau compte quelques dizaines de tronçons
    let n = -1;
    for (const m of todo) if (n < 0 || d.get(m)! < d.get(n)!) n = m;
    todo.delete(n);
    for (const r of w.routes) {
      if (!ends(r, n)) continue;
      const m = r.a === n ? r.b : r.a,
        v = d.get(n)! + r.length;
      if (v < (d.get(m) ?? Infinity)) {
        d.set(m, v);
        todo.add(m);
      }
    }
  }
  byDest.set(to, d);
  return d;
}

/** Tronçon à prendre depuis le nœud `from` pour aller vers `to` ; null s'ils ne sont pas reliés. */
export function leave(w: World, from: number, to: number): Pick<Truck, 'road' | 'd' | 'dir'> | null {
  const d = distancesTo(w, to);
  let best: Route | null = null,
    bd = Infinity;
  for (const r of w.routes) {
    if (!ends(r, from)) continue;
    const v = r.length + (d.get(r.a === from ? r.b : r.a) ?? Infinity);
    if (v < bd) [best, bd] = [r, v];
  }
  if (!best) return null;
  return best.a === from ? { road: best.id, d: 0, dir: 1 } : { road: best.id, d: best.length, dir: -1 };
}

// --- modifications -------------------------------------------------------------------------------------------------

/** Coupe le tronçon à la distance d et renvoie l'id du nouvel embranchement. */
function split(w: World, r: Route, d: number): number {
  const j = { id: w.nextId++, ...pointAt(r.points, d) };
  w.junctions.push(j);
  const first: Route = { id: w.nextId++, a: r.a, b: j.id, points: slice(r.points, 0, d), length: d };
  const second: Route = { id: w.nextId++, a: j.id, b: r.b, points: slice(r.points, d, r.length), length: r.length - d };
  for (const t of w.trucks)
    if (t.road === r.id) {
      const after = t.d > d;
      t.road = after ? second.id : first.id;
      if (after) t.d -= d;
    }
  w.routes = [...w.routes.filter(x => x !== r), first, second];
  return j.id;
}

/** Nœud situé en p : bâtiment ou embranchement proche, sinon coupure de la route qui y passe. */
function nodeAt(w: World, p: Pt): number {
  const near = nodes(w).find(n => dist(n, p) < SNAP);
  if (near) return near.id;
  for (const r of w.routes) {
    const q = project(p, r.points);
    if (q.dist < 3) return split(w, r, q.d);
  }
  const j = { id: w.nextId++, x: p.x, y: p.y };
  w.junctions.push(j);
  return j.id;
}

/** Ajoute un tracé neuf : il se raccorde à ses bouts et partout où il croise une route. */
export function addPiece(w: World, points: Pt[]): void {
  const length = routeLength(points);
  const cuts = w.routes
    .flatMap(r => meet(points, r.points).points)
    .filter(p => p.da > SNAP && p.da < length - SNAP)
    .sort((m, n) => m.da - n.da);
  const stops = [{ ...points[0], da: 0 }, ...cuts, { ...points[points.length - 1], da: length }].map(s => ({
    d: s.da,
    node: nodeAt(w, s),
  }));
  for (let i = 1; i < stops.length; i++) {
    const from = stops[i - 1],
      to = stops[i];
    if (from.node === to.node) continue;
    const part = slice(points, from.d, to.d),
      at = (id: number) => {
        const n = nodes(w).find(x => x.id === id)!;
        return { x: n.x, y: n.y };
      };
    part[0] = at(from.node);
    part[part.length - 1] = at(to.node);
    w.routes = [...w.routes, { id: w.nextId++, a: from.node, b: to.node, points: part, length: routeLength(part) }];
  }
}

/** Un bâtiment posé sur une route (ou sur un embranchement) y est raccordé, et se cale dessus. */
export function connect(w: World, a: Actor): void {
  let node = w.junctions.find(j => dist(j, a) < GRAB_ACTOR)?.id;
  if (node === undefined) {
    const hit = w.routes.map(r => ({ r, q: project(a, r.points) })).sort((m, n) => m.q.dist - n.q.dist)[0];
    if (!hit || hit.q.dist >= GRAB_ACTOR) return;
    node = split(w, hit.r, hit.q.d);
  }
  const j = w.junctions.find(x => x.id === node)!;
  a.x = j.x;
  a.y = j.y;
  w.junctions = w.junctions.filter(x => x !== j);
  w.routes = w.routes.map(r => ({ ...r, a: r.a === node ? a.id : r.a, b: r.b === node ? a.id : r.b }));
}

/** Supprime un tronçon ; les camions qui y roulaient sont perdus. */
export function removeRoad(w: World, id: number): void {
  for (const t of w.trucks) if (t.road === id) w.log.push({ t: w.time, ev: 'leak' });
  w.trucks = w.trucks.filter(t => t.road !== id);
  w.routes = w.routes.filter(r => r.id !== id);
}

/** Recolle les deux tronçons d'un embranchement qui n'en est plus un. */
function merge(w: World, j: number, r: Route, s: Route): void {
  const x = r.a === j ? r.b : r.a,
    y = s.a === j ? s.b : s.a;
  const head = r.b === j ? r.points : [...r.points].reverse(),
    tail = s.a === j ? s.points : [...s.points].reverse();
  const joined: Route = {
    id: w.nextId++,
    a: x,
    b: y,
    points: [...head, ...tail.slice(1)],
    length: r.length + s.length,
  };
  for (const t of w.trucks) {
    if (t.road !== r.id && t.road !== s.id) continue;
    const first = t.road === r.id,
      same = first ? r.b === j : s.a === j,
      len = first ? r.length : s.length;
    t.d = (first ? 0 : r.length) + (same ? t.d : len - t.d);
    if (!same) t.dir = t.dir === 1 ? -1 : 1;
    t.road = joined.id;
  }
  w.routes = [...w.routes.filter(q => q !== r && q !== s), joined];
  w.junctions = w.junctions.filter(q => q.id !== j);
}

/** Retire les impasses et les embranchements devenus inutiles. */
export function cleanup(w: World): void {
  for (let again = true; again;) {
    again = false;
    for (const j of w.junctions) {
      const on = w.routes.filter(r => ends(r, j.id));
      if (on.length >= 3) continue;
      if (on.length === 2) {
        const other = (r: Route) => (r.a === j.id ? r.b : r.a);
        if (other(on[0]) === other(on[1])) continue; // boucle : on la laisse
        merge(w, j.id, on[0], on[1]);
      } else {
        if (on.length) removeRoad(w, on[0].id);
        w.junctions = w.junctions.filter(q => q !== j);
      }
      again = true;
      break;
    }
  }
}

// --- devis et choix du tracé ---------------------------------------------------------------------------------------

/** Point d'accroche sous le doigt : un bâtiment, un embranchement ou un point d'une route. */
export function resolve(w: World, p: Pt): Pt | null {
  const closest = (list: Pt[], max: number) =>
    list.filter(n => dist(n, p) <= max).sort((m, n) => dist(m, p) - dist(n, p))[0];
  const n = closest(w.actors, GRAB_ACTOR) ?? closest(w.junctions, GRAB_ROAD);
  if (n) return { x: n.x, y: n.y };
  const q = w.routes.map(r => project(p, r.points)).sort((m, n) => m.dist - n.dist)[0];
  return q && q.dist <= GRAB_ROAD ? { x: q.x, y: q.y } : null;
}

/** Position sur le réseau : sur un tronçon, à `d` de son bout `a`. */
type Spot = Pt & { road: Route; d: number };

function spotsOf(w: World, p: Pt): Spot[] {
  return w.routes
    .map(road => ({ road, ...project(p, road.points) }))
    .filter(s => s.dist < 1)
    .map(s => ({ road: s.road, x: s.x, y: s.y, d: s.d }));
}

/** Trajet existant le plus court entre deux positions du réseau : longueur et tracé (pour l'aperçu). */
function ride(w: World, p: Spot, q: Spot): { length: number; path: Pt[][] } | null {
  const part = (r: Route, d0: number, d1: number) => slice(r.points, Math.min(d0, d1), Math.max(d0, d1));
  let best =
    p.road === q.road
      ? { length: Math.abs(p.d - q.d), path: [part(p.road, p.d, q.d)] }
      : (null as null | { length: number; path: Pt[][] });
  const pEnds = [
      { n: p.road.a, at: 0 },
      { n: p.road.b, at: p.road.length },
    ],
    qEnds = [
      { n: q.road.a, at: 0 },
      { n: q.road.b, at: q.road.length },
    ];
  for (const s of pEnds)
    for (const e of qEnds) {
      const d = distancesTo(w, e.n);
      if (!d.has(s.n)) continue;
      const length = Math.abs(p.d - s.at) + d.get(s.n)! + Math.abs(q.d - e.at);
      if (best && best.length <= length) continue;
      const path = [part(p.road, p.d, s.at), part(q.road, q.d, e.at)];
      for (let n = s.n, i = 0; n !== e.n && i < w.routes.length; i++) {
        const step = leave(w, n, e.n)!,
          r = w.routes.find(x => x.id === step.road)!;
        path.push(r.points);
        n = r.a === n ? r.b : r.a;
      }
      best = { length, path };
    }
  return best;
}

type Piece = { points: Pt[]; cost: number; water: number; crossings: Pt[] };

/** Devis d'un tracé neuf ; null s'il se superpose à une route existante. */
function quote(w: World, points: Pt[]): Piece | null {
  const length = routeLength(points),
    crossings: Pt[] = [];
  for (const r of w.routes) {
    const m = meet(points, r.points);
    if (m.overlap) return null;
    for (const p of m.points)
      if (p.da > SNAP && p.da < length - SNAP && !crossings.some(c => dist(c, p) < SNAP)) crossings.push(p);
  }
  let water = 0;
  for (let d = 2; d < length; d += 4) if (inWater(w.map, pointAt(points, d))) water += 4;
  const cost = length * ROUTE_COST_PER_PX + water * BRIDGE_COST_PER_PX + crossings.length * CROSS_COST;
  return { points, cost, water, crossings };
}

/** Le moins cher des deux coudes possibles entre a et b (rien à bâtir s'ils sont confondus). */
function link(w: World, a: Pt, b: Pt): Piece[] | null {
  if (dist(a, b) < SNAP) return [];
  const both = [snap45(a, b), snap45(b, a).reverse()]
    .map(points => quote(w, points))
    .filter(p => p !== null)
    .sort((m, n) => m.cost - n.cost);
  return both.length ? [both[0]] : null;
}

export type Plan = {
  /** Tronçons neufs à construire. */
  pieces: Pt[][];
  /** Routes existantes empruntées entre eux (aperçu). */
  reused: Pt[][];
  cost: number;
  water: number;
  crossings: Pt[];
  error: string | null;
};

/**
 * Relie deux points au moindre coût : soit un tracé direct, soit deux courts raccords vers des routes existantes,
 * tant que le détour reste raisonnable.
 */
export function planRoute(w: World, from: Pt, to: Pt): Plan {
  const none = (error: string): Plan => ({ pieces: [], reused: [], cost: 0, water: 0, crossings: [], error });
  const a = resolve(w, from),
    b = resolve(w, to);
  if (!a || !b) return none('Une route part d’un bâtiment ou d’une route, et y arrive');
  if (dist(a, b) < SNAP) return none('Trop court');
  const direct = routeLength(snap45(a, b));

  // accroches possibles de chaque côté : le point lui-même s'il est déjà sur une route, sinon le plus près de chacune
  const hooks = (p: Pt) => {
    const own = spotsOf(w, p);
    if (own.length) return own.slice(0, 1).map(spot => ({ spot, pieces: [] as Piece[] }));
    return w.routes.flatMap(road => {
      let { x, y, d } = project(p, road.points);
      if (d < SNAP) ({ x, y, d } = { ...road.points[0], d: 0 });
      if (road.length - d < SNAP) ({ x, y, d } = { ...road.points[road.points.length - 1], d: road.length });
      const pieces = link(w, p, { x, y });
      return pieces ? [{ spot: { road, x, y, d }, pieces }] : [];
    });
  };

  const options: { pieces: Piece[]; reused: Pt[][]; score: number }[] = [];
  const straight = link(w, a, b);
  if (straight) options.push({ pieces: straight, reused: [], score: straight[0].cost });
  const ends = hooks(b);
  for (const h of hooks(a))
    for (const k of ends) {
      const trip = ride(w, h.spot, k.spot);
      if (!trip) continue;
      const pieces = [...h.pieces, ...k.pieces.map(p => ({ ...p, points: [...p.points].reverse() }))];
      if (pieces.length === 2 && meet(pieces[0].points, pieces[1].points).overlap) continue;
      const total = trip.length + pieces.reduce((s, p) => s + routeLength(p.points), 0);
      if (total > direct * MAX_DETOUR + 40) continue;
      const score = pieces.reduce((s, p) => s + p.cost, 0) + trip.length * ROUTE_COST_PER_PX * REUSE_WEIGHT;
      options.push({ pieces, reused: trip.path, score: pieces.length ? score : -1 });
    }
  const best = options.sort((m, n) => m.score - n.score)[0];
  if (!best) return none('Deux routes ne peuvent pas se superposer');
  if (!best.pieces.length) return { ...none('Déjà reliés par la route'), reused: best.reused };
  return {
    pieces: best.pieces.map(p => p.points),
    reused: best.reused,
    cost: best.pieces.reduce((s, p) => s + p.cost, 0),
    water: best.pieces.reduce((s, p) => s + p.water, 0),
    crossings: best.pieces.flatMap(p => p.crossings),
    error: null,
  };
}
