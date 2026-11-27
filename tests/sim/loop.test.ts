import { describe, expect, it } from 'vitest';
import { createEndless, type Endless } from '../../src/modes/endless';
import { DT, DWELL, ROAD_COST, TRUCK } from '../../src/sim/defs';
import { accepts } from '../../src/sim/actors';
import { LOOP } from '../../src/sim/grid';
import { circularityIndex } from '../../src/sim/metrics';
import { connected, roadPlan } from '../../src/sim/roads';
import { applyCommand, createWorld } from '../../src/sim/world';
import type { Packet, World } from '../../src/sim/types';
import { place, road, run } from '../helpers';

const pk = (p: Partial<Packet>): Packet => ({
  id: 0,
  res: 'plastique',
  kind: 'dechet',
  dirty: false,
  sorted: false,
  reusable: false,
  repaired: false,
  ...p,
});

/** Réseau de référence autour d'un quartier en (1,3) : tout est collé à la boucle, sauf le fabricant, relié par une route. */
function goodNetwork(w: World): void {
  place(w, 'tri', 3, 0);
  place(w, 'recycleur', 7, 0, 'plastique');
  place(w, 'recycleur', 9, 0, 'verre');
  place(w, 'fabricant', 8, 3);
  road(w, { c: 8, r: 3 }, { c: 8, r: 1 });
  place(w, 'decharge', 12, 6);
}

describe('grille, boucle et routes', () => {
  it('LOOP : 30 cases distinctes, chacune voisine de la suivante, boucle fermée', () => {
    expect(LOOP).toHaveLength(30);
    expect(new Set(LOOP.map(x => `${x.c},${x.r}`)).size).toBe(30);
    for (let i = 0; i < LOOP.length; i++) {
      const a = LOOP[i],
        b = LOOP[(i + 1) % LOOP.length];
      expect(Math.abs(a.c - b.c) + Math.abs(a.r - b.r)).toBe(1);
    }
  });

  it('place : refuse hors grille, sur une route, sur une case prise ou hors budget ; ne construit aucune route', () => {
    const w = createWorld(1);
    expect(applyCommand(w, { type: 'place', kind: 'tri', c: -1, r: 0 })).toBe(false);
    expect(applyCommand(w, { type: 'place', kind: 'tri', c: 16, r: 0 })).toBe(false);
    expect(applyCommand(w, { type: 'place', kind: 'tri', c: 0.5, r: 0 })).toBe(false);
    expect(applyCommand(w, { type: 'place', kind: 'tri', c: 2, r: 1 })).toBe(false); // boucle
    expect(applyCommand(w, { type: 'place', kind: 'tri', c: 5, r: 3 })).toBe(true);
    expect(applyCommand(w, { type: 'place', kind: 'decharge', c: 5, r: 3 })).toBe(false);
    expect(w.roads).toEqual([]);
    road(w, { c: 5, r: 3 }, { c: 5, r: 1 });
    expect(applyCommand(w, { type: 'place', kind: 'decharge', c: 5, r: 2 })).toBe(false); // route construite
    w.budget = 1;
    expect(applyCommand(w, { type: 'place', kind: 'tri', c: 0, r: 0 })).toBe(false);
    expect(w.actors).toHaveLength(1);
  });

  it('route : en L d’un bâtiment ou d’une route à l’autre, par le coude libre le moins cher, payée à la case', () => {
    const w = createWorld(1),
      b = w.budget;
    place(w, 'tri', 5, 3);
    place(w, 'decharge', 6, 3);
    // coude par (5,1) : barré par le tri ; coude par (6,1) : une seule case neuve
    road(w, { c: 6, r: 3 }, { c: 5, r: 1 });
    expect(w.roads).toEqual([{ c: 6, r: 2 }]);
    expect(w.budget).toBe(b - 40 - 25 - ROAD_COST);
    expect(applyCommand(w, { type: 'road', from: { c: 6, r: 3 }, to: { c: 6, r: 1 } })).toBe(false); // rien à bâtir
    // déjà relié par un coude : l'autre n'est pas construit pour rien
    expect(roadPlan(w, { c: 6, r: 3 }, { c: 5, r: 1 }).error).toBe('Déjà relié par la route');
    expect(roadPlan(w, { c: 0, r: 0 }, { c: 2, r: 1 }).error).toBe(
      'Une route part d’un bâtiment ou d’une route, et y arrive',
    );
    expect(applyCommand(w, { type: 'road', from: { c: 0, r: 0 }, to: { c: 2, r: 1 } })).toBe(false); // départ dans le vide
    place(w, 'recycleur', 9, 3, 'plastique');
    expect(applyCommand(w, { type: 'road', from: { c: 5, r: 3 }, to: { c: 9, r: 3 } })).toBe(false); // décharge en travers
    expect(roadPlan(w, { c: 5, r: 3 }, { c: 9, r: 3 })).toMatchObject({
      error: 'Un bâtiment est en travers',
      cells: [],
    });
  });

  it('retirer une route : seulement une route construite ; les camions qui devaient y passer sont perdus', () => {
    const w = createWorld(1);
    place(w, 'quartier', 1, 3);
    place(w, 'tri', 5, 3);
    road(w, { c: 5, r: 3 }, { c: 5, r: 1 });
    run(w, 6);
    const ahead = (t: (typeof w.trucks)[number]) => t.path.slice(Math.ceil(t.d)).some(x => x.c === 5 && x.r === 2);
    const via = w.trucks.filter(ahead).length;
    expect(via).toBeGreaterThan(0);
    expect(applyCommand(w, { type: 'removeRoad', c: 5, r: 1 })).toBe(false); // la boucle reste
    expect(applyCommand(w, { type: 'removeRoad', c: 5, r: 2 })).toBe(true);
    expect(w.trucks.some(ahead)).toBe(false);
    expect(w.log.filter(l => l.ev === 'leak')).toHaveLength(via);
    expect(connected(w, w.actors[1])).toBe(false);
  });
});

