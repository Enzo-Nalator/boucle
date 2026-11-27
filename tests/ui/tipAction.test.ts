import { describe, expect, it, vi } from 'vitest';
import { tip } from '../../src/ui/store.svelte';
import { tooltip } from '../../src/ui/tipAction';

// la bulle partagée, sans les runes Svelte (les tests tournent hors compilateur Svelte)
vi.mock('../../src/ui/store.svelte', () => ({ tip: { visible: false, title: '', text: '', x: 0, y: 0 } }));

/** Élément factice : garde ses écouteurs pour les déclencher à la main. */
function fakeNode() {
  const on: Record<string, (e: unknown) => void> = {};
  const node = {
    addEventListener: (t: string, f: (e: unknown) => void) => (on[t] = f),
    removeEventListener: () => {},
    matches: () => false,
  } as unknown as HTMLElement;
  return { node, on };
}

describe('tooltip', () => {
  it('une infobulle mise à jour ne réécrit pas la bulle ouverte par un autre élément', () => {
    const a = fakeNode(),
      b = fakeNode();
    tooltip(a.node, { title: 'Recycleur', text: 'fiche' });
    const other = tooltip(b.node, { title: 'Indice', text: 'avant' });
    a.on.pointerenter({ pointerType: 'mouse', clientX: 0, clientY: 0 });
    other?.update?.({ title: 'Indice', text: 'après' });
    expect([tip.title, tip.text]).toEqual(['Recycleur', 'fiche']);
    b.on.pointerenter({ pointerType: 'mouse', clientX: 0, clientY: 0 });
    other?.update?.({ title: 'Indice', text: 'à jour' });
    expect(tip.text).toBe('à jour');
  });
});
