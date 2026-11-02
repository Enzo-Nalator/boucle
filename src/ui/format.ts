export const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const pct = (i: number): string => `${Math.round(i * 100)} %`;
