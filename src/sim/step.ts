import { ACTOR_DEFS, DT, ROUTE_SPEED } from './defs';
import { accepts, processActor } from './actors';
import { nextRandom } from './rng';
import { applyCommand } from './world';
import type { Actor, Command, Route, World } from './types';

const ROUTE_CAPACITY = 4, OVERFLOW_LIMIT = 5, EPS = 1e-9;

function emit(w: World, a: Actor) {
  a.credit += w.emitRate * DT;
  while (a.credit >= 1 - EPS) {
    a.credit -= 1;
    const res = w.activeRes[Math.floor(nextRandom(w) * w.activeRes.length)];
    const dirty = nextRandom(w) < w.contamination;
    const reusable = nextRandom(w) < 0.3;
    a.queue.push({ id: w.nextId++, res, kind: 'dechet', dirty, reusable, repaired: false });
    w.log.push({ t: w.time, ev: 'emit' });
  }
}

function routeCapacity(w: World, r: Route): number {
  const from = w.actors.find(a => a.id === r.from)!;
  return from.kind === 'collecteur' ? 2 + (from.level - 1) : ROUTE_CAPACITY;
}

/** Envoie les paquets en attente (quartier : queue ; autres : out) ; blocage en tête si aucune route valide. */
function dispatch(w: World, a: Actor) {
  const src = a.kind === 'quartier' ? a.queue : a.out;
  const outs = w.routes.filter(r => r.from === a.id);
  while (src.length) {
    const p = src[0];
    const ok = outs.filter(r => accepts(w.actors.find(x => x.id === r.to)!, p) && r.transit.length < routeCapacity(w, r));
    if (!ok.length) return;
    const top = Math.max(...ok.map(r => r.priority));
    const group = ok.filter(r => r.priority === top);
    const r = group[a.rr % group.length];
    a.rr++;
    r.transit.push({ packet: src.shift()!, d: 0 });
  }
}

function advance(w: World, r: Route) {
  const dest = w.actors.find(a => a.id === r.to)!;
  const cap = ACTOR_DEFS[dest.kind].capacity;
  r.transit = r.transit.filter(t => {
    t.d = Math.min(t.d + ROUTE_SPEED * DT, r.length);
    if (t.d < r.length) return true;
    if (!accepts(dest, t.packet)) { w.log.push({ t: w.time, ev: 'leak' }); return false; }
    if (dest.kind === 'quartier') {
      const p = t.packet;
      dest.returns.push({ at: w.time + (p.repaired ? 120 : 60), packet: { ...p, id: w.nextId++, kind: 'dechet', dirty: false, reusable: true, repaired: false } });
      return false;
    }
    if (dest.queue.length >= cap) return true; // attend en bout de route
    dest.queue.push(t.packet);
    return false;
  });
}

export function step(w: World, commands: Command[]): void {
  if (w.over) return;
  for (const c of commands) applyCommand(w, c);
  for (const a of w.actors) {
    if (a.kind !== 'quartier') continue;
    emit(w, a);
    const due = a.returns.filter(x => x.at <= w.time);
    a.returns = a.returns.filter(x => x.at > w.time);
    for (const x of due) a.queue.push({ ...x.packet, kind: 'dechet' });
  }
  for (const a of w.actors) processActor(w, a);
  for (const a of w.actors) dispatch(w, a);
  for (const r of w.routes) advance(w, r);
  for (const a of w.actors) {
    if (a.kind !== 'quartier') continue;
    a.overflowT = a.queue.length >= ACTOR_DEFS.quartier.capacity ? a.overflowT + DT : 0;
    if (a.overflowT > OVERFLOW_LIMIT) w.over = 'debordement';
  }
  // Task 6 : entretien, faillite, métriques
  w.time += DT;
}
