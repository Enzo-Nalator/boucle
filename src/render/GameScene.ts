import Phaser from 'phaser';
import { createEndless, type Endless } from '../modes/endless';
import { DT } from '../sim/defs';
import { moneyPerMinute } from '../sim/metrics';
import { RES_NAME } from '../ui/buildings';
import type { Command, Pt } from '../sim/types';
import { bestKey, browserStorage, saveBest } from '../ui/best';
import { planRoute, refusal } from '../sim/world';
import { resolve } from '../sim/network';
import { START_EVENT, ui } from '../ui/store.svelte';
import { dragVerdict, hoverInfo, routeCommand, tapCommand, type DragInfo } from './input';
import { snap45 } from './layout';
import { INK } from './theme';
import { vec, WorldView } from './WorldView';

export class GameScene extends Phaser.Scene {
  endless!: Endless;
  pending: Command[] = [];
  private view!: WorldView;
  private preview!: Phaser.GameObjects.Graphics;
  private price!: Phaser.GameObjects.Text;
  private hintLeft = 0;
  private newsLeft = 0;
  private seen = { res: 0, contamination: 0, emitRate: 0 };
  private drag: { start: Pt; info: DragInfo } | null = null;
  private pointer: Pt = { x: 0, y: 0 };
  /** Position de la souris sur le plateau ; null hors du plateau (ou au doigt, qui ne survole pas). */
  private hover: Pt | null = null;
  private acc = 0;
  private sync = 0;

  constructor() {
    super('game');
  }

