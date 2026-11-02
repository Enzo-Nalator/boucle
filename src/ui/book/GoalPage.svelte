<script lang="ts">
  import { START_BUDGET } from '../../sim/defs';
  import type { HelpPage } from '../help';
  import { reducedMotion } from './motion';
  import Heading from './Heading.svelte';
  import Spread from './Spread.svelte';

  let { page, n }: { page: HelpPage; n: number } = $props();
  const uid = $props.id();
  const still = reducedMotion();
  const paras = $derived(page.paragraphs ?? []);
</script>

<Spread backdrop={page.backdrop}>
  {#snippet left()}
    <svg viewBox="0 0 300 300" role="img" aria-label="La boucle : quartier, tri, recycleur et fabricant reliés en cercle par des routes">
      <g fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
        <path id="{uid}-r1" d="M74 139 L138 75" stroke="#9aa0a6" />
        <path id="{uid}-r2" d="M166 60 H205 L240 95 V130" stroke="#3ba7ff" />
        <path id="{uid}-r3" d="M240 168 V195 L200 235 H174" stroke="#3ba7ff" />
        <path id="{uid}-r4" d="M128 240 H100 L60 200 V168" stroke="#e08a1e" />
      </g>
      <circle cx="60" cy="150" r="17" fill="#2b2f36" />
      <rect x="134" y="44" width="32" height="32" fill="#2b2f36" />
      <polygon points="240,131 258,166 222,166" fill="#3ba7ff" stroke="#2b2f36" stroke-width="2" stroke-linejoin="round" />
      <polygon points="150,222 168,240 150,258 132,240" fill="#2b2f36" />
      {#if !still}
        {#each [['r1', '#9aa0a6', '3s', '0s'], ['r2', '#3ba7ff', '3.4s', '0s'], ['r3', '#3ba7ff', '3.4s', '-1s'], ['r4', '#e08a1e', '3s', '-0.5s']] as [id, c, dur, begin]}
          <circle r="5" fill={c}><animateMotion {dur} {begin} repeatCount="indefinite"><mpath href="#{uid}-{id}" /></animateMotion></circle>
        {/each}
      {/if}
      <g fill="#2b2f36" font-size="12" font-family="system-ui, sans-serif">
        <text x="2" y="192">quartier</text><text x="172" y="46">tri</text>
        <text x="216" y="152" text-anchor="end">recycleur</text><text x="176" y="268">fabricant</text>
      </g>
    </svg>
    <p class="hb-cap" style="max-width: 280px">Le déchet devient objet, l’objet redevient déchet.</p>
  {/snippet}
  {#snippet right()}
    <Heading {n} title={page.title} />
    <div class="hb-card hb-pop" style="--i:2; transform: rotate(-1.2deg)">{paras[0]}</div>
    <div class="gauges hb-pop" style="--i:3">
      <span class="hb-chip">{START_BUDGET} €</span><span class="hb-chip">42 %</span>
      <div><span class="hb-tag">HUD</span><p class="hb-cap">{paras[1]}</p></div>
    </div>
    <div class="hb-card hb-pop" style="--i:4; transform: rotate(0.9deg); margin-top: 14px">
      <span class="hb-tag">DÉFAITE</span> {paras[2]}
    </div>
  {/snippet}
</Spread>

<style>
  .gauges { margin-top: 16px; }
</style>
