import { describe, expect, it } from 'vitest';
import { ACTOR_DEFS } from '../../src/sim/defs';
import { FABRICATE_REVENUE, RECYCLE_REVENUE } from '../../src/sim/defs';
import { MAX_LEVEL, RENOVATE_COST, UPGRADE_RATIO } from '../../src/sim/world';
import type { ActorKind } from '../../src/sim/types';
import { ACTOR_INFO, ACTOR_ORDER, ALL_TOOLS, HELP_PAGES, actorNumber, actorStats, toolInfo } from '../../src/ui/help';

const KINDS: ActorKind[] = ['quartier', 'tri', 'recycleur', 'fabricant', 'reparateur', 'decharge'];

describe('ACTOR_INFO', () => {
  it('décrit chaque acteur avec un nom et un rôle', () => {
    for (const k of KINDS) {
      expect(ACTOR_INFO[k].name.length).toBeGreaterThan(2);
      expect(ACTOR_INFO[k].role.length).toBeGreaterThan(20);
    }
  });
});

describe('fiches d’acteur', () => {
  it('chaque acteur annonce son entrée et sa sortie', () => {
    for (const k of KINDS) {
      expect(ACTOR_INFO[k].inputs.length).toBeGreaterThan(2);
      expect(ACTOR_INFO[k].outputs.length).toBeGreaterThan(2);
    }
  });

  it('numérote les 6 acteurs de 01 à 06 dans l’ordre du jeu', () => {
    expect(ACTOR_ORDER).toHaveLength(6);
    expect(ACTOR_ORDER.map(actorNumber)).toEqual(['01', '02', '03', '04', '05', '06']);
  });

  it('formate les chiffres du simulateur en français', () => {
    expect(actorStats('recycleur')).toEqual({ capacity: 'file 8', rate: '0,8 / s', cost: '30 €', upkeep: '0,3 € / s' });
    expect(actorStats('quartier').cost).toBe('offert');
    expect(actorStats('decharge').capacity).toBe('file illimitée');
    expect(actorStats('decharge').upkeep).toBe('sans entretien');
  });
});

describe('revenus affichés', () => {
  it('le rôle du recycleur et du fabricant cite les revenus du simulateur', () => {
    expect(ACTOR_INFO.recycleur.role).toContain(`${RECYCLE_REVENUE} € par paquet`);
    expect(ACTOR_INFO.fabricant.role).toContain(`${String(FABRICATE_REVENUE).replace('.', ',')} € par objet`);
  });
});

describe('toolInfo', () => {
  it('donne un titre et un texte à chaque outil de la barre', () => {
    expect(ALL_TOOLS).toHaveLength(11);
    expect(new Set(ALL_TOOLS).size).toBe(ALL_TOOLS.length);
    for (const t of ALL_TOOLS) {
      const i = toolInfo(t);
      expect(i.title.length).toBeGreaterThan(2);
      expect(i.text.length).toBeGreaterThan(10);
    }
  });

  it("un outil de placement annonce le rôle de l'acteur et son coût réel", () => {
    const i = toolInfo('place:tri');
    expect(i.title).toBe('Placer : centre de tri');
    expect(i.text).toContain(ACTOR_INFO.tri.role);
    expect(i.text).toContain(`Coût : ${ACTOR_DEFS.tri.cost} €`);
  });

  it('améliorer et rénover affichent les coûts du simulateur', () => {
    expect(toolInfo('upgrade').text).toContain(`${UPGRADE_RATIO * 100} %`);
    expect(toolInfo('upgrade').text).toContain(`niveau ${MAX_LEVEL}`);
    expect(toolInfo('renovate').text).toContain(`${RENOVATE_COST} €`);
  });
});

describe('HELP_PAGES', () => {
  it('a au moins 4 pages avec un titre et du contenu', () => {
    expect(HELP_PAGES.length).toBeGreaterThanOrEqual(4);
    for (const p of HELP_PAGES) {
      expect(p.title.length).toBeGreaterThan(2);
      expect((p.paragraphs?.length ?? 0) + (p.actors?.length ?? 0) + (p.tools?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it('la page « Lire le plateau » a un paragraphe par repère numéroté (4)', () => {
    const board = HELP_PAGES.find(p => p.layout === 'board');
    expect(board?.paragraphs).toHaveLength(4);
  });

  it('chaque page a une mise en page connue', () => {
    expect(HELP_PAGES.map(p => p.layout)).toEqual([
      'goal',
      'board',
      'routes',
      'suivi',
      'actors',
      'actors',
      'tools',
      'tips',
    ]);
  });

  it('donne à chaque page un mot géant de fond, tous différents', () => {
    const words = HELP_PAGES.map(p => p.backdrop);
    for (const w of words) expect(w.length).toBeGreaterThan(3);
    expect(new Set(words).size).toBe(words.length);
  });

  it('présente chacun des 7 acteurs sur exactement une page', () => {
    const seen = HELP_PAGES.flatMap(p => p.actors ?? []);
    expect([...seen].sort()).toEqual([...KINDS].sort());
  });

  it('présente tous les outils sur la page des outils', () => {
    const tools = HELP_PAGES.flatMap(p => p.tools ?? []);
    expect([...tools].sort()).toEqual([...ALL_TOOLS].sort());
  });
});
