import Phaser from 'phaser';
import { ACTOR_DEFS } from '../sim/defs';
import { around, LOOP } from '../sim/grid';
import { isRoad } from '../sim/roads';
import type { Actor, ActorKind, Cell, Packet, Pt, Res, World } from '../sim/types';
import { ACTOR_BASE, GREY, INK, RES_COLOR, ROAD } from './theme';
import { CELL, cellCenter, levelPips, pathPoint } from './layout';

const T = 35; // demi-côté de la tuile d'un acteur (case de 80)
const ROAD_W = 15, // demi-largeur de la chaussée : deux voies
  LANE = 7; // décalage d'un camion vers la voie de droite
const WHITE = 0xffffff;
const SLOT_COLS = 6,
  STEP = 10;
type G = Phaser.GameObjects.Graphics;

const rect = (g: G, x: number, y: number, w: number, h: number, c: number, a = 1) =>
  g.fillStyle(c, a).fillRect(x, y, w, h);
const tri = (g: G, c: number, ...p: number[]) => g.fillStyle(c, 1).fillTriangle(p[0], p[1], p[2], p[3], p[4], p[5]);

function house(g: G, x: number, y: number, s: number, wall: number, roof: number) {
  rect(g, x - s, y - s * 0.2, 2 * s, s * 1.2, wall);
  tri(g, roof, x - s * 1.2, y - s * 0.2, x + s * 1.2, y - s * 0.2, x, y - s * 1.2);
  rect(g, x - s * 0.2, y + s * 0.35, s * 0.4, s * 0.65, 0x8a5a3c);
}

/** Bâtiment d'un acteur centré sur (x, y). */
function building(g: G, kind: ActorKind, res: Res | undefined, x: number, y: number) {
  switch (kind) {
    case 'quartier':
      house(g, x - 9, y + 3, 8, 0xfff4e0, 0xd9663e);
      house(g, x + 10, y + 7, 7, 0xf6d9a8, 0x4e7fc4);
      break;
    case 'tri':
      rect(g, x - 17, y - 6, 34, 20, 0x7d6bd6);
      rect(g, x - 12, y - 16, 7, 10, 0x5b4cb0);
      rect(g, x + 2, y - 12, 7, 6, 0x5b4cb0);
      rect(g, x - 17, y + 8, 34, 4, 0x3d3566);
      for (let i = 0; i < 3; i++) g.fillStyle(WHITE, 1).fillCircle(x - 9 + 9 * i, y + 1, 2.5);
      break;
    case 'recycleur':
      rect(g, x - 17, y - 6, 34, 20, res ? RES_COLOR[res] : GREY);
      rect(g, x - 13, y - 17, 8, 11, 0x5b6068);
      rect(g, x - 17, y - 8, 34, 4, INK, 0.35);
      g.lineStyle(3, WHITE, 1).strokeCircle(x + 3, y + 5, 6); // anneau : « recyclage »
      tri(g, WHITE, x + 3, y - 1, x + 8, y - 4, x + 8, y + 2);
      break;
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
    case 'garage': // toit, porte à lames, et un camion qui dépasse
      rect(g, x - 17, y - 6, 34, 20, 0x4e7fc4);
      tri(g, 0x35598c, x - 20, y - 6, x + 20, y - 6, x, y - 16);
      rect(g, x - 10, y - 1, 20, 15, 0xdfe6ee);
      for (let i = 0; i < 4; i++) rect(g, x - 10, y + 1 + 3.5 * i, 20, 1.2, 0x9aa0a6);
      break;
  }
}

/** Camion sur la voie de droite (DA de la branche gameplay) : caisse de la couleur de la matière (une bande par paquet
 * quand il en porte plusieurs), point sombre = contaminé, croix blanche = réutilisable. */