describe('règles d’acceptation', () => {
  it('recycleur : seulement trié, propre et de sa matière ; décharge : seulement des déchets', () => {
    const w = createWorld(1);
    place(w, 'recycleur', 0, 0, 'verre');
    place(w, 'decharge', 0, 2);
    const [rec, dech] = w.actors;
    expect(accepts(rec, pk({ res: 'verre', sorted: true }))).toBe(true);
    expect(accepts(rec, pk({ res: 'verre' }))).toBe(false);
    expect(accepts(rec, pk({ res: 'verre', sorted: true, dirty: true }))).toBe(false);
    expect(accepts(rec, pk({ sorted: true }))).toBe(false);
    expect(accepts(dech, pk({ dirty: true }))).toBe(true);
    expect(accepts(dech, pk({ kind: 'matiere' }))).toBe(false);
    expect(accepts(dech, pk({ kind: 'objet' }))).toBe(false);
  });
});

describe('camions automatiques', () => {
  it('sans route, un quartier déborde avant 60 s', () => {
    const w = createWorld(1);
    place(w, 'quartier', 0, 3);
    place(w, 'tri', 3, 0);
    run(w, 59);
    expect(w.over).toBe('debordement');
  });

  it('collés à la boucle, quartier et tri sont raccordés : les déchets partent seuls au tri', () => {
    const w = createWorld(1);
    place(w, 'quartier', 1, 3);
    place(w, 'tri', 3, 0);
    run(w, 30);
    const tri = w.actors[1];
    expect(tri.queue.length + tri.out.length).toBeGreaterThan(0);
    expect(tri.out.every(p => p.sorted)).toBe(true);
  });

  it('double sens : le camion prend le plus court chemin, même à rebours de l’ancien sens de la boucle', () => {
    const w = createWorld(1);
    place(w, 'quartier', 1, 3);
    place(w, 'tri', 1, 5);
    while (!w.trucks.length) run(w, DT);
    expect(w.trucks.length).toBeGreaterThan(0);
    expect(w.trucks[0].path).toEqual([
      { c: 1, r: 3 },
      { c: 2, r: 3 },
      { c: 2, r: 4 },
      { c: 2, r: 5 },
      { c: 1, r: 5 },
    ]);
  });

  it('équité : le quartier le plus plein envoie d’abord, même loin du tri', () => {
    const w = createWorld(1);
    place(w, 'quartier', 1, 3); // tout près du tri
    const far = place(w, 'quartier', 14, 6); // loin du tri
    road(w, { c: 14, r: 6 }, { c: 13, r: 5 });
    place(w, 'tri', 3, 0);
    const near = w.actors[0],
      tri = w.actors[2];
    tri.queue = Array.from({ length: 9 }, (_, i) => pk({ id: 300 + i })); // une seule place libre
    near.queue = Array.from({ length: 2 }, (_, i) => pk({ id: 400 + i }));
    w.actors[1].queue = Array.from({ length: 5 }, (_, i) => pk({ id: 500 + i }));
    run(w, DWELL + DT);
    expect(w.trucks.map(t => t.from)).toEqual([far]);
  });

  it('préférences : le tri avant la décharge, même plus loin ; la décharge ne prend que le reste', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 1, 3),
      t = place(w, 'tri', 3, 0);
    place(w, 'decharge', 1, 4); // collée au quartier
    place(w, 'recycleur', 7, 0, 'plastique');
    let fromQ = new Set<number>();
    for (let i = 0; i < Math.round(60 / DT); i++) {
      run(w, DT);
      for (const x of w.trucks) if (x.from === q) fromQ.add(x.to);
    }
    expect([...fromQ]).toEqual([t]);
    expect(w.log.some(l => l.ev === 'recycle')).toBe(true);
    expect(w.log.some(l => l.ev === 'leak')).toBe(true); // verre et déchets sales
  });

  it('un paquet reste un moment visible dans le bâtiment avant de partir, puis le camion roule sans attendre', () => {
    const w = createWorld(1);
    place(w, 'quartier', 1, 3);
    place(w, 'tri', 3, 0);
    const q = w.actors[0];
    while (!q.queue.length) run(w, DT);
    run(w, DWELL - 0.1);
    expect([q.queue.length, w.trucks.length]).toEqual([1, 0]);
    run(w, 0.2);
    expect([q.queue.length, w.trucks.length]).toEqual([0, 1]);
    const t = w.trucks[0],
      d = t.d;
    run(w, DT);
    expect(t.d).toBeGreaterThan(d);
  });

  it(`un camion par paquet, jamais plus de ${TRUCK.perLink} en route entre deux mêmes bâtiments`, () => {
    const w = createWorld(1);
    place(w, 'quartier', 1, 3);
    place(w, 'tri', 3, 0);
    w.actors[0].queue = Array.from({ length: 12 }, (_, i) => pk({ id: 100 + i }));
    run(w, DWELL + DT);
    expect(w.trucks).toHaveLength(TRUCK.perLink);
    expect(w.actors[0].queue.length).toBe(12 - TRUCK.perLink);
  });

  it('boucle complète : recycle, fabrique et rend des objets ; indice dans ]0, 1]', () => {
    const w = createWorld(7);
    w.budget = 1e6;
    place(w, 'quartier', 1, 3);
    goodNetwork(w);
    let returned = 0;
    for (let s = 0; s < 150; s++) {
      run(w, 1);
      returned = Math.max(returned, w.actors[0].returns.length);
    }
    expect(returned).toBeGreaterThan(0);
    const i = circularityIndex(w);
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThanOrEqual(1);
  });

  it('déterministe : même graine, mêmes commandes ⇒ même monde', () => {
    const make = () => {
      const w = createWorld(42);
      place(w, 'quartier', 1, 3);
      goodNetwork(w);
      run(w, 60);
      return w;
    };
    expect(make()).toEqual(make());
  });
});

