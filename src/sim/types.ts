export type Res = 'plastique' | 'verre' | 'metal' | 'bio' | 'papier';
export type ActorKind = 'quartier' | 'collecteur' | 'tri' | 'recycleur' | 'fabricant' | 'reparateur' | 'decharge';
export type Pt = { x: number; y: number };
export type Packet = { id: number; res: Res; kind: 'dechet' | 'matiere' | 'objet'; dirty: boolean; reusable: boolean; repaired: boolean };
export type Actor = {
  id: number; kind: ActorKind; x: number; y: number; res?: Res; level: number;
  queue: Packet[]; out: Packet[]; credit: number; offlineUntil: number; overflowT: number;
  window: boolean[]; returns: { at: number; packet: Packet }[]; rr: number;
};
export type Route = { id: number; from: number; to: number; points: Pt[]; length: number; transit: { packet: Packet; d: number }[]; priority: number };
export type World = {
  time: number; rng: number; nextId: number; budget: number; actors: Actor[]; routes: Route[];
  activeRes: Res[]; contamination: number; emitRate: number;
  log: { t: number; ev: 'emit' | 'recycle' | 'repair' | 'leak' }[];
  over: null | 'debordement' | 'faillite';
};
export type Command =
  | { type: 'place'; kind: ActorKind; x: number; y: number; res?: Res }
  | { type: 'route'; from: number; to: number; points: Pt[] }
  | { type: 'removeRoute'; id: number }
  | { type: 'upgrade'; id: number }
  | { type: 'priority'; routeId: number }
  | { type: 'renovate'; id: number };
