import type { ActorKind } from '../sim/types';

export type Tool = 'route' | 'delete' | 'upgrade' | 'renovate' | 'priority' | `place:${ActorKind}`;

export const ui = $state({
  screen: 'play' as 'menu' | 'play' | 'over',
  tool: 'route' as Tool,
  budget: 0,
  index: 0,
  time: 0,
  over: null as null | 'debordement' | 'faillite',
  best: null as null | { time: number; index: number },
});
