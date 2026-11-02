<script lang="ts">
  import { mmss, pct } from './format';
  import { ui } from './store.svelte';
</script>

{#if ui.screen === 'play'}
  <div class="hud">
    <span class="budget" class:low={ui.budget < 25}>{Math.round(ui.budget)} €</span>
    <span>{pct(ui.index)}</span>
    <span>{mmss(ui.time)}</span>
  </div>
{/if}

<style>
  .hud { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: center; gap: 32px; padding: 12px; font: 700 28px system-ui, sans-serif; color: #2b2f36; font-variant-numeric: tabular-nums; }
  .low { color: #d62828; }
</style>
