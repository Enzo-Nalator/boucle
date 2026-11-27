import { describe, expect, it } from 'vitest';
import { DT, DUMP_COST, DWELL, GARAGE, SELL_REFUND, TRUCK } from '../../src/sim/defs';
import { garageLevel } from '../../src/sim/step';
import { applyCommand, createWorld, MAX_LEVEL, RENOVATE_COST, UPGRADE_COST } from '../../src/sim/world';
import type { Packet } from '../../src/sim/types';
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

describe('règles des bâtiments', () => {
  it('décharge : 4 paquets ⇒ 4 × DUMP_COST et 4 pertes', () => {
    const w = createWorld(1);
    place(w, 'decharge', 0, 0);
    const b = w.budget;
    w.actors[0].queue = Array.from({ length: 4 }, (_, i) => pk({ id: i + 1 }));
    run(w, 1);
    expect(w.budget).toBeCloseTo(b - 4 * DUMP_COST);
    expect(w.log.filter(l => l.ev === 'leak')).toHaveLength(4);
  });

  it('quartier : un objet revient en déchet après 60 s, un objet réparé après 120 s', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 0, 3);
    const cell = { c: 0, r: 3 };
    for (const repaired of [false, true])
      w.trucks.push({ load: [pk({ kind: 'objet', repaired })], from: q, to: q, path: [cell, cell], d: 1 });
    run(w, DT);
    expect(w.actors[0].returns.map(x => x.at)).toEqual([60, 120]);
    expect(w.actors[0].returns.every(x => x.packet.kind === 'dechet' && x.packet.reusable)).toBe(true);
  });

  it('quartier : un objet rendu remplace un déchet neuf au lieu de s’y ajouter', () => {
    const make = (returns: number) => {
      const w = createWorld(1);
      place(w, 'quartier', 0, 3); // sans route : rien ne part
      for (let i = 0; i < returns; i++) w.actors[0].returns.push({ at: 0, packet: pk({ id: 100 + i }) });
      run(w, 10);
      return w.actors[0].queue.length;
    };
    expect(make(2)).toBe(make(0));
  });

  it('améliorer : coûte, refusé pour quartier et décharge, plafonné au niveau 3', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 0, 0),
      d = place(w, 'decharge', 0, 2),
      t = place(w, 'tri', 0, 4);
    expect(applyCommand(w, { type: 'upgrade', id: q })).toBe(false);
    expect(applyCommand(w, { type: 'upgrade', id: d })).toBe(false);
    const b = w.budget;
    while (applyCommand(w, { type: 'upgrade', id: t }));
    expect(w.actors[2].level).toBe(MAX_LEVEL);
    expect(w.budget).toBe(b - (MAX_LEVEL - 1) * UPGRADE_COST);
  });

  it('vendre : rend la moitié du prix, libère la case, perd le stock et les camions en route vers lui ; pas les quartiers', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 1, 3),
      t = place(w, 'tri', 3, 0);
    run(w, 3); // un camion part vers le tri
    expect(w.trucks.filter(x => x.to === t).length).toBeGreaterThan(0);
    const tri = w.actors[1];
    tri.out = [pk({ id: 900, sorted: true })];
    const b = w.budget,
      lost = tri.queue.length + tri.out.length + w.trucks.filter(x => x.to === t).length;
    expect(applyCommand(w, { type: 'sell', id: q })).toBe(false);
    expect(applyCommand(w, { type: 'sell', id: t })).toBe(true);
    expect(w.budget).toBe(b + 40 * SELL_REFUND);
    expect(w.actors.map(a => a.kind)).toEqual(['quartier']);
    expect(w.trucks.some(x => x.to === t)).toBe(false);
    expect(w.log.filter(l => l.ev === 'leak')).toHaveLength(lost);
    expect(applyCommand(w, { type: 'sell', id: t })).toBe(false);
    run(w, 1); // rien ne casse sans lui
    expect(applyCommand(w, { type: 'place', kind: 'decharge', c: 3, r: 0 })).toBe(true); // case libérée
  });

  it('garage : relié à la route, ses niveaux accélèrent les camions et les chargent davantage', () => {
    const w = createWorld(1);
    place(w, 'quartier', 1, 3);
    place(w, 'tri', 3, 0);
    w.budget = 1e6;
    const g = place(w, 'garage', 0, 0); // pas collé à une route : sans effet
    expect(garageLevel(w)).toBe(0);
    road(w, { c: 0, r: 0 }, { c: 2, r: 1 });
    expect(garageLevel(w)).toBe(1);
    applyCommand(w, { type: 'upgrade', id: g });
    applyCommand(w, { type: 'upgrade', id: g });
    expect(garageLevel(w)).toBe(3);
    // 6 déchets prêts d'un coup : 1 + 3 paquets par camion ⇒ 2 camions au lieu de 6
    w.actors[0].queue = Array.from({ length: 6 }, (_, i) => pk({ id: 100 + i }));
    run(w, DWELL + DT);
    expect(w.trucks.map(t => t.load.length)).toEqual([4, 2]);
    const t = w.trucks[0],
      d = t.d;
    run(w, DT);
    expect(t.d - d).toBeCloseTo(TRUCK.speed * (1 + 3 * GARAGE.speed) * DT);
  });

  it('rénover : vide la file et la sortie, compte les pertes, coûte', () => {
    const w = createWorld(1);
    place(w, 'tri', 0, 0);
    const t = w.actors[0],
      b = w.budget;
    t.queue = [pk({ id: 1 }), pk({ id: 2 })];
    t.out = [pk({ id: 3, sorted: true })];
    expect(applyCommand(w, { type: 'renovate', id: t.id })).toBe(true);
    expect([t.queue, t.out]).toEqual([[], []]);
    expect(w.log.filter(l => l.ev === 'leak')).toHaveLength(3);
    expect(w.budget).toBe(b - RENOVATE_COST);
  });

  it('retirer une route : un camion qui l’a déjà passée n’est pas perdu', () => {
    const w = createWorld(1);
    place(w, 'quartier', 1, 3);
    place(w, 'tri', 5, 3);
    road(w, { c: 5, r: 3 }, { c: 5, r: 1 });
    run(w, 3); // un camion part vers le tri
    const tri = w.actors[1];
    tri.queue = Array.from({ length: 10 }, (_, i) => pk({ id: 100 + i })); // tri bloqué : le camion attendra devant
    tri.out = Array.from({ length: 10 }, (_, i) => pk({ id: 200 + i, sorted: true }));
    run(w, 5);
    const waiting = w.trucks.filter(x => x.d === x.path.length - 1);
    expect(waiting.length).toBeGreaterThan(0);
    expect(applyCommand(w, { type: 'removeRoad', c: 5, r: 2 })).toBe(true);
    expect(w.trucks).toEqual(expect.arrayContaining(waiting));
  });
});
