<script lang="ts">
  import { ACTOR_DEFS } from '../sim/defs';
  import type { ActorKind } from '../sim/types';
  import { RES_CSS, RES_NAME } from './buildings';
  import { ALL_TOOLS, toolInfo } from './help';
  import { toolIcon } from './icons';
  import { ui } from './store.svelte';
  import { tooltip } from './tipAction';

  const tools = ALL_TOOLS.map(tool => ({
    tool,
    label: toolInfo(tool).title,
    cost: tool.startsWith('place:') ? ACTOR_DEFS[tool.slice('place:'.length) as ActorKind].cost : undefined,
  }));
  /** Matière du prochain recycleur : le choix du joueur, sinon la première qui n'en a pas. */
  const res = $derived(ui.pick ?? (ui.materials.find(m => !m.covered) ?? ui.materials[0])?.res);
</script>

{#if ui.screen === 'play'}
  <nav class="bar" aria-label="Outils">
    {#if ui.tool === 'place:recycleur'}
      <div class="picker" role="group" aria-label="Matière du recycleur">
        <span>Recycleur de :</span>
        {#each ui.materials as m (m.res)}
          <button type="button" class="res" aria-pressed={res === m.res} onclick={() => (ui.pick = m.res)}>
            <i style="background:{RES_CSS[m.res]}"></i>{RES_NAME[m.res]}{m.covered ? ' ✓' : ''}
          </button>
        {/each}
      </div>
    {/if}
    {#each tools as t (t.tool)}
      <button
        type="button"
        aria-label={t.label}
        aria-describedby="boucle-tip"
        aria-pressed={ui.tool === t.tool}
        onclick={() => (ui.tool = t.tool)}
        use:tooltip={toolInfo(t.tool)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">{@html toolIcon(t.tool)}</svg>
        {#if t.cost !== undefined}<span class="cost">{t.cost}</span>{/if}
      </button>
    {/each}
  </nav>
{/if}

<style>
  .bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
  }
  button {
    pointer-events: auto;
    position: relative;
    min-width: 52px;
    min-height: 52px;
    padding: 0;
    border: 2px solid #2b2f36;
    border-radius: 12px;
    background: #f4f1ea;
    color: #2b2f36;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 3px solid #1d6fd6;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px #f4f1ea;
  }
  button[aria-pressed='true'] {
    background: #2b2f36;
    color: #f4f1ea;
  }
  .picker {
    flex-basis: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 6px;
    font:
      700 14px system-ui,
      sans-serif;
    color: #2b2f36;
  }
  .res {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 12px;
    font: inherit;
  }
  .res i {
    width: 16px;
    height: 16px;
    border: 1.5px solid #fff;
  }
  svg {
    width: 28px;
    height: 28px;
    fill: currentColor;
    stroke: currentColor;
  }
  .cost {
    position: absolute;
    right: 3px;
    bottom: 1px;
    font:
      700 11px system-ui,
      sans-serif;
  }
</style>
