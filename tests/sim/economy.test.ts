import { describe, expect, it } from 'vitest';
import { FABRICATE_REVENUE, RECYCLE_REVENUE, START_BUDGET } from '../../src/sim/defs';
import { moneyPerMinute } from '../../src/sim/metrics';
import { createWorld } from '../../src/sim/world';
import { place, run } from '../helpers';

describe('économie', () => {
  it('une boucle simple est viable dès le départ', () => {
    // quartier → 2 recycleurs → fabricant → retour : ≈ 198 € d'achats (110 d'acteurs + 88 de routes)
    // + 0,9 €/s d'entretien avant le premier revenu : il faut une vraie marge sur le budget de départ.
    expect(START_BUDGET).toBe(260);
    expect(START_BUDGET - 198).toBeGreaterThanOrEqual(60);
  });
  it('un paquet recyclé et un objet fabriqué rapportent assez pour financer l’expansion (4 € et 2 €)', () => {
    expect(RECYCLE_REVENUE).toBe(4);
    expect(FABRICATE_REVENUE).toBe(2);
  });
});

describe('montée en charge', () => {
  it('un objet rendu remplace un déchet neuf : le volume d’un quartier ne gonfle pas quand la boucle marche', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 160, 360);
    const object = {
      id: 999,
      res: 'verre' as const,
      kind: 'objet' as const,
      dirty: false,
      reusable: false,
      repaired: false,
    };
    w.actors.find(a => a.id === q)!.returns = Array.from({ length: 5 }, () => ({ at: 0, packet: object }));
    run(w, 20);
    // 0,5 déchet/s pendant 20 s = 10, retours compris
    expect(w.actors[0].queue.length).toBe(10);
  });
});

describe('d’où vient l’argent', () => {
  it('ventile les gains et l’entretien par minute', () => {
    const w = createWorld(1);
    const r = w.actors.length;
    place(w, 'recycleur', 160, 360, 'verre');
    w.actors[r].queue.push({ id: 999, res: 'verre', kind: 'dechet', dirty: false, reusable: false, repaired: false });
    run(w, 60);
    const m = moneyPerMinute(w);
    expect(m.recycle).toBeCloseTo(RECYCLE_REVENUE);
    expect(m.upkeep).toBeCloseTo(-18);
    expect(m.net).toBeCloseTo(RECYCLE_REVENUE - 18);
  });
});
