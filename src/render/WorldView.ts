import Phaser from 'phaser';
import type { Actor, Packet, Pt, Route, World } from '../sim/types';
import { degrees } from '../sim/network';
import { ACTOR_BASE, ACTOR_LABEL, GREY, GRASS, INK, RES_COLOR, ROAD } from './theme';
import { levelPips, pointAt } from './layout';
import { ACTOR_DEFS } from '../sim/defs';
import { inWater, MAPS } from '../sim/maps';
import { RES_NAME } from '../ui/buildings';

const R = 30; // rayon de la pastille : sert aussi à la détection du toucher
const WHITE = 0xffffff;
const ROAD_W = 22, // deux voies
  LANE = 5.5;
const COLS = 6,
  STEP = 10,
  STUCK_SHOW = 1.5, // secondes avant d'afficher qu'un paquet est coincé
  POP_TIME = 1.2; // durée (s) d'un « +4 € » au-dessus d'un bâtiment
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
      for (let i = 0; i < 3; i++)
        tri(g, 0x9c4a2c, x - 17 + 11.3 * i, y - 4, x - 5.7 + 11.3 * i, y - 4, x - 17 + 11.3 * i, y - 16);
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
      for (const [dx, dy] of [
        [-8, 8],
        [5, 4],
        [10, 11],
        [-2, 11],
      ])
        g.fillStyle(0x4a423b, 1).fillCircle(x + dx, y + dy, 2);
      break;
  }
}

/** Camion sur la voie de droite ; la caisse a la couleur de la matière, point sombre = contaminé, croix = réparable. */
function truck(g: G, r: Route, d: number, dir: 1 | -1, p: Packet) {
  const here = pointAt(r.points, d),
    back = pointAt(r.points, d - 2),
    front = pointAt(r.points, d + 2);
  const ang = Math.atan2((front.y - back.y) * dir, (front.x - back.x) * dir),
    c = Math.cos(ang),
    s = Math.sin(ang);
  const at = (u: number, v: number) =>
    new Phaser.Math.Vector2(here.x - s * LANE + 1.1 * (u * c - v * s), here.y + c * LANE + 1.1 * (u * s + v * c));
  const box = (u0: number, u1: number, v: number, col: number) =>
    g.fillStyle(col, 1).fillPoints([at(u0, -v), at(u1, -v), at(u1, v), at(u0, v)], true);
  box(-9, 5, 4.8, 0x2b2f36); // contour
  box(-8, 4, 3.8, RES_COLOR[p.res]); // caisse
  box(4, 9, 3.8, 0x2b2f36); // cabine
  box(5, 8, 2.4, 0xdfe6ee);
  const m = at(-2, 0);
  if (p.dirty) g.fillStyle(INK, 1).fillCircle(m.x, m.y, 2.2);
  else if (p.kind === 'dechet' && p.reusable) plus(g, m.x, m.y, 1);
}

/** Croix blanche : déchet réutilisable, un réparateur peut le prendre. */
function plus(g: G, x: number, y: number, alpha: number) {
  g.fillStyle(WHITE, alpha)
    .fillRect(x - 3, y - 1, 6, 2)
    .fillRect(x - 1, y - 3, 2, 6);
}

