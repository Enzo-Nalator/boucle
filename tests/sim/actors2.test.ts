import { FABRICATE_REVENUE } from '../../src/sim/defs';
import { describe, it, expect } from 'vitest';
import { applyCommand, createWorld, planRoute } from '../../src/sim/world';
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
const trucksTo = (w: World, to: number) => w.trucks.filter(t => t.to === to);
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
  const bad = place(w, 'recycleur', 0, 100, 'verre');
  link(w, t, good);
  link(w, t, bad);
  let leaks = 0;
  for (let i = 0; i < n; i++) {
    get(w, t).out.push(pk());
    step(w, []);
    w.trucks.forEach(x => (x.d = x.dir === 1 ? 1e4 : 0)); // arrivée immédiate
    step(w, []);
    get(w, good).queue = [];
    get(w, bad).queue = [];
    w.trucks = [];
    leaks += w.log.filter(l => l.ev === 'leak').length; // atterrissage sur un recycleur qui refuse
    w.log = [];
  }
  return leaks;
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
    expect(w.trucks).toHaveLength(0);
    run(w, 6);
    expect(get(w, t).out).toHaveLength(0);
    expect(w.log.filter(l => l.ev === 'leak')).toHaveLength(1);
    expect(w.trucks).toHaveLength(0);
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
    expect(w.trucks).toHaveLength(0);
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
    expect(trucksTo(w, d)).toHaveLength(1);
  });
});

describe('fabricant / réparateur', () => {
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
  it('débit ×2 au niveau 3', () => {
    const count = (level: number) => {
      const w = quiet();
      const a = get(w, place(w, 'tri', 0, 0));
      a.level = level;
      a.queue.push(...Array.from({ length: 6 }, () => pk()));
      for (let i = 0; i < 40; i++) processActor(w, a); // 2 s
      return a.out.length;
    };
    expect(count(1)).toBe(2);
    expect(count(3)).toBe(4);
  });
});

describe('réseau', () => {
  const recyclers = () => {
    const w = quiet();
    const q = place(w, 'quartier', 100, 100),
      a = place(w, 'recycleur', 500, 100, 'plastique'),
      b = place(w, 'recycleur', 100, 500, 'plastique');
    link(w, q, a);
    link(w, q, b);
    return { w, q, a, b, src: get(w, q) };
  };
  it('priorité : le bâtiment prioritaire est servi d’abord', () => {
    const { w, b, src } = recyclers();
    get(w, b).priority = 1;
    src.queue.push(pk(), pk());
    step(w, []);
    expect(trucksTo(w, b)).toHaveLength(2);
  });
  it('à égalité, les paquets se répartissent', () => {
    const { w, a, b, src } = recyclers();
    src.queue.push(pk(), pk(), pk(), pk());
    step(w, []);
    expect([trucksTo(w, a).length, trucksTo(w, b).length]).toEqual([2, 2]);
  });
  it('les camions roulent dans les deux sens et passent par les embranchements', () => {
    const w = quiet();
    const f = place(w, 'fabricant', 100, 100),
      r = place(w, 'recycleur', 500, 100, 'plastique');
    link(w, f, r); // tracée depuis le fabricant, empruntée depuis le recycleur
    const q = place(w, 'quartier', 300, 300);
    applyCommand(w, { type: 'route', from: { x: 300, y: 300 }, to: { x: 300, y: 100 } });
    expect(w.junctions).toHaveLength(1);
    expect(w.routes).toHaveLength(3);
    get(w, r).out.push(pk({ kind: 'matiere' }));
    get(w, q).queue.push(pk());
    run(w, 12);
    expect(w.log.filter(l => l.ev === 'recycle')).toHaveLength(1);
    expect(w.cash.some(c => c.id === f)).toBe(true);
  });
  it('un nouveau tracé se branche sur la route voisine au lieu de la doubler', () => {
    const w = quiet();
    const a = place(w, 'tri', 100, 100),
      b = place(w, 'recycleur', 700, 100, 'plastique');
    link(w, a, b);
    place(w, 'decharge', 600, 180);
    const plan = planRoute(w, { x: 100, y: 100 }, { x: 600, y: 180 });
    expect(plan.reused.length).toBeGreaterThan(0);
    expect(plan.cost).toBeLessThan(10); // contre plus de 25 € en direct
  });
  it('supprimer un tronçon retire aussi l’impasse qui en reste', () => {
    const w = quiet();
    const a = place(w, 'tri', 100, 100),
      b = place(w, 'recycleur', 700, 100, 'plastique'),
      d = place(w, 'decharge', 400, 300);
    link(w, a, b);
    applyCommand(w, { type: 'route', from: { x: 400, y: 300 }, to: { x: 400, y: 100 } });
    const stub = w.routes.find(r => r.a === d || r.b === d)!;
    applyCommand(w, { type: 'removeRoute', id: stub.id });
    expect(w.routes).toHaveLength(1);
    expect(w.junctions).toEqual([]);
  });
  it('camions plafonnés entre un même départ et une même arrivée', () => {
    const w = quiet();
    const f = place(w, 'recycleur', 0, 0, 'verre'),
      d = place(w, 'fabricant', 1000, 0);
    link(w, f, d);
    get(w, d).level = 1;
    get(w, f).out.push(...Array.from({ length: 12 }, () => pk({ kind: 'matiere' })));
    step(w, []);
    expect(w.trucks).toHaveLength(8);
  });
  it('attend en bout de route quand la file destinataire est pleine', () => {
    const w = quiet();
    const s = place(w, 'recycleur', 0, 0, 'verre'),
      f = place(w, 'fabricant', 100, 0);
    link(w, s, f);
    get(w, s).out.push(pk({ kind: 'matiere' }));
    step(w, []);
    const dest = get(w, f);
    dest.queue.push(...Array.from({ length: 8 }, () => pk({ kind: 'matiere' })));
    dest.out.push(...Array.from({ length: 8 }, () => pk({ kind: 'objet' }))); // le fabricant ne consomme plus
    run(w, 5);
    expect(w.trucks).toHaveLength(1);
    expect(w.trucks[0].d).toBe(w.routes[0].length);
  });
});
