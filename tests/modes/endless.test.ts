import { describe, it, expect } from 'vitest';
import { createEndless, SLOTS, FIRST_QUARTIER } from '../../src/modes/endless';
import { DT } from '../../src/sim/defs';

const quartiers = (e: ReturnType<typeof createEndless>) => e.world.actors.filter(a => a.kind === 'quartier').length;
// Garde le monde en vie : le débordement est testé ailleurs.
function advance(e: ReturnType<typeof createEndless>, s: number, each?: () => void) {
  for (let i = 0; i < Math.round(s / DT); i++) { e.step([]); each?.(); e.world.over = null; for (const a of e.world.actors) a.queue = []; e.world.budget = 1e6; }
}

describe('directeur mode A', () => {
  it('démarre avec un quartier et plastique/verre', () => {
    const e = createEndless(1);
    expect(e.world.actors.map(a => [a.kind, a.x, a.y])).toEqual([['quartier', FIRST_QUARTIER.x, FIRST_QUARTIER.y]]);
    expect(e.world.activeRes).toEqual(['plastique', 'verre']);
  });
  it('à 61 s un second quartier existe', () => {
    const e = createEndless(1); advance(e, 61);
    expect(quartiers(e)).toBe(2);
  });
  it('à 121 s metal est actif', () => {
    const e = createEndless(1); advance(e, 121);
    expect(e.world.activeRes).toContain('metal');
  });
  it('contamination plafonnée à 0.4, émission x1.2', () => {
    const e = createEndless(1); let max = 0;
    advance(e, 61 * 4 * 9, () => { max = Math.max(max, e.world.contamination); });
    expect(max).toBeLessThanOrEqual(0.4 + 1e-9);
    expect(max).toBeCloseTo(0.4);
  });
  it('slots valides', () => {
    const all = [FIRST_QUARTIER, ...SLOTS];
    for (const p of all) { expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(1280); expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(720); }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)).toBeGreaterThanOrEqual(60);
  });
  it('pannes : aucune avant 300 s, au moins une après 360 s', () => {
    const e = createEndless(3);
    // un acteur non-quartier pour qu'une panne soit possible
    e.step([{ type: 'place', kind: 'tri', x: 640, y: 360 }]);
    let early = false, late = false;
    advance(e, 365, () => {
      const off = e.world.actors.some(a => a.offlineUntil > 0);
      if (e.world.time < 300 && off) early = true;
      if (e.world.time > 360 && off) late = true;
    });
    expect(early).toBe(false);
    expect(late).toBe(true);
  });
});
