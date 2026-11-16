<!--
	@author Oblx <code@oblx.dev>
	@description Precision hexagonal SVG reticle atom indicating engine calibration state.
-->
<script lang="ts">
	import { HUD_THEME, type ReticleState } from '@config/hud.tokens';

	interface Props {
		state?: ReticleState;
		size?: number;
	}

	let { state = HUD_THEME.RETICLE_STATES.ACTIVE, size = 22 }: Props = $props();

	let strokeColor = $derived.by(() => {
		if (state === HUD_THEME.RETICLE_STATES.CRITICAL) return HUD_THEME.COLORS.DANGER;
		if (state === HUD_THEME.RETICLE_STATES.WARNING) return HUD_THEME.COLORS.WARNING;
		if (state === HUD_THEME.RETICLE_STATES.SCANNING) return HUD_THEME.COLORS.NOMINAL;
		return HUD_THEME.COLORS.CYBER_CYAN;
	});
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	aria-hidden="true"
	class="shrink-0"
>
	<polygon
		points="12,2 21,7 21,17 12,22 3,17 3,7"
		stroke={strokeColor}
		stroke-width="1.5"
		fill="rgba(6, 182, 212, 0.08)"
	/>
	<circle cx="12" cy="12" r="3" fill={strokeColor} />
</svg>
