import { START_BUDGET } from '../sim/defs';
import { nextRandom } from '../sim/rng';
import { step } from '../sim/step';
import { circularityIndex } from '../sim/metrics';
import { applyCommand, createWorld } from '../sim/world';
import type { Cell, Command, Res, World } from '../sim/types';

/** Prochain événement du directeur, annoncé dans le HUD (repris de la branche gameplay). */
export type NextEvent = {
  /** Secondes restantes. */
  in: number;
  /** `panne` : le tick n'apporte rien d'autre qu'une panne. */
  kind: 'quartier' | 'matiere' | 'contamination' | 'emission' | 'panne';
  /** Matière qui arrive (kind `matiere`). */
  res?: Res;
  /** Un bâtiment tombera aussi en panne. */
  outage: boolean;
};

export type Endless = {
  world: World;
  step(cmds: Command[]): void;
  score(): { time: number; index: number };
  /** Le prochain événement du directeur ; null si la partie est finie. */
  nextEvent(): NextEvent | null;
};

// Calendrier du directeur (données) : un tick toutes les TICK s, événements en cycle.
export const TICK = 60;
const EPS = 1e-6; // tolérance sur w.time (cumul de DT flottants)
export const OUTAGE_FROM = 300;
export const OUTAGE_DURATION = 10;
export const NEW_RES: Res[] = ['metal', 'bio', 'papier'];
export const CONTAMINATION_STEP = 0.05,
  CONTAMINATION_MAX = 0.4,
  EMIT_FACTOR = 1.2;
export const FIRST_QUARTIER: Cell = { c: 1, r: 3 };
/** Quartiers à une case ou deux de la route : il faut construire la leur. */
export const SLOTS: Cell[] = [
  { c: 15, r: 2 },
  { c: 6, r: 3 },
  { c: 0, r: 6 },
  { c: 10, r: 3 },
  { c: 15, r: 5 },
  { c: 0, r: 0 },
];
/**
 * Base offerte au départ : une boucle classique (quartier → tri → recycleur → fabricant → quartier, le reste du tri
 * en décharge), mais incomplète (un seul recycleur, le verre part à la décharge) : elle perd de l'argent tant que le
 * joueur ne l'améliore pas. Tout est collé à la boucle, qu'une traverse coupe en deux.
 */
export const BASE: Command[] = [
  { type: 'place', kind: 'tri', c: 4, r: 0 },
  { type: 'road', from: { c: 4, r: 1 }, to: { c: 4, r: 5 } }, // traverse : raccourci vers la décharge
  { type: 'place', kind: 'recycleur', c: 7, r: 2, res: 'plastique' },
  { type: 'place', kind: 'fabricant', c: 14, r: 1 },
  { type: 'place', kind: 'decharge', c: 7, r: 6 },
];
const CYCLE = ['quartier', 'matiere', 'contamination', 'emission'] as const;

export function createEndless(seed: number): Endless {
  const world = createWorld(seed);
  applyCommand(world, { type: 'place', kind: 'quartier', ...FIRST_QUARTIER });
  for (const c of BASE) applyCommand(world, c);
  world.budget = START_BUDGET; // la base est offerte
  let tick = 0,
    slot = 0;

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
      case 'contamination':
        w.contamination = Math.min(CONTAMINATION_MAX, w.contamination + CONTAMINATION_STEP);
        break;
      case 'emission':
        w.emitRate *= EMIT_FACTOR;
        break;
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
    nextEvent() {
      if (world.over) return null;
      for (let k = tick; ; k++) {
        const at = (k + 1) * TICK,
          kind = CYCLE[k % CYCLE.length],
          res = NEW_RES.find(x => !world.activeRes.includes(x));
        const outage = at >= OUTAGE_FROM - EPS && world.actors.some(a => a.kind !== 'quartier');
        // un événement sans effet (plafond atteint) est sauté ; l'émission, elle, monte toujours
        const idle =
          (kind === 'quartier' && slot >= SLOTS.length) ||
          (kind === 'matiere' && !res) ||
          (kind === 'contamination' && world.contamination >= CONTAMINATION_MAX - EPS);
        if (idle && !outage) continue;
        return {
          in: Math.max(0, at - world.time),
          kind: idle ? 'panne' : kind,
          ...(kind === 'matiere' && res ? { res } : {}),
          outage,
        };
      }
    },
  };
}
