<script lang="ts">
  import { ACTOR_DEFS } from '../../sim/defs';
  import type { ActorKind } from '../../sim/types';
  import { toolInfo, type HelpPage } from '../help';
  import { toolIcon } from '../icons';
  import type { Tool } from '../store.svelte';
  import Heading from './Heading.svelte';
  import Spread from './Spread.svelte';

  let { page, n }: { page: HelpPage; n: number } = $props();
  const tools = $derived(page.tools ?? []);
  let active = $state<Tool>('route');
  const cost = (t: Tool) =>
    t.startsWith('place:') ? ACTOR_DEFS[t.slice('place:'.length) as ActorKind].cost : undefined;
</script>

<Spread backdrop={page.backdrop}>
  {#snippet left()}
    <div class="bar" role="group" aria-label="Réplique de la barre d’actions">
      {#each tools as t, i (t)}
        <button
          type="button"
          class="hb-pop"
          style="--i:{i}"
          aria-pressed={active === t}
          aria-label={toolInfo(t).title}
          onclick={() => (active = t)}
          onpointerenter={() => (active = t)}
          onfocus={() => (active = t)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{@html toolIcon(t)}</svg>
          <span class="pin" aria-hidden="true">{i + 1}</span>
          {#if cost(t) !== undefined}<span class="cost">{cost(t)}</span>{/if}
        </button>
      {/each}
    </div>
    {#key active}
      <div class="hb-card detail hb-pop" style="--i:0; transform: rotate(-0.8deg)">
        <strong>{toolInfo(active).title}</strong>
        <p>{toolInfo(active).text}</p>
      </div>
    {/key}
  {/snippet}
  {#snippet right()}
    <Heading {n} title={page.title} align="right" />
    <p class="hb-cap intro">{page.paragraphs?.[0]}</p>
    <ol>
      {#each tools as t, i (t)}
        <li>
          <button type="button" class:on={active === t} onclick={() => (active = t)} onpointerenter={() => (active = t)}
            ><span class="pin" aria-hidden="true">{i + 1}</span>{toolInfo(t).title}</button
          >
        </li>
      {/each}
    </ol>
  {/snippet}
</Spread>

<style>
  .bar {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
    gap: 10px;
    max-width: 430px;
  }
  .bar button {
    position: relative;
    min-height: 56px;
    border: 2px solid #2b2f36;
    border-radius: 12px;
    background: #f4f1ea;
    color: #2b2f36;
    cursor: pointer;
    padding: 0;
  }
  .bar button[aria-pressed='true'] {
    background: #2b2f36;
    color: #f4f1ea;
  }
  .bar button:focus-visible,
  li button:focus-visible {
    outline: 3px solid #1d6fd6;
    outline-offset: 2px;
  }
  svg {
    width: 28px;
    height: 28px;
    fill: currentColor;
    stroke: currentColor;
  }
  .pin {
    position: absolute;
    left: -7px;
    top: -7px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #2b2f36;
    color: #f4f1ea;
    border: 1.5px solid #f4f1ea;
    font:
      500 11px system-ui,
      sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cost {
    position: absolute;
    right: 4px;
    bottom: 2px;
    font:
      700 11px system-ui,
      sans-serif;
  }
  .detail {
    margin-top: 24px;
    max-width: 360px;
  }
  .detail p {
    margin: 6px 0 0;
  }
  .intro {
    margin: 0 0 12px;
    max-width: none;
    text-align: right;
    font-size: 14px;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  li button {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    padding: 6px 10px 6px 34px;
    border: 0;
    background: transparent;
    font:
      15px system-ui,
      sans-serif;
    color: #2b2f36;
    cursor: pointer;
  }
  li button.on {
    background: #2b2f36;
    color: #f4f1ea;
  }
  li .pin {
    left: 8px;
    top: 50%;
    translate: 0 -50%;
  }
  li button.on .pin {
    background: #f4f1ea;
    color: #2b2f36;
    border-color: #2b2f36;
  }
</style>
