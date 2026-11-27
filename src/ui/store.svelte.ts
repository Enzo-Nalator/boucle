import type { ActorKind } from '../sim/types';
import type { MapId } from '../sim/maps';
import type { NextEvent } from '../modes/endless';
import type { Money } from '../sim/metrics';
import type { Res } from '../sim/types';

export type Tool = 'route' | 'delete' | 'upgrade' | 'renovate' | 'priority' | 'demolish' | `place:${ActorKind}`;

/** Événement `game.events` qui demande à la scène de lancer une partie neuve. */
export const START_EVENT = 'boucle:start';

export const ui = $state({
  screen: 'menu' as 'menu' | 'play' | 'over',
  tool: 'route' as Tool,
  /** Matière choisie pour le prochain recycleur ; null : la première sans recycleur. */
  pick: null as Res | null,
  map: 'plaine' as MapId,
  /** Message court expliquant un refus (construction sur l'eau, routes superposées…). */
  hint: '',
  paused: false,
  budget: 0,
  money: { recycle: 0, fabricate: 0, repair: 0, upkeep: 0, dump: 0, net: 0 } as Money,
  /** Matières en jeu ; `covered` : un recycleur existe pour elle. */
  materials: [] as { res: Res; covered: boolean }[],
  contamination: 0,
  /** Annonce d'une évolution de la partie (nouvelle matière, plus de déchets…). */
  news: '',
  index: 0,
  time: 0,
  over: null as null | 'debordement' | 'faillite',
  /** Prochain événement annoncé dans la bulle du HUD. */
  next: null as NextEvent | null,
  best: null as null | { time: number; index: number },
});

/** Infobulle de la barre d'actions (suit le curseur ; voir Tooltip.svelte et tipAction.ts). */
export const tip = $state({ visible: false, title: '', text: '', x: 0, y: 0 });
