export type Res = 'plastique' | 'verre' | 'metal' | 'bio' | 'papier';
export type ActorKind = 'quartier' | 'tri' | 'recycleur' | 'fabricant' | 'reparateur' | 'decharge' | 'garage';
export type Pt = { x: number; y: number };
/** Case de la grille : colonne c, ligne r. */
export type Cell = { c: number; r: number };
export type Packet = {
  id: number;
  res: Res;
  kind: 'dechet' | 'matiere' | 'objet';
  dirty: boolean;
  /** Passé par un centre de tri : seul un déchet trié est accepté par un recycleur. */
  sorted: boolean;
  reusable: boolean;
  repaired: boolean;
  /** Moment où il pourra quitter le bâtiment où il attend (posé à son premier essai de départ). */
  ready?: number;
};
export type Actor = {
  id: number;
  kind: ActorKind;
  c: number;
  r: number;
  res?: Res;
  level: number;
  queue: Packet[];
  out: Packet[];
  credit: number;
  offlineUntil: number;
  overflowT: number;
  returns: { at: number; packet: Packet }[];
};
/**
 * Camion qui porte ses paquets (`load`, un seul sans garage) de `from` à `to` le long de `path` (cases, bâtiments
 * compris) ; d = cases parcourues.
 */
export type Truck = { load: Packet[]; from: number; to: number; path: Cell[]; d: number };
export type World = {
  time: number;
  rng: number;
  nextId: number;
  budget: number;
  actors: Actor[];
  /** Routes construites par le joueur (la boucle, elle, est fixe). */
  roads: Cell[];
  trucks: Truck[];
  activeRes: Res[];
  contamination: number;
  emitRate: number;
  log: { t: number; ev: 'emit' | 'recycle' | 'repair' | 'leak' }[];
  over: null | 'debordement' | 'faillite';
  /** Gains et frais de traitement des 60 dernières secondes (id/kind : l'acteur qui a rapporté ou coûté). */
  cash: { t: number; id: number; kind: ActorKind; v: number }[];
};
export type Command =
  | { type: 'place'; kind: ActorKind; c: number; r: number; res?: Res }
  | { type: 'road'; from: Cell; to: Cell }
  | { type: 'removeRoad'; c: number; r: number }
  | { type: 'upgrade'; id: number }
  | { type: 'renovate'; id: number }
  | { type: 'sell'; id: number };
