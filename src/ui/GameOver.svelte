<script lang="ts">
  import { mmss, pct } from './format';
  import { ui } from './store.svelte';
  let { onstart }: { onstart: () => void } = $props();
  const focus = (el: HTMLElement) => el.focus();
</script>

{#if ui.screen === 'over'}
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="over-title">
    <h2 id="over-title">{ui.over === 'debordement' ? 'Un quartier a débordé' : 'Budget épuisé'}</h2>
    <p>Temps tenu : <b>{mmss(ui.time)}</b></p>
    <p>Indice de circularité : <b>{pct(ui.index)}</b></p>
    {#if ui.best}<p>Meilleur : <b>{mmss(ui.best.time)}</b> · {pct(ui.best.index)}</p>{/if}
    <div class="row">
      <button type="button" class="primary" use:focus onclick={onstart}>Rejouer</button>
      <button type="button" onclick={() => (ui.screen = 'menu')}>Menu</button>
    </div>
  </div>
{/if}

<style>
  .panel { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(244, 241, 234, 0.92); color: #2b2f36; font-family: system-ui, sans-serif; font-size: 20px; pointer-events: auto; }
  h2 { margin: 0 0 12px; font-size: 40px; }
  p { margin: 0; }
  .row { display: flex; gap: 12px; margin-top: 20px; }
  button { min-width: 140px; min-height: 56px; border: 2px solid #2b2f36; border-radius: 12px; background: #f4f1ea; color: #2b2f36; font: 700 20px system-ui, sans-serif; cursor: pointer; }
  .primary { background: #2b2f36; color: #f4f1ea; }
</style>
