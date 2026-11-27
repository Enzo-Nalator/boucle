<script lang="ts">
  import { buildingSvg, truckSvg } from '../buildings';
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
    <svg
      viewBox="0 0 300 300"
      role="img"
      aria-label="La boucle : quartier, tri, recycleur et fabricant reliés en cercle par des routes où roulent des camions"
    >
      <rect width="300" height="300" fill="#cfe8b8" />
      {#each ['M74 139 L138 75', 'M166 60 H205 L240 95 V130', 'M240 168 V195 L200 235 H174', 'M128 240 H100 L60 200 V168'] as d, i}
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path {d} stroke="#6b7078" stroke-width="16" /><path
            id="{uid}-r{i + 1}"
            {d}
            stroke="#8a8f98"
            stroke-width="12"
          /><path {d} stroke="#fff" stroke-width="2" stroke-dasharray="7 9" />
        </g>
      {/each}
      <g transform="translate(28.0 118.0) scale(0.64)">{@html buildingSvg('quartier')}</g>
      <g transform="translate(118.0 28.0) scale(0.64)">{@html buildingSvg('tri')}</g>
      <g transform="translate(208.0 118.0) scale(0.64)">{@html buildingSvg('recycleur')}</g>
      <g transform="translate(118.0 208.0) scale(0.64)">{@html buildingSvg('fabricant')}</g>
      {#if !still}
        {#each [['r1', '#9aa0a6', '3s', '0s'], ['r2', '#3ba7ff', '3.4s', '0s'], ['r3', '#3ba7ff', '3.4s', '-1s'], ['r4', '#e08a1e', '3s', '-0.5s']] as [id, c, dur, begin]}
          <g
            ><animateMotion {dur} {begin} repeatCount="indefinite" rotate="auto"
              ><mpath href="#{uid}-{id}" /></animateMotion
            >{@html truckSvg(c)}</g
          >
        {/each}
      {/if}
      <g fill="#2b2f36" font-size="12" font-weight="700" font-family="system-ui, sans-serif">
        <text x="60" y="210" text-anchor="middle">quartier</text><text x="150" y="102" text-anchor="middle">tri</text>
        <text x="240" y="210" text-anchor="middle">recycleur</text><text x="150" y="285" text-anchor="middle"
          >fabricant</text
        >
      </g>
    </svg>
    <p class="hb-cap" style="max-width: 280px">Le déchet devient objet, l’objet redevient déchet.</p>
  {/snippet}
  {#snippet right()}
    <Heading {n} title={page.title} />
    <div class="hb-card hb-pop" style="--i:2; transform: rotate(-1.2deg)">{paras[0]}</div>
    <div class="gauges hb-pop" style="--i:3">
      <span class="hb-chip">{START_BUDGET} €</span><span class="hb-chip">42 %</span>
      <div>
        <span class="hb-tag">HUD</span>
        <p class="hb-cap">{paras[1]}</p>
      </div>
    </div>
    <div class="hb-card hb-pop" style="--i:4; transform: rotate(0.9deg); margin-top: 14px">
      <span class="hb-tag">DÉFAITE</span>
      {paras[2]}
    </div>
  {/snippet}
</Spread>

<style>
  .gauges {
    margin-top: 16px;
  }
</style>
