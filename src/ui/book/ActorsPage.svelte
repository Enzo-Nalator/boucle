<script lang="ts">
  import type { ActorKind } from '../../sim/types';
  import { buildingSvg, slotsSvg, truckSvg } from '../buildings';
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
  /** Contenu d'exemple de la file : matières mélangées, une seule matière pour un recycleur, etc. */
  const demo = $derived(
    sel === 'quartier' || sel === 'tri' || sel === 'collecteur'
      ? [{ res: 'plastique' as const }, { res: 'verre' as const }, { res: 'plastique' as const, dirty: true }, { res: 'bio' as const }, { res: 'plastique' as const }]
      : sel === 'recycleur'
        ? [{ res: 'plastique' as const }, { res: 'plastique' as const }, { res: 'verre' as const, stuck: true }]
        : sel === 'fabricant'
          ? [{ res: 'plastique' as const, kind: 'matiere' as const }, { res: 'plastique' as const, kind: 'matiere' as const }]
          : sel === 'reparateur'
            ? [{ res: 'verre' as const }]
            : [{ res: 'bio' as const }, { res: 'plastique' as const }],
  );
  const ROUTE: Partial<Record<ActorKind, string>> = {
    recycleur: '#3ba7ff',
    fabricant: '#e08a1e',
    reparateur: '#e08a1e',
  };
</script>

<Spread backdrop={info.name.toUpperCase()}>
  {#snippet left()}
    {#key sel}
      <div class="hb-pop" style="--i:0"><span class="hb-tag">ACTEUR {actorNumber(sel)}</span></div>
      <svg
        viewBox="0 0 300 190"
        role="img"
        aria-label="{info.name} dans son cadre, avec ses cases de stockage, relié par une route"
      >
        <rect x="14" y="14" width="200" height="162" fill="#fbf9f4" stroke="#2b2f36" stroke-width="1.5" />
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M286 160 H232 L167 95 H164" stroke="#6b7078" stroke-width="16" />
          <path id="{uid}-route" d="M286 160 H232 L167 95 H164" stroke="#8a8f98" stroke-width="12" />
          <path d="M286 160 H232 L167 95 H164" stroke="#fff" stroke-width="2" stroke-dasharray="8 10" />
        </g>
        <g transform="translate(64 45)">{@html buildingSvg(sel)}</g>
        <g transform="translate(114 151)">{@html slotsSvg(demo)}</g>
        {#if !still}
          <g
            ><animateMotion dur="2.6s" repeatCount="indefinite" rotate="auto"><mpath href="#{uid}-route" /></animateMotion
            >{@html truckSvg(ROUTE[sel] ?? '#9aa0a6')}</g
          >
        {/if}
      </svg>
      <p class="hb-cap" style="max-width: 250px">
        Les cases sous le bâtiment montrent ce qu’il stocke : la couleur donne la matière. Une case entourée de rouge est un paquet coincé.
      </p>
    {/key}
  {/snippet}
  {#snippet right()}
    <Heading {n} title={page.title} subtitle={page.subtitle} align="right" />
    {#key sel}
      <div class="hb-card hb-pop" style="--i:1; transform: rotate(0.8deg)">
        <strong>{info.name}</strong> — {info.role}
        <div class="chips">
          <span class="hb-chip">{stats.capacity}</span><span class="hb-chip">{stats.rate}</span><span class="hb-chip"
            >{stats.cost}</span
          ><span class="hb-chip">{stats.upkeep}</span>
        </div>
        <div class="flow">
          <span class="hb-tag">ENTRÉE</span>
          {info.inputs} <span class="hb-tag">SORTIE</span>
          {info.outputs}
        </div>
      </div>
    {/key}
    <div class="thumbs" role="group" aria-label="Choisir un acteur">
      {#each kinds as k, i (k)}
        <button
          type="button"
          class="thumb hb-pop"
          style="--i:{i + 2}"
          aria-pressed={sel === k}
          aria-label={ACTOR_INFO[k].name}
          onclick={() => (picked = k)}
        >
          <Glyph kind={k} size={44} />
          <span class="hb-tag">{actorNumber(k)}</span>
        </button>
      {/each}
    </div>
  {/snippet}
</Spread>

<style>
  svg {
    width: 100%;
    max-width: 420px;
    display: block;
    margin-top: 8px;
  }
  .chips {
    margin-top: 10px;
  }
  .flow {
    margin-top: 4px;
    font-size: 13px;
    line-height: 2;
  }
  .thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 18px;
  }
  .thumb {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: #f4f1ea;
    border: 1.5px solid #2b2f36;
    border-radius: 10px;
    cursor: pointer;
  }
  .thumb[aria-pressed='true'] {
    background: #2b2f36;
  }
  .thumb:focus-visible {
    outline: 3px solid #1d6fd6;
    outline-offset: 2px;
  }
</style>
