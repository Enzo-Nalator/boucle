import { START_BUDGET } from '../../src/sim/defs';
import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { nextRandom } from '../../src/sim/rng';

describe('world', () => {
  it('nextRandom est déterministe', () => {
    const a = createWorld(42),
      b = createWorld(42);
    expect([nextRandom(a), nextRandom(a)]).toEqual([nextRandom(b), nextRandom(b)]);
  });
  it('nextRandom reste dans [0,1)', () => {
    const w = createWorld(1);
    for (let i = 0; i < 1000; i++) {
      const r = nextRandom(w);
      expect(r >= 0 && r < 1).toBe(true);
    }
  });
  it('monde initial', () => {
    const w = createWorld(1);
    expect(w.budget).toBe(START_BUDGET);
    expect(w.actors).toEqual([]);
    expect(w.activeRes).toEqual(['plastique', 'verre']);
    expect(w.over).toBeNull();
  });
});
