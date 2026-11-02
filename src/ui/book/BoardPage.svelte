<script lang="ts">
  import { glyphSvg } from '../glyphs';
  import type { HelpPage } from '../help';
  import { reducedMotion } from './motion';
  import Heading from './Heading.svelte';
  import Spread from './Spread.svelte';

  let { page, n }: { page: HelpPage; n: number } = $props();
  const uid = $props.id();
  const still = reducedMotion();
  const notes = $derived(page.paragraphs ?? []);
</script>

<Spread backdrop={page.backdrop}>
  {#snippet left()}
    <svg viewBox="0 0 300 310" role="img" aria-label="Mini-plateau annoté : un quartier relié à un recycleur, un acteur grisé en panne">
      <path id="{uid}-route" d="M110 200 H135 L175 160 V110 H190" fill="none" stroke="#3ba7ff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
      <g transform="translate(30 160) scale(.8)" fill="#2b2f36" stroke="#2b2f36" stroke-width="4" stroke-linejoin="round">{@html glyphSvg('cercle')}</g>
      <circle cx="70" cy="200" r="40" fill="none" stroke="#d9d4c4" stroke-width="4" />
      <circle cx="70" cy="200" r="40" fill="none" stroke="#2b2f36" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="30" transform="rotate(-90 70 200)" />
      <g transform="translate(190 70) scale(.8)" fill="#3ba7ff" stroke="#2b2f36" stroke-width="4" stroke-linejoin="round">{@html glyphSvg('triangle')}</g>
      <circle cx="230" cy="110" r="40" fill="none" stroke="#d9d4c4" stroke-width="4" />
      <circle cx="230" cy="110" r="40" fill="none" stroke="#2b2f36" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="75" transform="rotate(-90 230 110)" />
      <g transform="translate(190 200) scale(.8)" fill="#2b2f36" stroke="#2b2f36" stroke-width="4" stroke-linejoin="round" opacity=".35">{@html glyphSvg('hexagone')}</g>
      {#if !still}
        <circle r="5.5" fill="#3ba7ff" stroke="#2b2f36" stroke-width="1.5"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#{uid}-route" /></animateMotion></circle>
        <circle r="5.5" fill="#3ba7ff" stroke="#2b2f36" stroke-width="1.5"><animateMotion dur="3s" begin="-1.5s" repeatCount="indefinite"><mpath href="#{uid}-route" /></animateMotion></circle>
        <circle r="2" fill="#2b2f36"><animateMotion dur="3s" begin="-1.5s" repeatCount="indefinite"><mpath href="#{uid}-route" /></animateMotion></circle>
      {/if}
      <g stroke="#2b2f36" stroke-width="1.5" fill="none">
        <path d="M35.1 158.4 L52.6 179.3" /><path d="M135.8 149.3 L155 180" /><path d="M270.4 61.4 L258.3 81.7" /><path d="M260.1 285.2 L230 270.4" />
      </g>
      <g fill="#2b2f36"><circle cx="28" cy="150" r="11" /><circle cx="130" cy="140" r="11" /><circle cx="276" cy="52" r="11" /><circle cx="270" cy="290" r="11" /></g>
      <g fill="#f4f1ea" font-size="12" font-weight="500" text-anchor="middle" font-family="system-ui, sans-serif">
        <text x="28" y="154">1</text><text x="130" y="144">2</text><text x="276" y="56">3</text><text x="270" y="294">4</text>
      </g>
    </svg>
  {/snippet}
  {#snippet right()}
    <Heading {n} title={page.title} />
    <ol class="notes">
      {#each notes as note, i}
        <li class="hb-pop" style="--i:{i + 2}"><span class="pin" aria-hidden="true">{i + 1}</span><span>{note}</span></li>
      {/each}
    </ol>
  {/snippet}
</Spread>

<style>
  .notes { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  li { display: flex; gap: 12px; align-items: flex-start; font-size: 15px; line-height: 1.5; background: #fbf9f4; border: 1.5px solid #2b2f36; padding: 10px 12px; }
  li:nth-child(odd) { transform: rotate(-0.6deg); }
  li:nth-child(even) { transform: rotate(0.6deg); }
  .pin { flex: none; width: 24px; height: 24px; border-radius: 50%; background: #2b2f36; color: #f4f1ea; font: 500 13px system-ui, sans-serif; display: flex; align-items: center; justify-content: center; }
</style>
