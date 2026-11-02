<script lang="ts">
  import { ACTOR_SHAPE } from '../../render/theme';
  import type { ActorKind } from '../../sim/types';
  import { glyphSvg } from '../glyphs';
  import { ACTOR_INFO, actorNumber, actorStats, type HelpPage } from '../help';
  import { reducedMotion } from './motion';
  import Glyph from './Glyph.svelte';
  import Heading from './Heading.svelte';
  import Spread from './Spread.svelte';

  let { page, n }: { page: HelpPage; n: number } = $props();
  const uid = $props.id();
  const still = reducedMotion();
  const kinds = $derived(page.actors ?? []);

  let picked = $state<ActorKind | null>(null);
  const sel = $derived(picked ?? kinds[0]);
  const info = $derived(ACTOR_INFO[sel]);
  const stats = $derived(actorStats(sel));
  const FILL: Partial<Record<ActorKind, string>> = { recycleur: '#3ba7ff' };
  const ROUTE: Partial<Record<ActorKind, string>> = { recycleur: '#3ba7ff', fabricant: '#e08a1e', reparateur: '#e08a1e' };
</script>

<Spread backdrop={info.name.toUpperCase()}>
  {#snippet left()}
    {#key sel}
      <div class="hb-pop" style="--i:0"><span class="hb-tag">ACTEUR {actorNumber(sel)}</span></div>
      <svg viewBox="0 0 300 190" role="img" aria-label="{info.name} dans son cadre, entouré de son anneau de capacité et relié par une route">
        <rect x="14" y="14" width="200" height="162" fill="#fbf9f4" stroke="#2b2f36" stroke-width="1.5" />
        <path id="{uid}-route" d="M286 160 H232 L167 95 H164" fill="none" stroke={ROUTE[sel] ?? '#9aa0a6'} stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="114" cy="95" r="50" fill="none" stroke="#d9d4c4" stroke-width="5" />
        <circle class="ring" class:still cx="114" cy="95" r="50" fill="none" stroke="#2b2f36" stroke-width="5" stroke-linecap="round" pathLength="100" transform="rotate(-90 114 95)" />
        <g transform="translate(64 45)" fill={FILL[sel] ?? '#2b2f36'} stroke="#2b2f36" stroke-width="3" stroke-linejoin="round">{@html glyphSvg(ACTOR_SHAPE[sel])}</g>
        {#if !still}
          <circle r="5.5" fill={ROUTE[sel] ?? '#9aa0a6'} stroke="#2b2f36" stroke-width="1.5"><animateMotion dur="2.6s" repeatCount="indefinite"><mpath href="#{uid}-route" /></animateMotion></circle>
        {/if}
      </svg>
      <p class="hb-cap" style="max-width: 250px">L’anneau entoure l’acteur : plus sa file se remplit, plus il se ferme.</p>
    {/key}
  {/snippet}
  {#snippet right()}
    <Heading {n} title={page.title} subtitle={page.subtitle} align="right" />
    {#key sel}
      <div class="hb-card hb-pop" style="--i:1; transform: rotate(0.8deg)">
        <strong>{info.name}</strong> — {info.role}
        <div class="chips">
          <span class="hb-chip">{stats.capacity}</span><span class="hb-chip">{stats.rate}</span><span class="hb-chip">{stats.cost}</span><span class="hb-chip">{stats.upkeep}</span>
        </div>
        <div class="flow"><span class="hb-tag">ENTRÉE</span> {info.inputs} <span class="hb-tag">SORTIE</span> {info.outputs}</div>
      </div>
    {/key}
    <div class="thumbs" role="group" aria-label="Choisir un acteur">
      {#each kinds as k, i (k)}
        <button type="button" class="thumb hb-pop" style="--i:{i + 2}" aria-pressed={sel === k} aria-label={ACTOR_INFO[k].name} onclick={() => (picked = k)}>
          <Glyph shape={ACTOR_SHAPE[k]} size={40} fill={FILL[k] ?? '#2b2f36'} />
          <span class="hb-tag">{actorNumber(k)}</span>
        </button>
      {/each}
    </div>
  {/snippet}
</Spread>

<style>
  svg { width: 100%; max-width: 420px; display: block; margin-top: 8px; }
  .ring { stroke-dasharray: 100 100; animation: fill 4s ease-in-out infinite alternate; }
  .ring.still { animation: none; stroke-dashoffset: 55; }
  @keyframes fill { from { stroke-dashoffset: 80; } to { stroke-dashoffset: 25; } }
  .chips { margin-top: 10px; }
  .flow { margin-top: 4px; font-size: 13px; line-height: 2; }
  .thumbs { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-end; margin-top: 18px; }
  .thumb { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 10px; background: #f4f1ea; border: 1.5px solid #2b2f36; border-radius: 10px; cursor: pointer; }
  .thumb[aria-pressed='true'] { background: #2b2f36; }
  .thumb[aria-pressed='true'] :global(svg) { filter: invert(1) hue-rotate(180deg); }
  .thumb:focus-visible { outline: 3px solid #1d6fd6; outline-offset: 2px; }
</style>
