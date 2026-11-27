import { ACTOR_DEFS, CROSS_RADIUS, CROSS_SLOW, DT, ROUTE_SPEED, TRUCKS_PER_LINK } from './defs';
import { accepts, processActor } from './actors';
import { inWindow } from './metrics';
import { degrees, distancesTo, leave } from './network';
import { nextRandom } from './rng';
import { applyCommand } from './world';
import type { Actor, ActorKind, Command, Packet, World } from './types';

const OVERFLOW_LIMIT = 5,
  STUCK_LIMIT = 8,
  LOAD_PX = 150, // un paquet d'avance chez un destinataire « vaut » 150 px de trajet en plus
  EPS = 1e-9;

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

/** Types de destinataires, du préféré au dernier recours. */
function tiers(from: Actor, p: Packet): ActorKind[] {
  if (p.kind === 'matiere') return ['fabricant'];
  if (p.kind === 'objet') return ['quartier'];
  if (from.kind === 'quartier') return ['tri', 'reparateur', 'recycleur', 'decharge'];
  return p.dirty ? ['decharge'] : ['reparateur', 'recycleur'];
}

/**
 * Où envoyer le paquet : le bâtiment le mieux placé du premier type atteignable par le réseau. `null` : personne
 * d'atteignable n'en veut ; `'attendre'` : il y a preneur, mais plus de place pour l'instant. Un réparateur plein
 * laisse passer au choix suivant.
 */
function choose(w: World, from: Actor, p: Packet): Actor | 'attendre' | null {
  let waiting = false;
  for (const kind of tiers(from, p)) {
    const reach = w.actors.filter(
      x => x !== from && x.kind === kind && accepts(x, p) && distancesTo(w, x.id).has(from.id),
    );
    if (!reach.length) continue;
    let best: Actor | null = null,
      score = Infinity;
    for (const x of reach) {
      let inbound = 0,
        link = 0;
      for (const t of w.trucks)
        if (t.to === x.id) {
          inbound++;
          if (t.from === from.id) link++;
        }
      const load = x.queue.length + inbound;
      if (link >= TRUCKS_PER_LINK || (x.kind !== 'quartier' && load >= ACTOR_DEFS[x.kind].capacity)) continue;
      const s = (load + x.returns.length) * LOAD_PX + distancesTo(w, x.id).get(from.id)! - x.priority * 1e6;
      if (s < score) [best, score] = [x, s];
    }
    if (best) return best;
    if (kind !== 'reparateur') return 'attendre';
    waiting = true;
  }
  return waiting ? 'attendre' : null;
}

/** Le centre de tri se trompe parfois : le paquet propre part chez un recycleur d'une autre matière. */
function missort(w: World, tri: Actor, p: Packet, to: Actor): Actor {
  if (tri.kind !== 'tri' || p.dirty || nextRandom(w) >= Math.max(0.01, 0.1 - 0.03 * (tri.level - 1))) return to;
  const wrong = w.actors.filter(x => x.kind === 'recycleur' && !accepts(x, p) && distancesTo(w, x.id).has(tri.id));
  return wrong.length ? wrong[Math.floor(nextRandom(w) * wrong.length)] : to;
}

/**
 * Envoie les paquets en attente (quartier : queue ; autres : out). Un paquet qui ne peut pas partir n'empêche pas les
 * suivants de passer. Hors quartier, un paquet dont personne d'atteignable ne veut pendant STUCK_LIMIT secondes est
 * jeté (fuite ; pas de fuite tant que l'acteur n'a aucune route) : un déchet mal aiguillé ne bloque jamais la chaîne.
 */
function dispatch(w: World, a: Actor) {
  if (a.kind === 'decharge') return;
  const src = a.kind === 'quartier' ? a.queue : a.out;
  const linked = w.routes.some(r => r.a === a.id || r.b === a.id);
  let i = 0;
  while (i < src.length) {
    const p = src[i],
      to = choose(w, a, p);
    if (to === null && a.kind !== 'quartier') {
      p.stuck = (p.stuck ?? 0) + DT;
      if (linked && p.stuck > STUCK_LIMIT) {
        src.splice(i, 1);
        w.log.push({ t: w.time, ev: 'leak' });
        continue;
      }
    }
    if (to === null || to === 'attendre') {
      i++;
      continue;
    }
    p.stuck = undefined;
    const dest = missort(w, a, p, to);
    src.splice(i, 1);
    w.trucks.push({ packet: p, from: a.id, to: dest.id, ...leave(w, a.id, dest.id)! });
  }
}

/** Fait rouler les camions ; à chaque nœud, ils prennent le plus court chemin vers leur destinataire. */
function advance(w: World) {
  const deg = degrees(w),
    busy = new Set(w.junctions.filter(j => (deg.get(j.id) ?? 0) >= 3).map(j => j.id)),
    roads = new Map(w.routes.map(r => [r.id, r]));
  w.trucks = w.trucks.filter(t => {
    const r = roads.get(t.road)!,
      slow = (busy.has(r.a) && t.d < CROSS_RADIUS) || (busy.has(r.b) && r.length - t.d < CROSS_RADIUS);
    t.d = Math.max(0, Math.min(r.length, t.d + t.dir * ROUTE_SPEED * (slow ? CROSS_SLOW : 1) * DT));
    if (t.dir === 1 ? t.d < r.length : t.d > 0) return true;
    const node = t.dir === 1 ? r.b : r.a;
    if (node !== t.to) {
      const next = leave(w, node, t.to);
      if (next) Object.assign(t, next);
      else w.log.push({ t: w.time, ev: 'leak' }); // la route a disparu devant lui
      return !!next;
    }
    const dest = w.actors.find(a => a.id === t.to)!;
    if (!accepts(dest, t.packet)) {
      w.log.push({ t: w.time, ev: 'leak' });
      return false;
    }
    if (dest.kind === 'quartier') {
      const p = t.packet;
      dest.returns.push({
        at: w.time + (p.repaired ? 120 : 60),
        packet: { ...p, id: w.nextId++, kind: 'dechet', dirty: false, reusable: true, repaired: false },
      });
      return false;
    }
    if (dest.queue.length >= ACTOR_DEFS[dest.kind].capacity) return true; // attend en bout de route
    dest.queue.push(t.packet);
    return false;
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
      a.queue.push({ ...x.packet, kind: 'dechet' });
      // il remplace un déchet neuf : sinon une boucle qui marche gonfle sans fin jusqu'au débordement
      a.credit -= 1;
      w.log.push({ t: w.time, ev: 'emit' }); // un objet rendu est ré-émis : garde l'indice ≤ 100 %
    }
  }
  for (const a of w.actors) if (on(a)) processActor(w, a);
  for (const a of w.actors) if (on(a)) dispatch(w, a);
  advance(w);
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
