import { FABRICATE_REVENUE } from '../../src/sim/defs';
import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { accepts, processActor } from '../../src/sim/actors';
import { step } from '../../src/sim/step';
import { run, place, link } from '../helpers';
import type { Packet, Res, World } from '../../src/sim/types';

let id = 5000;
const pk = (o: Partial<Packet> = {}, res: Res = 'plastique'): Packet => ({
  id: id++,
  res,
  kind: 'dechet',
  dirty: false,
  reusable: false,
  repaired: false,
  ...o,
});
const get = (w: World, i: number) => w.actors.find(a => a.id === i)!;
const quiet = (seed = 1) => {
  const w = createWorld(seed);
  w.emitRate = 0;
  w.budget = 1e6;
  return w;
};

/** Tri niveau `level`, 1 route juste + 1 mauvaise (verre) : les erreurs atterrissent sur la mauvaise (fuite). */
function errors(level: number, n = 1000) {
  const w = quiet(42);
  const t = place(w, 'tri', 0, 0);
  get(w, t).level = level;
  const good = place(w, 'recycleur', 100, 0, 'plastique');
  const bad = place(w, 'recycleur', 170, 0, 'verre');
  link(w, t, good);
  link(w, t, bad);
  for (const x of w.routes) x.length = 0;
  for (let i = 0; i < n; i++) {
    get(w, t).out.push(pk());
    step(w, []);
    get(w, good).queue = [];
  }
  return w.log.filter(l => l.ev === 'leak').length; // atterrissage sur un recycleur qui refuse
}

describe('tri', () => {
  it('niveau 1 : 80 à 120 erreurs sur 1000', () => {
    const e = errors(1);
    expect(e).toBeGreaterThanOrEqual(80);
    expect(e).toBeLessThanOrEqual(120);
  });
  it("niveau 3 : moins d'erreurs qu'au niveau 1, et < 70", () => {
    const e3 = errors(3);
    expect(e3).toBeLessThan(errors(1));
    expect(e3).toBeLessThan(70);
  });
  it('paquet propre + seule route vers une décharge : marqué coincé, puis jeté (fuite) sans rien envoyer', () => {
    const w = quiet();
    const t = place(w, 'tri', 0, 0),
      d = place(w, 'decharge', 100, 0);
    link(w, t, d);
    get(w, t).out.push(pk());
    run(w, 4);
    expect(get(w, t).out[0].stuck).toBeGreaterThan(3);
    expect(w.routes[0].transit).toHaveLength(0);
    run(w, 6);
    expect(get(w, t).out).toHaveLength(0);
    expect(w.log.filter(l => l.ev === 'leak')).toHaveLength(1);
    expect(w.routes[0].transit).toHaveLength(0);
  });
  it('un paquet coincé en tête ne bloque pas les suivants', () => {
    const w = quiet();
    const t = place(w, 'tri', 0, 0),
      r = place(w, 'recycleur', 100, 0, 'plastique');
    link(w, t, r);
    get(w, t).out.push(pk({}, 'verre'), pk({}, 'plastique'));
    run(w, 3);
    const rq = get(w, r);
    expect([...rq.queue, ...rq.out].length).toBe(1); // le plastique est passé (recyclé ou en file)
    expect(get(w, t).out.map(p => p.res)).toEqual(['verre']);
  });
  it('sans aucune route, rien n’est jeté', () => {
    const w = quiet();
    const t = place(w, 'tri', 0, 0);
    get(w, t).out.push(pk());
    run(w, 20);
    expect(get(w, t).out).toHaveLength(1);
  });
  it('une seule route : le tri ne peut pas se tromper', () => {
    const w = quiet(7);
    const t = place(w, 'tri', 0, 0),
      r = place(w, 'recycleur', 100, 0, 'plastique');
    link(w, t, r);
    for (let i = 0; i < 200; i++) {
      get(w, t).out.push(pk());
      step(w, []);
      get(w, r).queue = [];
    }
    expect(w.log.filter(l => l.ev === 'leak')).toHaveLength(0);
  });
  it('paquet sale + route vers recycleur seul : jamais envoyé, reste en attente', () => {
    const w = quiet();
    const t = place(w, 'tri', 0, 0),
      r = place(w, 'recycleur', 100, 0, 'plastique');
    link(w, t, r);
    get(w, t).queue.push(pk({ dirty: true }));
    run(w, 6);
    expect(get(w, t).out).toHaveLength(1);
    expect(w.routes[0].transit).toHaveLength(0);
  });
  it('paquet sale va à la décharge', () => {
    const w = quiet();
    const t = place(w, 'tri', 0, 0),
      r = place(w, 'recycleur', 100, 0, 'plastique'),
      d = place(w, 'decharge', 0, 100);
    link(w, t, r);
    link(w, t, d);
    get(w, t).out.push(pk({ dirty: true }));
    step(w, []);
    expect(w.routes[1].transit).toHaveLength(1);
  });
});

