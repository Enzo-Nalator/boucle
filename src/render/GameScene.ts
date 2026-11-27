import Phaser from 'phaser';
import { createEndless, type Endless } from '../modes/endless';
import { ACTOR_DEFS, DT, SELL_REFUND } from '../sim/defs';
import { circularityCounts, moneyPerMinute } from '../sim/metrics';
import { inGrid } from '../sim/grid';
import { actorOn, isRoad, roadPlan } from '../sim/roads';
import { applyCommand } from '../sim/world';
import type { Cell, Command, Pt } from '../sim/types';
import { browserStorage, saveBest } from '../ui/best';
import { RES_NAME } from '../ui/buildings';
import { START_EVENT, ui } from '../ui/store.svelte';
import { roadCommand, tapCommand } from './input';
import { cellAt, cellCenter, CELL } from './layout';
import { INK } from './theme';
import { WorldView } from './WorldView';

const RED = 0xe5484d,
  TILE = 35; // demi-côté de la tuile d'un bâtiment (voir WorldView)

export class GameScene extends Phaser.Scene {
  endless!: Endless;
  pending: Command[] = [];
  private view!: WorldView;
  private preview!: Phaser.GameObjects.Graphics;
  /** Aperçu du tracé en cours, dessiné opaque sur un calque transparent (les raccords ne foncent pas). */
  private plan!: Phaser.GameObjects.Graphics;
  /** Étiquette du tracé en cours : prix ou raison du refus. */
  private price!: Phaser.GameObjects.Text;
  private pointer: Pt | null = null;
  /** Route en cours de tracé : case de départ et pointeur qui la tire (un second doigt ne l'écrase pas). */
  private drag: { from: Cell; pointerId: number } | null = null;
  private acc = 0;
  private sync = 0;
  /** État du monde à la dernière annonce, pour dire ce qui vient de changer. */
  private seen = { quartiers: 0, res: 0, contamination: 0, emitRate: 0 };
  /** Millisecondes avant d'effacer l'annonce en cours. */
  private newsLeft = 0;

  constructor() {
    super('game');
  }

