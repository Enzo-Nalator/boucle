export type Best = { time: number; index: number };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export const BEST_KEY = 'boucle:best:endless';
/** Un meilleur score par carte ; la plaine garde la clé d'origine. */
export const bestKey = (map: string): string => (map === 'plaine' ? BEST_KEY : `${BEST_KEY}:${map}`);

export const isBetter = (a: Best, b: Best | null): boolean =>
  !b || a.time > b.time || (a.time === b.time && a.index > b.index);

const valid = (v: unknown): v is Best =>
  !!v &&
  typeof (v as Best).time === 'number' &&
  typeof (v as Best).index === 'number' &&
  (v as Best).time >= 0 &&
  (v as Best).index >= 0 &&
  isFinite((v as Best).time) &&
  isFinite((v as Best).index);

export function loadBest(storage: Store, key = BEST_KEY): Best | null {
  try {
    const v: unknown = JSON.parse(storage.getItem(key) ?? 'null');
    return valid(v) ? v : null;
  } catch {
    return null;
  }
}

/** Enregistre `cand` s'il bat le meilleur stocké ; renvoie le meilleur à afficher. */
export function saveBest(storage: Store, cand: Best, key = BEST_KEY): Best {
  const cur = loadBest(storage, key);
  if (!isBetter(cand, cur)) return cur!;
  const best = { time: cand.time, index: cand.index };
  try {
    storage.setItem(key, JSON.stringify(best));
  } catch {
    /* stockage indisponible */
  }
  return best;
}

/** Accès paresseux : même `localStorage` lève parfois à l'accès (stockage bloqué), les appels sont dans les try. */
export const browserStorage: Store = {
  getItem: k => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
};
