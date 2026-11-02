import { describe, it, expect } from 'vitest';
import { createEndless, SLOTS, FIRST_QUARTIER } from '../../src/modes/endless';
import { DT } from '../../src/sim/defs';

const quartiers = (e: ReturnType<typeof createEndless>) => e.world.actors.filter(a => a.kind === 'quartier').length;
// Contourne VOLONTAIREMENT les règles de la sim (vide les files, remet over à null, budget illimité) :
// on ne teste ici que le calendrier du directeur, pas la survie.
function advance(e: ReturnType<typeof createEndless>, s: number, each?: () => void) {
  for (let i = 0; i < Math.round(s / DT); i++) { e.step([]); each?.(); e.world.over = null; for (const a of e.world.actors) a.queue = []; e.world.budget = 1e6; }
}
const advanceTo = (e: ReturnType<typeof createEndless>, t: number) => advance(e, t - e.world.time);

describe('directeur mode A', () => {
  it('démarre avec un quartier et plastique/verre', () => {
    const e = createEndless(1);
    expect(e.world.actors.map(a => [a.kind, a.x, a.y])).toEqual([['quartier', FIRST_QUARTIER.x, FIRST_QUARTIER.y]]);
    expect(e.world.activeRes).toEqual(['plastique', 'verre']);
  });
  it('ordre cyclique aux ticks 60/120/180/240', () => {
    const e = createEndless(1), w = e.world;
    advanceTo(e, 59);
    expect([quartiers(e), w.activeRes.length, w.contamination, w.emitRate]).toEqual([1, 2, 0.1, 0.5]);
    advanceTo(e, 61); // 1 : quartier, exactement SLOTS[0]
    expect(quartiers(e)).toBe(2);
    expect(w.actors[1]).toMatchObject({ kind: 'quartier', x: SLOTS[0].x, y: SLOTS[0].y });
    expect([w.activeRes.length, w.contamination, w.emitRate]).toEqual([2, 0.1, 0.5]);
    advanceTo(e, 121); // 2 : matière metal, pas bio
    expect(w.activeRes).toEqual(['plastique', 'verre', 'metal']);
    expect([quartiers(e), w.contamination, w.emitRate]).toEqual([2, 0.1, 0.5]);
    advanceTo(e, 179);
    expect(w.contamination).toBeCloseTo(0.1);
    advanceTo(e, 181); // 3 : contamination
    expect(w.contamination).toBeCloseTo(0.15);
    expect([quartiers(e), w.activeRes.length, w.emitRate]).toEqual([2, 3, 0.5]);
    advanceTo(e, 239);
    expect(w.emitRate).toBeCloseTo(0.5);
    advanceTo(e, 241); // 4 : émission
    expect(w.emitRate).toBeCloseTo(0.6);
    expect([quartiers(e), w.activeRes.length]).toEqual([2, 3]);
    expect(w.contamination).toBeCloseTo(0.15);
  });
  it('contamination plafonnée à 0.4', () => {
    const e = createEndless(1); let max = 0;
    advance(e, 61 * 4 * 9, () => { max = Math.max(max, e.world.contamination); });
    expect(max).toBeLessThanOrEqual(0.4 + 1e-9);
    expect(max).toBeCloseTo(0.4);
  });
  it('emplacements épuisés : un nouvel événement quartier ne fait rien', () => {
    const e = createEndless(1);
    advanceTo(e, 1261); // 6e événement quartier (tick 21)
    expect(quartiers(e)).toBe(1 + SLOTS.length);
    expect(() => advanceTo(e, 1501)).not.toThrow(); // 7e événement quartier
    expect(quartiers(e)).toBe(1 + SLOTS.length);
  });
  it('slot bloqué par un acteur : le quartier prend le slot libre suivant', () => {
    const e = createEndless(1);
    e.step([{ type: 'place', kind: 'collecteur', x: SLOTS[0].x, y: SLOTS[0].y }]);
    advanceTo(e, 61);
    expect(quartiers(e)).toBe(2);
    expect(e.world.actors.find(a => a.kind === 'quartier' && a.id !== 1)).toMatchObject({ x: SLOTS[1].x, y: SLOTS[1].y });
  });
  it('matières épuisées : un nouvel événement matière ne fait rien', () => {
    const e = createEndless(1);
    advanceTo(e, 601);
    expect(e.world.activeRes).toEqual(['plastique', 'verre', 'metal', 'bio', 'papier']);
    advanceTo(e, 841);
    expect(e.world.activeRes).toHaveLength(5);
  });
  it('slots valides', () => {
    const all = [FIRST_QUARTIER, ...SLOTS];
    for (const p of all) { expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(1280); expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(720); }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)).toBeGreaterThanOrEqual(60);
  });
  it('pannes : aucune avant 300 s, 10 s, jamais un quartier, au moins une après 360 s', () => {
    const e = createEndless(3), w = e.world;
    e.step([{ type: 'place', kind: 'tri', x: 640, y: 360 }]);
    const seen = new Map<number, number>();
    let early = false, late = false, count = 0;
    advance(e, 365, () => {
      for (const a of w.actors) {
        if (a.offlineUntil > 0 && seen.get(a.id) !== a.offlineUntil) { // panne qui vient d'être posée
          seen.set(a.id, a.offlineUntil);
          count++;
          expect(a.kind).not.toBe('quartier');
          expect(a.offlineUntil - w.time).toBeCloseTo(10);
          if (w.time < 300 - 1e-6) early = true;
        }
        if (a.offlineUntil > w.time && w.time > 360) late = true;
      }
    });
    expect(early).toBe(false);
    expect(count).toBeGreaterThan(0);
    expect(late).toBe(true);
  });
});

describe('minuteur du prochain quartier', () => {
  it('compte à rebours depuis le début : 60 s, puis 30 s après 30 s', () => {
    const e = createEndless(1);
    expect(e.nextQuartierIn()).toBeCloseTo(60, 1);
    advance(e, 30);
    expect(e.nextQuartierIn()).toBeCloseTo(30, 1);
  });
  it('repart de 240 s après l’arrivée d’un quartier (un quartier toutes les 4 minutes)', () => {
    const e = createEndless(1);
    advanceTo(e, 61);
    expect(quartiers(e)).toBe(2);
    expect(e.nextQuartierIn()).toBeCloseTo(300 - 61, 1);
    advanceTo(e, 301);
    expect(quartiers(e)).toBe(3);
    expect(e.nextQuartierIn()).toBeCloseTo(540 - 301, 1);
  });
  it('ne dit rien quand tous les emplacements sont pris, ni quand la partie est finie', () => {
    const e = createEndless(1);
    advanceTo(e, 1261);
    expect(quartiers(e)).toBe(1 + SLOTS.length);
    expect(e.nextQuartierIn()).toBeNull();
    const f = createEndless(1);
    f.world.over = 'faillite';
    expect(f.nextQuartierIn()).toBeNull();
  });
});
