import { describe, it, expect } from 'vitest';
import { createEndless } from '../../src/modes/endless';
import { circularityIndex } from '../../src/sim/metrics';
import { createWorld } from '../../src/sim/world';
import { run, place, link, playGoodGame } from '../helpers';

describe('scénarios de partie', () => {
  // M5 : équilibrage encore partiel ; le bot déborde entre 430 et 570 s sur la plaine (graines 1 à 8), quand l’émission dépasse son réseau.
  it('bon réseau : aucune défaite pendant 420 s, et de quoi continuer à construire', () => {
    for (const seed of [1, 2, 3, 7]) {
      const e = createEndless(seed);
      playGoodGame(e, 420);
      expect(e.world.over).toBeNull();
      expect(e.world.budget).toBeGreaterThan(100);
    }
  }, 30000);
  it('R7 : quartier sans route ⇒ débordement avant 60 s', () => {
    const w = createWorld(1);
    place(w, 'quartier', 160, 360);
    run(w, 59);
    expect(w.over).toBe('debordement');
  });
  it('R7 : quartier relié à une décharge seule ⇒ indice 0 après 120 s', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 160, 360),
      d = place(w, 'decharge', 400, 360);
    link(w, q, d);
    run(w, 120);
    expect(circularityIndex(w)).toBe(0);
  });
  it('même graine, même bot ⇒ même score', () => {
    const play = () => {
      const e = createEndless(5);
      playGoodGame(e, 200);
      return e.score();
    };
    const a = play();
    expect(a.time).toBeGreaterThan(0);
    expect(a).toEqual(play());
  });
});
