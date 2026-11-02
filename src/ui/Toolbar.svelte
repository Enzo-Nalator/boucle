<script lang="ts">
  import { ACTOR_DEFS } from '../sim/defs';
  import type { ActorKind } from '../sim/types';
  import { ACTOR_SHAPE, type ShapeName } from '../render/theme';
  import { ui, type Tool } from './store.svelte';

  const KINDS: Exclude<ActorKind, 'quartier'>[] = ['collecteur', 'tri', 'recycleur', 'fabricant', 'reparateur', 'decharge'];
  const NAME: Record<(typeof KINDS)[number], string> = {
    collecteur: 'collecteur', tri: 'tri', recycleur: 'recycleur', fabricant: 'fabricant', reparateur: 'réparateur', decharge: 'décharge',
  };
  const SHAPE: Record<ShapeName, string> = {
    cercle: '<circle cx="12" cy="12" r="8"/>',
    carre: '<rect x="4" y="4" width="16" height="16"/>',
    'carre-arrondi': '<rect x="4" y="4" width="16" height="16" rx="5"/>',
    triangle: '<polygon points="12,3 21,20 3,20"/>',
    losange: '<polygon points="12,2 22,12 12,22 2,12"/>',
    croix: '<polygon points="9,3 15,3 15,9 21,9 21,15 15,15 15,21 9,21 9,15 3,15 3,9 9,9"/>',
    hexagone: '<polygon points="12,2.5 20.2,7.25 20.2,16.75 12,21.5 3.8,16.75 3.8,7.25"/>',
  };
  const tools: { tool: Tool; label: string; icon: string; cost?: number }[] = [
    { tool: 'route', label: 'Tracer une route', icon: '<path d="M4 18 L12 18 L20 10" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' },
    ...KINDS.map(k => ({ tool: `place:${k}` as Tool, label: `Placer : ${NAME[k]}`, icon: SHAPE[ACTOR_SHAPE[k]], cost: ACTOR_DEFS[k].cost })),
    { tool: 'upgrade', label: 'Améliorer', icon: '<path d="M12 20 V5 M6 11 L12 5 L18 11" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' },
    { tool: 'renovate', label: 'Rénover', icon: '<path d="M19 12 A7 7 0 1 1 15 5.7 M19 4 V9 H14" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' },
    { tool: 'priority', label: 'Priorité', icon: '<path d="M12 4 V14 M12 19 V19.5" fill="none" stroke-width="3.5" stroke-linecap="round"/>' },
    { tool: 'delete', label: 'Supprimer une route', icon: '<path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke-width="3" stroke-linecap="round"/>' },
  ];
</script>

{#if ui.screen === 'play'}
  <nav class="bar" aria-label="Outils">
    {#each tools as t (t.tool)}
      <button type="button" title={t.label} aria-label={t.label} aria-pressed={ui.tool === t.tool} onclick={() => (ui.tool = t.tool)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{@html t.icon}</svg>
        {#if t.cost !== undefined}<span class="cost">{t.cost}</span>{/if}
      </button>
    {/each}
  </nav>
{/if}

<style>
  .bar { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 8px; }
  button { pointer-events: auto; position: relative; min-width: 52px; min-height: 52px; padding: 0; border: 2px solid #2b2f36; border-radius: 12px; background: #f4f1ea; color: #2b2f36; cursor: pointer; }
  button:focus-visible { outline: 3px solid #1d6fd6; outline-offset: 2px; box-shadow: 0 0 0 2px #f4f1ea; }
  button[aria-pressed='true'] { background: #2b2f36; color: #f4f1ea; }
  svg { width: 28px; height: 28px; fill: currentColor; stroke: currentColor; }
  .cost { position: absolute; right: 3px; bottom: 1px; font: 700 11px system-ui, sans-serif; }
</style>
