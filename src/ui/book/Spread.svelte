<script lang="ts">
  import type { Snippet } from 'svelte';

  let { backdrop, left, right }: { backdrop: string; left: Snippet; right: Snippet } = $props();
</script>

<div class="spread">
  <div class="big" aria-hidden="true">{backdrop}</div>
  <div class="col">{@render left()}</div>
  <div class="col">{@render right()}</div>
</div>

<style>
  .spread {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    width: 100%;
    min-height: 420px;
  }
  .big {
    position: absolute;
    left: 0;
    bottom: -4px;
    z-index: 0;
    max-width: 100%;
    overflow: hidden;
    font-size: clamp(64px, 14vw, 168px);
    font-weight: 500;
    letter-spacing: 0.04em;
    line-height: 0.8;
    color: #e7e2d4;
    pointer-events: none;
    white-space: nowrap;
  }
  .col {
    position: relative;
    z-index: 1;
    min-width: 0;
    padding: 6px 4px;
  }
  @media (max-width: 760px) {
    .spread {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
