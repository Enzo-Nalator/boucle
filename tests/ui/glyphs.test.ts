import { describe, expect, it } from 'vitest';
import { ACTOR_SHAPE, type ShapeName } from '../../src/render/theme';
import { glyph, glyphExtent, glyphSvg, type Pt } from '../../src/ui/glyphs';

const SHAPES = [...new Set(Object.values(ACTOR_SHAPE))] as ShapeName[];

describe('glyphs', () => {
  it('définit une forme pour chaque forme d’acteur du jeu', () => {
    expect(SHAPES).toHaveLength(7);
    for (const s of SHAPES) expect(glyph(s)).toBeDefined();
  });

  it('chaque forme tient dans un rayon de 40 (l’anneau de rayon 50 l’entoure) et reste lisible (≥ 30)', () => {
    for (const s of SHAPES) {
      const e = glyphExtent(s);
      expect(e, s).toBeLessThanOrEqual(40);
      expect(e, s).toBeGreaterThanOrEqual(30);
    }
  });

  it('le triangle est centré sur son centre de gravité (50, 50)', () => {
    const g = glyph('triangle');
    expect(g.kind).toBe('polygon');
    const pts = (g as { points: Pt[] }).points;
    expect(pts.reduce((s, p) => s + p[0], 0) / 3).toBeCloseTo(50, 1);
    expect(pts.reduce((s, p) => s + p[1], 0) / 3).toBeCloseTo(50, 1);
  });

  it('produit le bon élément SVG pour chaque type de forme', () => {
    expect(glyphSvg('cercle')).toMatch(/^<circle /);
    expect(glyphSvg('carre-arrondi')).toMatch(/^<rect .*rx="/);
    for (const s of ['carre', 'triangle', 'losange', 'croix', 'hexagone'] as ShapeName[])
      expect(glyphSvg(s)).toMatch(/^<polygon points="/);
  });
});
