import type { ActorKind } from '../sim/types';
import type { Tool } from './store.svelte';

const STROKE = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
const ACTION_SVG: Record<'route' | 'upgrade' | 'renovate' | 'priority' | 'delete', string> = {
  route: `<path d="M4 18 L12 18 L20 10" ${STROKE} stroke-width="3"/>`,
  upgrade: `<path d="M12 20 V5 M6 11 L12 5 L18 11" ${STROKE} stroke-width="3"/>`,
  renovate: `<path d="M19 12 A7 7 0 1 1 15 5.7 M19 4 V9 H14" ${STROKE} stroke-width="3"/>`,
  priority: '<path d="M12 4 V14 M12 19 V19.5" fill="none" stroke-width="3.5" stroke-linecap="round"/>',
  delete: `<path d="M6 6 L18 18 M18 6 L6 18" ${STROKE} stroke-width="3"/>`,
};

/** Pictogrammes « ville » des acteurs (viewBox 24×24), en phase avec le rendu du jeu. */
const BUILDING_SVG: Record<ActorKind, string> = {
  quartier: '<polygon points="12,3 21,11 3,11"/><rect x="5" y="11" width="14" height="9"/>',
  collecteur: '<polygon points="12,4 22,10 2,10"/><rect x="4" y="10" width="16" height="10"/>',
  tri: '<rect x="3" y="9" width="18" height="11"/><rect x="5" y="3" width="4" height="6"/><rect x="12" y="5" width="4" height="4"/>',
  recycleur: '<rect x="3" y="9" width="18" height="11"/><rect x="5" y="3" width="4" height="6"/>',
  fabricant: '<polygon points="3,20 3,8 9,12 9,8 15,12 15,8 21,12 21,20"/>',
  reparateur: '<polygon points="12,3 21,11 3,11"/><rect x="5" y="11" width="14" height="9"/>',
  decharge: '<polygon points="2,20 12,4 22,20"/>',
};
export const actorIcon = (kind: ActorKind): string => BUILDING_SVG[kind];

export function toolIcon(tool: Tool): string {
  return tool.startsWith('place:')
    ? actorIcon(tool.slice('place:'.length) as ActorKind)
    : ACTION_SVG[tool as keyof typeof ACTION_SVG];
}
