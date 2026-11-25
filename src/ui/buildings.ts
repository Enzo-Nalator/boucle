import type { ActorKind, Res } from '../sim/types';

/** Matières en CSS (mêmes teintes que RES_COLOR du rendu Phaser). */
export const RES_CSS: Record<Res, string> = {
  plastique: '#3ba7ff',
  verre: '#2fbf8a',
  metal: '#8a94a6',
  bio: '#e08a1e',
  papier: '#d9c84a',
};

const BASE: Record<ActorKind, string> = {
  quartier: '#fde8c8',
  collecteur: '#e3e6ec',
  tri: '#dcd3ff',
  recycleur: '#e3e6ec',
  fabricant: '#ffe9a8',
  reparateur: '#ffd3d3',
  decharge: '#d9cfc4',
};

const r = (x: number, y: number, w: number, h: number, c: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const t = (c: string, ...p: number[]) => `<polygon points="${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}" fill="${c}"/>`;
const house = (x: number, y: number, s: number, wall: string, roof: string) =>
  r(x - s, y - s * 0.2, 2 * s, s * 1.2, wall) +
  t(roof, x - s * 1.2, y - s * 0.2, x + s * 1.2, y - s * 0.2, x, y - s * 1.2) +
  r(x - s * 0.2, y + s * 0.35, s * 0.4, s * 0.65, '#8a5a3c');

/** Bâtiment centré sur (0, 0), dans une pastille de rayon 30 : même dessin que le jeu (WorldView). */
function building(kind: ActorKind, res: Res): string {
  switch (kind) {
    case 'quartier':
      return house(-9, 3, 8, '#fff4e0', '#d9663e') + house(10, 7, 7, '#f6d9a8', '#4e7fc4');
    case 'collecteur':
      return r(-16, -8, 32, 22, '#6b7a8f') + t('#4b5668', -18, -8, 18, -8, 0, -20) + r(-9, 1, 18, 13, '#dfe6ee') + r(-9, 7, 18, 1.5, '#6b7a8f');
    case 'tri':
      return (
        r(-17, -6, 34, 20, '#7d6bd6') + r(-12, -16, 7, 10, '#5b4cb0') + r(2, -12, 7, 6, '#5b4cb0') + r(-17, 8, 34, 4, '#3d3566') +
        [-9, 0, 9].map(x => `<circle cx="${x}" cy="1" r="2.5" fill="#fff"/>`).join('')
      );
    case 'recycleur':
      return (
        r(-17, -6, 34, 20, RES_CSS[res]) + r(-13, -17, 8, 11, '#5b6068') + r(-17, -8, 34, 4, 'rgba(43,47,54,.35)') +
        '<circle cx="3" cy="5" r="6" fill="none" stroke="#fff" stroke-width="3"/>' + t('#fff', 3, -1, 8, -4, 8, 2)
      );
    case 'fabricant':
      return r(-17, -4, 34, 18, '#c0623e') + [0, 1, 2].map(i => t('#9c4a2c', -17 + 11.3 * i, -4, -5.7 + 11.3 * i, -4, -17 + 11.3 * i, -16)).join('') + r(-5, 4, 10, 10, '#ffe9a8');
    case 'reparateur':
      return house(0, 3, 12, '#fff4e0', '#d23c3c') + r(-2.5, -2, 5, 14, '#fff') + r(-7, 2.5, 14, 5, '#fff');
    case 'decharge':
      return (
        t('#8b7d70', -20, 14, 20, 14, 0, -14) + t('#6e6258', -4, 14, 20, 14, 6, -2) +
        [[-8, 8], [5, 4], [10, 11], [-2, 11]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#4a423b"/>`).join('')
      );
  }
}

/** Élément SVG (viewBox 0 0 100 100) d'un acteur : pastille + bâtiment. */
export const buildingSvg = (kind: ActorKind, res: Res = 'plastique'): string =>
  `<g transform="translate(50 50) scale(1.55)"><circle r="30" fill="${BASE[kind]}" stroke="#fff" stroke-width="3"/>${building(kind, res)}</g>`;

/** Camion vu de côté, centré sur (0, 0), roulant vers +x : à placer dans un groupe animé (rotate="auto"). */
export const truckSvg = (color: string, dirty = false): string =>
  `<rect x="-9" y="-5.5" width="18" height="11" fill="#2b2f36"/><rect x="-8" y="-4.5" width="12" height="9" fill="${color}"/><rect x="5" y="-3" width="3" height="6" fill="#dfe6ee"/>` +
  (dirty ? '<circle cx="-2" r="2.2" fill="#2b2f36"/>' : '');

export type SlotItem = { res: Res; kind?: 'dechet' | 'matiere' | 'objet'; dirty?: boolean; stuck?: boolean };

/** Cases de stockage (mêmes règles que le jeu), centrées en x = 0, haut à y = 0 ; 6 colonnes, n cases au total. */
export function slotsSvg(items: SlotItem[], n = 12): string {
  const COLS = 6,
    STEP = 10,
    x0 = -(COLS * STEP - 2) / 2,
    rows = Math.ceil(n / COLS);
  let out = `<rect x="${x0 - 3}" y="-3" width="${COLS * STEP + 1}" height="${rows * STEP + 4}" rx="5" fill="#fff" fill-opacity=".9"/>`;
  for (let i = 0; i < n; i++) {
    const cx = x0 + (i % COLS) * STEP + 4,
      cy = Math.floor(i / COLS) * STEP + 4,
      p = items[i];
    if (!p) {
      out += `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="#e3e3e3"/>`;
      continue;
    }
    const c = RES_CSS[p.res],
      k = p.kind ?? 'dechet';
    out +=
      k === 'dechet'
        ? `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="${c}"/>`
        : k === 'matiere'
          ? `<circle cx="${cx}" cy="${cy}" r="4.4" fill="${c}"/>`
          : `<polygon points="${cx - 4.7},${cy + 4} ${cx + 4.7},${cy + 4} ${cx},${cy - 4.7}" fill="${c}"/>`;
    if (p.dirty) out += `<circle cx="${cx}" cy="${cy}" r="1.7" fill="#2b2f36"/>`;
    if (p.stuck) out += `<rect x="${cx - 5.2}" y="${cy - 5.2}" width="10.4" height="10.4" fill="none" stroke="#e5484d" stroke-width="2"/>`;
  }
  return out;
}

/** Panneau d'alerte « ! » centré sur (0, 0). */
export const warnSvg = (): string =>
  '<polygon points="-12,10 12,10 0,-13" fill="#ffcc00"/><rect x="-1.5" y="-6" width="3" height="9" fill="#2b2f36"/><circle cy="6.5" r="1.8" fill="#2b2f36"/>';
