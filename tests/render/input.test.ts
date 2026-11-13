import { describe, it, expect } from 'vitest';
import { createWorld, applyCommand } from '../../src/sim/world';
import { tapCommand, routeCommand, dragVerdict } from '../../src/render/input';

function setup() {
  const w = createWorld(1);
  w.budget = 1000;
  applyCommand(w, { type: 'place', kind: 'quartier', x: 100, y: 100 });
  applyCommand(w, { type: 'place', kind: 'tri', x: 300, y: 100 });
  applyCommand(w, {
    type: 'route',
    from: w.actors[0].id,
    to: w.actors[1].id,
    points: [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ],
  });
  return w;
}

describe('tapCommand', () => {
  it("place un acteur n'importe où", () => {
    expect(tapCommand('place:tri', { x: 500, y: 400 }, setup())).toEqual({
      type: 'place',
      kind: 'tri',
      x: 500,
      y: 400,
    });
  });
  it('recycleur : première matière active non couverte', () => {
    const w = setup();
    w.activeRes = ['plastique', 'verre'];
    applyCommand(w, { type: 'place', kind: 'recycleur', x: 500, y: 300, res: 'plastique' });
    expect(tapCommand('place:recycleur', { x: 600, y: 500 }, w)).toMatchObject({ kind: 'recycleur', res: 'verre' });
  });
  it('delete / priority sur une route (12 px / 28 px)', () => {
    const w = setup(),
      id = w.routes[0].id;
    expect(tapCommand('delete', { x: 200, y: 108 }, w)).toEqual({ type: 'removeRoute', id });
    expect(tapCommand('delete', { x: 200, y: 120 }, w)).toBeNull();
    expect(tapCommand('priority', { x: 200, y: 110 }, w)).toEqual({ type: 'priority', routeId: id });
  });
  it('upgrade / renovate sur un acteur', () => {
    const w = setup();
    expect(tapCommand('upgrade', { x: 310, y: 100 }, w)).toEqual({ type: 'upgrade', id: w.actors[1].id });
    expect(tapCommand('renovate', { x: 100, y: 130 }, w)).toBeNull();
    expect(tapCommand('renovate', { x: 100, y: 120 }, w)).toEqual({ type: 'renovate', id: w.actors[0].id });
  });
});

describe('routeCommand', () => {
  it('relâcher sur un autre acteur', () => {
    const w = setup();
    expect(routeCommand(w, w.actors[1].id, { x: 105, y: 100 })).toEqual({
      type: 'route',
      from: w.actors[1].id,
      to: w.actors[0].id,
      points: [
        { x: 300, y: 100 },
        { x: 100, y: 100 },
      ],
    });
  });
  it('relâcher sur soi-même ou dans le vide : annulé', () => {
    const w = setup();
    expect(routeCommand(w, w.actors[1].id, { x: 300, y: 100 })).toBeNull();
    expect(routeCommand(w, w.actors[1].id, { x: 700, y: 600 })).toBeNull();
  });
});

describe('dragVerdict', () => {
  const d = { pointerId: 1, tool: 'route' as const };
  it('accepte le pointeur du tracé', () => {
    expect(dragVerdict(d, { kind: 'move', pointerId: 1 }, 'route', false)).toBe('accept');
    expect(dragVerdict(d, { kind: 'up', pointerId: 1 }, 'route', false)).toBe('accept');
  });
  it('ignore un autre pointeur', () =>
    expect(dragVerdict(d, { kind: 'up', pointerId: 2 }, 'route', false)).toBe('ignore'));
  it('ignore sans tracé', () => expect(dragVerdict(null, { kind: 'up', pointerId: 1 }, 'route', false)).toBe('ignore'));
  it("annule si l'outil change", () =>
    expect(dragVerdict(d, { kind: 'up', pointerId: 1 }, 'delete', false)).toBe('cancel'));
  it('annule si la partie est finie', () =>
    expect(dragVerdict(d, { kind: 'move', pointerId: 1 }, 'route', true)).toBe('cancel'));
  it('annule au relâchement hors canvas', () =>
    expect(dragVerdict(d, { kind: 'out', pointerId: 1 }, 'route', false)).toBe('cancel'));
});
