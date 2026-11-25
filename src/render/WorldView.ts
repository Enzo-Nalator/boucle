import Phaser from 'phaser';
import type { Actor, Pt, World } from '../sim/types';
import { ACTOR_BASE, ACTOR_LABEL, GREY, GRASS, INK, RES_COLOR, ROAD } from './theme';
import { levelPips, pointAt, routeWidth } from './layout';
import { ACTOR_DEFS } from '../sim/defs';

const R = 30; // rayon de la pastille : sert aussi à la détection du toucher
const WHITE = 0xffffff;
const COLS = 6,
  STEP = 10,
  STUCK_SHOW = 1.5; // secondes avant d'afficher qu'un paquet est coincé
export const vec = (pts: { x: number; y: number }[]): Phaser.Math.Vector2[] =>
  pts.map(p => new Phaser.Math.Vector2(p.x, p.y));
type G = Phaser.GameObjects.Graphics;

const rect = (g: G, x: number, y: number, w: number, h: number, c: number, a = 1) =>
  g.fillStyle(c, a).fillRect(x, y, w, h);
const tri = (g: G, c: number, ...p: number[]) => g.fillStyle(c, 1).fillTriangle(p[0], p[1], p[2], p[3], p[4], p[5]);

function house(g: G, x: number, y: number, s: number, wall: number, roof: number) {
  rect(g, x - s, y - s * 0.2, 2 * s, s * 1.2, wall);
  tri(g, roof, x - s * 1.2, y - s * 0.2, x + s * 1.2, y - s * 0.2, x, y - s * 1.2);
  rect(g, x - s * 0.2, y + s * 0.35, s * 0.4, s * 0.65, 0x8a5a3c);
}

/** Bâtiment de chaque acteur, centré sur (x, y), tenant dans la pastille. */
function building(g: G, a: Actor) {
  const { x, y } = a;
  switch (a.kind) {
    case 'quartier':
      house(g, x - 9, y + 3, 8, 0xfff4e0, 0xd9663e);
      house(g, x + 10, y + 7, 7, 0xf6d9a8, 0x4e7fc4);
      break;
    case 'collecteur':
      rect(g, x - 16, y - 8, 32, 22, 0x6b7a8f);
      tri(g, 0x4b5668, x - 18, y - 8, x + 18, y - 8, x, y - 20);
      rect(g, x - 9, y + 1, 18, 13, 0xdfe6ee);
      rect(g, x - 9, y + 7, 18, 1.5, 0x6b7a8f);
      break;
    case 'tri':
      rect(g, x - 17, y - 6, 34, 20, 0x7d6bd6);
      rect(g, x - 12, y - 16, 7, 10, 0x5b4cb0);
      rect(g, x + 2, y - 12, 7, 6, 0x5b4cb0);
      rect(g, x - 17, y + 8, 34, 4, 0x3d3566);
      for (let i = 0; i < 3; i++) g.fillStyle(0xffffff, 1).fillCircle(x - 9 + 9 * i, y + 1, 2.5);
      break;
    case 'recycleur': {
      const c = a.res ? RES_COLOR[a.res] : GREY;
      rect(g, x - 17, y - 6, 34, 20, c);
      rect(g, x - 13, y - 17, 8, 11, 0x5b6068);
      rect(g, x - 17, y - 8, 34, 4, INK, 0.35);
      g.lineStyle(3, WHITE, 1).strokeCircle(x + 3, y + 5, 6); // anneau : « recyclage »
      tri(g, WHITE, x + 3, y - 1, x + 8, y - 4, x + 8, y + 2);
      break;
    }
    case 'fabricant':
      rect(g, x - 17, y - 4, 34, 18, 0xc0623e);
      for (let i = 0; i < 3; i++) tri(g, 0x9c4a2c, x - 17 + 11.3 * i, y - 4, x - 5.7 + 11.3 * i, y - 4, x - 17 + 11.3 * i, y - 16);
      rect(g, x - 5, y + 4, 10, 10, 0xffe9a8);
      break;
    case 'reparateur':
      house(g, x, y + 3, 12, 0xfff4e0, 0xd23c3c);
      rect(g, x - 2.5, y - 2, 5, 14, WHITE);
      rect(g, x - 7, y + 2.5, 14, 5, WHITE);
      break;
    case 'decharge':
      tri(g, 0x8b7d70, x - 20, y + 14, x + 20, y + 14, x, y - 14);
      tri(g, 0x6e6258, x - 4, y + 14, x + 20, y + 14, x + 6, y - 2);
      for (const [dx, dy] of [[-8, 8], [5, 4], [10, 11], [-2, 11]]) g.fillStyle(0x4a423b, 1).fillCircle(x + dx, y + dy, 2);
      break;
  }
}

/** Camion orienté selon la route ; la caisse a la couleur de la matière, un point sombre = contaminé. */
function truck(g: G, p: Pt, q: Pt, color: number, dirty: boolean) {
  const ang = Math.atan2(q.y - p.y, q.x - p.x),
    c = Math.cos(ang),
    s = Math.sin(ang);
  const at = (u: number, v: number) => new Phaser.Math.Vector2(p.x + 1.3 * (u * c - v * s), p.y + 1.3 * (u * s + v * c));
  const box = (u0: number, u1: number, v: number, col: number) =>
    g.fillStyle(col, 1).fillPoints([at(u0, -v), at(u1, -v), at(u1, v), at(u0, v)], true);
  box(-9, 5, 5.5, 0x2b2f36); // contour
  box(-8, 4, 4.5, color); // caisse
  box(4, 9, 4.5, 0x2b2f36); // cabine
  box(5, 8, 3, 0xdfe6ee);
  if (dirty) {
    const d = at(-2, 0);
    g.fillStyle(INK, 1).fillCircle(d.x, d.y, 2.2);
  }
}

