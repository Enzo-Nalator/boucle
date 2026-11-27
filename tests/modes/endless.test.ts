import { describe, it, expect } from 'vitest';
import { createEndless, MAX_QUARTIERS, SPAWN } from '../../src/modes/endless';
import { inWater, MAP_IDS } from '../../src/sim/maps';
import { DT } from '../../src/sim/defs';

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
  it('démarre avec un quartier et plastique/verre', () => {
    const e = createEndless(1);
    expect(e.world.actors.map(a => a.kind)).toEqual(['quartier']);
    expect(e.world.activeRes).toEqual(['plastique', 'verre']);
  });
  it('ordre cyclique aux ticks 60/120/180/240', () => {
    const e = createEndless(1),
      w = e.world;
    advanceTo(e, 59);
    expect([quartiers(e), w.activeRes.length, w.contamination, w.emitRate]).toEqual([1, 2, 0.1, 0.5]);
    advanceTo(e, 61); // 1 : quartier
    expect(quartiers(e)).toBe(2);
    expect(w.actors[1].kind).toBe('quartier');
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
  it('plafond de quartiers : les événements suivants ne font rien', () => {
    const e = createEndless(1);
    advanceTo(e, 1261); // 6e événement quartier (tick 21)
    expect(quartiers(e)).toBe(MAX_QUARTIERS);
    advanceTo(e, 1501);
    expect(quartiers(e)).toBe(MAX_QUARTIERS);
  });
  it('apparitions au hasard sur toute la carte, toujours au sec et dans la zone', () => {
    for (const map of MAP_IDS) {
      const xs: number[] = [];
      for (let seed = 1; seed <= 40; seed++) {
        const [q] = createEndless(seed, map).world.actors;
        expect(inWater(map, q)).toBe(false);
        expect(q.x >= SPAWN.x0 && q.x <= SPAWN.x1 && q.y >= SPAWN.y0 && q.y <= SPAWN.y1).toBe(true);
        xs.push(q.x);
      }
      expect(Math.min(...xs)).toBeLessThan(400);
      expect(Math.max(...xs)).toBeGreaterThan(880);
    }
  });
  it('matières épuisées : un nouvel événement matière ne fait rien', () => {
    const e = createEndless(1);
    advanceTo(e, 601);
    expect(e.world.activeRes).toEqual(['plastique', 'verre', 'metal', 'bio', 'papier']);
    advanceTo(e, 841);
    expect(e.world.activeRes).toHaveLength(5);
  });
  it('pannes : aucune avant 300 s, 10 s, jamais un quartier, au moins une après 360 s', () => {
    const e = createEndless(3),
      w = e.world;
    e.world.budget = 1e6;
    const free = e.world.actors[0].x < 640 ? 900 : 300;
    e.step([{ type: 'place', kind: 'tri', x: free, y: 360 }]);
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

describe('annonce du prochain événement', () => {
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
    e.step([{ type: 'place', kind: 'tri', x: e.world.actors[0].x < 640 ? 900 : 300, y: 360 }]);
    advanceTo(e, 241);
    expect(e.nextEvent()).toMatchObject({ kind: 'quartier', outage: true });
  });
  it('saute les événements sans effet, et se tait quand la partie est finie', () => {
    const e = createEndless(1);
    advanceTo(e, 1261); // plafond de quartiers atteint
    expect(quartiers(e)).toBe(MAX_QUARTIERS);
    advanceTo(e, 1441); // le tick suivant (quartier) n'apporte rien
    expect(e.nextEvent()!.kind).toBe('emission'); // matières et saleté au maximum aussi
    e.world.over = 'faillite';
    expect(e.nextEvent()).toBeNull();
  });
});
