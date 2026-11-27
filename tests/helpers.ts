import { ACTOR_DEFS, DT } from '../src/sim/defs';
import { step } from '../src/sim/step';
import { applyCommand, planRoute } from '../src/sim/world';
import type { Endless } from '../src/modes/endless';
import type { ActorKind, Command, Pt, Res, World } from '../src/sim/types';

export function run(w: World, seconds: number, cmds: Command[] = []): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) step(w, i === 0 ? cmds : []);
}

export function place(w: World, kind: ActorKind, x: number, y: number, res?: Res): number {
  applyCommand(w, { type: 'place', kind, x, y, ...(res ? { res } : {}) });
  return w.actors[w.actors.length - 1].id;
}

/** Relie deux bâtiments (le tracé est choisi par la simulation) ; renvoie le dernier tronçon créé. */
export function link(w: World, from: number, to: number): number {
  const a = w.actors.find(x => x.id === from)!,
    b = w.actors.find(x => x.id === to)!;
  applyCommand(w, { type: 'route', from: a, to: b });
  return w.routes[w.routes.length - 1].id;
}

// --- Bot de scénario (mode A) : réagit aux événements du directeur ---

const HUB = { tri: { x: 240, y: 360 }, decharge: { x: 240, y: 430 } };
const RECYCLEUR_POS: Record<Res, Pt> = {
  plastique: { x: 320, y: 300 },
  verre: { x: 320, y: 370 },
  metal: { x: 320, y: 440 },
  bio: { x: 320, y: 510 },
  papier: { x: 320, y: 580 },
};
const TUNING = { fabAt: 100, reserve: 15, triAt: 130, upgradeAt: 100 };

/**
 * Réseau « bon » incrémental, un fabricant par recycleur (un seul ne suffit pas au débit). Phase 1 : quartiers →
 * recycleurs directs. Dès que le budget le permet : tri + décharge, routes directes retirées. Puis améliorations.
 */
export function syncGoodNetwork(w: World): void {
  const actorAt = (p: Pt) => w.actors.find(a => a.x === p.x && a.y === p.y);
  const spend = (c: Command) =>
    (c.type === 'place' ? ACTOR_DEFS[c.kind].cost : 0) + TUNING.reserve <= w.budget && applyCommand(w, c);
  const ensure = (kind: ActorKind, p: Pt, res?: Res) =>
    !!actorAt(p) || spend({ type: 'place', kind, ...p, ...(res ? { res } : {}) });
  const connect = (from: number, to: number) => {
    const a = w.actors.find(x => x.id === from)!,
      b = w.actors.find(x => x.id === to)!;
    const plan = planRoute(w, a, b);
    if (plan.error) return plan.error.startsWith('Déjà');
    return spend({ type: 'route', from: a, to: b });
  };
  for (const r of w.activeRes) if (!ensure('recycleur', RECYCLEUR_POS[r], r)) return;
  const qs = w.actors.filter(a => a.kind === 'quartier').map(a => a.id);
  const recs = w.activeRes.map(r => actorAt(RECYCLEUR_POS[r])!.id);
  const tri = actorAt(HUB.tri) && actorAt(HUB.decharge) ? actorAt(HUB.tri)!.id : null;
  // entrée : quartiers → (tri → recycleurs + décharge) ou quartiers → recycleurs
  if (tri !== null) {
    for (const q of qs) if (!connect(q, tri)) return;
    if (!connect(tri, actorAt(HUB.decharge)!.id)) return;
    for (const r of recs) if (!connect(tri, r)) return;
  } else for (const q of qs) for (const r of recs) if (!connect(q, r)) return;
  // sortie : tous les recycleurs → tous les fabricants → tous les quartiers ; un fabricant de plus quand tous saturent
  const fabAt = (i: number) => actorAt({ x: 420, y: 300 + 70 * i });
  let nFab = 0;
  while (fabAt(nFab)) nFab++;
  const fabs = Array.from({ length: nFab }, (_, i) => fabAt(i)!);
  if (nFab === 0 || (nFab < recs.length && w.budget >= TUNING.fabAt && fabs.every(f => f.queue.length >= 4))) {
    if (!ensure('fabricant', { x: 420, y: 300 + 70 * nFab })) return;
    fabs.push(fabAt(nFab)!);
  }
  for (const f of fabs) {
    for (const r of recs) if (!connect(r, f.id)) return;
    for (const q of qs) if (!connect(f.id, q)) return;
  }
  if (!actorAt(HUB.tri) && w.budget >= TUNING.triAt && !(ensure('tri', HUB.tri) && ensure('decharge', HUB.decharge)))
    return;
  // améliore l'acteur le plus chargé (file pleine, sortie vide = goulot) quand il reste du budget
  if (w.budget >= TUNING.upgradeAt) {
    const busiest = w.actors
      .filter(a => a.kind !== 'quartier' && a.kind !== 'decharge' && a.level < 3)
      .sort((a, b) => b.queue.length - b.out.length - (a.queue.length - a.out.length))[0];
    if (busiest) applyCommand(w, { type: 'upgrade', id: busiest.id });
  }
}

const BOT_QUARTIERS: Pt[] = [
  { x: 160, y: 360 },
  { x: 160, y: 160 },
];

/** Joue `seconds` de simulation en resynchronisant le réseau chaque seconde. */
export function playGoodGame(e: Endless, seconds: number): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n && !e.world.over; i++) {
    // le bot vise un plan fixe : on ramène les quartiers (apparus au hasard) à ses emplacements
    e.world.actors
      .filter(a => a.kind === 'quartier')
      .forEach((q, k) => k < BOT_QUARTIERS.length && Object.assign(q, BOT_QUARTIERS[k]));
    if (i % 20 === 0) syncGoodNetwork(e.world);
    e.step([]);
  }
}
