import { nextRandom } from '../sim/rng';
import { step } from '../sim/step';
import { circularityIndex } from '../sim/metrics';
import { applyCommand, createWorld } from '../sim/world';
import type { Command, Pt, Res, World } from '../sim/types';

export type Endless = { world: World; step(cmds: Command[]): void; score(): { time: number; index: number } };

// Calendrier du directeur (données) : un tick toutes les TICK s, événements en cycle.
export const TICK = 60;
const EPS = 1e-6; // tolérance sur w.time (cumul de DT flottants)
export const OUTAGE_FROM = 300;
export const OUTAGE_DURATION = 10;
export const NEW_RES: Res[] = ['metal', 'bio', 'papier'];
export const CONTAMINATION_STEP = 0.05, CONTAMINATION_MAX = 0.4, EMIT_FACTOR = 1.2;
export const FIRST_QUARTIER: Pt = { x: 160, y: 360 };
/** Quartiers sur les bords gauche, haut et bas ; le milieu reste libre pour le réseau du joueur. */
export const SLOTS: Pt[] = [
  { x: 160, y: 160 }, { x: 160, y: 560 }, { x: 480, y: 80 }, { x: 480, y: 600 }, { x: 800, y: 80 }, { x: 800, y: 600 },
];
const CYCLE = ['quartier', 'matiere', 'contamination', 'emission'] as const;

export function createEndless(seed: number): Endless {
  const world = createWorld(seed);
  applyCommand(world, { type: 'place', kind: 'quartier', ...FIRST_QUARTIER });
  let tick = 0, slot = 0;

  function direct() {
    const w = world;
    switch (CYCLE[tick % CYCLE.length]) {
      case 'quartier':
        while (slot < SLOTS.length && !applyCommand(w, { type: 'place', kind: 'quartier', ...SLOTS[slot++] }));
        break;
      case 'matiere': {
        const r = NEW_RES.find(x => !w.activeRes.includes(x));
        if (r) w.activeRes.push(r);
        break;
      }
      case 'contamination': w.contamination = Math.min(CONTAMINATION_MAX, w.contamination + CONTAMINATION_STEP); break;
      case 'emission': w.emitRate *= EMIT_FACTOR; break;
    }
    tick++;
    // le nombre de tirages nextRandom dépend de l'existence d'un acteur non-quartier (déterministe)
    if (w.time >= OUTAGE_FROM - EPS) {
      const others = w.actors.filter(a => a.kind !== 'quartier');
      if (others.length) others[Math.floor(nextRandom(w) * others.length)].offlineUntil = w.time + OUTAGE_DURATION;
    }
  }

  return {
    world,
    step(cmds) {
      step(world, cmds);
      if (!world.over && world.time >= (tick + 1) * TICK - EPS) direct();
    },
    score: () => ({ time: world.time, index: circularityIndex(world) }),
  };
}
