import type { MapId } from './maps';

export type Res = 'plastique' | 'verre' | 'metal' | 'bio' | 'papier';
export type ActorKind = 'quartier' | 'tri' | 'recycleur' | 'fabricant' | 'reparateur' | 'decharge';
export type Pt = { x: number; y: number };
export type Packet = {
  id: number;
  res: Res;
  kind: 'dechet' | 'matiere' | 'objet';
  dirty: boolean;
  reusable: boolean;
  repaired: boolean;
  /** Secondes passées dans une file de sortie sans aucune route capable de l'accepter (absent = jamais coincé). */
  stuck?: number;
};
export type Actor = {
  id: number;
  kind: ActorKind;
  x: number;
  y: number;
  res?: Res;
  level: number;
  queue: Packet[];
  out: Packet[];
  credit: number;
  offlineUntil: number;
  overflowT: number;
  window: boolean[];
  returns: { at: number; packet: Packet }[];
  /** 0 à 2 : à matière égale, le bâtiment le plus prioritaire est servi d'abord. */
  priority: number;
};
/** Point du réseau sans bâtiment : embranchement ou carrefour. */
export type Junction = Pt & { id: number };
/** Tronçon à double sens entre deux nœuds (bâtiment ou embranchement) ; `points` va de `a` vers `b`. */
export type Route = { id: number; a: number; b: number; points: Pt[]; length: number };
/** Camion en route vers le bâtiment `to` : sur le tronçon `road`, à `d` px de son bout `a`, sens `dir`. */
export type Truck = { packet: Packet; from: number; to: number; road: number; d: number; dir: 1 | -1 };
export type World = {
  map: MapId;
  time: number;
  rng: number;
  nextId: number;
  budget: number;
  actors: Actor[];
  routes: Route[];
  junctions: Junction[];
  trucks: Truck[];
  activeRes: Res[];
  contamination: number;
  emitRate: number;
  log: { t: number; ev: 'emit' | 'recycle' | 'repair' | 'leak' }[];
  over: null | 'debordement' | 'faillite';
  /** Gains et frais de traitement des 60 dernières secondes (id/kind : l'acteur qui a payé ou coûté). */
  cash: { t: number; id: number; kind: ActorKind; v: number }[];
};
export type Command =
  | { type: 'place'; kind: ActorKind; x: number; y: number; res?: Res }
  | { type: 'route'; from: Pt; to: Pt }
  | { type: 'removeRoute'; id: number }
  | { type: 'upgrade'; id: number }
  | { type: 'priority'; id: number }
  | { type: 'renovate'; id: number }
  | { type: 'demolish'; id: number };
