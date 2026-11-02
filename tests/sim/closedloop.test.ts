import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { circularityIndex } from '../../src/sim/metrics';
import { run, place, link } from '../helpers';

describe('boucle fermée', () => {
  it('objets rendus au quartier : indice dans ]0, 1]', () => {
    const w = createWorld(7);
    w.budget = 1e6;
    w.contamination = 0.1;
    w.activeRes = ['plastique'];
    const q = place(w, 'quartier', 0, 0), t = place(w, 'tri', 100, 0), d = place(w, 'decharge', 100, 80);
    const r = place(w, 'recycleur', 200, 0, 'plastique'), f = place(w, 'fabricant', 300, 0);
    link(w, q, t); link(w, t, r); link(w, t, d); link(w, r, f); link(w, f, q);
    let returns = 0;
    for (let sec = 1; sec <= 200; sec++) {
      const before = w.actors[0].returns.length;
      run(w, 1);
      returns = Math.max(returns, w.actors[0].returns.length, before);
      if (sec % 25 === 0 && sec >= 75) {
        const i = circularityIndex(w);
        expect(i).toBeGreaterThan(0);
        expect(i).toBeLessThanOrEqual(1);
      }
    }
    expect(returns).toBeGreaterThan(0); // des objets sont bien revenus au quartier
  });
});
