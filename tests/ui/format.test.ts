import { describe, expect, it } from 'vitest';
import { countdown, mmss } from '../../src/ui/format';

describe('countdown', () => {
  it('arrondit à la seconde supérieure pour ne jamais afficher 0:00 avant l’événement', () => {
    expect(countdown(42.2)).toBe('0:43');
    expect(countdown(42)).toBe('0:42');
    expect(countdown(0.01)).toBe('0:01');
    expect(countdown(0)).toBe('0:00');
    expect(countdown(239.4)).toBe('4:00');
  });
  it('mmss garde l’arrondi à l’inférieur du temps écoulé', () => expect(mmss(61.9)).toBe('1:01'));
});
