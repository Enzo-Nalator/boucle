import { ACTOR_DEFS, DT, RECYCLE_REVENUE, FABRICATE_REVENUE } from './defs';
import type { Actor, Packet, World } from './types';

export function accepts(a: Actor, p: Packet): boolean {
  switch (a.kind) {
    case 'recycleur':
      return p.kind === 'dechet' && p.res === a.res;
    case 'fabricant':
      return p.kind === 'matiere';
    case 'quartier':
      return p.kind === 'objet';
    case 'tri':
      return p.kind === 'dechet';
    case 'reparateur':
      return p.kind === 'dechet' && p.reusable;
    case 'decharge':
    case 'collecteur':
      return true;
  }
}

const WINDOW = 5,
  DIRTY_MAX = 0.2;

/** Traite a.queue au débit de l'acteur : un paquet par unité de crédit. */
export function processActor(w: World, a: Actor): void {
  if (a.kind === 'quartier') return;
  const cap = ACTOR_DEFS[a.kind].capacity;
  a.credit += ACTOR_DEFS[a.kind].rate * (1 + 0.5 * (a.level - 1)) * DT;
  while (a.credit >= 1 - 1e-9 && a.queue.length && a.out.length < cap) {
    a.credit -= 1;
    const p = a.queue.shift()!;
    if (a.kind === 'decharge') {
      w.budget -= 0.5;
      w.log.push({ t: w.time, ev: 'leak' });
    } else if (a.kind === 'recycleur') {
      a.window.push(p.dirty);
      if (a.window.length > WINDOW) a.window.shift();
      if (a.window.filter(Boolean).length / a.window.length > DIRTY_MAX) {
        w.log.push({ t: w.time, ev: 'leak' });
      } else {
        w.budget += RECYCLE_REVENUE;
        w.log.push({ t: w.time, ev: 'recycle' });
        a.out.push({ id: w.nextId++, res: p.res, kind: 'matiere', dirty: false, reusable: false, repaired: false });
      }
    } else if (a.kind === 'fabricant') {
      w.budget += FABRICATE_REVENUE;
      a.out.push({ id: w.nextId++, res: p.res, kind: 'objet', dirty: false, reusable: false, repaired: false });
    } else if (a.kind === 'reparateur') {
      w.log.push({ t: w.time, ev: 'repair' });
      a.out.push({ id: w.nextId++, res: p.res, kind: 'objet', dirty: false, reusable: false, repaired: true });
    } else {
      a.out.push(p); // tri, collecteur : la décision de route est dans dispatch
    }
  }
  if (a.credit > 1) a.credit = 1; // pas de crédit accumulé à vide
}
