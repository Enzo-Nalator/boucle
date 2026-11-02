import { describe, expect, it } from 'vitest';
import { ACTOR_DEFS } from '../../src/sim/defs';
import { MAX_LEVEL, RENOVATE_COST, UPGRADE_COST } from '../../src/sim/world';
import type { ActorKind } from '../../src/sim/types';
import { ACTOR_INFO, ALL_TOOLS, HELP_PAGES, toolInfo } from '../../src/ui/help';

const KINDS: ActorKind[] = ['quartier', 'collecteur', 'tri', 'recycleur', 'fabricant', 'reparateur', 'decharge'];

describe('ACTOR_INFO', () => {
  it('décrit chaque acteur avec un nom et un rôle', () => {
    for (const k of KINDS) {
      expect(ACTOR_INFO[k].name.length).toBeGreaterThan(2);
      expect(ACTOR_INFO[k].role.length).toBeGreaterThan(20);
    }
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
    expect(toolInfo('upgrade').text).toContain(`${UPGRADE_COST} €`);
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

  it('présente chacun des 7 acteurs sur exactement une page', () => {
    const seen = HELP_PAGES.flatMap((p) => p.actors ?? []);
    expect([...seen].sort()).toEqual([...KINDS].sort());
  });

  it("présente tous les outils sur la page des outils", () => {
    const tools = HELP_PAGES.flatMap((p) => p.tools ?? []);
    expect([...tools].sort()).toEqual([...ALL_TOOLS].sort());
  });
});
