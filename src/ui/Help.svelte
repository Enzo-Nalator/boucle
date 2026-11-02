<script lang="ts">
  import { ACTOR_INFO, HELP_PAGES, toolInfo } from './help';
  import { actorIcon, toolIcon } from './icons';

  let { onclose }: { onclose: () => void } = $props();
  let page = $state(0);
  const current = $derived(HELP_PAGES[page]);
  const last = $derived(page === HELP_PAGES.length - 1);
  const focus = (el: HTMLElement) => el.focus();
  const next = () => (last ? onclose() : page++);
  const prev = () => { if (page > 0) page--; };

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  }
</script>

<svelte:window {onkeydown} />

<div class="panel" role="dialog" aria-modal="true" aria-labelledby="help-title">
  <button type="button" class="close" aria-label="Fermer l’aide" onclick={onclose}>✕</button>
  <div class="page">
    <h2 id="help-title">{current.title}</h2>
    {#each current.paragraphs ?? [] as para}<p>{para}</p>{/each}
    {#if current.actors}
      <ul>
        {#each current.actors as kind (kind)}
          <li><svg viewBox="0 0 24 24" aria-hidden="true">{@html actorIcon(kind)}</svg><div><strong>{ACTOR_INFO[kind].name}</strong><span>{ACTOR_INFO[kind].role}</span></div></li>
        {/each}
      </ul>
    {/if}
    {#if current.tools}
      <ul>
        {#each current.tools as tool (tool)}
          <li><svg viewBox="0 0 24 24" aria-hidden="true">{@html toolIcon(tool)}</svg><div><strong>{toolInfo(tool).title}</strong><span>{toolInfo(tool).text}</span></div></li>
        {/each}
      </ul>
    {/if}
  </div>
  <nav class="nav" aria-label="Pages de l’aide">
    <button type="button" onclick={prev} disabled={page === 0}>Précédent</button>
    <span aria-live="polite">{page + 1} / {HELP_PAGES.length}</span>
    <button type="button" class="primary" use:focus onclick={next}>{last ? 'Terminer' : 'Suivant'}</button>
  </nav>
</div>

<style>
  .panel { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; background: #f4f1ea; color: #2b2f36; font-family: system-ui, sans-serif; pointer-events: auto; overflow-y: auto; }
  .page { width: min(720px, 100% - 32px); flex: 1; padding: 56px 0 16px; }
  h2 { margin: 0 0 16px; font-size: 32px; }
  p { margin: 0 0 14px; font-size: 18px; line-height: 1.5; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  li { display: flex; gap: 14px; align-items: flex-start; }
  li svg { flex: none; width: 36px; height: 36px; fill: #2b2f36; stroke: #2b2f36; }
  li div { display: flex; flex-direction: column; gap: 2px; font-size: 17px; line-height: 1.45; }
  .nav { display: flex; align-items: center; gap: 24px; padding: 16px; position: sticky; bottom: 0; background: #f4f1ea; width: 100%; justify-content: center; }
  button { min-width: 140px; min-height: 52px; border: 2px solid #2b2f36; border-radius: 12px; background: #f4f1ea; color: #2b2f36; font: 700 18px system-ui, sans-serif; cursor: pointer; }
  button:focus-visible { outline: 3px solid #1d6fd6; outline-offset: 2px; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  .primary { background: #2b2f36; color: #f4f1ea; }
  .close { position: absolute; top: 12px; right: 12px; min-width: 52px; padding: 0; }
</style>
