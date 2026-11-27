import type { Actor, Command, Pt, Res, Route, World } from '../sim/types';
import type { Tool } from '../ui/store.svelte';
import { resolve } from '../sim/network';
import { ACTOR_DEFS, DEMOLISH_REFUND } from '../sim/defs';
import { MAX_LEVEL, refusal, RENOVATE_COST, upgradeCost } from '../sim/world';
import { distToPolyline } from './layout';

export const GRAB = 28,
  ROUTE_GRAB = 12;

export function hitActor(w: World, p: Pt, r = GRAB): Actor | null {
  let best: Actor | null = null,
    bd = r;
  for (const a of w.actors) {
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d <= bd) {
      best = a;
      bd = d;
    }
  }
  return best;
}

function hitRoute(w: World, p: Pt, r: number): Route | null {
  let best: Route | null = null,
    bd = r;
  for (const rt of w.routes) {
    const d = distToPolyline(p, rt.points);
    if (d <= bd) {
      best = rt;
      bd = d;
    }
  }
  return best;
}

/** Appui simple : outil (hors `route`) + point → commande éventuelle. */
export function tapCommand(tool: Tool, p: Pt, w: World, pick: Res | null = null): Command | null {
  if (tool.startsWith('place:')) {
    const kind = tool.slice(6) as Extract<Command, { type: 'place' }>['kind'];
    if (kind !== 'recycleur') return { type: 'place', kind, x: p.x, y: p.y };
    const taken = new Set(w.actors.filter(a => a.kind === 'recycleur').map(a => a.res));
    const res = pick ?? w.activeRes.find(r => !taken.has(r)) ?? w.activeRes[0];
    return { type: 'place', kind, x: p.x, y: p.y, res };
  }
  if (tool === 'delete') {
    const r = hitRoute(w, p, ROUTE_GRAB);
    return r && { type: 'removeRoute', id: r.id };
  }
  if (tool === 'upgrade' || tool === 'renovate' || tool === 'demolish' || tool === 'priority') {
    const a = hitActor(w, p);
    return a && { type: tool, id: a.id };
  }
  return null;
}

/** Glisser de `start` à `end`, chacun sur un bâtiment ou une route ; sinon (vide, sur place) : annulé. */
export function routeCommand(w: World, start: Pt, end: Pt): Command | null {
  const from = resolve(w, start),
    to = resolve(w, end);
  if (!from || !to || Math.hypot(from.x - to.x, from.y - to.y) < GRAB) return null;
  return { type: 'route', from, to };
}

const euros = (v: number) => `${String(v).replace('.', ',')} €`;

/** Ce que ferait un appui, à afficher au survol : texte avec le prix payé ou rendu ; `ok` faux si c'est refusé. */
export function hoverInfo(w: World, c: Command): { text: string; ok: boolean } | null {
  const no = (text: string) => ({ text, ok: false }),
    yes = (text: string) => ({ text, ok: true }),
    pay = (price: number, text: string) =>
      w.budget < price ? no(`Pas assez d’argent (${euros(price)})`) : yes(`${text} : −${euros(price)}`);
  if (c.type === 'removeRoute') return yes('Supprimer ce tronçon : gratuit, rien de remboursé');
  if (!('id' in c)) return null;
  const a = w.actors.find(x => x.id === c.id);
  if (!a) return null;
  switch (c.type) {
    case 'upgrade':
      if (a.kind === 'quartier' || a.kind === 'decharge') return no('Pas d’amélioration pour ce bâtiment');
      if (a.level >= MAX_LEVEL) return no('Niveau maximum');
      return pay(upgradeCost(a.kind, a.level), `Niveau ${a.level + 1}`);
    case 'renovate':
      return pay(RENOVATE_COST, 'Vider les files');
    case 'demolish': {
      const why = refusal(w, c);
      return why ? no(why) : yes(`Démolir : +${euros(ACTOR_DEFS[a.kind].cost * DEMOLISH_REFUND)}`);
    }
    case 'priority':
      return a.kind === 'quartier'
        ? no('Pas de priorité pour un quartier')
        : yes(`Priorité ${(a.priority + 1) % 3} : gratuit`);
  }
}

export type DragInfo = { pointerId: number; tool: Tool };
/** Décide du sort d'un évènement de pointeur pendant un glisser : l'accepter, l'ignorer (autre pointeur) ou annuler le tracé. */
export function dragVerdict(
  drag: DragInfo | null,
  ev: { kind: 'move' | 'up' | 'out'; pointerId: number },
  tool: Tool,
  over: boolean,
): 'accept' | 'ignore' | 'cancel' {
  if (!drag) return 'ignore';
  if (over || tool !== drag.tool) return 'cancel';
  if (ev.kind === 'out') return 'cancel';
  return ev.pointerId === drag.pointerId ? 'accept' : 'ignore';
}
