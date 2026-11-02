import { describe, expect, it } from 'vitest';
import { BEST_KEY, isBetter, loadBest, saveBest } from '../../src/ui/best';

const fake = (init?: string) => {
  const m = new Map<string, string>(init === undefined ? [] : [[BEST_KEY, init]]);
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const boom = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };

describe('best', () => {
  it('longer time wins, ties broken by index', () => {
    expect(isBetter({ time: 10, index: 0 }, null)).toBe(true);
    expect(isBetter({ time: 11, index: 0 }, { time: 10, index: 0.9 })).toBe(true);
    expect(isBetter({ time: 10, index: 0.5 }, { time: 10, index: 0.4 })).toBe(true);
    expect(isBetter({ time: 10, index: 0.4 }, { time: 10, index: 0.4 })).toBe(false);
    expect(isBetter({ time: 9, index: 1 }, { time: 10, index: 0 })).toBe(false);
  });
  it('saves only improvements', () => {
    const s = fake();
    expect(saveBest(s, { time: 50, index: 0.2 })).toEqual({ time: 50, index: 0.2 });
    expect(saveBest(s, { time: 40, index: 0.9 })).toEqual({ time: 50, index: 0.2 });
    expect(loadBest(s)).toEqual({ time: 50, index: 0.2 });
  });
  it('ignores corrupted data', () => {
    for (const bad of ['{nope', '"x"', '{"time":"a","index":1}', 'null']) {
      expect(loadBest(fake(bad))).toBeNull();
      expect(saveBest(fake(bad), { time: 5, index: 0 })).toEqual({ time: 5, index: 0 });
    }
  });
  it('survives a throwing storage', () => {
    expect(loadBest(boom)).toBeNull();
    expect(saveBest(boom, { time: 5, index: 0 })).toEqual({ time: 5, index: 0 });
  });
});
