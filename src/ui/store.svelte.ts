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
  /** Secondes avant le prochain quartier ; null s'il n'en viendra plus. */
  nextQuartier: null as number | null,
  best: loadBest(browserStorage) as null | { time: number; index: number },
});

/** Infobulle de la barre d'actions (suit le curseur ; voir Tooltip.svelte et tipAction.ts). */
export const tip = $state({ visible: false, title: '', text: '', x: 0, y: 0 });