function truck(g: G, p: Pt, ang: number, load: Packet[]) {
  const pk = load[0],
    n = Math.min(load.length, 4);
  const c = Math.cos(ang),
    s = Math.sin(ang);
  const at = (u: number, v: number) =>
    new Phaser.Math.Vector2(p.x - s * LANE + 1.4 * (u * c - v * s), p.y + c * LANE + 1.4 * (u * s + v * c));
  const box = (u0: number, u1: number, v: number, col: number) =>
    g.fillStyle(col, 1).fillPoints([at(u0, -v), at(u1, -v), at(u1, v), at(u0, v)], true);
  box(-9, 5, 4.8, INK); // contour
  for (let k = 0; k < n; k++) box(-8 + (12 * k) / n, -8 + (12 * (k + 1)) / n, 3.8, RES_COLOR[load[k].res]); // caisse
  box(4, 9, 3.8, INK); // cabine
  box(5, 8, 2.4, 0xdfe6ee);
  const m = at(-2, 0);
  if (n > 1) return;
  if (pk.dirty) g.fillStyle(INK, 1).fillCircle(m.x, m.y, 2.6);
  else if (pk.kind === 'dechet' && pk.reusable)
    g.fillStyle(WHITE, 1)
      .fillRect(m.x - 3.5, m.y - 1.2, 7, 2.4)
      .fillRect(m.x - 1.2, m.y - 3.5, 2.4, 7);
}

/** Carrefour : feu tricolore. */
function crossing(g: G, p: Pt) {
  g.fillStyle(0xf0a030, 1).fillCircle(p.x, p.y, 14);
  g.fillStyle(INK, 1).fillRoundedRect(p.x - 5.5, p.y - 11, 11, 22, 3);
  g.fillStyle(0xe5484d, 1).fillCircle(p.x, p.y - 6, 2.8);
  g.fillStyle(0xffcc00, 1).fillCircle(p.x, p.y, 2.8);
  g.fillStyle(0x4caf50, 1).fillCircle(p.x, p.y + 6, 2.8);
}

/** Rectangle de chaussée entre deux centres de case, débordant de h à chaque bout (coins carrés). */
function segment(g: G, a: Pt, b: Pt, h: number, col: number) {
  g.fillStyle(col, 1).fillRect(
    Math.min(a.x, b.x) - h,
    Math.min(a.y, b.y) - h,
    Math.abs(b.x - a.x) + 2 * h,
    Math.abs(b.y - a.y) + 2 * h,
  );
}