export class WorldView {
  private g: G;
  private labels = new Map<number, Phaser.GameObjects.Text>();
  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics();
    scene.cameras.main.setBackgroundColor(GRASS);
  }

  private road(r: { points: Pt[]; priority: number }) {
    const g = this.g,
      pts = vec(r.points),
      w = 14 + 3 * routeWidth(r.priority) - 18;
    g.lineStyle(w + 4, 0x6b7078, 1).strokePoints(pts);
    g.lineStyle(w, ROAD, 1).strokePoints(pts);
    let len = 0; // ligne centrale pointillée
    for (let i = 1; i < r.points.length; i++) len += Math.hypot(r.points[i].x - r.points[i - 1].x, r.points[i].y - r.points[i - 1].y);
    g.lineStyle(2, WHITE, 0.9);
    for (let d = 6; d + 8 < len; d += 18) {
      const a = pointAt(r.points, d),
        b = pointAt(r.points, d + 8);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  draw(w: World): void {
    const g = this.g;
    g.clear();
    for (const r of w.routes) this.road(r);
    for (const r of w.routes)
      for (const t of r.transit)
        truck(g, pointAt(r.points, t.d), pointAt(r.points, t.d + 2), RES_COLOR[t.packet.res], t.packet.dirty);
    for (const a of w.actors) this.actor(a, w.time);
  }

  private label(a: Actor): Phaser.GameObjects.Text {
    let t = this.labels.get(a.id);
    if (!t) {
      t = this.scene.add
        .text(0, 0, ACTOR_LABEL[a.kind], { fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#2b2f36' })
        .setOrigin(0.5);
      this.labels.set(a.id, t);
    }
    return t;
  }

  private actor(a: Actor, time: number) {
    const g = this.g,
      off = a.offlineUntil > time,
      alpha = off ? 0.35 : 1,
      now = this.scene.time.now;
    const cap = ACTOR_DEFS[a.kind].capacity;
    const f = Math.min(1, (a.kind === 'quartier' ? a.queue.length : Math.max(a.queue.length, a.out.length)) / cap);
    const danger = a.kind === 'quartier' && f >= 0.8;

    g.fillStyle(INK, 0.15 * alpha).fillEllipse(a.x, a.y + R * 0.8, R * 2, R * 0.5);
    if (danger) g.lineStyle(5, 0xe5484d, 0.35 + 0.5 * Math.sin(now / 120) ** 2).strokeCircle(a.x, a.y, R + 6);
    g.fillStyle(ACTOR_BASE[a.kind], alpha).fillCircle(a.x, a.y, R);
    g.lineStyle(3, WHITE, alpha).strokeCircle(a.x, a.y, R);
    building(g, a);
    if (off) g.fillStyle(WHITE, 0.55).fillCircle(a.x, a.y, R);

    // stock : une case par place de la file, colorée par matière (carré = déchet, rond = matière, triangle = objet)
    const items = [...a.queue, ...a.out],
      n = Math.min(cap, 12),
      rows = Math.ceil(n / COLS),
      by = a.y + R + 4,
      x0 = a.x - (COLS * STEP - 2) / 2;
    g.fillStyle(WHITE, 0.9 * alpha).fillRoundedRect(x0 - 3, by - 3, COLS * STEP + 1, rows * STEP + 4, 5);
    for (let i = 0; i < n; i++) {
      const p = items[i],
        cx = x0 + (i % COLS) * STEP + 4,
        cy = by + Math.floor(i / COLS) * STEP + 4;
      if (!p) {
        g.fillStyle(0xe3e3e3, alpha).fillRect(cx - 4, cy - 4, 8, 8);
        continue;
      }
      g.fillStyle(RES_COLOR[p.res], alpha);
      if (p.kind === 'dechet') g.fillRect(cx - 4, cy - 4, 8, 8);
      else if (p.kind === 'matiere') g.fillCircle(cx, cy, 4.4);
      else g.fillTriangle(cx - 4.7, cy + 4, cx + 4.7, cy + 4, cx, cy - 4.7);
      if (p.dirty) g.fillStyle(INK, alpha).fillCircle(cx, cy, 1.7);
      if ((p.stuck ?? 0) > STUCK_SHOW) g.lineStyle(2, 0xe5484d, alpha).strokeRect(cx - 5.2, cy - 5.2, 10.4, 10.4);
    }
    const stuck = items.some(p => (p.stuck ?? 0) > STUCK_SHOW);
    const labelY = by + rows * STEP + 3;

    // niveau : étoiles dorées en haut à droite
    for (let i = 0; i < levelPips(a.level); i++) g.fillStyle(0xf5b800, alpha).fillCircle(a.x + R - 4 - 9 * i, a.y - R + 2, 4).lineStyle(1.5, INK, alpha).strokeCircle(a.x + R - 4 - 9 * i, a.y - R + 2, 4);

    // alerte : panneau « ! » qui bat
    if (danger || stuck) {
      const k = 1 + 0.08 * Math.sin(now / 150),
        x = a.x + R * 0.8,
        y = a.y - R * 0.9;
      g.fillStyle(0xffcc00, 1).fillTriangle(x - 12 * k, y + 10 * k, x + 12 * k, y + 10 * k, x, y - 13 * k);
      g.fillStyle(INK, 1).fillRect(x - 1.5, y - 6, 3, 9).fillCircle(x, y + 6.5, 1.8);
    }

    const t = this.label(a).setPosition(a.x, labelY + 7.5).setAlpha(alpha);
    g.fillStyle(WHITE, 0.85 * alpha).fillRoundedRect(a.x - t.width / 2 - 5, labelY, t.width + 10, 15, 7.5);
  }
}