  create(): void {
    this.endless = createEndless(Date.now() >>> 0, ui.map); // décor du menu, remplacé par startGame()
    this.game.events.on(START_EVENT, this.startGame, this);
    this.events.once('shutdown', () => this.game.events.off(START_EVENT, this.startGame, this));
    this.view = new WorldView(this);
    this.preview = this.add.graphics().setDepth(1);
    this.price = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        backgroundColor: '#ffffff',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setVisible(false);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const w = this.endless.world;
      if (ui.screen !== 'play' || ui.paused || w.over || this.drag) return; // un second pointeur n'écrase pas un tracé en cours
      if (ui.tool === 'route') {
        const start = resolve(w, p);
        if (start) this.drag = { start, info: { pointerId: p.id, tool: ui.tool } };
        this.pointer = { x: p.x, y: p.y };
        return;
      }
      const c = tapCommand(ui.tool, p, w, ui.pick);
      this.submit(c);
      if (c?.type === 'place' && !refusal(w, c)) ui.pick = null; // posé : on repasse à la matière qui manque
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.hover = p.wasTouch ? null : { x: p.x, y: p.y };
      if (this.verdict('move', p.id) === 'accept') this.pointer = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const v = this.verdict('up', p.id);
      if (v === 'accept') {
        this.submit(routeCommand(this.endless.world, this.drag!.start, p));
      }
      if (v !== 'ignore') this.drag = null;
    });
    const out = () => {
      if (this.verdict('out', this.drag?.info.pointerId ?? -1) === 'cancel') this.drag = null;
    };
    this.input.on('pointerupoutside', out);
    this.input.on('gameout', out);
    this.input.on('gameout', () => (this.hover = null));
  }

  /** Nouvelle partie propre : monde neuf, commandes, accumulateur, tracé et chiffres remis à zéro. */
  startGame(): void {
    this.endless = createEndless(Date.now() >>> 0, ui.map);
    this.pending = [];
    this.acc = 0;
    this.sync = 0;
    this.drag = null;
    ui.hint = '';
    ui.news = '';
    ui.pick = null;
    ui.paused = false;
    this.remember();
    this.publish();
    ui.budget = this.endless.world.budget;
    ui.index = 0;
    ui.time = 0;
    ui.over = null;
    ui.next = this.endless.nextEvent();
    ui.screen = 'play';
  }

  private remember(): void {
    const w = this.endless.world;
    this.seen = { res: w.activeRes.length, contamination: w.contamination, emitRate: w.emitRate };
  }

  /** Argent, matières en jeu et annonce de ce qui vient de changer. */
  private publish(): void {
    const w = this.endless.world,
      news: string[] = [];
    for (const r of w.activeRes.slice(this.seen.res))
      news.push(`Nouvelle matière : ${RES_NAME[r].toLowerCase()}. Il lui faut son recycleur.`);
    if (w.contamination > this.seen.contamination)
      news.push(`Les déchets sont plus souvent sales : ${Math.round(w.contamination * 100)} %. Un centre de tri aide.`);
    if (w.emitRate > this.seen.emitRate) news.push('Les quartiers produisent maintenant plus de déchets.');
    if (news.length) {
      ui.news = news.join(' ');
      this.newsLeft = 7000;
    }
    this.remember();
    ui.money = moneyPerMinute(w);
    ui.contamination = w.contamination;
    ui.materials = w.activeRes.map(res => ({
      res,
      covered: w.actors.some(a => a.kind === 'recycleur' && a.res === res),
    }));
  }

  /** Met la commande en file, ou explique au joueur pourquoi elle est refusée. */
  private submit(c: Command | null): void {
    if (!c) return;
    const why = refusal(this.endless.world, c);
    if (!why) {
      this.pending.push(c);
      return;
    }
    ui.hint = why;
    this.hintLeft = 2500;
  }

  private drawPreview(): void {
    const w = this.endless.world;
    this.preview.clear();
    this.price.setVisible(false);
    if (!this.drag) return this.drawTarget();
    const c = routeCommand(w, this.drag.start, this.pointer);
    if (c?.type !== 'route') {
      this.preview.lineStyle(6, INK, 0.5).strokePoints(vec(snap45(this.drag.start, this.pointer)));
      return;
    }
    const plan = planRoute(w, c.from, c.to),
      bad = !!refusal(w, c);
    // en clair : le trajet par les routes existantes ; en sombre : ce qui sera construit
    for (const path of plan.reused) this.preview.lineStyle(8, 0xffffff, 0.75).strokePoints(vec(path));
    for (const piece of plan.pieces) this.preview.lineStyle(6, bad ? 0xe5484d : INK, 0.65).strokePoints(vec(piece));
    for (const x of plan.crossings) this.preview.lineStyle(4, 0xf0a030, 1).strokeCircle(x.x, x.y, 14);
    const n = plan.crossings.length;
    const parts = plan.error
      ? [plan.error]
      : [`${Math.ceil(plan.cost)} €`, ...(plan.reused.length ? ['branché sur le réseau'] : [])];
    if (n) parts.push(`${n} carrefour${n > 1 ? 's' : ''}`);
    if (plan.water) parts.push('pont');
    this.showPrice(parts.join(' · '), bad, this.pointer.x, this.pointer.y - 40);
  }

  /** Outils à appui : halo blanc sur la cible survolée, et ce que le clic coûtera ou rapportera. */
  private drawTarget(): void {
    const w = this.endless.world;
    if (!this.hover || ui.screen !== 'play' || ui.paused || ui.tool === 'route' || ui.tool.startsWith('place:')) return;
    const c = tapCommand(ui.tool, this.hover, w),
      info = c && hoverInfo(w, c);
    if (!c || !info) return;
    let at: Pt = this.hover;
    if (c.type === 'removeRoute') {
      const road = w.routes.find(r => r.id === c.id)!;
      for (const [width, alpha] of [
        [40, 0.25],
        [30, 0.45],
      ])
        this.preview.lineStyle(width, 0xffffff, alpha).strokePoints(vec(road.points));
    } else if ('id' in c) {
      at = w.actors.find(a => a.id === c.id)!;
      for (const [radius, width, alpha] of [
        [42, 10, 0.3],
        [36, 7, 0.55],
        [32, 4, 0.95],
      ])
        this.preview.lineStyle(width, 0xffffff, alpha).strokeCircle(at.x, at.y, radius);
    }
    this.showPrice(info.text, !info.ok, at.x, at.y - 54);
  }

  private showPrice(text: string, bad: boolean, x: number, y: number): void {
    this.price
      .setText(text)
      .setColor(bad ? '#c0262c' : '#2b2f36')
      .setPosition(Phaser.Math.Clamp(x, 190, 1090), Math.max(y, 20))
      .setVisible(true);
  }

  private verdict(kind: 'move' | 'up' | 'out', pointerId: number) {
    return dragVerdict(this.drag?.info ?? null, { kind, pointerId }, ui.tool, !!this.endless.world.over);
  }

  update(_time: number, delta: number): void {
    const e = this.endless,
      w = e.world;
    if (ui.paused) this.drag = null;
    else this.acc += Math.min(delta / 1000, 0.25);
    while (ui.screen === 'play' && !ui.paused && this.acc >= DT && !w.over) {
      e.step(this.pending);
      this.pending = [];
      this.acc -= DT;
    }
    this.view.draw(w);

    if (this.drag && this.verdict('move', this.drag.info.pointerId) === 'cancel') this.drag = null; // outil changé ou partie finie
    this.drawPreview();
    if (!ui.paused && this.newsLeft > 0 && (this.newsLeft -= delta) <= 0) ui.news = '';
    if (this.hintLeft > 0 && (this.hintLeft -= delta) <= 0) ui.hint = '';

    this.sync += delta;
    if (ui.screen === 'play' && (this.sync >= 200 || w.over)) {
      this.sync = 0;
      const s = e.score();
      ui.budget = w.budget;
      ui.index = s.index;
      ui.time = s.time;
      ui.over = w.over;
      ui.next = e.nextEvent();
      this.publish();
      if (w.over) {
        ui.best = saveBest(browserStorage, s, bestKey(w.map));
        ui.screen = 'over';
      }
    }
  }
}
