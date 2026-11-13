import Phaser from 'phaser';
import type { Actor, World } from '../sim/types';
import { ACTOR_SHAPE, type ShapeName, GREY, INK, RES_COLOR } from './theme';
import { levelPips, pointAt, routeWidth } from './layout';
import { ACTOR_DEFS } from '../sim/defs';

const SIZE = 22, RING = SIZE + 8;
export const vec = (pts: { x: number; y: number }[]): Phaser.Math.Vector2[] => pts.map(p => new Phaser.Math.Vector2(p.x, p.y));
type G = Phaser.GameObjects.Graphics;

function poly(g: G, x: number, y: number, r: number, n: number, rot: number) {
  g.fillPoints(vec(Array.from({ length: n }, (_, i) => ({ x: x + r * Math.cos(rot + (i * 2 * Math.PI) / n), y: y + r * Math.sin(rot + (i * 2 * Math.PI) / n) }))), true);
}

const SHAPES: Record<ShapeName, (g: G, x: number, y: number, s: number) => void> = {
  cercle: (g, x, y, s) => g.fillCircle(x, y, s),
  carre: (g, x, y, s) => g.fillRect(x - s, y - s, 2 * s, 2 * s),
  'carre-arrondi': (g, x, y, s) => g.fillRoundedRect(x - s, y - s, 2 * s, 2 * s, 7),
  triangle: (g, x, y, s) => poly(g, x, y, s * 1.2, 3, -Math.PI / 2),
  losange: (g, x, y, s) => poly(g, x, y, s * 1.25, 4, 0),
  croix: (g, x, y, s) => { g.fillRect(x - s, y - s / 3, 2 * s, (2 * s) / 3); g.fillRect(x - s / 3, y - s, (2 * s) / 3, 2 * s); },
  hexagone: (g, x, y, s) => poly(g, x, y, s * 1.1, 6, 0),
};

export class WorldView {
  private g: G;
  constructor(private scene: Phaser.Scene) { this.g = scene.add.graphics(); }

  draw(w: World): void {
    const g = this.g;
    g.clear();
    for (const r of w.routes) {
      g.lineStyle(routeWidth(r.priority), r.transit.length ? RES_COLOR[r.transit[0].packet.res] : GREY, 1);
      g.strokePoints(vec(r.points));
    }
    for (const r of w.routes) {
      for (const t of r.transit) {
        const p = pointAt(r.points, t.d);
        g.fillStyle(RES_COLOR[t.packet.res], 1).fillCircle(p.x, p.y, 5);
        g.lineStyle(1.5, INK, 1).strokeCircle(p.x, p.y, 5);
        if (t.packet.dirty) g.fillStyle(INK, 1).fillCircle(p.x, p.y, 2);
      }
    }
    for (const a of w.actors) this.actor(a, w.time);
  }

  private actor(a: Actor, time: number) {
    const g = this.g, off = a.offlineUntil > time, alpha = off ? 0.35 : 1;
    g.fillStyle(a.kind === 'recycleur' && a.res ? RES_COLOR[a.res] : INK, alpha);
    SHAPES[ACTOR_SHAPE[a.kind]](g, a.x, a.y, SIZE);
    const cap = ACTOR_DEFS[a.kind].capacity;
    const f = Math.min(1, (a.kind === 'quartier' ? a.queue.length : Math.max(a.queue.length, a.out.length)) / cap);
    let ringA = alpha;
    if (a.kind === 'quartier' && f >= 0.8) ringA *= 0.55 + 0.45 * Math.sin(this.scene.time.now / 120);
    for (let i = 0; i < levelPips(a.level); i++) g.fillStyle(INK, alpha).fillCircle(a.x - 5 + 10 * i, a.y + RING + 8, 3);
    g.lineStyle(4, INK, 0.15 * alpha).strokeCircle(a.x, a.y, RING);
    if (f > 0) {
      g.lineStyle(4, INK, ringA).beginPath();
      g.arc(a.x, a.y, RING, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * f, false);
      g.strokePath();
    }
  }
}
