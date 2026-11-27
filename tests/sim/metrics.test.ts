import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { circularityCounts, circularityIndex, moneyPerMinute } from '../../src/sim/metrics';
import { run, place } from '../helpers';
import type { World } from '../../src/sim/types';

const logN = (w: World, ev: 'emit' | 'recycle' | 'repair', n: number, t: number) => {
  for (let i = 0; i < n; i++) w.log.push({ t, ev });
};

describe('metrics', () => {
  it('indice = (recycle + repair) / emit', () => {
    const w = createWorld(1);
    w.time = 30;
    logN(w, 'emit', 10, 10);
    logN(w, 'recycle', 4, 10);
    logN(w, 'repair', 1, 10);
    expect(circularityIndex(w)).toBe(0.5);
  });
  it('ignore les entrées de plus de 60 s', () => {
    const w = createWorld(1);
    w.time = 61;
    logN(w, 'emit', 10, 0);
    logN(w, 'recycle', 10, 0);
    logN(w, 'emit', 2, 50);
    logN(w, 'recycle', 1, 50);
    expect(circularityIndex(w)).toBe(0.5);
  });
  it('borné à 100 % quand la fenêtre compte plus de recyclages que d’émissions', () => {
    const w = createWorld(1);
    w.time = 30;
    logN(w, 'emit', 2, 10);
    logN(w, 'recycle', 3, 10);
    expect(circularityIndex(w)).toBe(1);
  });
  it('0 sans émission', () => {
    const w = createWorld(1);
    logN(w, 'recycle', 3, 0);
    expect(circularityIndex(w)).toBe(0);
  });
  it('circularityCounts : ce que l’indice compte, émis et recyclés ou réparés', () => {
    const w = createWorld(1);
    w.time = 30;
    logN(w, 'emit', 10, 10);
    logN(w, 'recycle', 4, 10);
    logN(w, 'repair', 1, 10);
    expect(circularityCounts(w)).toEqual({ emit: 10, back: 5 });
  });
  it('moneyPerMinute : gains et décharge sur la fenêtre, entretien au rythme actuel, total net', () => {
    const w = createWorld(1);
    place(w, 'tri', 0, 0); // entretien 0,5 €/s
    w.time = 60;
    w.cash.push(
      { t: 30, id: 1, kind: 'recycleur', v: 3 },
      { t: 40, id: 1, kind: 'recycleur', v: 3 },
      { t: 45, id: 2, kind: 'fabricant', v: 1.5 },
      { t: 50, id: 3, kind: 'decharge', v: -0.5 },
      { t: 0, id: 1, kind: 'recycleur', v: 3 }, // hors fenêtre
    );
    expect(moneyPerMinute(w)).toEqual({ recycle: 6, fabricate: 1.5, upkeep: -30, dump: -0.5, net: -23 });
    w.time = 20; // début de partie : extrapolé sur la minute
    w.cash = [{ t: 10, id: 1, kind: 'recycleur', v: 3 }];
    expect(moneyPerMinute(w).recycle).toBe(9);
  });
  it('step élague le log de plus de 60 s', () => {
    const w = createWorld(1);
    w.time = 100;
    logN(w, 'emit', 3, 10);
    run(w, 0.1);
    expect(w.log.length).toBe(0);
  });
});

describe('entretien et pannes', () => {
  it('un tri seul pendant 10 s coûte 5 €', () => {
    const w = createWorld(1);
    w.trucks = []; // isole l'entretien du tri
    place(w, 'tri', 0, 0);
    const b = w.budget;
    run(w, 10);
    expect(b - w.budget).toBeCloseTo(5, 1);
  });
  it('faillite quand le budget passe sous 0', () => {
    const w = createWorld(1);
    place(w, 'tri', 0, 0);
    w.budget = 0.1;
    run(w, 1);
    expect(w.over).toBe('faillite');
  });
  it('acteur hors service : pas d’entretien, rien traité', () => {
    const w = createWorld(1);
    w.trucks = [];
    const t = place(w, 'tri', 0, 0);
    const a = w.actors.find(x => x.id === t)!;
    a.offlineUntil = 100;
    a.queue.push({
      id: 99,
      res: 'verre',
      kind: 'dechet',
      dirty: false,
      sorted: false,
      reusable: false,
      repaired: false,
    });
    const b = w.budget;
    run(w, 5);
    expect(w.budget).toBe(b);
    expect(a.queue.length).toBe(1);
    expect(a.out.length).toBe(0);
  });
  it('quartier hors service n’émet rien', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 0, 0);
    w.actors.find(x => x.id === q)!.offlineUntil = 100;
    run(w, 10);
    expect(w.log.filter(l => l.ev === 'emit').length).toBe(0);
  });
});
