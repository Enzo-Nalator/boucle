import { DT } from '../src/sim/defs';
import { step } from '../src/sim/step';
import { applyCommand } from '../src/sim/world';
import type { ActorKind, Cell, Command, Res, World } from '../src/sim/types';

export function run(w: World, seconds: number, cmds: Command[] = []): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) step(w, i === 0 ? cmds : []);
}

export function place(w: World, kind: ActorKind, c: number, r: number, res?: Res): number {
  if (!applyCommand(w, { type: 'place', kind, c, r, ...(res ? { res } : {}) })) throw new Error(`place ${kind} refusé`);
  return w.actors[w.actors.length - 1].id;
}

/** Construit une route de from à to ; lève si refusé. */
export function road(w: World, from: Cell, to: Cell): void {
  if (!applyCommand(w, { type: 'road', from, to })) throw new Error(`route ${JSON.stringify([from, to])} refusée`);
}
