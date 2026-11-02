export const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/** Compte à rebours : arrondi à la seconde supérieure, pour ne jamais afficher 0:00 avant l'événement. */
export const countdown = (s: number): string => mmss(Math.ceil(s));
export const pct = (i: number): string => `${Math.round(i * 100)} %`;
