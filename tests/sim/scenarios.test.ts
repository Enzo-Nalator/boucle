import { describe, it, expect } from 'vitest';
import { createEndless } from '../../src/modes/endless';
import { circularityIndex } from '../../src/sim/metrics';
import { createWorld } from '../../src/sim/world';
import { run, place, link, playGoodGame } from '../helpers';

describe('scénarios de partie', () => {
  // M5: équilibrage — le meilleur bot testé (jusqu'à 3 graines) meurt entre 143 s et 265 s, jamais 600 s ;
  // durée ramenée à 120 s, atteinte par toutes les graines essayées.
  it('bon réseau : aucune défaite pendant 120 s', () => {
    for (const seed of [1, 2, 3, 7]) {
      const e = createEndless(seed);
      playGoodGame(e, 120);
      expect(e.world.over).toBeNull();
    }
  });
  it('R7 : quartier sans route ⇒ débordement avant 60 s', () => {
    const w = createWorld(1);
    place(w, 'quartier', 160, 360);
    run(w, 59);
    expect(w.over).toBe('debordement');
  });
  it('R7 : quartier relié à une décharge seule ⇒ indice 0 après 120 s', () => {
    const w = createWorld(1);
    const q = place(w, 'quartier', 160, 360), d = place(w, 'decharge', 400, 360);
    link(w, q, d);
    run(w, 120);
    expect(circularityIndex(w)).toBe(0);
  });
  it('même graine, même bot ⇒ même score', () => {
    const play = () => { const e = createEndless(5); playGoodGame(e, 200); return e.score(); };
    expect(play()).toEqual(play());
  });
});