/**
 * Bot : complète la base (recycleur verre collé à la boucle), construit la route de chaque nouveau quartier vers la
 * boucle, et améliore les bâtiments engorgés.
 */
function play(e: Endless, seconds: number): void {
  const w = e.world;
  place(w, 'recycleur', 9, 0, 'verre');
  for (let i = 0; i < Math.round(seconds / DT) && !w.over; i++) {
    if (i % 20 === 0)
      for (const q of w.actors.filter(a => a.kind === 'quartier' && !connected(w, a))) {
        const near = [...LOOP].sort(
          (a, b) => Math.abs(a.c - q.c) + Math.abs(a.r - q.r) - Math.abs(b.c - q.c) - Math.abs(b.r - q.r),
        )[0];
        applyCommand(w, { type: 'road', from: q, to: near });
      }
    if (i % 20 === 0)
      for (const a of w.actors)
        if (a.kind !== 'quartier' && a.queue.length >= 5) applyCommand(w, { type: 'upgrade', id: a.id });
    e.step([]);
  }
}

describe('scénario mode infini', () => {
  it('la base complétée d’un recycleur, avec une route par nouveau quartier, tient 180 s', () => {
    for (const seed of [1, 2, 3]) {
      const e = createEndless(seed);
      play(e, 180);
      expect([seed, e.world.over]).toEqual([seed, null]);
    }
  });
});
