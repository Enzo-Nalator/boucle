<script lang="ts">
  let {
    n,
    title,
    subtitle,
    align = 'left',
  }: { n: number; title: string; subtitle?: string; align?: 'left' | 'right' } = $props();
</script>

<header class:right={align === 'right'}>
  <div class="num hb-pop" style="--i:0" aria-hidden="true">{n}</div>
  <h2 class="hb-pop" style="--i:1">
    {title}{#if subtitle}<small>{subtitle}</small>{/if}
  </h2>
</header>

<style>
  header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }
  header.right {
    align-items: flex-end;
    text-align: right;
  }
  .num {
    width: 44px;
    height: 44px;
    border: 2.5px solid #2b2f36;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 500;
  }
  h2 {
    margin: 0;
    font-size: clamp(20px, 3.2vw, 28px);
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    line-height: 1.25;
  }
  small {
    margin-left: 10px;
    font-size: 13px;
    letter-spacing: 0.1em;
    font-family: ui-monospace, monospace;
    opacity: 0.7;
  }
</style>
