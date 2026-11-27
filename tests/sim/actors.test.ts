import { RECYCLE_REVENUE } from '../../src/sim/defs';
import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { processActor } from '../../src/sim/actors';
import { run, place, link } from '../helpers';
import type { Packet, Res } from '../../src/sim/types';

let id = 1000;
const pk = (dirty = false, res: Res = 'plastique'): Packet => ({
  id: id++,
  res,
  kind: 'dechet',
  dirty,
  reusable: false,
  repaired: false,
});

describe('actors', () => {
  it('recycleur : 5 propres ⇒ 5 × RECYCLE_REVENUE et 5 matières', () => {
    const w = createWorld(1);
    const r = place(w, 'recycleur', 0, 0, 'plastique');
    const a = w.actors.find(x => x.id === r)!;
    const b0 = w.budget;
    a.queue.push(...[0, 1, 2, 3, 4].map(() => pk()));
    run(w, 10);
    expect(w.budget - b0).toBeCloseTo(5 * RECYCLE_REVENUE - 0.3 * 10, 1); // gain moins entretien
    expect(a.out.filter(p => p.kind === 'matiere' && !p.dirty && p.res === 'plastique')).toHaveLength(5);
  });

  it('recycleur : 3 sales sur 5 ⇒ tout refusé', () => {
    const w = createWorld(1);
    const r = place(w, 'recycleur', 0, 0, 'plastique');
    const a = w.actors.find(x => x.id === r)!;
    const b0 = w.budget;
    a.queue.push(pk(true), pk(true), pk(true), pk(), pk());
    run(w, 10);
    expect(w.budget - b0).toBeCloseTo(-0.3 * 10, 1); // seulement l’entretien
    expect(a.out).toHaveLength(0);
    expect(w.log.filter(l => l.ev === 'leak').length).toBeGreaterThanOrEqual(3);
  });

  it('décharge : 4 paquets ⇒ −2 €', () => {
    const w = createWorld(1);
    const d = place(w, 'decharge', 0, 0);
    const a = w.actors.find(x => x.id === d)!;
    const b0 = w.budget;
    a.queue.push(pk(), pk(), pk(), pk());
    for (let i = 0; i < 20; i++) processActor(w, a);
    expect(w.budget - b0).toBe(-2);
    expect(a.queue).toHaveLength(0);
  });

  function objetToQuartier(repaired: boolean) {
    const w = createWorld(1);
    w.emitRate = 0;
    const f = place(w, 'fabricant', 0, 0),
      q = place(w, 'quartier', 100, 0);
    const rid = link(w, f, q);
    const qa = w.actors.find(x => x.id === q)!;
    w.trucks.push({
      packet: { id: id++, res: 'verre', kind: 'objet', dirty: false, reusable: false, repaired },
      from: f,
      to: q,
      road: rid,
      d: 100,
      dir: 1,
    });
    return { w, qa };
  }

  it('quartier : objet ⇒ déchet de retour après 60 s', () => {
    const { w, qa } = objetToQuartier(false);
    run(w, 59);
    expect(qa.queue).toHaveLength(0);
    run(w, 3);
    expect(qa.queue).toHaveLength(1);
    expect(qa.queue[0]).toMatchObject({ kind: 'dechet', res: 'verre', reusable: true, dirty: false });
  });

  it('quartier : objet réparé ⇒ retour à t ≥ 120 s', () => {
    const { w, qa } = objetToQuartier(true);
    run(w, 100);
    expect(qa.queue).toHaveLength(0);
    run(w, 25);
    expect(qa.queue).toHaveLength(1);
  });
});
