import type { ShapeName } from '../render/theme';
import { ACTOR_SHAPE } from '../render/theme';
import type { ActorKind } from '../sim/types';
import type { Tool } from './store.svelte';

/** Formes SVG (viewBox 24×24) alignées sur les formes dessinées dans le jeu. */
export const SHAPE_SVG: Record<ShapeName, string> = {
  cercle: '<circle cx="12" cy="12" r="8"/>',
  carre: '<rect x="4" y="4" width="16" height="16"/>',
  'carre-arrondi': '<rect x="4" y="4" width="16" height="16" rx="5"/>',
  triangle: '<polygon points="12,3 21,20 3,20"/>',
  losange: '<polygon points="12,2 22,12 12,22 2,12"/>',
  croix: '<polygon points="9,3 15,3 15,9 21,9 21,15 15,15 15,21 9,21 9,15 3,15 3,9 9,9"/>',
  hexagone: '<polygon points="12,2.5 20.2,7.25 20.2,16.75 12,21.5 3.8,16.75 3.8,7.25"/>',
};

const STROKE = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
const ACTION_SVG: Record<'route' | 'upgrade' | 'renovate' | 'priority' | 'delete', string> = {
  route: `<path d="M4 18 L12 18 L20 10" ${STROKE} stroke-width="3"/>`,
  upgrade: `<path d="M12 20 V5 M6 11 L12 5 L18 11" ${STROKE} stroke-width="3"/>`,
  renovate: `<path d="M19 12 A7 7 0 1 1 15 5.7 M19 4 V9 H14" ${STROKE} stroke-width="3"/>`,
  priority: '<path d="M12 4 V14 M12 19 V19.5" fill="none" stroke-width="3.5" stroke-linecap="round"/>',
  delete: `<path d="M6 6 L18 18 M18 6 L6 18" ${STROKE} stroke-width="3"/>`,
};

export const actorIcon = (kind: ActorKind): string => SHAPE_SVG[ACTOR_SHAPE[kind]];

export function toolIcon(tool: Tool): string {
  return tool.startsWith('place:') ? actorIcon(tool.slice('place:'.length) as ActorKind) : ACTION_SVG[tool as keyof typeof ACTION_SVG];
}
