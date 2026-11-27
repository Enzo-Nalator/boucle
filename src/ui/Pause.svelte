<script lang="ts">
  import { bestKey, browserStorage, saveBest } from './best';
  import Help from './Help.svelte';
  import { ui } from './store.svelte';

  const focus = (el: HTMLElement) => el.focus();
  let helpOpen = $state(false);

  function onkeydown(e: KeyboardEvent) {
    // l'aide ouverte gère elle-même Échap
    if (e.key === 'Escape' && ui.screen === 'play' && !helpOpen) ui.paused = !ui.paused;
  }
  function quit() {
    saveBest(browserStorage, { time: ui.time, index: ui.index }, bestKey(ui.map));
    ui.paused = false;
    ui.screen = 'menu';
  }
</script>

<svelte:window {onkeydown} />

{#if ui.screen === 'play' && ui.paused}
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="pause-title" inert={helpOpen}>
    <h2 id="pause-title">Pause</h2>
    <button type="button" class="primary" use:focus onclick={() => (ui.paused = false)}>Reprendre</button>
    <button type="button" onclick={() => (helpOpen = true)}>Aide</button>
    <button type="button" onclick={quit}>Quitter la partie</button>
  </div>
  {#if helpOpen}<Help onclose={() => (helpOpen = false)} />{/if}
{/if}

<style>
  .panel {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    background: rgba(244, 241, 234, 0.9);
    color: #2b2f36;
    font-family: system-ui, sans-serif;
    pointer-events: auto;
  }
  h2 {
    margin: 0 0 12px;
    font-size: 40px;
  }
  button {
    min-width: 240px;
    min-height: 56px;
    border: 2px solid #2b2f36;
    border-radius: 12px;
    background: #f4f1ea;
    color: #2b2f36;
    font:
      700 20px system-ui,
      sans-serif;
    cursor: pointer;
  }
  .primary {
    background: #2b2f36;
    color: #f4f1ea;
  }
</style>
