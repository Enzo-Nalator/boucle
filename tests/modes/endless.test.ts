import { describe, it, expect } from 'vitest';
import { createEndless, SLOTS, FIRST_QUARTIER } from '../../src/modes/endless';
import { DT, START_BUDGET } from '../../src/sim/defs';
import { around, inGrid } from '../../src/sim/grid';
import { isRoad } from '../../src/sim/roads';
import { moneyPerMinute } from '../../src/sim/metrics';

const quartiers = (e: ReturnType<typeof createEndless>) => e.world.actors.filter(a => a.kind === 'quartier').length;
// Contourne VOLONTAIREMENT les règles de la sim (vide les files, remet over à null, budget illimité) :
// on ne teste ici que le calendrier du directeur, pas la survie.
function advance(e: ReturnType<typeof createEndless>, s: number, each?: () => void) {
  for (let i = 0; i < Math.round(s / DT); i++) {
    e.step([]);
    each?.();
    e.world.over = null;
    for (const a of e.world.actors) a.queue = [];
    e.world.budget = 1e6;
  }
}
const advanceTo = (e: ReturnType<typeof createEndless>, t: number) => advance(e, t - e.world.time);

describe('directeur mode A', () => {
  it('démarre avec un quartier, la base offerte et plastique/verre', () => {
    const e = createEndless(1);
    expect(e.world.actors[0]).toMatchObject({ kind: 'quartier', ...FIRST_QUARTIER });
    expect(e.world.actors.map(a => a.kind)).toEqual(['quartier', 'tri', 'recycleur', 'fabricant', 'decharge']);
    expect(e.world.roads).toEqual([
      { c: 4, r: 2 },
      { c: 4, r: 3 },
      { c: 4, r: 4 },
    ]);
    expect(e.world.budget).toBe(START_BUDGET);
    expect(e.world.activeRes).toEqual(['plastique', 'verre']);
  });
  it('la base tourne (recycle, ne déborde pas) mais perd de l’argent', () => {
    const e = createEndless(1),
      w = e.world;
    for (let i = 0; i < Math.round(55 / DT); i++) e.step([]);
    expect(w.over).toBeNull();
    expect(w.log.some(l => l.ev === 'recycle')).toBe(true);
    expect(w.budget).toBeLessThan(START_BUDGET);
    // ordre de grandeur voulu : environ −50 € par minute avant toute amélioration
    const net = moneyPerMinute(w).net;
    expect(net).toBeLessThan(-30);
    expect(net).toBeGreaterThan(-80);
  });
  it('ordre cyclique aux ticks 60/120/180/240', () => {
    const e = createEndless(1),
      w = e.world;
    advanceTo(e, 59);
    expect([quartiers(e), w.activeRes.length, w.contamination, w.emitRate]).toEqual([1, 2, 0.1, 0.5]);
    advanceTo(e, 61); // 1 : quartier, exactement SLOTS[0]
    expect(quartiers(e)).toBe(2);
    expect(w.actors.filter(a => a.kind === 'quartier')[1]).toMatchObject(SLOTS[0]);
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
    const e = createEndless(1);
    let max = 0;
    advance(e, 61 * 4 * 9, () => {
      max = Math.max(max, e.world.contamination);
    });
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
    e.step([{ type: 'place', kind: 'decharge', ...SLOTS[0] }]);
    advanceTo(e, 61);
    expect(quartiers(e)).toBe(2);
    expect(e.world.actors.filter(a => a.kind === 'quartier')[1]).toMatchObject(SLOTS[1]);
  });
  it('matières épuisées : un nouvel événement matière ne fait rien', () => {
    const e = createEndless(1);
    advanceTo(e, 601);
    expect(e.world.activeRes).toEqual(['plastique', 'verre', 'metal', 'bio', 'papier']);
    advanceTo(e, 841);
    expect(e.world.activeRes).toHaveLength(5);
  });
  it('slots valides : sur la grille, hors route, distincts ; seul le premier quartier touche une route de la base', () => {
    const w = createEndless(1).world,
      all = [FIRST_QUARTIER, ...SLOTS];
    expect(new Set(all.map(p => `${p.c},${p.r}`)).size).toBe(all.length);
    for (const p of all) {
      expect(inGrid(p.c, p.r)).toBe(true);
      expect(isRoad(w, p.c, p.r)).toBe(false);
      expect(around(p).some(n => isRoad(w, n.c, n.r))).toBe(p === FIRST_QUARTIER);
    }
  });
  it('pannes : aucune avant 300 s, 10 s, jamais un quartier, au moins une après 360 s', () => {
    const e = createEndless(3),
      w = e.world;
    const seen = new Map<number, number>();
    let early = false,
      late = false,
      count = 0;
    advance(e, 365, () => {
      for (const a of w.actors) {
        if (a.offlineUntil > 0 && seen.get(a.id) !== a.offlineUntil) {
          // panne qui vient d'être posée
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

describe('prochain événement', () => {
  it('compte à rebours depuis le début : 60 s, puis 30 s après 30 s', () => {
    const e = createEndless(1);
    expect(e.nextEvent()).toMatchObject({ kind: 'quartier', outage: false });
    expect(e.nextEvent()!.in).toBeCloseTo(60, 1);
    advance(e, 30);
    expect(e.nextEvent()!.in).toBeCloseTo(30, 1);
  });
  it('suit le cycle, en nommant la matière qui arrive', () => {
    const e = createEndless(1);
    advanceTo(e, 61);
    expect(e.nextEvent()).toMatchObject({ kind: 'matiere', res: 'metal' });
    advanceTo(e, 121);
    expect(e.nextEvent()!.kind).toBe('contamination');
    advanceTo(e, 181);
    expect(e.nextEvent()!.kind).toBe('emission');
  });
  it('signale la panne à partir de 300 s', () => {
    const e = createEndless(1);
    advanceTo(e, 241);
    expect(e.nextEvent()).toMatchObject({ kind: 'quartier', outage: true });
  });
  it('saute les événements sans effet, et se tait quand la partie est finie', () => {
    const e = createEndless(1);
    advanceTo(e, 1261); // tous les emplacements de quartier pris
    expect(quartiers(e)).toBe(1 + SLOTS.length);
    advanceTo(e, 1441); // le tick suivant (quartier) n'apporte plus de quartier : il n'annonce que sa panne
    expect(e.nextEvent()).toMatchObject({ kind: 'panne', outage: true });
    advanceTo(e, 1501); // puis matière et saleté, au maximum, ne font plus que des pannes ; l'émission monte toujours
    expect(e.nextEvent()).toMatchObject({ kind: 'panne', outage: true });
    advanceTo(e, 1621);
    expect(e.nextEvent()).toMatchObject({ kind: 'emission', outage: true });
    e.world.over = 'faillite';
    expect(e.nextEvent()).toBeNull();
  });
});
