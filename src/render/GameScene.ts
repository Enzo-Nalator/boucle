import Phaser from 'phaser';
import { createEndless, type Endless } from '../modes/endless';
import { DT } from '../sim/defs';
import type { Command, Pt } from '../sim/types';
import { ui } from '../ui/store.svelte';
import { hitActor, routeCommand, tapCommand } from './input';
import { snap45 } from './layout';
import { INK } from './theme';
import { vec, WorldView } from './WorldView';

export class GameScene extends Phaser.Scene {
  endless!: Endless;
  pending: Command[] = [];
  private view!: WorldView;
  private preview!: Phaser.GameObjects.Graphics;
  private drag: number | null = null;
  private pointer: Pt = { x: 0, y: 0 };
  private acc = 0;
  private sync = 0;

  constructor() { super('game'); }

  create(): void {
    this.endless = createEndless(Date.now() >>> 0);
    this.view = new WorldView(this);
    this.preview = this.add.graphics();
    this.input.on('pointerdown', (p: Pt) => {
      const w = this.endless.world;
      if (w.over) return;
      if (ui.tool === 'route') { this.drag = hitActor(w, p)?.id ?? null; this.pointer = { x: p.x, y: p.y }; return; }
      const c = tapCommand(ui.tool, p, w);
      if (c) this.pending.push(c);
    });
    this.input.on('pointermove', (p: Pt) => { this.pointer = { x: p.x, y: p.y }; });
    this.input.on('pointerup', (p: Pt) => {
      if (this.drag === null) return;
      const c = routeCommand(this.endless.world, this.drag, p);
      if (c) this.pending.push(c);
      this.drag = null;
    });
  }

  update(_time: number, delta: number): void {
    const e = this.endless, w = e.world;
    this.acc += Math.min(delta / 1000, 0.25);
    while (this.acc >= DT && !w.over) { e.step(this.pending); this.pending = []; this.acc -= DT; }
    this.view.draw(w);

    this.preview.clear();
    const a = this.drag === null ? null : w.actors.find(x => x.id === this.drag);
    if (a) this.preview.lineStyle(6, INK, 0.5).strokePoints(vec(snap45(a, this.pointer)));

    this.sync += delta;
    if (this.sync >= 200 || w.over) {
      this.sync = 0;
      const s = e.score();
      ui.budget = w.budget; ui.index = s.index; ui.time = s.time; ui.over = w.over;
      if (w.over) ui.screen = 'over';
    }
  }
}
