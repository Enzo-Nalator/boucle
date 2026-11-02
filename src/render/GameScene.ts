import Phaser from 'phaser';
import { createEndless, type Endless } from '../modes/endless';
import { DT } from '../sim/defs';
import type { Command, Pt } from '../sim/types';
import { browserStorage, saveBest } from '../ui/best';
import { START_EVENT, ui } from '../ui/store.svelte';
import { dragVerdict, hitActor, routeCommand, tapCommand, type DragInfo } from './input';
import { snap45 } from './layout';
import { INK } from './theme';
import { vec, WorldView } from './WorldView';

export class GameScene extends Phaser.Scene {
  endless!: Endless;
  pending: Command[] = [];
  private view!: WorldView;
  private preview!: Phaser.GameObjects.Graphics;
  private drag: { id: number; info: DragInfo } | null = null;
  private pointer: Pt = { x: 0, y: 0 };
  private acc = 0;
  private sync = 0;

  constructor() { super('game'); }

  create(): void {
    this.endless = createEndless(Date.now() >>> 0); // décor du menu, remplacé par startGame()
    this.game.events.on(START_EVENT, this.startGame, this);
    this.events.once('shutdown', () => this.game.events.off(START_EVENT, this.startGame, this));
    this.view = new WorldView(this);
    this.preview = this.add.graphics();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const w = this.endless.world;
      if (ui.screen !== 'play' || w.over || this.drag) return; // un second pointeur n'écrase pas un tracé en cours
      if (ui.tool === 'route') {
        const a = hitActor(w, p);
        if (a) this.drag = { id: a.id, info: { pointerId: p.id, tool: ui.tool } };
        this.pointer = { x: p.x, y: p.y };
        return;
      }
      const c = tapCommand(ui.tool, p, w);
      if (c) this.pending.push(c);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.verdict('move', p.id) === 'accept') this.pointer = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const v = this.verdict('up', p.id);
      if (v === 'accept') {
        const c = routeCommand(this.endless.world, this.drag!.id, p);
        if (c) this.pending.push(c);
      }
      if (v !== 'ignore') this.drag = null;
    });
    const out = () => { if (this.verdict('out', this.drag?.info.pointerId ?? -1) === 'cancel') this.drag = null; };
    this.input.on('pointerupoutside', out);
    this.input.on('gameout', out);
  }

  /** Nouvelle partie propre : monde neuf, commandes, accumulateur, tracé et chiffres remis à zéro. */
  startGame(): void {
    this.endless = createEndless(Date.now() >>> 0);
    this.pending = []; this.acc = 0; this.sync = 0; this.drag = null;
    ui.budget = this.endless.world.budget; ui.index = 0; ui.time = 0; ui.over = null; ui.nextQuartier = this.endless.nextQuartierIn();
    ui.screen = 'play';
  }

  private verdict(kind: 'move' | 'up' | 'out', pointerId: number) {
    return dragVerdict(this.drag?.info ?? null, { kind, pointerId }, ui.tool, !!this.endless.world.over);
  }

  update(_time: number, delta: number): void {
    const e = this.endless, w = e.world;
    this.acc += Math.min(delta / 1000, 0.25);
    while (ui.screen === 'play' && this.acc >= DT && !w.over) { e.step(this.pending); this.pending = []; this.acc -= DT; }
    this.view.draw(w);

    if (this.drag && this.verdict('move', this.drag.info.pointerId) === 'cancel') this.drag = null; // outil changé ou partie finie
    this.preview.clear();
    const a = this.drag && w.actors.find(x => x.id === this.drag!.id);
    if (a) this.preview.lineStyle(6, INK, 0.5).strokePoints(vec(snap45(a, this.pointer)));

    this.sync += delta;
    if (ui.screen === 'play' && (this.sync >= 200 || w.over)) {
      this.sync = 0;
      const s = e.score();
      ui.budget = w.budget; ui.index = s.index; ui.time = s.time; ui.over = w.over; ui.nextQuartier = e.nextQuartierIn();
      if (w.over) { ui.best = saveBest(browserStorage, s); ui.screen = 'over'; }
    }
  }
}
