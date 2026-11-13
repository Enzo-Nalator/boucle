import type { ShapeName } from '../render/theme';

export type Pt = [number, number];
export type Glyph =
  { kind: 'circle'; r: number } | { kind: 'roundrect'; points: Pt[]; rx: number } | { kind: 'polygon'; points: Pt[] };

const C = 50;
const r1 = (n: number) => Math.round(n * 100) / 100;
const regular = (n: number, R: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
    return [r1(C + R * Math.cos(a)), r1(C + R * Math.sin(a))];
  });

/**
 * Formes des acteurs dans un repère 100×100 centré sur (50, 50). Chacune tient dans un
 * rayon de 40 : l'anneau de capacité (rayon 50) l'entoure toujours sans la toucher.
 */
const GLYPHS: Record<ShapeName, Glyph> = {
  cercle: { kind: 'circle', r: 34 },
  carre: {
    kind: 'polygon',
    points: [
      [22, 22],
      [78, 22],
      [78, 78],
      [22, 78],
    ],
  },
  'carre-arrondi': {
    kind: 'roundrect',
    points: [
      [22, 22],
      [78, 22],
      [78, 78],
      [22, 78],
    ],
    rx: 12,
  },
  triangle: { kind: 'polygon', points: regular(3, 38) },
  losange: {
    kind: 'polygon',
    points: [
      [50, 12],
      [88, 50],
      [50, 88],
      [12, 50],
    ],
  },
  croix: {
    kind: 'polygon',
    points: [
      [38, 14],
      [62, 14],
      [62, 38],
      [86, 38],
      [86, 62],
      [62, 62],
      [62, 86],
      [38, 86],
      [38, 62],
      [14, 62],
      [14, 38],
      [38, 38],
    ],
  },
  hexagone: { kind: 'polygon', points: regular(6, 38) },
};

export const glyph = (s: ShapeName): Glyph => GLYPHS[s];

/** Distance maximale d'un point de la forme au centre (50, 50). */
export function glyphExtent(s: ShapeName): number {
  const g = GLYPHS[s];
  return g.kind === 'circle' ? g.r : Math.max(...g.points.map(([x, y]) => Math.hypot(x - C, y - C)));
}

/** Élément SVG de la forme (sans couleur : à styler par CSS). */
export function glyphSvg(s: ShapeName): string {
  const g = GLYPHS[s];
  if (g.kind === 'circle') return `<circle cx="${C}" cy="${C}" r="${g.r}"/>`;
  if (g.kind === 'roundrect') {
    const [[x0, y0], [x1]] = g.points;
    return `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${x1 - x0}" rx="${g.rx}"/>`;
  }
  return `<polygon points="${g.points.map(p => p.join(',')).join(' ')}"/>`;
}
