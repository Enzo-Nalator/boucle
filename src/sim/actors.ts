import { ACTOR_DEFS, DT, DUMP_COST, RECYCLE_REVENUE, FABRICATE_REVENUE } from './defs';
import type { Actor, Packet, World } from './types';

/** Ce qu'un acteur accepte d'un camion. La décharge ne prend que des déchets (jamais matière ni objets). */
export function accepts(a: Actor, p: Packet): boolean {
  switch (a.kind) {
    case 'quartier':
      return p.kind === 'objet';
    case 'tri':
      return p.kind === 'dechet' && !p.sorted;
    case 'recycleur':
      return p.kind === 'dechet' && p.sorted && !p.dirty && p.res === a.res;
    case 'fabricant':
      return p.kind === 'matiere';
    case 'reparateur':
      return p.kind === 'dechet' && p.reusable;
    case 'decharge':
      return p.kind === 'dechet';
    case 'garage':
      return false;
  }
}

function pay(w: World, a: Actor, v: number) {
  w.budget += v;
  w.cash.push({ t: w.time, id: a.id, kind: a.kind, v });
}

/** Traite a.queue au débit de l'acteur : un paquet par unité de crédit. */
export function processActor(w: World, a: Actor): void {
  if (a.kind === 'quartier') return;
  const cap = ACTOR_DEFS[a.kind].capacity;
  a.credit += ACTOR_DEFS[a.kind].rate * (1 + 0.5 * (a.level - 1)) * DT;
  while (a.credit >= 1 - 1e-9 && a.queue.length && a.out.length < cap) {
    a.credit -= 1;
    const p = a.queue.shift()!;
    const made = (kind: Packet['kind'], repaired = false) =>
      a.out.push({ id: w.nextId++, res: p.res, kind, dirty: false, sorted: false, reusable: false, repaired });
    if (a.kind === 'decharge') {
      pay(w, a, -DUMP_COST);
      w.log.push({ t: w.time, ev: 'leak' });
    } else if (a.kind === 'recycleur') {
      pay(w, a, RECYCLE_REVENUE);
      w.log.push({ t: w.time, ev: 'recycle' });
      made('matiere');
    } else if (a.kind === 'fabricant') {
      pay(w, a, FABRICATE_REVENUE);
      made('objet');
    } else if (a.kind === 'reparateur') {
      w.log.push({ t: w.time, ev: 'repair' });
      made('objet', true);
    } else {
      a.out.push({ ...p, sorted: true }); // tri : un contaminé trié n'ira qu'à la décharge
    }
  }
  if (a.credit > 1) a.credit = 1; // pas de crédit accumulé à vide
}
