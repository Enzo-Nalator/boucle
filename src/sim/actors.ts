import type { Actor, Packet, World } from './types';

export function accepts(a: Actor, p: Packet): boolean {
  switch (a.kind) {
    case 'recycleur': return p.kind === 'dechet' && p.res === a.res;
    case 'fabricant': return p.kind === 'matiere';
    case 'quartier': return p.kind === 'objet';
    case 'tri': return p.kind === 'dechet';
    case 'reparateur': return p.kind === 'dechet' && p.reusable;
    case 'decharge':
    case 'collecteur': return true;
  }
}

/** Point d'extension (Tasks 4-5) : traite a.queue à son débit et pousse le résultat dans a.out. */
export function process(_w: World, _a: Actor): void {}
