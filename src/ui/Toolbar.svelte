<script lang="ts">
  import { ACTOR_DEFS } from '../sim/defs';
  import type { ActorKind } from '../sim/types';
  import { ALL_TOOLS, toolInfo } from './help';
  import { toolIcon } from './icons';
  import { ui } from './store.svelte';
  import { tooltip } from './tipAction';

  const tools = ALL_TOOLS.map((tool) => ({
    tool,
    label: toolInfo(tool).title,
    cost: tool.startsWith('place:') ? ACTOR_DEFS[tool.slice('place:'.length) as ActorKind].cost : undefined,
  }));
</script>

{#if ui.screen === 'play'}
  <nav class="bar" aria-label="Outils">
    {#each tools as t (t.tool)}
      <button type="button" aria-label={t.label} aria-describedby="boucle-tip" aria-pressed={ui.tool === t.tool} onclick={() => (ui.tool = t.tool)} use:tooltip={toolInfo(t.tool)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{@html toolIcon(t.tool)}</svg>
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
