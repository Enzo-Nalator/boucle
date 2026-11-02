<script lang="ts">
  import { onMount } from 'svelte';
  import type Phaser from 'phaser';
  import { createGame } from './game';
  import GameOver from './ui/GameOver.svelte';
  import Hud from './ui/Hud.svelte';
  import Menu from './ui/Menu.svelte';
  import { START_EVENT, ui } from './ui/store.svelte';
  import Toolbar from './ui/Toolbar.svelte';

  let host: HTMLDivElement;
  let game: Phaser.Game;
  onMount(() => {
    game = createGame(host);
    return () => game.destroy(true);
  });
  const start = () => game.events.emit(START_EVENT);
</script>

<div class="stage" bind:this={host}></div>
<div class="overlay" class:playing={ui.screen === 'play'}>
  <Hud />
  <Toolbar />
  <Menu onstart={start} />
  <GameOver onstart={start} />
</div>

<style>
  :global(html, body) { margin: 0; height: 100%; background: #f4f1ea; overflow: hidden; overscroll-behavior: none; }
  :global(button) { touch-action: manipulation; }
  .stage { position: fixed; inset: 0; touch-action: none; }
  .overlay { position: fixed; inset: 0; pointer-events: none; }
  .playing { user-select: none; -webkit-user-select: none; }
</style>
