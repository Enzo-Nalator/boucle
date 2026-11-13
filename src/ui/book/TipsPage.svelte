<script lang="ts">
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
      <circle cx="30" cy="35" r="11" fill="#2b2f36" /><circle
        cx="30"
        cy="35"
        r="19"
        fill="none"
        stroke="#2b2f36"
        stroke-width="3"
      />
      <polygon points="112,3 124,23 100,23" fill="#3ba7ff" stroke="#2b2f36" stroke-width="2" stroke-linejoin="round" />
    {:else if i === 2}
      <rect x="10" y="26" width="18" height="18" fill="#2b2f36" />
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
      <polygon points="108,5 120,25 96,25" fill="#3ba7ff" stroke="#2b2f36" stroke-width="2" stroke-linejoin="round" />
      <polygon points="108,45 118,50 118,60 108,65 98,60 98,50" fill="#2b2f36" opacity=".6" />
    {:else}
      <rect x="40" y="20" width="26" height="26" fill="#2b2f36" /><circle
        cx="53"
        cy="33"
        r="24"
        fill="none"
        stroke="#d62828"
        stroke-width="3"
      />
      <path d="M6 33 H29" fill="none" stroke="#9aa0a6" stroke-width="5" stroke-linecap="round" />
      <circle cx="12" cy="33" r="5" fill="#e08a1e" /><circle cx="24" cy="33" r="5" fill="#3ba7ff" />
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
