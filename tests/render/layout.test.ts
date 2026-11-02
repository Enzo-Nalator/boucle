import { describe, it, expect } from 'vitest';
import { snap45, pointAt, distToPolyline, routeWidth, levelPips } from '../../src/render/layout';

describe('snap45', () => {
  it('horizontal puis diagonale', () => {
    expect(snap45({ x: 0, y: 0 }, { x: 100, y: 40 })).toEqual([{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 100, y: 40 }]);
  });
  it('vertical puis diagonale', () => {
    expect(snap45({ x: 0, y: 0 }, { x: 30, y: 90 })).toEqual([{ x: 0, y: 0 }, { x: 0, y: 60 }, { x: 30, y: 90 }]);
  });
  it('aligné : deux points', () => {
    expect(snap45({ x: 0, y: 0 }, { x: 100, y: 0 })).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
  });
  it('même point : deux points identiques', () => {
    expect(snap45({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual([{ x: 5, y: 5 }, { x: 5, y: 5 }]);
  });
  it('diagonale exacte : deux points', () => {
    expect(snap45({ x: 0, y: 0 }, { x: 50, y: 50 })).toEqual([{ x: 0, y: 0 }, { x: 50, y: 50 }]);
  });
  it('sens négatifs', () => {
    expect(snap45({ x: 100, y: 40 }, { x: 0, y: 0 })).toEqual([{ x: 100, y: 40 }, { x: 40, y: 40 }, { x: 0, y: 0 }]);
  });
});

const L = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }];
describe('pointAt', () => {
  it('sur le premier segment', () => expect(pointAt(L, 40)).toEqual({ x: 40, y: 0 }));
  it('sur le second segment', () => expect(pointAt(L, 120)).toEqual({ x: 100, y: 20 }));
  it('segment de longueur nulle', () => {
    expect(pointAt([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }], 4)).toEqual({ x: 4, y: 0 });
  });
  it('borné aux extrémités', () => {
    expect(pointAt(L, -5)).toEqual({ x: 0, y: 0 });
    expect(pointAt(L, 999)).toEqual({ x: 100, y: 50 });
  });
});

describe('distToPolyline', () => {
  it('perpendiculaire', () => expect(distToPolyline({ x: 50, y: 10 }, L)).toBe(10));
  it('au-delà de l\'extrémité', () => expect(distToPolyline({ x: -3, y: 4 }, L)).toBe(5));
  it('sur la ligne', () => expect(distToPolyline({ x: 100, y: 30 }, L)).toBe(0));
});

describe('retours visuels', () => {
  it('routeWidth 6/8/10', () => expect([0, 1, 2].map(routeWidth)).toEqual([6, 8, 10]));
  it('levelPips 0/1/2', () => expect([1, 2, 3].map(levelPips)).toEqual([0, 1, 2]));
});
