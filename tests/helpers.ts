import { DT } from '../src/sim/defs';
import { step } from '../src/sim/step';
import { applyCommand } from '../src/sim/world';
import type { ActorKind, Command, Pt, Res, World } from '../src/sim/types';

export function run(w: World, seconds: number, cmds: Command[] = []): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) step(w, i === 0 ? cmds : []);
}

export function place(w: World, kind: ActorKind, x: number, y: number, res?: Res): number {
  applyCommand(w, { type: 'place', kind, x, y, ...(res ? { res } : {}) });
  return w.actors[w.actors.length - 1].id;
}

export function link(w: World, from: number, to: number, points?: Pt[]): number {
  const a = w.actors.find(x => x.id === from)!, b = w.actors.find(x => x.id === to)!;
  applyCommand(w, { type: 'route', from, to, points: points ?? [{ x: a.x, y: a.y }, { x: b.x, y: b.y }] });
  return w.routes[w.routes.length - 1].id;
}
