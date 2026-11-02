<script lang="ts">
  import { onMount } from 'svelte';
  import { createGame } from './game';

  let host: HTMLDivElement;
  onMount(() => {
    const game = createGame(host);
    return () => game.destroy(true);
  });
</script>

<div class="stage" bind:this={host}></div>

<style>
  :global(html, body) { margin: 0; height: 100%; background: #f4f1ea; overflow: hidden; }
  .stage { position: fixed; inset: 0; touch-action: none; }
</style>
