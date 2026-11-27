import { ACTOR_DEFS, DT, DWELL, GARAGE, TRUCK } from './defs';
import { accepts, processActor } from './actors';
import { connected, paths, route } from './roads';
import { inWindow } from './metrics';
import { nextRandom } from './rng';
import { applyCommand } from './world';
import type { Actor, ActorKind, Cell, Command, Packet, World } from './types';

const OVERFLOW_LIMIT = 5,
  LOAD_CELLS = 2, // un paquet d'avance chez un destinataire « vaut » 2 cases de trajet en plus
  EPS = 1e-9;

function emit(w: World, a: Actor) {
  a.credit += w.emitRate * DT;
  while (a.credit >= 1 - EPS) {
    a.credit -= 1;
    const res = w.activeRes[Math.floor(nextRandom(w) * w.activeRes.length)];
    const dirty = nextRandom(w) < w.contamination;
    const reusable = nextRandom(w) < 0.3;
    a.queue.push({ id: w.nextId++, res, kind: 'dechet', dirty, sorted: false, reusable, repaired: false });
    w.log.push({ t: w.time, ev: 'emit' });
  }
}

const hasRoom = (a: Actor) => a.kind === 'quartier' || a.queue.length < ACTOR_DEFS[a.kind].capacity;

function deliver(w: World, a: Actor, p: Packet) {
  if (a.kind !== 'quartier') return void a.queue.push(p);
  // un objet rendu au quartier redevient un déchet réutilisable à la fin de sa durée de vie
  a.returns.push({
    at: w.time + (p.repaired ? 120 : 60),
    packet: { ...p, id: w.nextId++, kind: 'dechet', dirty: false, sorted: false, reusable: true, repaired: false },
  });
}

/** Types de destinataires, du préféré au dernier recours (repris de la branche gameplay). */
function tiers(from: Actor, p: Packet): ActorKind[] {
  if (p.kind === 'matiere') return ['fabricant'];
  if (p.kind === 'objet') return ['quartier'];
  if (from.kind === 'quartier') return ['tri', 'reparateur', 'decharge'];
  return p.dirty ? ['decharge'] : ['reparateur', 'recycleur', 'decharge'];
}

/**
 * Où envoyer le paquet : parmi les bâtiments reliés par la route, le moins chargé et le plus proche du premier type
 * qui en veut. `'attendre'` : un preneur existe mais il est plein ; null : personne de relié n'en veut.
 */
function choose(w: World, from: Actor, p: Packet, prev: Map<number, Cell | null>) {
  for (const kind of tiers(from, p)) {
    let best: { to: Actor; path: Cell[] } | null = null,
      score = Infinity,
      seen = false;
    for (const x of w.actors) {
      if (x === from || x.kind !== kind || !accepts(x, p)) continue;
      const path = route(prev, from, x);
      if (!path) continue;
      seen = true;
      const inbound = w.trucks.filter(t => t.to === x.id),
        load = x.queue.length + inbound.reduce((n, t) => n + t.load.length, 0);
      if (inbound.filter(t => t.from === from.id).length >= TRUCK.perLink) continue;
      if (x.kind !== 'quartier' && load >= ACTOR_DEFS[x.kind].capacity) continue;
      const s = load * LOAD_CELLS + path.length;
      if (s < score) [best, score] = [{ to: x, path }, s];
    }
    if (best) return best;
    if (seen && kind !== 'reparateur') return 'attendre'; // un réparateur plein laisse passer au choix suivant
  }
  return null;
}

/** Meilleur niveau parmi les garages en service reliés à la route ; 0 sans garage. */
export function garageLevel(w: World): number {
  const gs = w.actors.filter(a => a.kind === 'garage' && a.offlineUntil <= w.time && connected(w, a));
  return Math.max(0, ...gs.map(a => a.level));
}

/**
 * Envoie les paquets prêts (quartier : file ; autres : sortie) en camion ; ce qui n'a pas de preneur attend. Avec un
 * garage, un camion emporte aussi les autres paquets prêts qui vont au même endroit, jusqu'à sa capacité.
 */
function dispatch(w: World, a: Actor, cap: number) {
  const src = a.kind === 'quartier' ? a.queue : a.out;
  if (a.kind === 'decharge' || !src.length) return;
  for (const p of src) p.ready ??= w.time + DWELL; // un paquet reste un moment visible dans le bâtiment
  const prev = paths(w, a),
    take = (p: Packet) => (p.ready! > w.time + EPS ? null : choose(w, a, p, prev));
  for (let i = 0; i < src.length;) {
    const c = take(src[i]);
    if (!c || c === 'attendre') {
      i++;
      continue;
    }
    const t = { load: src.splice(i, 1), from: a.id, to: c.to.id, path: c.path, d: 0 };
    w.trucks.push(t);
    for (let j = i; j < src.length && t.load.length < cap;) {
      const d = take(src[j]);
      if (d && d !== 'attendre' && d.to === c.to) t.load.push(...src.splice(j, 1));
      else j++;
    }
    for (const p of t.load) delete p.ready;
  }
}

/** Avance les camions ; arrivé, un camion livre ce qui entre, et attend devant avec le reste si le destinataire est plein. */
function drive(w: World, speed: number) {
  w.trucks = w.trucks.filter(t => {
    const end = t.path.length - 1;
    t.d = Math.min(end, t.d + speed * DT);
    if (t.d < end) return true;
    const dest = w.actors.find(a => a.id === t.to)!;
    while (t.load.length && hasRoom(dest)) deliver(w, dest, t.load.shift()!);
    return t.load.length > 0;
  });
}

export function step(w: World, commands: Command[]): void {
  if (w.over) return;
  for (const c of commands) applyCommand(w, c);
  const on = (a: Actor) => a.offlineUntil <= w.time;
  for (const a of w.actors) {
    if (a.kind !== 'quartier' || !on(a)) continue;
    emit(w, a);
    const due = a.returns.filter(x => x.at <= w.time);
    a.returns = a.returns.filter(x => x.at > w.time);
    for (const x of due) {
      a.queue.push(x.packet);
      // il remplace un déchet neuf (repris de gameplay) : sinon une boucle qui marche gonfle jusqu'au débordement
      a.credit -= 1;
      w.log.push({ t: w.time, ev: 'emit' }); // un objet rendu est ré-émis : garde l'indice ≤ 100 %
    }
  }
  for (const a of w.actors) if (on(a)) processActor(w, a);
  const level = garageLevel(w),
    pending = (a: Actor) => (a.kind === 'quartier' ? a.queue : a.out).length;
  // les plus pleins envoient d'abord : un quartier loin du tri n'est plus affamé par un quartier proche
  for (const a of [...w.actors].sort((x, y) => pending(y) - pending(x)))
    if (on(a)) dispatch(w, a, 1 + GARAGE.load * level);
  drive(w, TRUCK.speed * (1 + GARAGE.speed * level));
  for (const a of w.actors) {
    if (a.kind !== 'quartier') continue;
    a.overflowT = a.queue.length >= ACTOR_DEFS.quartier.capacity ? a.overflowT + DT : 0;
    if (a.overflowT > OVERFLOW_LIMIT) w.over = 'debordement';
  }
  for (const a of w.actors) if (on(a)) w.budget -= ACTOR_DEFS[a.kind].upkeep * DT;
  if (w.budget < 0 && !w.over) w.over = 'faillite';
  w.log = w.log.filter(l => inWindow(w, l.t));
  w.cash = w.cash.filter(c => inWindow(w, c.t));
  w.time += DT;
}
