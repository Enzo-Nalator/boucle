<script lang="ts">
  import { tip } from './store.svelte';
  import { placeTooltip } from './tooltip';

  let w = $state(0);
  let h = $state(0);
  let vw = $state(1280);
  let vh = $state(720);
  const pos = $derived(placeTooltip({ x: tip.x, y: tip.y }, { w, h }, { w: vw, h: vh }));
</script>

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} />

<div
  id="boucle-tip"
  role="tooltip"
  class="tip"
  class:visible={tip.visible}
  style:transform="translate({pos.x}px, {pos.y}px)"
  bind:clientWidth={w}
  bind:clientHeight={h}
>
  <strong>{tip.title}</strong>
  <span>{tip.text}</span>
</div>

<style>
  .tip {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 10;
    max-width: 300px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #2b2f36;
    color: #f4f1ea;
    font:
      14px/1.4 system-ui,
      sans-serif;
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.25);
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.15s ease,
      visibility 0s linear 0.15s;
  }
  .tip.visible {
    opacity: 1;
    visibility: visible;
    transition:
      opacity 0.15s ease,
      visibility 0s;
  }
  strong {
    display: block;
    margin-bottom: 2px;
    font-size: 15px;
  }
</style>
