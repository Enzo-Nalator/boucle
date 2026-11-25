<script lang="ts">
  import { buildingSvg, truckSvg } from '../buildings';
  import type { HelpPage } from '../help';
  import Heading from './Heading.svelte';
  import Spread from './Spread.svelte';

  let { page, n }: { page: HelpPage; n: number } = $props();
  const tips = $derived(page.paragraphs ?? []);
</script>

{#snippet drawing(i: number)}
  <svg viewBox="0 0 140 70" role="img" aria-hidden="true">
    {#if i === 0}
      <rect x="10" y="26" width="120" height="16" fill="none" stroke="#2b2f36" stroke-width="2" />
      <rect x="10" y="26" width="34" height="16" fill="#3ba7ff" /><rect
        x="44"
        y="26"
        width="20"
        height="16"
        fill="#9aa0a6"
      />
    {:else if i === 1}
      <path
        d="M44 35 H62 L84 13 H100"
        fill="none"
        stroke="#3ba7ff"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <g transform="translate(8.0 13.0) scale(0.44)">{@html buildingSvg('quartier')}</g>
      <g transform="translate(92.0 -4.0) scale(0.4)">{@html buildingSvg('recycleur')}</g>
    {:else if i === 2}
      <g transform="translate(0.0 15.0) scale(0.4)">{@html buildingSvg('tri')}</g>
      <path
        d="M28 35 H50 L70 15 H92"
        fill="none"
        stroke="#3ba7ff"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M50 35 L70 55 H92"
        fill="none"
        stroke="#9aa0a6"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <g transform="translate(91.0 -2.0) scale(0.34)">{@html buildingSvg('recycleur')}</g>
      <g transform="translate(91.0 38.0) scale(0.34)">{@html buildingSvg('decharge')}</g>
    {:else}
      <g transform="translate(33.0 13.0) scale(0.4)">{@html buildingSvg('tri')}</g><circle cx="53" cy="33" r="25" fill="none" stroke="#d62828" stroke-width="3" />
      <path d="M6 33 H29" fill="none" stroke="#6b7078" stroke-width="5" stroke-linecap="round" />
      <g transform="translate(14 33)">{@html truckSvg('#e08a1e')}</g><g transform="translate(26 33) scale(.8)">{@html truckSvg('#3ba7ff')}</g>
    {/if}
  </svg>
{/snippet}

<Spread backdrop={page.backdrop}>
  {#snippet left()}
    <div class="grid">
      {#each tips.slice(0, 2) as tip, i}
        <div class="hb-card hb-pop" style="--i:{i + 1}; transform: rotate({i % 2 ? 0.8 : -0.8}deg)">
          <span class="hb-tag">CONSEIL {i + 1}</span>
          {@render drawing(i)}
          <p>{tip}</p>
        </div>
      {/each}
    </div>
  {/snippet}
  {#snippet right()}
    <Heading {n} title={page.title} align="right" />
    <div class="grid">
      {#each tips.slice(2) as tip, i}
        <div class="hb-card hb-pop" style="--i:{i + 3}; transform: rotate({i % 2 ? 0.8 : -0.8}deg)">
          <span class="hb-tag">CONSEIL {i + 3}</span>
          {@render drawing(i + 2)}
          <p>{tip}</p>
        </div>
      {/each}
    </div>
  {/snippet}
</Spread>

<style>
  .grid {
    display: grid;
    gap: 16px;
    padding-top: 4px;
  }
  svg {
    width: 100%;
    max-width: 200px;
    display: block;
    margin: 8px 0;
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
  }
</style>
