import { START_BUDGET } from '../../src/sim/defs';
import { describe, it, expect } from 'vitest';
import { createWorld, applyCommand } from '../../src/sim/world';
import { routeLength } from '../../src/sim/world';
import type { World, Packet } from '../../src/sim/types';

const pk = (id: number): Packet => ({ id, res: 'verre', kind: 'dechet', dirty: false, reusable: false, repaired: false });
function two(): World {
  const w = createWorld(1);
  applyCommand(w, { type: 'place', kind: 'tri', x: 0, y: 0 });
  applyCommand(w, { type: 'place', kind: 'recycleur', x: 200, y: 0 });
  return w;
}
const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];

describe('commandes', () => {
  it('place tri coûte 40 et initialise l acteur', () => {
    const w = createWorld(1);
    expect(applyCommand(w, { type: 'place', kind: 'tri', x: 0, y: 0 })).toBe(true);
    expect(w.budget).toBe(START_BUDGET - 40);
    expect(w.actors[0]).toMatchObject({ id: 1, level: 1, queue: [], out: [], credit: 0, rr: 0 });
    expect('res' in w.actors[0]).toBe(false);
  });
  it('place trop proche refusé', () => {
    const w = createWorld(1);
    applyCommand(w, { type: 'place', kind: 'tri', x: 0, y: 0 });
    const id = w.nextId;
    expect(applyCommand(w, { type: 'place', kind: 'tri', x: 59, y: 0 })).toBe(false);
    expect(w.budget).toBe(START_BUDGET - 40);
    expect(w.nextId).toBe(id);
  });
  it('place sans budget refusé', () => {
    const w = createWorld(1);
    w.budget = 10;
    const id = w.nextId;
    expect(applyCommand(w, { type: 'place', kind: 'fabricant', x: 0, y: 0 })).toBe(false);
    expect(w.actors.length).toBe(0);
    expect(w.budget).toBe(10);
    expect(w.nextId).toBe(id);
  });
  it('route sans budget refusée', () => {
    const w = two();
    w.budget = 4;
    const id = w.nextId;
    expect(applyCommand(w, { type: 'route', from: 1, to: 2, points: line })).toBe(false);
    expect(w.budget).toBe(4);
    expect(w.routes.length).toBe(0);
    expect(w.nextId).toBe(id);
  });
  it('route: coût, from===to, doublon', () => {
    const w = two();
    const b = w.budget;
    expect(routeLength(line)).toBe(100);
    expect(applyCommand(w, { type: 'route', from: 1, to: 2, points: line })).toBe(true);
    expect(w.budget).toBe(b - 5);
    expect(applyCommand(w, { type: 'route', from: 1, to: 2, points: line })).toBe(false);
    expect(applyCommand(w, { type: 'route', from: 1, to: 1, points: line })).toBe(false);
    expect(applyCommand(w, { type: 'route', from: 1, to: 9, points: line })).toBe(false);
    expect(w.budget).toBe(b - 5);
  });
  it('removeRoute compte les fuites', () => {
    const w = two();
    applyCommand(w, { type: 'route', from: 1, to: 2, points: line });
    w.routes[0].transit = [1, 2, 3].map(i => ({ packet: pk(i), d: 0 }));
    expect(applyCommand(w, { type: 'removeRoute', id: w.routes[0].id })).toBe(true);
    expect(w.log.filter(l => l.ev === 'leak').length).toBe(3);
    expect(w.routes.length).toBe(0);
    expect(applyCommand(w, { type: 'removeRoute', id: 99 })).toBe(false);
  });
  it('route inverse b→a supprime a→b, sans coût ni création', () => {
    const w = two();
    applyCommand(w, { type: 'route', from: 1, to: 2, points: line });
    w.routes[0].transit = [1, 2].map(i => ({ packet: pk(i), d: 0 }));
    const b = w.budget, id = w.nextId;
    expect(applyCommand(w, { type: 'route', from: 2, to: 1, points: [{ x: 100, y: 0 }, { x: 0, y: 0 }] })).toBe(true);
    expect(w.routes).toEqual([]);
    expect(w.budget).toBe(b);
    expect(w.nextId).toBe(id);
    expect(w.log.filter(l => l.ev === 'leak').length).toBe(2);
  });
  it('route même sens en double toujours refusée', () => {
    const w = two();
    applyCommand(w, { type: 'route', from: 1, to: 2, points: line });
    const b = w.budget;
    expect(applyCommand(w, { type: 'route', from: 1, to: 2, points: line })).toBe(false);
    expect(w.routes.length).toBe(1);
    expect(w.budget).toBe(b);
  });
  it('upgrade refusé pour quartier et décharge', () => {
    const w = createWorld(1);
    applyCommand(w, { type: 'place', kind: 'quartier', x: 0, y: 0 });
    applyCommand(w, { type: 'place', kind: 'decharge', x: 200, y: 0 });
    const b = w.budget;
    expect(applyCommand(w, { type: 'upgrade', id: 1 })).toBe(false);
    expect(applyCommand(w, { type: 'upgrade', id: 2 })).toBe(false);
    expect(w.budget).toBe(b);
    expect(w.actors.map(a => a.level)).toEqual([1, 1]);
  });
  it('renovate vide aussi la sortie d un tri bloqué', () => {
    const w = two(); // tri (1) → recycleur plastique/verre? res absent: aucune route n'accepte
    const t = w.actors[0];
    t.queue = [pk(1), pk(2)];
    t.out = [pk(3)];
    const b = w.budget;
    expect(applyCommand(w, { type: 'renovate', id: 1 })).toBe(true);
    expect(t.queue).toEqual([]);
    expect(t.out).toEqual([]);
    expect(w.budget).toBe(b - 50);
    expect(w.log.filter(l => l.ev === 'leak').length).toBe(3);
  });
  it('upgrade plafonné au niveau 3', () => {
    const w = two();
    const r = [1, 2, 3, 4].map(() => applyCommand(w, { type: 'upgrade', id: 1 }));
    expect(r).toEqual([true, true, false, false]);
    expect(w.actors[0].level).toBe(3);
  });
  it('priority cycle', () => {
    const w = two();
    applyCommand(w, { type: 'route', from: 1, to: 2, points: line });
    const id = w.routes[0].id, seen: number[] = [];
    for (let i = 0; i < 3; i++) { applyCommand(w, { type: 'priority', routeId: id }); seen.push(w.routes[0].priority); }
    expect(seen).toEqual([1, 2, 0]);
  });
  it('renovate vide la file', () => {
    const w = two();
    w.actors[0].queue = [pk(1), pk(2)];
    const b = w.budget;
    expect(applyCommand(w, { type: 'renovate', id: 1 })).toBe(true);
    expect(w.actors[0].queue).toEqual([]);
    expect(w.budget).toBe(b - 50);
    expect(w.log.filter(l => l.ev === 'leak').length).toBe(2);
  });
});
