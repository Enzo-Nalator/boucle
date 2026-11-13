<script lang="ts">
  import Help from './Help.svelte';
  import { ui } from './store.svelte';
  let { onstart }: { onstart: () => void } = $props();
  const focus = (el: HTMLElement) => el.focus();

  let helpOpen = $state(false);
  let helpButton = $state<HTMLButtonElement>();
  function closeHelp() {
    helpOpen = false;
    queueMicrotask(() => helpButton?.focus());
  }
</script>

{#if ui.screen === 'menu'}
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="menu-title" inert={helpOpen}>
    <h1 id="menu-title">Boucle !</h1>
    <button type="button" class="primary" use:focus onclick={onstart}>Réseau infini</button>
    <button type="button" bind:this={helpButton} onclick={() => (helpOpen = true)}>Aide</button>
    <button type="button" disabled aria-describedby="soon">Campagne</button>
    <small id="soon">bientôt</small>
  </div>
  {#if helpOpen}<Help onclose={closeHelp} />{/if}
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
    background: #f4f1ea;
    color: #2b2f36;
    font-family: system-ui, sans-serif;
    pointer-events: auto;
  }
  h1 {
    margin: 0 0 16px;
    font-size: 56px;
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
  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    border-style: dashed;
  }
  small {
    margin-top: -8px;
    opacity: 0.6;
  }
</style>
