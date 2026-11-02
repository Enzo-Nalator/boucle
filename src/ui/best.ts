export type Best = { time: number; index: number };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export const BEST_KEY = 'boucle:best:endless';

export const isBetter = (a: Best, b: Best | null): boolean =>
  !b || a.time > b.time || (a.time === b.time && a.index > b.index);

const valid = (v: unknown): v is Best =>
  !!v && typeof (v as Best).time === 'number' && typeof (v as Best).index === 'number'
  && isFinite((v as Best).time) && isFinite((v as Best).index);

export function loadBest(storage: Store): Best | null {
  try {
    const v: unknown = JSON.parse(storage.getItem(BEST_KEY) ?? 'null');
    return valid(v) ? v : null;
  } catch { return null; }
}

/** Enregistre `cand` s'il bat le meilleur stocké ; renvoie le meilleur à afficher. */
export function saveBest(storage: Store, cand: Best): Best {
  const cur = loadBest(storage);
  if (!isBetter(cand, cur)) return cur!;
  try { storage.setItem(BEST_KEY, JSON.stringify(cand)); } catch { /* stockage indisponible */ }
  return cand;
}

/** Accès paresseux : même `localStorage` lève parfois à l'accès (stockage bloqué), les appels sont dans les try. */
export const browserStorage: Store = {
  getItem: k => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
};
