import { START_BUDGET } from './defs';
import type { World } from './types';

export function createWorld(seed: number): World {
  return {
    time: 0, rng: seed >>> 0, nextId: 1, budget: START_BUDGET, actors: [], routes: [],
    activeRes: ['plastique', 'verre'], contamination: 0.1, emitRate: 0.5, log: [], over: null,
  };
}
