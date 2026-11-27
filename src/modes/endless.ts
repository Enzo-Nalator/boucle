import { nextRandom } from '../sim/rng';
import { step } from '../sim/step';
import { circularityIndex } from '../sim/metrics';
import { applyCommand, createWorld } from '../sim/world';
import { distToPolyline } from '../sim/geo';
import type { Command, Pt, Res, World } from '../sim/types';
import { MAP_H, MAP_W, type MapId } from '../sim/maps';

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
export const MAX_QUARTIERS = 7;
/** Zone d'apparition : marge pour le HUD, la barre d'outils et les cases sous les bâtiments. */
export const SPAWN = { x0: 80, x1: MAP_W - 80, y0: 90, y1: MAP_H - 110 };

/**
 * Pose un quartier à un endroit au hasard (sec, loin des autres, hors des routes). Les écarts exigés se relâchent
 * si la carte se remplit.
 */
function spawnQuartier(w: World): boolean {
  for (let i = 0; i < 300; i++) {
    const p: Pt = {
      x: Math.round(SPAWN.x0 + nextRandom(w) * (SPAWN.x1 - SPAWN.x0)),
      y: Math.round(SPAWN.y0 + nextRandom(w) * (SPAWN.y1 - SPAWN.y0)),
    };
    const apart = i < 100 ? 260 : i < 200 ? 160 : 90;
    if (w.actors.some(a => Math.hypot(a.x - p.x, a.y - p.y) < (a.kind === 'quartier' ? apart : 90))) continue;
    if (i < 200 && w.routes.some(r => distToPolyline(p, r.points) < 45)) continue;
    if (applyCommand(w, { type: 'place', kind: 'quartier', ...p })) return true;
  }
  return false;
}
const CYCLE = ['quartier', 'matiere', 'contamination', 'emission'] as const;

export function createEndless(seed: number, map: MapId = 'plaine'): Endless {
  const world = createWorld(seed, map);
  spawnQuartier(world);
  let tick = 0;
  const full = () => world.actors.filter(a => a.kind === 'quartier').length >= MAX_QUARTIERS;

  function direct() {
    const w = world;
    switch (CYCLE[tick % CYCLE.length]) {
      case 'quartier':
        if (!full()) spawnQuartier(w);
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
          (kind === 'quartier' && full()) ||
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
