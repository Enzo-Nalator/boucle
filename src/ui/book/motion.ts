/** Vrai si l'utilisateur demande moins d'animations (les animations SMIL et les transitions sont alors coupées). */
export const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
