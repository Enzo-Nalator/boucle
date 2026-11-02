<script lang="ts">
  import type { ShapeName } from '../../render/theme';
  import { glyphSvg } from '../glyphs';

  let { shape, size = 36, fill = '#2b2f36' }: { shape: ShapeName; size?: number; fill?: string } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style:fill={fill} stroke="#2b2f36" stroke-width="4" stroke-linejoin="round">{@html glyphSvg(shape)}</svg>
