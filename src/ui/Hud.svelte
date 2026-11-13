<script lang="ts">
  import Glyph from './book/Glyph.svelte';
  import { countdown, mmss, pct } from './format';
  import { ui } from './store.svelte';
  import { tooltip } from './tipAction';

  const info = {
    title: 'Prochain quartier',
    text: 'Un nouveau quartier apparaît à la fin du minuteur. Relie-le vite : sans route, il déborde en moins d’une minute.',
  };
</script>

{#if ui.screen === 'play'}
  <div class="hud">
    <span class="budget" class:low={ui.budget < 25}>{Math.round(ui.budget)} €</span>
    <span>{pct(ui.index)}</span>
    <span>{mmss(ui.time)}</span>
    {#if ui.nextQuartier !== null}
      <span
        class="next"
        class:soon={ui.nextQuartier <= 10}
        role="timer"
        aria-label="Prochain quartier dans {countdown(ui.nextQuartier)}"
        use:tooltip={info}
      >
        <span class="plus" aria-hidden="true">+</span><Glyph shape="cercle" size={22} />{countdown(ui.nextQuartier)}
      </span>
    {/if}
  </div>
{/if}

<style>
  .hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 32px;
    padding: 12px;
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
    gap: 4px;
    padding: 2px 12px;
    border: 2px solid #2b2f36;
    border-radius: 999px;
    font-size: 20px;
    background: #f4f1ea;
  }
  .plus {
    font-size: 20px;
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