describe('fabricant / réparateur / collecteur', () => {
  it('fabricant : 5 matières ⇒ 5 objets, 5 × FABRICATE_REVENUE', () => {
    const w = quiet();
    const f = get(w, place(w, 'fabricant', 0, 0));
    const b0 = w.budget;
    f.queue.push(...[1, 2, 3, 4, 5].map(() => pk({ kind: 'matiere' }, 'verre')));
    run(w, 20);
    expect(w.budget - b0).toBeCloseTo(5 * FABRICATE_REVENUE - 0.3 * 20, 1); // gain moins entretien
    expect(f.out.filter(p => p.kind === 'objet' && !p.repaired && p.res === 'verre')).toHaveLength(5);
  });
  it('réparateur : refuse le non réutilisable, répare le réutilisable', () => {
    const w = quiet();
    const r = get(w, place(w, 'reparateur', 0, 0));
    expect(accepts(r, pk())).toBe(false);
    r.queue.push(pk({ reusable: true }));
    run(w, 10);
    expect(r.out).toMatchObject([{ kind: 'objet', repaired: true, dirty: false }]);
    expect(w.log.filter(l => l.ev === 'repair')).toHaveLength(1);
  });
  it('collecteur : relais', () => {
    const w = quiet();
    const c = get(w, place(w, 'collecteur', 0, 0));
    c.queue.push(pk(), pk({ dirty: true }));
    run(w, 5);
    expect(c.out).toHaveLength(2);
  });
  it('débit ×2 au niveau 3', () => {
    const count = (level: number) => {
      const w = quiet();
      const a = get(w, place(w, 'collecteur', 0, 0));
      a.level = level;
      a.queue.push(...Array.from({ length: 6 }, () => pk()));
      for (let i = 0; i < 20; i++) processActor(w, a); // 1 s
      return a.out.length;
    };
    expect(count(1)).toBe(2);
    expect(count(3)).toBe(4);
  });
});

describe('dispatch', () => {
  function two() {
    const w = quiet();
    const s = place(w, 'collecteur', 0, 0),
      a = place(w, 'decharge', 100, 0),
      b = place(w, 'decharge', 0, 100);
    return { w, s, ra: link(w, s, a), rb: link(w, s, b), src: get(w, s) };
  }
  it("priorité : la route prioritaire est utilisée d'abord", () => {
    const { w, ra, rb, src } = two();
    w.routes.find(r => r.id === rb)!.priority = 1;
    src.out.push(pk(), pk());
    step(w, []);
    expect(w.routes.find(r => r.id === rb)!.transit).toHaveLength(2);
    expect(w.routes.find(r => r.id === ra)!.transit).toHaveLength(0);
  });
  it('round-robin à priorité égale', () => {
    const { w, ra, rb, src } = two();
    const ps = [pk(), pk(), pk(), pk()];
    src.out.push(...ps);
    step(w, []);
    expect(w.routes.find(r => r.id === ra)!.transit.map(t => t.packet.id)).toEqual([ps[0].id, ps[2].id]);
    expect(w.routes.find(r => r.id === rb)!.transit.map(t => t.packet.id)).toEqual([ps[1].id, ps[3].id]);
  });
  it('capacité : 4 par route (tri), collecteur 2 + (niveau − 1)', () => {
    for (const [kind, level, cap] of [
      ['tri', 1, 4],
      ['collecteur', 1, 2],
      ['collecteur', 2, 3],
    ] as const) {
      const w = quiet();
      const s = place(w, kind, 0, 0),
        d = place(w, 'collecteur', 1000, 0);
      get(w, s).level = level;
      link(w, s, d);
      get(w, s).out.push(...Array.from({ length: 8 }, () => pk()));
      step(w, []);
      expect(w.routes[0].transit).toHaveLength(cap);
    }
  });
  it('attend en bout de route quand la file destinataire est pleine', () => {
    const w = quiet();
    const s = place(w, 'collecteur', 0, 0),
      t = place(w, 'tri', 100, 0);
    link(w, s, t);
    const dest = get(w, t);
    dest.queue.push(...Array.from({ length: 10 }, () => pk()));
    get(w, s).out.push(pk());
    dest.out.push(...Array.from({ length: 10 }, () => pk())); // le tri ne consomme plus : file pleine
    run(w, 5);
    expect(w.routes[0].transit).toHaveLength(1);
    expect(w.routes[0].transit[0].d).toBe(w.routes[0].length);
  });
});
