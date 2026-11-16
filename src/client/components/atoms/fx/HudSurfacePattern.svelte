<!--
	@author Oblx <code@oblx.dev>
	@description Reusable zero-asset procedural SVG tileable surface texture atom supporting all 6 curated v1.1.5 SURFACE_PATTERNS.
-->
<script lang="ts">
	import { SURFACE_PATTERN_IDS, SURFACE_PATTERNS, type SurfacePatternId } from '@config/hud.tokens';

	interface Props {
		patternId?: SurfacePatternId;
		opacity?: number;
		tileScale?: number;
		strokeColor?: string;
		className?: string;
	}

	const uid = $props.id();
	let {
		patternId = SURFACE_PATTERN_IDS.ARCHITECTURAL_BLUEPRINT,
		opacity,
		tileScale = 1,
		strokeColor = 'var(--hud-grid)',
		className = '',
	}: Props = $props();

	let spec = $derived(SURFACE_PATTERNS[patternId] ?? SURFACE_PATTERNS.ARCHITECTURAL_BLUEPRINT);
	let effectiveOpacity = $derived(opacity ?? spec.defaultOpacity);
	let tilePx = $derived(Math.max(8, Math.round(spec.tileSizePx * tileScale)));
	let patDomId = $derived(`hud-pat-${uid}-${patternId}`);
</script>

<svg
	aria-hidden="true"
	class={`pointer-events-none absolute inset-0 w-full h-full transition-opacity duration-300 ${className}`}
	style={`opacity: ${effectiveOpacity};`}
>
	<defs>
		{#if patternId === SURFACE_PATTERN_IDS.ARCHITECTURAL_BLUEPRINT}
			{@const sub = tilePx / 5}
			<pattern id={patDomId} width={tilePx} height={tilePx} patternUnits="userSpaceOnUse">
				<path d={`M ${sub} 0 V ${tilePx} M ${sub * 2} 0 V ${tilePx} M ${sub * 3} 0 V ${tilePx} M ${sub * 4} 0 V ${tilePx} M 0 ${sub} H ${tilePx} M 0 ${sub * 2} H ${tilePx} M 0 ${sub * 3} H ${tilePx} M 0 ${sub * 4} H ${tilePx}`} stroke={strokeColor} stroke-width="0.6" stroke-opacity="0.45" fill="none" />
				<path d={`M ${tilePx} 0 L 0 0 0 ${tilePx}`} stroke="var(--hud-border)" stroke-width="0.9" stroke-opacity="0.65" fill="none" />
				<path d="M -3 0 H 3 M 0 -3 V 3" stroke="var(--hud-accent)" stroke-width="0.8" stroke-opacity="0.4" />
			</pattern>
		{:else if patternId === SURFACE_PATTERN_IDS.ISOMETRIC_HEX_MESH}
			{@const h = Math.round(tilePx * 0.866)}
			<pattern id={patDomId} width={tilePx} height={h} patternUnits="userSpaceOnUse">
				<path d={`M ${tilePx * 0.25} 0 L ${tilePx * 0.75} 0 L ${tilePx} ${h * 0.5} L ${tilePx * 0.75} ${h} L ${tilePx * 0.25} ${h} L 0 ${h * 0.5} Z`} fill="none" stroke={strokeColor} stroke-width="0.9" stroke-opacity="0.85" />
				<circle cx={tilePx * 0.5} cy={h * 0.5} r="0.8" fill="var(--hud-accent)" fill-opacity="0.32" />
			</pattern>
		{:else if patternId === SURFACE_PATTERN_IDS.PHOSPHOR_SCANLINES}
			<pattern id={patDomId} width={tilePx} height={4} patternUnits="userSpaceOnUse">
				<line x1="0" y1="1" x2={tilePx} y2="1" stroke={strokeColor} stroke-width="1" stroke-opacity="0.7" />
				<circle cx={Math.round(tilePx * 0.35)} cy="3" r="0.5" fill="var(--hud-accent)" fill-opacity="0.22" />
			</pattern>
		{:else if patternId === SURFACE_PATTERN_IDS.TOPOGRAPHIC_CONTOUR}
			<pattern id={patDomId} width={tilePx} height={tilePx} patternUnits="userSpaceOnUse">
				<path d={`M 0 ${tilePx * 0.3} C ${tilePx * 0.3} ${tilePx * 0.1}, ${tilePx * 0.7} ${tilePx * 0.5}, ${tilePx} ${tilePx * 0.3}`} fill="none" stroke="var(--hud-border)" stroke-width="0.9" stroke-opacity="0.55" />
				<path d={`M 0 ${tilePx * 0.72} C ${tilePx * 0.35} ${tilePx * 0.9}, ${tilePx * 0.65} ${tilePx * 0.52}, ${tilePx} ${tilePx * 0.72}`} fill="none" stroke="var(--hud-accent)" stroke-width="0.75" stroke-opacity="0.25" />
			</pattern>
		{:else if patternId === SURFACE_PATTERN_IDS.DIAGONAL_MICRO_HATCH}
			<pattern id={patDomId} width={tilePx} height={tilePx} patternUnits="userSpaceOnUse">
				<path d={`M 0 ${tilePx} L ${tilePx} 0 M -${tilePx * 0.5} ${tilePx * 0.5} L ${tilePx * 0.5} -${tilePx * 0.5} M ${tilePx * 0.5} ${tilePx * 1.5} L ${tilePx * 1.5} ${tilePx * 0.5}`} stroke={strokeColor} stroke-width="0.85" stroke-opacity="0.6" />
			</pattern>
		{:else}
			<pattern id={patDomId} width={tilePx} height={tilePx} patternUnits="userSpaceOnUse">
				<line x1={tilePx / 2} y1={tilePx / 2} x2="0" y2="0" stroke="var(--hud-ray)" stroke-width="2" />
				<line x1={tilePx / 2} y1={tilePx / 2} x2={tilePx} y2="0" stroke="var(--hud-ray)" stroke-width="2" />
				<line x1={tilePx / 2} y1={tilePx / 2} x2={tilePx} y2={tilePx} stroke="var(--hud-ray)" stroke-width="2" />
				<line x1={tilePx / 2} y1={tilePx / 2} x2="0" y2={tilePx} stroke="var(--hud-ray)" stroke-width="2" />
			</pattern>
		{/if}
	</defs>
	<rect width="100%" height="100%" fill={`url(#${patDomId})`} />
</svg>
