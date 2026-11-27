<script lang="ts">
  import Glyph from './book/Glyph.svelte';
  import { RES_CSS, RES_NAME } from './buildings';
  import { countdown, mmss, pct } from './format';
  import { ui } from './store.svelte';
  import { tooltip } from './tipAction';

  let detail = $state(false);
  $effect(() => {
    if (ui.screen !== 'play') detail = false;
  });
  const signed = (v: number) => `${v < -0.5 ? '−' : '+'}${Math.abs(Math.round(v))} €`;
  const rows = $derived([
    ['Recycleurs (paquets recyclés)', ui.money.recycle],
    ['Fabricants (objets produits)', ui.money.fabricate],
    ['Réparateurs (objets réparés)', ui.money.repair],
    ['Entretien des bâtiments', ui.money.upkeep],
    ['Décharge', ui.money.dump],
  ] as const);

  /** Texte de la bulle et explication de chaque événement. */
  const EVENTS = {
    quartier: [
      'Nouveau quartier',
      'Un quartier apparaît. Relie-le vite : sans route, il déborde en moins d’une minute.',
    ],
    matiere: ['Nouveau déchet', 'Les quartiers vont produire cette matière : prévois son recycleur.'],
    contamination: ['Plus de saleté', 'La part de déchets contaminés augmente : un centre de tri les écarte.'],
    emission: ['Plus de déchets', 'Les quartiers vont produire davantage : renforce ce qui sature.'],
    panne: ['Panne', 'Un bâtiment au hasard s’arrête 10 secondes.'],
  } as const;
  /** Une bulle par événement du prochain moment : une panne peut s'ajouter à un autre. */
  const events = $derived.by(() => {
    const next = ui.next;
    if (!next) return [];
    const kinds = next.outage && next.kind !== 'panne' ? [next.kind, 'panne' as const] : [next.kind];
    return kinds.map(kind => {
      const [title, text] = EVENTS[kind],
        res = kind === 'matiere' ? next.res : undefined;
      return { kind, res, in: next.in, label: res ? `${title} : ${RES_NAME[res].toLowerCase()}` : title, text };
    });
  });
</script>

{#if ui.screen === 'play'}
  <div class="toast" role="status">{ui.hint}</div>
  <div class="top">
    <div class="hud">
      <button type="button" class="budget" aria-expanded={detail} onclick={() => (detail = !detail)}>
        <span class:low={ui.budget < 25}>{Math.round(ui.budget)} €</span>
        <small class:low={ui.money.net < -0.5}>{signed(ui.money.net)}/min {detail ? '▴' : '▾'}</small>
      </button>
      <span>{pct(ui.index)}</span>
      <span>{mmss(ui.time)}</span>
      {#each events as event (event.kind)}
        <button
          type="button"
          class="next"
          class:soon={event.in <= 10}
          aria-label="{event.label} dans {countdown(event.in)}"
          aria-describedby="boucle-tip"
          use:tooltip={{ title: `${event.label} dans ${countdown(event.in)}`, text: event.text }}
        >
          {#if event.kind === 'quartier'}
            <Glyph kind="quartier" size={26} />
          {:else if event.res}
            <i style="background:{RES_CSS[event.res]}" aria-hidden="true"></i>
          {:else}
            <b aria-hidden="true">{event.kind === 'contamination' ? '●' : event.kind === 'emission' ? '▲' : '!'}</b>
          {/if}
          <span>{event.label}</span>
          {countdown(event.in)}
        </button>
      {/each}
      <button type="button" class="pause" aria-label="Pause" onclick={() => (ui.paused = true)}>❚❚</button>
    </div>
    <div class="legend">
      {#each ui.materials as m (m.res)}
        <span class="chip" class:missing={!m.covered}>
          <i style="background:{RES_CSS[m.res]}"></i>{RES_NAME[m.res]}{m.covered ? '' : ' : sans recycleur'}
        </span>
      {/each}
      <span class="chip">■ déchet → ● matière → ▲ objet</span>
      <span class="chip">• sale : {pct(ui.contamination)}</span>
      <span class="chip">✚ réparable</span>
    </div>
  </div>
  {#if ui.news}<div class="news" role="status">{ui.news}</div>{/if}
  {#if detail}
    <dl class="detail">
      {#each rows as [label, v] (label)}
        <dt>{label}</dt>
        <dd class:low={v < -0.5}>{signed(v)}</dd>
      {/each}
      <dt class="total">Par minute</dt>
      <dd class="total" class:low={ui.money.net < -0.5}>{signed(ui.money.net)}</dd>
    </dl>
  {/if}
{/if}

<style>
  button {
    pointer-events: auto;
    border: 2px solid #2b2f36;
    border-radius: 12px;
    background: #f4f1ea;
    color: #2b2f36;
    font: inherit;
    cursor: pointer;
  }
  .budget {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 2px 12px;
  }
  .budget small {
    font-size: 15px;
    color: #17692c;
  }
  .budget small.low {
    color: #d62828;
  }
  .pause {
    min-width: 44px;
    min-height: 44px;
    font-size: 16px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    padding: 0 8px;
    font:
      700 13px system-ui,
      sans-serif;
    color: #2b2f36;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 999px;
    background: #fff;
  }
  .chip i {
    width: 11px;
    height: 11px;
  }
  .missing {
    outline: 2px solid #d62828;
    color: #b01e1e;
  }
  .news {
    position: absolute;
    bottom: 132px;
    left: 50%;
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100% - 32px);
    box-sizing: border-box;
    padding: 10px 16px;
    border: 2px solid #2b2f36;
    border-radius: 12px;
    background: #ffe9a8;
    color: #2b2f36;
    font:
      700 16px system-ui,
      sans-serif;
  }
  .detail {
    position: absolute;
    top: 100px;
    left: 8px;
    display: grid;
    grid-template-columns: auto auto;
    gap: 6px 20px;
    margin: 0;
    padding: 12px 16px;
    border: 2px solid #2b2f36;
    border-radius: 12px;
    background: #fff;
    color: #2b2f36;
    font:
      14px system-ui,
      sans-serif;
    font-variant-numeric: tabular-nums;
  }
  dd {
    margin: 0;
    text-align: right;
    font-weight: 700;
    color: #17692c;
  }
  dd.low {
    color: #d62828;
  }
  .total {
    border-top: 1.5px solid #2b2f36;
    padding-top: 6px;
    font-weight: 700;
  }
  .toast {
    position: absolute;
    top: 102px;
    z-index: 1;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    border-radius: 20px;
    background: #2b2f36;
    color: #fff;
    font:
      700 16px system-ui,
      sans-serif;
    white-space: nowrap;
  }
  .toast:empty {
    padding: 0;
  }
  .top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }
  .hud {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 8px 14px;
    padding: 12px 8px 8px;
    font:
      700 28px system-ui,
      sans-serif;
    color: #2b2f36;
    font-variant-numeric: tabular-nums;
  }
  .low {
    color: #d62828;
  }
  .next {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    padding: 2px 12px;
    border: 2px solid #2b2f36;
    border-radius: 999px;
    font-size: 20px;
    background: #f4f1ea;
  }
  .next i {
    width: 16px;
    height: 16px;
  }
  .next > span {
    font-size: 15px;
  }
  .soon {
    border-color: #d62828;
    color: #d62828;
    animation: blink 0.8s ease-in-out infinite alternate;
  }
  .soon :global(svg) {
    fill: #d62828 !important;
    stroke: #d62828 !important;
  }
  @keyframes blink {
    from {
      opacity: 1;
    }
    to {
      opacity: 0.45;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .soon {
      animation: none;
    }
  }
</style>