export class WorldView {
  private g: G;
  private labels = new Map<number, Phaser.GameObjects.Text>();
  private pops = new Map<World['cash'][number], Phaser.GameObjects.Text>();
  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics();
    scene.cameras.main.setBackgroundColor(GRASS);
  }

  private water(w: World) {
    const g = this.g;
    for (const r of MAPS[w.map].water) {
      g.fillStyle(0xf2e2b0, 1).fillRoundedRect(r.x - 7, r.y - 7, r.w + 14, r.h + 14, 24); // berge
      g.fillStyle(0x6cc4ee, 1).fillRoundedRect(r.x, r.y, r.w, r.h, 18);
      g.lineStyle(3, WHITE, 0.55);
      for (let y = r.y + 30; y < r.y + r.h - 10; y += 55)
        for (let x = r.x + 18; x + 28 < r.x + r.w; x += 70) {
          const o = ((y / 55) % 2) * 20;
          if (x + o + 28 < r.x + r.w)
            g.lineBetween(x + o, y, x + o + 14, y - 5).lineBetween(x + o + 14, y - 5, x + o + 28, y);
        }
    }
  }

  /** Garde-corps en bois sur les tronçons de route au-dessus de l'eau. */
  private bridge(w: World, points: Pt[], len: number, half: number) {
    for (let d = 0; d < len; d += 5) {
      const p = pointAt(points, d);
      if (!inWater(w.map, p)) continue;
      const q = pointAt(points, d + 2),
        a = Math.atan2(q.y - p.y, q.x - p.x),
        nx = -Math.sin(a) * half,
        ny = Math.cos(a) * half;
      this.g
        .fillStyle(0x8a5a3c, 1)
        .fillCircle(p.x + nx, p.y + ny, 3.5)
        .fillCircle(p.x - nx, p.y - ny, 3.5);
    }
  }

  /** Carrefour : feu tricolore ; les camions y ralentissent, dans les deux sens. */
  private crossing(p: Pt) {
    const g = this.g;
    g.fillStyle(0xf0a030, 1).fillCircle(p.x, p.y, 13);
    g.fillStyle(INK, 1).fillRoundedRect(p.x - 5, p.y - 10, 10, 20, 3);
    g.fillStyle(0xe5484d, 1).fillCircle(p.x, p.y - 5.5, 2.6);
    g.fillStyle(0xffcc00, 1).fillCircle(p.x, p.y, 2.6);
    g.fillStyle(0x4caf50, 1).fillCircle(p.x, p.y + 5.5, 2.6);
  }

  /** Toutes les bordures d'abord, puis les chaussées : les embranchements se raccordent sans couture. */
  private roads(w: World) {
    const g = this.g;
    for (const [width, color] of [
      [ROAD_W + 4, 0x6b7078],
      [ROAD_W, ROAD],
    ] as const)
      for (const r of w.routes) {
        g.lineStyle(width, color, 1).strokePoints(vec(r.points));
        for (const p of r.points) g.fillStyle(color, 1).fillCircle(p.x, p.y, width / 2);
      }
    g.lineStyle(2, WHITE, 0.9); // ligne centrale pointillée
    for (const r of w.routes)
      for (let d = 6; d + 8 < r.length; d += 18) {
        const a = pointAt(r.points, d),
          b = pointAt(r.points, d + 8);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
  }

  draw(w: World): void {
    const g = this.g;
    g.clear();
    this.water(w);
    this.roads(w);
    for (const r of w.routes) this.bridge(w, r.points, r.length, ROAD_W / 2 + 3);
    const byId = new Map(w.routes.map(r => [r.id, r]));
    for (const t of w.trucks) truck(g, byId.get(t.road)!, t.d, t.dir, t.packet);
    const deg = degrees(w);
    for (const j of w.junctions) if ((deg.get(j.id) ?? 0) >= 3) this.crossing(j);
    for (const a of w.actors) this.actor(a, w.time);
    this.money(w);
    for (const [id, t] of this.labels)
      if (!w.actors.some(a => a.id === id)) {
        t.destroy(); // bâtiment démoli ou partie relancée
        this.labels.delete(id);
      }
  }

  /** L'argent apparaît là où il est gagné (vert) ou dépensé (rouge). */
  private money(w: World) {
    const live = new Set<World['cash'][number]>();
    for (const c of w.cash) {
      const age = w.time - c.t,
        a = age < POP_TIME && w.actors.find(x => x.id === c.id);
      if (!a) continue;
      live.add(c);
      let t = this.pops.get(c);
      if (!t) {
        t = this.scene.add
          .text(0, 0, `${c.v > 0 ? '+' : '−'}${String(Math.abs(c.v)).replace('.', ',')} €`, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: c.v > 0 ? '#17692c' : '#c0262c',
            stroke: '#ffffff',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(1);
        this.pops.set(c, t);
      }
      t.setPosition(a.x, a.y - R - 6 - age * 22).setAlpha(Math.min(1, 2 * (1 - age / POP_TIME)));
    }
    for (const [c, t] of this.pops)
      if (!live.has(c)) {
        t.destroy();
        this.pops.delete(c);
      }
  }

  private label(a: Actor): Phaser.GameObjects.Text {
    const text =
      a.kind === 'recycleur' && a.res ? `${ACTOR_LABEL[a.kind]} ${RES_NAME[a.res].toLowerCase()}` : ACTOR_LABEL[a.kind];
    let t = this.labels.get(a.id);
    if (t && t.text !== text) t.setText(text); // identifiants réutilisés d'une partie à l'autre
    if (!t) {
      t = this.scene.add
        .text(0, 0, text, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#2b2f36',
        })
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
      else if (p.kind === 'dechet' && p.reusable) plus(g, cx, cy, alpha);
      if ((p.stuck ?? 0) > STUCK_SHOW) g.lineStyle(2, 0xe5484d, alpha).strokeRect(cx - 5.2, cy - 5.2, 10.4, 10.4);
    }
    const stuck = items.some(p => (p.stuck ?? 0) > STUCK_SHOW);
    const labelY = by + rows * STEP + 3;

    // niveau : étoiles dorées en haut à droite
    for (let i = 0; i < levelPips(a.level); i++)
      g.fillStyle(0xf5b800, alpha)
        .fillCircle(a.x + R - 4 - 9 * i, a.y - R + 2, 4)
        .lineStyle(1.5, INK, alpha)
        .strokeCircle(a.x + R - 4 - 9 * i, a.y - R + 2, 4);

    // priorité : drapeaux bleus en haut à gauche
    for (let i = 0; i < a.priority; i++)
      g.fillStyle(0x1d6fd6, alpha).fillTriangle(
        a.x - R + 9 * i,
        a.y - R - 6,
        a.x - R + 9 * i,
        a.y - R + 6,
        a.x - R + 9 * i + 8,
        a.y - R,
      );

    // alerte : panneau « ! » qui bat
    if (danger || stuck) {
      const k = 1 + 0.08 * Math.sin(now / 150),
        x = a.x + R * 0.8,
        y = a.y - R * 0.9;
      g.fillStyle(0xffcc00, 1).fillTriangle(x - 12 * k, y + 10 * k, x + 12 * k, y + 10 * k, x, y - 13 * k);
      g.fillStyle(INK, 1)
        .fillRect(x - 1.5, y - 6, 3, 9)
        .fillCircle(x, y + 6.5, 1.8);
    }

    const t = this.label(a)
      .setPosition(a.x, labelY + 7.5)
      .setAlpha(alpha);
    g.fillStyle(WHITE, 0.85 * alpha).fillRoundedRect(a.x - t.width / 2 - 5, labelY, t.width + 10, 15, 7.5);
  }
}
