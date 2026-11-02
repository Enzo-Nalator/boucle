import Phaser from 'phaser';
import { LEVELS, RES, type NodeDef, type ResKey } from './levels';

const NODE_W = 190;
const ROW = 38;
const HEAD = 44;
const GRAB = 26; // rayon de saisie d'un port (px)
const SNAP = 44; // rayon d'accroche au relâchement
const INK = 0xe8eef5;

export interface GameState {
  title: string;
  links: number;
  total: number;
  won: boolean;
  last: boolean;
}

interface Port {
  node: NodeDef;
  kind: 'in' | 'out';
  res: ResKey;
  x: number;
  y: number;
  link: Link | null;
}

interface Link {
  out: Port;
  in: Port;
}

interface Drag {
  from: Port;
  trail: Phaser.Math.Vector2[];
}

type Pt = { x: number; y: number };

export class GameScene extends Phaser.Scene {
  levelIndex = 0;
  private nodes!: Phaser.GameObjects.Group;
  private linkGfx!: Phaser.GameObjects.Graphics;
  private dragGfx!: Phaser.GameObjects.Graphics;
  private ports: Port[] = [];
  private links: Link[] = [];
  private drag: Drag | null = null;
  private won = false;

  constructor() {
    super('game');
  }

  create(): void {
    this.nodes = this.add.group();
    this.linkGfx = this.add.graphics();
    this.dragGfx = this.add.graphics();
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.loadLevel(0);
  }

  loadLevel(i: number): void {
    this.levelIndex = i;
    this.nodes.clear(true, true);
    this.ports = [];
    this.links = []; // { out, in }
    this.drag = null;
    this.won = false;
    this.dragGfx.clear();

    const level = LEVELS[i];
    for (const n of level.nodes) this.buildNode(n);
    this.redraw();
    this.emitState();
  }

  private buildNode(n: NodeDef): void {
    const rows = Math.max(n.in.length, n.out.length);
    const h = HEAD + rows * ROW + 10;
    const g = this.add.graphics();
    g.fillStyle(0x1f3447, 1).fillRoundedRect(n.x, n.y, NODE_W, h, 14);
    g.lineStyle(2, 0x3a5671, 1).strokeRoundedRect(n.x, n.y, NODE_W, h, 14);
    const t = this.add.text(n.x + NODE_W / 2, n.y + 22, n.name, {
      fontSize: '22px', color: '#e8eef5', fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.nodes.addMultiple([g, t]);

    const place = (list: ResKey[], kind: 'in' | 'out') => list.forEach((res, k) => {
      const x = kind === 'in' ? n.x : n.x + NODE_W;
      const y = n.y + HEAD + k * ROW + ROW / 2;
      const label = this.add.text(kind === 'in' ? x + 18 : x - 18, y, RES[res].label, {
        fontSize: '16px', color: '#8fa3b5', fontFamily: 'sans-serif',
      }).setOrigin(kind === 'in' ? 0 : 1, 0.5);
      this.nodes.add(label);
      this.ports.push({ node: n, kind, res, x, y, link: null });
    });
    place(n.in, 'in');
    place(n.out, 'out');
  }

  private portAt(x: number, y: number, radius: number, filter: (p: Port) => boolean = () => true): Port | null {
    let best: Port | null = null;
    let bestD = radius;
    for (const p of this.ports) {
      if (!filter(p)) continue;
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d <= bestD) { best = p; bestD = d; }
    }
    return best;
  }

  private canLink(a: Port, b: Port): boolean {
    return a.kind !== b.kind && a.res === b.res && a.node !== b.node && !b.link;
  }

  onDown(pointer: Pt): void {
    if (this.won) return;
    const p = this.portAt(pointer.x, pointer.y, GRAB);
    if (!p) return;
    if (p.link) { this.removeLink(p.link); this.emitState(); } // reprendre un lien existant = le défaire
    this.drag = { from: p, trail: [new Phaser.Math.Vector2(p.x, p.y)] };
  }

  onMove(pointer: Pt): void {
    if (!this.drag) return;
    const trail = this.drag.trail;
    const last = trail[trail.length - 1];
    if (Phaser.Math.Distance.Between(last.x, last.y, pointer.x, pointer.y) > 3) {
      trail.push(new Phaser.Math.Vector2(pointer.x, pointer.y));
    }
    this.redraw(pointer);
  }

  onUp(pointer: Pt): void {
    if (!this.drag) return;
    const { from } = this.drag;
    const target = this.portAt(pointer.x, pointer.y, SNAP, (p) => this.canLink(from, p));
    this.drag = null;
    if (target) this.addLink(from, target);
    this.redraw();
    this.checkWin();
  }

  private addLink(a: Port, b: Port): void {
    const link: Link = a.kind === 'out' ? { out: a, in: b } : { out: b, in: a };
    a.link = b.link = link;
    this.links.push(link);
  }

  private removeLink(link: Link): void {
    link.out.link = link.in.link = null;
    this.links = this.links.filter((l) => l !== link);
  }

  private curve(a: Pt, b: Pt): Phaser.Curves.CubicBezier {
    const dx = Math.max(60, Math.abs(b.x - a.x) * 0.5);
    return new Phaser.Curves.CubicBezier(
      new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2(a.x + dx, a.y),
      new Phaser.Math.Vector2(b.x - dx, b.y), new Phaser.Math.Vector2(b.x, b.y),
    );
  }

  private redraw(pointer?: Pt): void {
    const g = this.linkGfx;
    g.clear();
    for (const l of this.links) {
      g.lineStyle(6, RES[l.out.res].color, 1);
      g.strokePoints(this.curve(l.out, l.in).getPoints(40));
    }

    for (const p of this.ports) {
      const hot = this.drag && this.canLink(this.drag.from, p);
      if (hot) g.lineStyle(3, INK, 0.9).strokeCircle(p.x, p.y, 17);
      g.fillStyle(RES[p.res].color, p.link || hot || !this.drag ? 1 : 0.35).fillCircle(p.x, p.y, 11);
      g.lineStyle(2, 0x14202b, 1).strokeCircle(p.x, p.y, 11);
    }

    const d = this.dragGfx;
    d.clear();
    if (this.drag && pointer) {
      d.lineStyle(6, RES[this.drag.from.res].color, 0.9);
      d.strokePoints(this.drag.trail);
    }
  }

  private emitState(): void {
    this.game.events.emit('state', <GameState>{
      title: LEVELS[this.levelIndex].title,
      links: this.links.length,
      total: this.ports.length / 2,
      won: this.won,
      last: this.levelIndex === LEVELS.length - 1,
    });
  }

  private checkWin(): void {
    this.won = this.links.length === this.ports.length / 2;
    this.emitState();
  }

  next(): void {
    this.loadLevel((this.levelIndex + 1) % LEVELS.length);
  }
}
