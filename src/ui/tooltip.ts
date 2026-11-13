export interface Pt {
  x: number;
  y: number;
}
export interface Size {
  w: number;
  h: number;
}

/**
 * Position de l’infobulle près du curseur : en bas à droite par défaut, de l’autre côté
 * du curseur si elle sortirait de la fenêtre, jamais à moins de `margin` du bord.
 */
export function placeTooltip(p: Pt, size: Size, view: Size, offset = 16, margin = 8): Pt {
  let x = p.x + offset;
  let y = p.y + offset;
  if (x + size.w > view.w - margin) x = p.x - offset - size.w;
  if (y + size.h > view.h - margin) y = p.y - offset - size.h;
  return { x: Math.max(margin, x), y: Math.max(margin, y) };
}
