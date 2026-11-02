import { describe, expect, it } from 'vitest';
import { placeTooltip } from '../../src/ui/tooltip';

const size = { w: 200, h: 60 };
const view = { w: 1000, h: 800 };

describe('placeTooltip', () => {
  it('se place en bas à droite du curseur par défaut', () => {
    expect(placeTooltip({ x: 100, y: 100 }, size, view)).toEqual({ x: 116, y: 116 });
  });
  it('bascule à gauche du curseur près du bord droit', () => {
    expect(placeTooltip({ x: 900, y: 100 }, size, view)).toEqual({ x: 684, y: 116 });
  });
  it('bascule au-dessus du curseur près du bord bas (barre d\'outils)', () => {
    expect(placeTooltip({ x: 100, y: 780 }, size, view)).toEqual({ x: 116, y: 704 });
  });
  it('ne sort jamais de la fenêtre (marge 8 px)', () => {
    expect(placeTooltip({ x: 5, y: 790 }, { w: 2000, h: 2000 }, view)).toEqual({ x: 8, y: 8 });
  });
});