  create(): void {
    this.endless = createEndless(Date.now() >>> 0); // décor du menu, remplacé par startGame()
    this.game.events.on(START_EVENT, this.startGame, this);
    this.events.once('shutdown', () => this.game.events.off(START_EVENT, this.startGame, this));
    this.view = new WorldView(this);
    this.plan = this.add.graphics().setAlpha(0.65);
    this.preview = this.add.graphics();
    this.price = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        backgroundColor: '#ffffff',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const w = this.endless.world;
      if (ui.screen !== 'play' || w.over || this.drag) return;
      if (ui.tool === 'road') return void (this.drag = { from: cellAt(p), pointerId: p.id });
      const c = tapCommand(ui.tool, p, w, ui.pick);
      if (!c) return;
      if (c.type === 'place' && applyCommand(structuredClone(w), c)) ui.pick = null; // posé : retour à la matière qui manque
      this.pending.push(c);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => (this.pointer = { x: p.x, y: p.y }));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.drag?.pointerId !== p.id) return;
      if (ui.tool === 'road' && !this.endless.world.over) this.pending.push(roadCommand(cellCenter(this.drag.from), p));
      this.drag = null;
    });
    this.input.on('pointerupoutside', () => (this.drag = null));
    this.input.on('gameout', () => {
      this.pointer = null;
      this.drag = null;
    });
  }

  /** Nouvelle partie propre : monde neuf, commandes, accumulateur et chiffres remis à zéro. */
  startGame(): void {
    this.endless = createEndless(Date.now() >>> 0);
    this.pending = [];
    this.acc = 0;
    this.sync = 0;
    this.drag = null;
    ui.pick = null;
    this.syncMaterials();
    ui.budget = this.endless.world.budget;
    ui.money = moneyPerMinute(this.endless.world);
    ui.index = 0;
    ui.circ = { emit: 0, back: 0 };
    ui.time = 0;
    ui.over = null;
    ui.next = this.endless.nextEvent();
    ui.news = '';
    this.newsLeft = 0;
    this.remember();
    ui.screen = 'play';
  }

  private remember(): void {
    const w = this.endless.world;
    this.seen = {
      quartiers: w.actors.filter(a => a.kind === 'quartier').length,
      res: w.activeRes.length,
      contamination: w.contamination,
      emitRate: w.emitRate,
    };
  }

  /** Annonce ce que le directeur vient de changer (repris de gameplay), affichée quelques secondes. */
  private announce(): void {
    const w = this.endless.world,
      news: string[] = [];
    if (w.actors.filter(a => a.kind === 'quartier').length > this.seen.quartiers)
      news.push('Un nouveau quartier est arrivé : construis-lui vite une route.');
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
  }

  /** Matières en jeu, si un recycleur s'en occupe, et saleté : pour le choix du recycleur et la légende du HUD. */
  private syncMaterials(): void {
    const w = this.endless.world;
    ui.materials = w.activeRes.map(res => ({
      res,
      covered: w.actors.some(a => a.kind === 'recycleur' && a.res === res),
    }));
    ui.contamination = w.contamination;
  }

  /**
   * Case survolée, verte si l'outil courant y serait accepté par la simulation (essai sur une copie du monde) ; pour la
   * route, verte sur un départ possible. Pendant le tracé : l'aperçu de la route et son prix.
   * shortcut: copie le monde à chaque image, à remplacer par une validation sans mutation si le monde grossit.
   */
  private drawHover(): void {
    this.preview.clear();
    this.plan.clear();
    this.price.setVisible(false);
    if (!this.pointer || ui.screen !== 'play') return;
    const w = this.endless.world,
      cell = cellAt(this.pointer);
    if (!inGrid(cell.c, cell.r)) return;
    if (this.drag) return this.drawRoadPlan(cell);
    let ok: boolean;
    const { x, y } = cellCenter(cell);
    if (ui.tool === 'road') ok = isRoad(w, cell.c, cell.r) || !!actorOn(w, cell.c, cell.r);
    else {
      const cmd = tapCommand(ui.tool, this.pointer, w, ui.pick);
      ok = !!cmd && applyCommand(structuredClone(w), cmd);
      const a = cmd?.type === 'sell' && w.actors.find(b => b.id === cmd.id);
      if (a) {
        // ce que la vente rapporte, et ce qu'elle fait perdre
        const lost = a.queue.length + a.out.length + w.trucks.filter(t => t.to === a.id).length;
        const text = !ok
          ? 'On ne vend pas un quartier'
          : `+${ACTOR_DEFS[a.kind].cost * SELL_REFUND} €` +
            (lost ? ` · ${lost} paquet${lost > 1 ? 's perdus' : ' perdu'}` : '');
        this.showLabel(text, !ok, x, y - CELL / 2 - 14);
      }
    }
    this.preview
      .lineStyle(3, ok ? 0x2f9e44 : 0xe5484d, 0.9)
      .strokeRoundedRect(x - CELL / 2 + 2, y - CELL / 2 + 2, CELL - 4, CELL - 4, 10);
  }

  /** Aperçu façon gameplay : en clair ce qui existe déjà et sera emprunté, en sombre ce qui sera construit (rouge si
   * refusé), et une étiquette avec le prix ou la raison du refus. */
  private drawRoadPlan(to: Cell): void {
    if (!this.drag || (to.c === this.drag.from.c && to.r === this.drag.from.r)) return;
    const w = this.endless.world,
      plan = roadPlan(w, this.drag.from, to),
      broke = !plan.error && w.budget < plan.cost,
      bad = !!plan.error || broke,
      fresh = (x: Cell) => plan.cells.some(n => n.c === x.c && n.r === x.r);
    // morceaux qui ne se chevauchent pas (sinon la transparence fonce aux raccords) : un carré par case de route, un
    // raccord entre deux cases, rien sur la tuile d'un bâtiment
    const H = 14,
      col = (built: boolean) => (built ? (bad ? RED : INK) : 0xffffff),
      pad = (x: Cell) => (actorOn(w, x.c, x.r) ? TILE : H),
      rect = (x: number, y: number, wd: number, ht: number, c: number) =>
        this.plan.fillStyle(c, 1).fillRect(x, y, wd, ht);
    plan.path.forEach((x, k) => {
      const p = cellCenter(x);
      if (!actorOn(w, x.c, x.r)) rect(p.x - H, p.y - H, 2 * H, 2 * H, col(fresh(x)));
      if (!k) return;
      const prev = plan.path[k - 1],
        c = col(fresh(x) || fresh(prev)),
        [s, e] = x.c + x.r < prev.c + prev.r ? [x, prev] : [prev, x], // s en haut ou à gauche
        ps = cellCenter(s),
        pe = cellCenter(e);
      if (ps.y === pe.y) rect(ps.x + pad(s), ps.y - H, pe.x - pad(e) - ps.x - pad(s), 2 * H, c);
      else rect(ps.x - H, ps.y + pad(s), 2 * H, pe.y - pad(e) - ps.y - pad(s), c);
    });
    const n = plan.cells.length;
    const text =
      plan.error ?? (broke ? `Pas assez d’argent (${plan.cost} €)` : `${plan.cost} € · ${n} case${n > 1 ? 's' : ''}`);
    this.showLabel(text, bad, this.pointer!.x, this.pointer!.y - 50);
  }

  /** Étiquette blanche au-dessus du plateau : texte sombre, ou rouge pour un refus. */
  private showLabel(text: string, bad: boolean, x: number, y: number): void {
    this.price
      .setText(text)
      .setColor(bad ? '#c0262c' : '#2b2f36')
      .setPosition(Phaser.Math.Clamp(x, 160, 1120), Math.max(y, 20))
      .setVisible(true);
  }

  update(_time: number, delta: number): void {
    const e = this.endless,
      w = e.world;
    this.acc += Math.min(delta / 1000, 0.25);
    while (ui.screen === 'play' && this.acc >= DT && !w.over) {
      e.step(this.pending);
      this.pending = [];
      this.acc -= DT;
    }
    this.view.draw(w);
    if (ui.tool !== 'road') this.drag = null; // outil changé pendant un tracé
    this.drawHover();

    if (this.newsLeft > 0 && (this.newsLeft -= delta) <= 0) ui.news = '';
    this.sync += delta;
    if (ui.screen === 'play' && (this.sync >= 200 || w.over)) {
      this.sync = 0;
      const s = e.score();
      ui.budget = w.budget;
      ui.money = moneyPerMinute(w);
      ui.index = s.index;
      ui.circ = circularityCounts(w);
      this.syncMaterials();
      ui.time = s.time;
      ui.over = w.over;
      ui.next = e.nextEvent();
      this.announce();
      if (w.over) {
        ui.best = saveBest(browserStorage, s);
        ui.screen = 'over';
      }
    }
  }
}
