import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { circularityIndex } from '../../src/sim/metrics';
import { run, place, link } from '../helpers';
import type { World } from '../../src/sim/types';

const logN = (w: World, ev: 'emit' | 'recycle' | 'repair', n: number, t: number) => {
  for (let i = 0; i < n; i++) w.log.push({ t, ev });
};

describe('metrics', () => {
  it('indice = (recycle + repair) / emit', () => {
    const w = createWorld(1);
    w.time = 30;
    logN(w, 'emit', 10, 10); logN(w, 'recycle', 4, 10); logN(w, 'repair', 1, 10);
    expect(circularityIndex(w)).toBe(0.5);
  });
  it('ignore les entrées de plus de 60 s', () => {
    const w = createWorld(1);
    w.time = 61;
    logN(w, 'emit', 10, 0); logN(w, 'recycle', 10, 0);
    logN(w, 'emit', 2, 50); logN(w, 'recycle', 1, 50);
    expect(circularityIndex(w)).toBe(0.5);
  });
  it('0 sans émission', () => {
    const w = createWorld(1);
    logN(w, 'recycle', 3, 0);
    expect(circularityIndex(w)).toBe(0);
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
    const t = place(w, 'tri', 0, 0);
    const a = w.actors.find(x => x.id === t)!;
    a.offlineUntil = 100;
    a.queue.push({ id: 99, res: 'verre', kind: 'dechet', dirty: false, reusable: false, repaired: false });
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
  it('hors service : ne dispatche pas', () => {
    const w = createWorld(1);
    const t = place(w, 'tri', 0, 0), d = place(w, 'decharge', 100, 0);
    link(w, t, d);
    const a = w.actors.find(x => x.id === t)!;
    a.offlineUntil = 100;
    a.out.push({ id: 99, res: 'verre', kind: 'dechet', dirty: true, reusable: false, repaired: false });
    run(w, 2);
    expect(a.out.length).toBe(1);
  });
});
