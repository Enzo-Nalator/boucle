export { distToPolyline, pointAt, snap45 } from '../sim/geo';

/** Nombre de pastilles affichées pour un niveau (rien au niveau 1). */
export const levelPips = (level: number): number => Math.max(0, Math.min(2, level - 1));
