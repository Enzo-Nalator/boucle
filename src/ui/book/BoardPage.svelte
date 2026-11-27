<script lang="ts">
  import { FABRICATE_REVENUE, RECYCLE_REVENUE } from '../../sim/defs';
  import { buildingSvg, slotsSvg, truckSvg, warnSvg } from '../buildings';
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
    {#if page.layout === 'routes'}
      <svg
        viewBox="0 0 300 310"
        role="img"
        aria-label="Un réseau à double sens : un embranchement à feu et un pont sur une rivière"
      >
        <rect width="300" height="310" fill="#cfe8b8" />
        <rect x="170" width="46" height="310" fill="#6cc4ee" />
        <g fill="none" stroke-linejoin="round">
          <path d="M50 90 H255 M110 90 V230" stroke="#6b7078" stroke-width="22" />
          <path d="M50 90 H255 M110 90 V230" stroke="#8a8f98" stroke-width="18" />
          <path d="M50 90 H255 M110 90 V230" stroke="#fff" stroke-width="2" stroke-dasharray="8 10" />
          <path d="M170 77 H216 M170 103 H216" stroke="#8a5a3c" stroke-width="4" />
        </g>
        <g transform="translate(70 95)">{@html truckSvg('#3ba7ff')}</g>
        <g transform="translate(150 85) rotate(180)">{@html truckSvg('#2fbf8a')}</g>
        <g transform="translate(105 160) rotate(90)">{@html truckSvg('#e08a1e')}</g>
        <circle cx="110" cy="90" r="13" fill="#f0a030" />
        <rect x="105" y="80" width="10" height="20" rx="3" fill="#2b2f36" />
        <circle cx="110" cy="84.5" r="2.6" fill="#e5484d" /><circle cx="110" cy="90" r="2.6" fill="#ffcc00" />
        <circle cx="110" cy="95.5" r="2.6" fill="#4caf50" />
        <g transform="translate(10 50) scale(.8)">{@html buildingSvg('quartier')}</g>
        <g transform="translate(220 50) scale(.8)">{@html buildingSvg('recycleur', 'plastique')}</g>
        <g transform="translate(70 200) scale(.8)">{@html buildingSvg('tri')}</g>
      </svg>
    {:else if page.layout === 'suivi'}
      <svg
        viewBox="0 0 300 310"
        role="img"
        aria-label="Gains affichés au-dessus des bâtiments, matières en jeu et cases de stockage"
      >
        <rect width="300" height="310" fill="#cfe8b8" />
        <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
          <g font-size="12" fill="#2b2f36">
            <rect x="22" y="18" width="94" height="24" rx="12" fill="#fff" />
            <rect x="32" y="25" width="10" height="10" fill="#3ba7ff" /><text x="78" y="34">Plastique</text>
            <rect x="124" y="18" width="154" height="24" rx="12" fill="#fff" stroke="#d62828" stroke-width="2" />
            <rect x="134" y="25" width="10" height="10" fill="#8a94a6" />
            <text x="211" y="34" fill="#b01e1e">Métal : sans recycleur</text>
          </g>
          <g font-size="20" stroke="#fff" stroke-width="4" paint-order="stroke">
            <text x="60" y="90" fill="#17692c">+{RECYCLE_REVENUE} €</text>
            <text x="150" y="90" fill="#17692c">+{FABRICATE_REVENUE} €</text>
            <text x="240" y="90" fill="#c0262c">−0,5 €</text>
          </g>
        </g>
        <g transform="translate(20 92) scale(.8)">{@html buildingSvg('recycleur', 'plastique')}</g>
        <g transform="translate(110 92) scale(.8)">{@html buildingSvg('fabricant')}</g>
        <g transform="translate(200 92) scale(.8)">{@html buildingSvg('decharge')}</g>
        <g transform="translate(150 215) scale(2)"
          >{@html slotsSvg([
            { res: 'plastique' },
            { res: 'verre', reusable: true },
            { res: 'plastique', dirty: true },
            { res: 'verre', kind: 'matiere' },
            { res: 'plastique', kind: 'objet' },
          ])}</g
        >
        <g font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2b2f36" text-anchor="middle">
          <text x="150" y="272">■ déchet → ● matière → ▲ objet</text>
          <text x="150" y="292">✚ réparable · • sale</text>
        </g>
      </svg>
    {:else}
      <svg
        viewBox="0 0 300 310"
        role="img"
        aria-label="Mini-plateau annoté : un quartier relié à un recycleur par une route, un acteur grisé en panne"
      >
        <rect width="300" height="310" fill="#cfe8b8" />
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M110 200 H135 L175 160 V110 H190" stroke="#6b7078" stroke-width="18" />
          <path id="{uid}-route" d="M110 200 H135 L175 160 V110 H190" stroke="#8a8f98" stroke-width="14" />
          <path d="M110 200 H135 L175 160 V110 H190" stroke="#fff" stroke-width="2" stroke-dasharray="8 10" />
        </g>
        <g transform="translate(30 160) scale(.8)">{@html buildingSvg('quartier')}</g>
        <g transform="translate(190 70) scale(.8)">{@html buildingSvg('recycleur', 'plastique')}</g>
        <g transform="translate(190 200) scale(.8)" opacity=".4">{@html buildingSvg('decharge')}</g>
        <g transform="translate(70 247) scale(.8)"
          >{@html slotsSvg([
            { res: 'plastique' },
            { res: 'verre' },
            { res: 'plastique', dirty: true },
            { res: 'bio' },
            { res: 'plastique' },
            { res: 'verre' },
            { res: 'papier' },
          ])}</g
        >
        <g transform="translate(230 157) scale(.8)"
          >{@html slotsSvg([{ res: 'plastique' }, { res: 'verre', stuck: true }], 8)}</g
        >
        <g transform="translate(262 80) scale(.9)">{@html warnSvg()}</g>
        {#if !still}
          <g
            ><animateMotion dur="3s" repeatCount="indefinite" rotate="auto"><mpath href="#{uid}-route" /></animateMotion
            >{@html truckSvg('#3ba7ff')}</g
          >
          <g
            ><animateMotion dur="3s" begin="-1.5s" repeatCount="indefinite" rotate="auto"
              ><mpath href="#{uid}-route" /></animateMotion
            >{@html truckSvg('#3ba7ff', true)}</g
          >
        {:else}
          <g transform="translate(135 200)">{@html truckSvg('#3ba7ff')}</g>
        {/if}
        <g stroke="#2b2f36" stroke-width="1.5" fill="none">
          <path d="M35.1 158.4 L52.6 179.3" /><path d="M135.8 149.3 L155 180" /><path d="M270.4 61.4 L250 168" /><path
            d="M260.1 285.2 L230 270.4"
          />
        </g>
        <g fill="#2b2f36"
          ><circle cx="28" cy="150" r="11" /><circle cx="130" cy="140" r="11" /><circle
            cx="276"
            cy="52"
            r="11"
          /><circle cx="270" cy="290" r="11" /></g
        >
        <g fill="#f4f1ea" font-size="12" font-weight="500" text-anchor="middle" font-family="system-ui, sans-serif">
          <text x="28" y="154">1</text><text x="130" y="144">2</text><text x="276" y="56">3</text><text x="270" y="294"
            >4</text
          >
        </g>
      </svg>
    {/if}
  {/snippet}
  {#snippet right()}
    <Heading {n} title={page.title} />
    <ol class="notes">
      {#each notes as note, i}
        <li class="hb-pop" style="--i:{i + 2}">
          <span class="pin" aria-hidden="true">{i + 1}</span><span>{note}</span>
        </li>
      {/each}
    </ol>
  {/snippet}
</Spread>

<style>
  .notes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
  }
  li {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    font-size: 15px;
    line-height: 1.5;
    background: #fbf9f4;
    border: 1.5px solid #2b2f36;
    padding: 10px 12px;
  }
  li:nth-child(odd) {
    transform: rotate(-0.6deg);
  }
  li:nth-child(even) {
    transform: rotate(0.6deg);
  }
  .pin {
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #2b2f36;
    color: #f4f1ea;
    font:
      500 13px system-ui,
      sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
