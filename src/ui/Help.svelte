<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import ActorsPage from './book/ActorsPage.svelte';
  import BoardPage from './book/BoardPage.svelte';
  import GoalPage from './book/GoalPage.svelte';
  import TipsPage from './book/TipsPage.svelte';
  import ToolsPage from './book/ToolsPage.svelte';
  import { reducedMotion } from './book/motion';
  import { HELP_PAGES } from './help';

  let { onclose }: { onclose: () => void } = $props();
  let page = $state(0);
  let dir = $state(1);
  const current = $derived(HELP_PAGES[page]);
  const last = $derived(page === HELP_PAGES.length - 1);
  const still = reducedMotion();
  const focus = (el: HTMLElement) => el.focus();

  function go(n: number) {
    if (n < 0 || n >= HELP_PAGES.length || n === page) return;
    dir = n > page ? 1 : -1;
    page = n;
  }
  const next = () => (last ? onclose() : go(page + 1));

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') go(page - 1);
  }
</script>

<svelte:window {onkeydown} />

<div class="panel" role="dialog" aria-modal="true" aria-label="Aide du jeu">
  <button type="button" class="close" aria-label="Fermer l’aide" onclick={onclose}>✕</button>
  <div class="stage">
    {#key page}
      <section
        class="page"
        aria-live="polite"
        in:fly={{ x: dir * 60, duration: still ? 0 : 300 }}
        out:fade={{ duration: still ? 0 : 120 }}
      >
        {#if current.layout === 'goal'}<GoalPage page={current} n={page + 1} />
        {:else if current.layout === 'board'}<BoardPage page={current} n={page + 1} />
        {:else if current.layout === 'actors'}<ActorsPage page={current} n={page + 1} />
        {:else if current.layout === 'tools'}<ToolsPage page={current} n={page + 1} />
        {:else}<TipsPage page={current} n={page + 1} />{/if}
      </section>
    {/key}
  </div>
  <nav class="nav" aria-label="Pages de l’aide">
    <button type="button" onclick={() => go(page - 1)} disabled={page === 0}>Précédent</button>
    <div class="dots" role="group" aria-label="Page {page + 1} sur {HELP_PAGES.length}">
      {#each HELP_PAGES as p, i}
        <button
          type="button"
          class="dot"
          aria-label="Page {i + 1} : {p.title}{p.subtitle ? ` ${p.subtitle}` : ''}"
          aria-current={i === page ? 'page' : undefined}
          onclick={() => go(i)}
        ></button>
      {/each}
    </div>
    <button type="button" class="primary" use:focus onclick={next}>{last ? 'Terminer' : 'Suivant'}</button>
  </nav>
</div>

<style>
  .panel {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #f4f1ea;
    color: #2b2f36;
    font-family: system-ui, sans-serif;
    pointer-events: auto;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .stage {
    display: grid;
    width: min(1000px, 100% - 32px);
    flex: 1;
    padding: 76px 0 16px;
  }
  .page {
    grid-area: 1 / 1;
    min-width: 0;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 14px 16px;
    position: sticky;
    bottom: 0;
    width: 100%;
    box-sizing: border-box;
    justify-content: center;
    background: #f4f1ea;
    border-top: 1.5px solid #2b2f36;
  }
  button {
    font-family: inherit;
  }
  .nav > button {
    min-width: 130px;
    min-height: 52px;
    border: 2px solid #2b2f36;
    border-radius: 12px;
    background: #f4f1ea;
    color: #2b2f36;
    font:
      700 18px system-ui,
      sans-serif;
    cursor: pointer;
  }
  .nav > button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .primary {
    background: #2b2f36 !important;
    color: #f4f1ea !important;
  }
  .dots {
    display: flex;
    gap: 8px;
  }
  .dot {
    width: 14px;
    height: 14px;
    padding: 0;
    border: 2px solid #2b2f36;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
  }
  .dot[aria-current='page'] {
    background: #2b2f36;
  }
  button:focus-visible {
    outline: 3px solid #1d6fd6;
    outline-offset: 2px;
  }
  .close {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 5;
    min-width: 52px;
    min-height: 52px;
    border: 2px solid #2b2f36;
    border-radius: 12px;
    background: #f4f1ea;
    color: #2b2f36;
    font-size: 18px;
    cursor: pointer;
  }

  :global(.hb-tag) {
    display: inline-block;
    background: #2b2f36;
    color: #f4f1ea;
    font:
      11px/1 ui-monospace,
      monospace;
    letter-spacing: 0.12em;
    padding: 3px 6px;
  }
  :global(.hb-cap) {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.4;
    max-width: 200px;
  }
  :global(.hb-card) {
    position: relative;
    background: #fbf9f4;
    border: 1.5px solid #2b2f36;
    padding: 14px 16px;
    font-size: 15px;
    line-height: 1.55;
  }
  :global(.hb-chip) {
    display: inline-block;
    border: 1.5px solid #2b2f36;
    border-radius: 8px;
    padding: 3px 8px;
    font:
      500 12px ui-monospace,
      monospace;
    margin: 0 6px 6px 0;
    background: #f4f1ea;
  }
  :global(.hb-pop) {
    opacity: 0;
    animation: hb-in 0.45s ease forwards;
    animation-delay: calc(var(--i, 0) * 70ms + 120ms);
  }
  @keyframes hb-in {
    from {
      opacity: 0;
      translate: 0 8px;
    }
    to {
      opacity: 1;
      translate: 0 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.hb-pop) {
      animation: none;
      opacity: 1;
    }
  }
</style>
