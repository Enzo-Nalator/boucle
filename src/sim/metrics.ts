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
  return emit ? back / emit : 0;
}
