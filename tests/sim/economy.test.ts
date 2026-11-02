import { describe, expect, it } from 'vitest';
import { FABRICATE_REVENUE, RECYCLE_REVENUE, START_BUDGET } from '../../src/sim/defs';

describe('économie', () => {
  it('une boucle simple est viable dès le départ', () => {
    // quartier → 2 recycleurs → fabricant → retour : ≈ 198 € d'achats (110 d'acteurs + 88 de routes)
    // + 0,9 €/s d'entretien avant le premier revenu : il faut une vraie marge sur le budget de départ.
    expect(START_BUDGET).toBe(260);
    expect(START_BUDGET - 198).toBeGreaterThanOrEqual(60);
  });
  it('un paquet recyclé et un objet fabriqué rapportent plus qu’avant (2 € et 1 €)', () => {
    expect(RECYCLE_REVENUE).toBe(3);
    expect(FABRICATE_REVENUE).toBe(1.5);
  });
});
