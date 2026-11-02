import type { ActorKind } from '../sim/types';
import { browserStorage, loadBest } from './best';

export type Tool = 'route' | 'delete' | 'upgrade' | 'renovate' | 'priority' | `place:${ActorKind}`;

/** Événement `game.events` qui demande à la scène de lancer une partie neuve. */
export const START_EVENT = 'boucle:start';

export const ui = $state({
  screen: 'menu' as 'menu' | 'play' | 'over',
  tool: 'route' as Tool,
  budget: 0,
  index: 0,
  time: 0,
  over: null as null | 'debordement' | 'faillite',
  best: loadBest(browserStorage) as null | { time: number; index: number },
});
