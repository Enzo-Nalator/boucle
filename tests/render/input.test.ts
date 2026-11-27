import { describe, expect, it } from 'vitest';
import { applyCommand, createWorld } from '../../src/sim/world';
import { roadCommand, tapCommand } from '../../src/render/input';
import { cellCenter } from '../../src/render/layout';

const road = cellCenter({ c: 5, r: 1 }),
  free = cellCenter({ c: 5, r: 3 });

describe('tapCommand', () => {
  it('route : le glisser donne les cases de départ et d’arrivée ; retirer : seulement une route construite', () => {
    const w = createWorld(1);
    expect(roadCommand(free, road)).toEqual({ type: 'road', from: { c: 5, r: 3 }, to: { c: 5, r: 1 } });
    expect(tapCommand('delete', road, w)).toBeNull(); // la boucle ne se retire pas
    applyCommand(w, { type: 'place', kind: 'tri', c: 5, r: 3 });
    applyCommand(w, roadCommand(free, road));
    const built = cellCenter({ c: 5, r: 2 });
    expect(tapCommand('delete', built, w)).toEqual({ type: 'removeRoad', c: 5, r: 2 });
  });
  it('placer : la case touchée ; recycleur sur la matière choisie, sinon la première sans recycleur', () => {
    const w = createWorld(1);
    expect(tapCommand('place:tri', free, w)).toEqual({ type: 'place', kind: 'tri', c: 5, r: 3 });
    applyCommand(w, { type: 'place', kind: 'recycleur', c: 0, r: 0, res: 'plastique' });
    expect(tapCommand('place:recycleur', free, w)).toMatchObject({ res: 'verre' });
    expect(tapCommand('place:recycleur', free, w, 'plastique')).toMatchObject({ res: 'plastique' }); // choix du joueur
  });
  it('améliorer, vendre : visent l’acteur de la case, rien sur une case vide', () => {
    const w = createWorld(1);
    expect(tapCommand('upgrade', free, w)).toBeNull();
    applyCommand(w, { type: 'place', kind: 'tri', c: 5, r: 3 });
    expect(tapCommand('upgrade', free, w)).toEqual({ type: 'upgrade', id: w.actors[0].id });
    expect(tapCommand('sell', free, w)).toEqual({ type: 'sell', id: w.actors[0].id });
  });
});
