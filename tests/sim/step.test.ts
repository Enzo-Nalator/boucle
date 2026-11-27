import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { run, place, link } from '../helpers';

describe('step', () => {
  it('un quartier seul émet ~0.5 paquet/s', () => {
    const w = createWorld(1);
    place(w, 'quartier', 0, 0);
    run(w, 10);
    const n = w.log.filter(l => l.ev === 'emit').length;
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThanOrEqual(6);
  });

  it('déterministe à graine égale', () => {
    const mk = () => {
      const w = createWorld(42);
      const q = place(w, 'quartier', 0, 0),
        d = place(w, 'decharge', 100, 0);
      link(w, q, d);
      run(w, 60);
      return JSON.stringify(w);
    };
    expect(mk()).toBe(mk());
  });

  it('quartier sans route ⇒ débordement', () => {
    const w = createWorld(1);
    place(w, 'quartier', 0, 0);
    run(w, 40);
    expect(w.over).toBe('debordement');
  });

  it('quartier → décharge reliés', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 0, 0),
      d = place(w, 'decharge', 100, 0);
    link(w, q, d);
    run(w, 30);
    expect(w.over).toBeNull();
    expect(w.log.filter(l => l.ev === 'leak').length).toBeGreaterThanOrEqual(10);
  });

  it('paquet vers un acteur qui ne l accepte pas ⇒ leak', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 0, 0),
      f = place(w, 'fabricant', 100, 0);
    const r = link(w, q, f);
    w.trucks.push({
      packet: { id: 99, res: 'verre', kind: 'dechet', dirty: false, reusable: false, repaired: false },
      from: q,
      to: f,
      road: r,
      d: 99,
      dir: 1,
    });
    expect(() => run(w, 1)).not.toThrow();
    expect(w.log.some(l => l.ev === 'leak')).toBe(true);
    expect(w.actors[1].queue.length).toBe(0);
  });
});
