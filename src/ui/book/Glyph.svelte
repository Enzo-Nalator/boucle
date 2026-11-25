<script lang="ts">
  import type { ActorKind, Res } from '../../sim/types';
  import { buildingSvg } from '../buildings';

  let { kind, res = 'plastique', size = 36 }: { kind: ActorKind; res?: Res; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">{@html buildingSvg(kind, res)}</svg>
