import type { NextEvent } from '../modes/endless';
import type { Money } from '../sim/metrics';
import type { ActorKind, Res } from '../sim/types';
import { browserStorage, loadBest } from './best';

export type Tool = 'road' | 'delete' | 'upgrade' | 'renovate' | 'sell' | `place:${ActorKind}`;

/** Événement `game.events` qui demande à la scène de lancer une partie neuve. */
export const START_EVENT = 'boucle:start';

export const ui = $state({
  screen: 'menu' as 'menu' | 'play' | 'over',
  tool: 'road' as Tool,
  /** Matière choisie pour le prochain recycleur ; null : la première sans recycleur. */
  pick: null as Res | null,
  /** Matières en jeu ; `covered` : un recycleur existe pour elle. */
  materials: [] as { res: Res; covered: boolean }[],
  /** Part des déchets contaminés à l'émission (légende du HUD). */
  contamination: 0,
  budget: 0,
  /** Gains et frais en € par minute (voir moneyPerMinute). */
  money: { recycle: 0, fabricate: 0, upkeep: 0, dump: 0, net: 0 } as Money,
  index: 0,
  /** Ce que compte l'indice sur la dernière minute : déchets émis, et recyclés ou réparés. */
  circ: { emit: 0, back: 0 },
  time: 0,
  over: null as null | 'debordement' | 'faillite',
  /** Prochain événement annoncé dans les bulles du HUD ; null si la partie est finie. */
  next: null as NextEvent | null,
  /** Annonce de ce qui vient de changer (nouveau quartier, nouvelle matière…), vide sinon. */
  news: '',
  best: loadBest(browserStorage) as null | { time: number; index: number },
});

/** Infobulle de la barre d'actions (suit le curseur ; voir Tooltip.svelte et tipAction.ts). */
export const tip = $state({ visible: false, title: '', text: '', x: 0, y: 0 });
