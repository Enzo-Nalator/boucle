import type { Actor, Command, Pt, Res, World } from '../sim/types';
import type { Tool } from '../ui/store.svelte';
import { cellAt } from './layout';

export const actorAt = (w: World, p: Pt): Actor | null => {
  const { c, r } = cellAt(p);
  return w.actors.find(a => a.c === c && a.r === r) ?? null;
};

/** Glisser avec l'outil route : de la case de départ à celle d'arrivée (la simulation choisit le coude et juge). */
export const roadCommand = (from: Pt, to: Pt): Command => ({ type: 'road', from: cellAt(from), to: cellAt(to) });

/** Appui : outil + point → commande éventuelle (la route se trace au glisser, voir roadCommand). */
export function tapCommand(tool: Tool, p: Pt, w: World, pick: Res | null = null): Command | null {
  const { c, r } = cellAt(p);
  if (tool.startsWith('place:')) {
    const kind = tool.slice(6) as Extract<Command, { type: 'place' }>['kind'];
    if (kind !== 'recycleur') return { type: 'place', kind, c, r };
    // la matière choisie par le joueur, sinon la première qui n'a pas encore de recycleur
    const taken = new Set(w.actors.filter(a => a.kind === 'recycleur').map(a => a.res));
    const res = pick ?? w.activeRes.find(x => !taken.has(x)) ?? w.activeRes[0];
    return { type: 'place', kind, c, r, res };
  }
  if (tool === 'delete') return w.roads.some(x => x.c === c && x.r === r) ? { type: 'removeRoad', c, r } : null;
  const a = actorAt(w, p);
  return a && (tool === 'upgrade' || tool === 'renovate' || tool === 'sell') ? { type: tool, id: a.id } : null;
}