export class WorldView {
  private g: G;
  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics();
  }

  draw(w: World): void {
    const g = this.g;
    g.clear();
    // routes, façon gameplay : toutes les bordures puis les chaussées (raccords sans couture), ligne centrale en
    // pointillés. Un tronçon relie deux cases de route voisines, ou un bâtiment à une route qui le touche.
    const cells = [...LOOP, ...w.roads],
      road = (x: Cell) => isRoad(w, x.c, x.r),
      segs: [Pt, Pt][] = [];
    for (const x of cells)
      for (const n of [
        { c: x.c + 1, r: x.r },
        { c: x.c, r: x.r + 1 },
      ])
        if (road(n)) segs.push([cellCenter(x), cellCenter(n)]);
    for (const a of w.actors) for (const n of around(a)) if (road(n)) segs.push([cellCenter(a), cellCenter(n)]);
    for (const [h, col] of [
      [ROAD_W + 2, 0x6b7078],
      [ROAD_W, ROAD],
    ])
      for (const [a, b] of segs) segment(g, a, b, h, col);
    g.lineStyle(2, WHITE, 0.9);
    for (const [a, b] of segs)
      for (let d = 5; d < CELL; d += 20) {
        const u = d / CELL,
          v = (d + 10) / CELL;
        g.lineBetween(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.x + (b.x - a.x) * v, a.y + (b.y - a.y) * v);
      }
    for (const t of w.trucks) {
      const p = pathPoint(t.path, t.d),
        q0 = pathPoint(t.path, t.d - 0.05),
        q1 = pathPoint(t.path, t.d + 0.05);
      truck(g, p, Math.atan2(q1.y - q0.y, q1.x - q0.x), t.load);
    }
    for (const x of cells) if (around(x).filter(road).length >= 3) crossing(g, cellCenter(x));
    for (const a of w.actors) this.actor(a, w.time);
  }

  private actor(a: Actor, time: number) {
    const g = this.g,
      { x, y } = cellCenter(a),
      off = a.offlineUntil > time,
      alpha = off ? 0.35 : 1,
      now = this.scene.time.now;
    const cap = ACTOR_DEFS[a.kind].capacity;
    const f = Math.min(1, (a.kind === 'quartier' ? a.queue.length : Math.max(a.queue.length, a.out.length)) / cap);
    const danger = a.kind === 'quartier' && f >= 0.8;

    if (danger)
      g.lineStyle(5, 0xe5484d, 0.35 + 0.5 * Math.sin(now / 120) ** 2).strokeRoundedRect(
        x - T - 5,
        y - T - 5,
        2 * T + 10,
        2 * T + 10,
        14,
      );
    g.fillStyle(ACTOR_BASE[a.kind], alpha).fillRoundedRect(x - T, y - T, 2 * T, 2 * T, 10);
    g.lineStyle(3, WHITE, alpha).strokeRoundedRect(x - T, y - T, 2 * T, 2 * T, 10);
    building(g, a.kind, a.res, x, cap ? y - 12 : y); // sans cases de stock (garage), le dessin se centre
    if (off) g.fillStyle(WHITE, 0.55).fillRoundedRect(x - T, y - T, 2 * T, 2 * T, 10);

    const items = [...a.queue, ...a.out],
      n = Math.min(cap, 12); // un garage ne stocke rien : pas de cases
    if (n) this.slots(items, n, x, y, alpha);
    // niveau : étoiles dorées en haut à droite
    for (let i = 0; i < levelPips(a.level); i++)
      g.fillStyle(0xf5b800, alpha)
        .fillCircle(x + T - 8 - 9 * i, y - T + 8, 4)
        .lineStyle(1.5, INK, alpha)
        .strokeCircle(x + T - 8 - 9 * i, y - T + 8, 4);

    // alerte : panneau « ! » qui bat au-dessus d'un quartier presque plein
    if (danger) {
      const k = 1 + 0.08 * Math.sin(now / 150),
        ax = x + T - 4,
        ay = y - T + 2;
      g.fillStyle(0xffcc00, 1).fillTriangle(ax - 12 * k, ay + 10 * k, ax + 12 * k, ay + 10 * k, ax, ay - 13 * k);
      g.fillStyle(INK, 1)
        .fillRect(ax - 1.5, ay - 6, 3, 9)
        .fillCircle(ax, ay + 6.5, 1.8);
    }
  }

  /** Stock : une case par place de la file, colorée par matière (carré = déchet, rond = matière, triangle = objet). */
  private slots(items: Packet[], n: number, x: number, y: number, alpha: number) {
    const g = this.g,
      rows = Math.ceil(n / SLOT_COLS),
      by = y + 12,
      x0 = x - (SLOT_COLS * STEP - 2) / 2;
    g.fillStyle(WHITE, 0.9 * alpha).fillRoundedRect(x0 - 3, by - 3, SLOT_COLS * STEP + 1, rows * STEP + 4, 5);
    for (let i = 0; i < n; i++) {
      const p = items[i],
        cx = x0 + (i % SLOT_COLS) * STEP + 4,
        cy = by + Math.floor(i / SLOT_COLS) * STEP + 4;
      if (!p) {
        g.fillStyle(0xe3e3e3, alpha).fillRect(cx - 4, cy - 4, 8, 8);
        continue;
      }
      g.fillStyle(RES_COLOR[p.res], alpha);
      if (p.kind === 'dechet') g.fillRect(cx - 4, cy - 4, 8, 8);
      else if (p.kind === 'matiere') g.fillCircle(cx, cy, 4.4);
      else g.fillTriangle(cx - 4.7, cy + 4, cx + 4.7, cy + 4, cx, cy - 4.7);
      if (p.dirty) g.fillStyle(INK, alpha).fillCircle(cx, cy, 1.7);
    }
  }
}
