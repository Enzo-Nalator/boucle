import { ACTOR_DEFS } from './defs';
import type { World } from './types';

export const LOG_WINDOW = 60;

/** Entrées du journal dans la fenêtre glissante (partagée par l'élagage et la métrique). */
export const inWindow = (w: World, t: number): boolean => t > w.time - LOG_WINDOW;

export function circularityIndex(w: World): number {
  let emit = 0,
    back = 0;
  for (const l of w.log) {
    if (!inWindow(w, l.t)) continue;
    if (l.ev === 'emit') emit++;
    else if (l.ev === 'recycle' || l.ev === 'repair') back++;
  }
  // la fenêtre glissante peut compter un recyclage dont l’émission vient d’en sortir : borné à 100 %
  return emit ? Math.min(1, back / emit) : 0;
}

export type Money = { recycle: number; fabricate: number; repair: number; upkeep: number; dump: number; net: number };

/** D'où vient l'argent, en € par minute (moyenne sur la fenêtre ; entretien : au rythme actuel). Hors construction. */
export function moneyPerMinute(w: World): Money {
  const k = LOG_WINDOW / Math.min(LOG_WINDOW, Math.max(10, w.time)); // début de partie : au moins 10 s de recul
  const sum = (kind: string) => w.cash.reduce((s, c) => (c.kind === kind && inWindow(w, c.t) ? s + c.v : s), 0) * k;
  const recycle = sum('recycleur'),
    fabricate = sum('fabricant'),
    repair = sum('reparateur'),
    dump = sum('decharge'),
    upkeep = -w.actors.reduce((s, a) => s + (a.offlineUntil > w.time ? 0 : ACTOR_DEFS[a.kind].upkeep), 0) * 60;
  return { recycle, fabricate, repair, upkeep, dump, net: recycle + fabricate + repair + upkeep + dump };
}
