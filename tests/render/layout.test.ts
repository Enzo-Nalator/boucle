import { describe, expect, it } from 'vitest';
import { CELL, cellAt, cellCenter, levelPips, pathPoint, TOP } from '../../src/render/layout';

describe('grille à l’écran', () => {
  it('cellAt est l’inverse de cellCenter', () => {
    for (const cell of [
      { c: 0, r: 0 },
      { c: 7, r: 3 },
      { c: 15, r: 6 },
    ])
      expect(cellAt(cellCenter(cell))).toEqual(cell);
  });
  it('un point sur un bord de case tombe dans la case suivante', () => {
    expect(cellAt({ x: CELL, y: TOP })).toEqual({ c: 1, r: 0 });
  });
  it('pathPoint : centre des cases aux entiers, interpolé entre deux, borné aux bouts', () => {
    const path = [
      { c: 1, r: 3 },
      { c: 2, r: 3 },
      { c: 2, r: 4 },
    ];
    expect(pathPoint(path, 0)).toEqual(cellCenter(path[0]));
    expect(pathPoint(path, 1.5)).toEqual({ x: cellCenter(path[1]).x, y: cellCenter(path[1]).y + CELL / 2 });
    expect(pathPoint(path, 9)).toEqual(cellCenter(path[2]));
    expect(pathPoint(path, -1)).toEqual(cellCenter(path[0]));
  });
  it('levelPips 0/1/2', () => expect([1, 2, 3].map(levelPips)).toEqual([0, 1, 2]));
});
