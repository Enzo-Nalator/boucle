<script lang="ts">
  import { onMount } from 'svelte';
  import type Phaser from 'phaser';
  import { createGame } from './game';
  import type { GameScene, GameState } from './GameScene';

  let host: HTMLDivElement;
  let game: Phaser.Game;
  // reflète l'état émis par la scène Phaser ('state' sur game.events)
  let s: GameState = $state({ title: '', links: 0, total: 0, won: false, last: false });

  const scene = () => game.scene.getScene('game') as GameScene;

  onMount(() => {
    game = createGame(host);
    game.events.on('state', (next: GameState) => (s = next));
    return () => game.destroy(true);
  });
</script>

<div class="stage" bind:this={host}></div>

<header>
  <div>
    <h1>{s.title}</h1>
    <p>Liens : {s.links} / {s.total}</p>
  </div>
  <button onclick={() => scene().loadLevel(scene().levelIndex)}>Recommencer</button>
</header>

{#if s.won}
  <div class="win">
    <h2>{s.last ? 'Boucle bouclée !' : 'Boucle fermée !'}</h2>
    <button onclick={() => scene().next()}>{s.last ? 'Rejouer' : 'Niveau suivant'}</button>
  </div>
{/if}

<style>
  :global(html, body) { margin: 0; height: 100%; background: #14202b; overflow: hidden; font-family: sans-serif; color: #e8eef5; }
  .stage { position: fixed; inset: 0; touch-action: none; }
  header { position: fixed; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 24px; pointer-events: none; }
  h1 { margin: 0; font-size: 1.4rem; font-weight: 500; }
  p { margin: 4px 0 0; color: #8fa3b5; }
  button { pointer-events: auto; background: #25394b; color: inherit; border: 0; border-radius: 8px; padding: 10px 16px; font-size: 1rem; cursor: pointer; }
  button:hover { background: #2f4a63; }
  .win { position: fixed; inset: 0; display: grid; place-content: center; justify-items: center; gap: 16px; background: #14202bcc; }
  h2 { margin: 0; font-size: 3rem; color: #3de0a0; }
</style>
