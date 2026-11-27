import { describe, expect, it } from 'vitest';
import { DEMOLISH_REFUND, ACTOR_DEFS } from '../../src/sim/defs';
import { applyCommand, createWorld, planRoute } from '../../src/sim/world';
import { place, link } from '../helpers';

const rich = (map: 'plaine' | 'riviere' = 'plaine') => Object.assign(createWorld(1, map), { budget: 1000 });

const at = (x: number, y: number) => ({ x, y });

describe('eau', () => {
  it('interdit de construire dessus et renchérit les ponts', () => {
    const w = rich('riviere');
    expect(applyCommand(w, { type: 'place', kind: 'tri', x: 640, y: 300 })).toBe(false);
    place(w, 'tri', 500, 300);
    place(w, 'tri', 800, 300);
    const plan = planRoute(w, at(500, 300), at(800, 300));
    expect(plan.water).toBeGreaterThanOrEqual(96);
    expect(plan.cost).toBeGreaterThan(50);
  });
});

describe('démolition', () => {
  it('retire le bâtiment et ses routes, rembourse une partie ; pas les quartiers', () => {
    const w = rich();
    const q = place(w, 'quartier', 100, 100),
      t = place(w, 'tri', 300, 100);
    link(w, q, t);
    const before = w.budget;
    expect(applyCommand(w, { type: 'demolish', id: q })).toBe(false);
    expect(applyCommand(w, { type: 'demolish', id: t })).toBe(true);
    expect(w.actors.map(a => a.id)).toEqual([q]);
    expect(w.routes).toEqual([]);
    expect(w.budget).toBeCloseTo(before + ACTOR_DEFS.tri.cost * DEMOLISH_REFUND);
  });
});
