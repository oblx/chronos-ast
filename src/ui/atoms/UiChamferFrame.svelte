<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic vector hull atom with 4-Tuple CornerTuple ([TL, TR, BR, BL]), STRAIGHT | CHAMFER mode, bilateral chevrons, and height tweening.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import {
		CORNER_STYLES, HULL_PROFILES, HULL_TOKENS, buildCornerCarets, buildCornerPolygonPoints,
		buildHullClipPath, resolveChamferCutPx, resolveEffectiveCornerTuple,
		type CornerTuple, type CornerVertex, type HullProfile,
	} from '../tokens';

	interface Props {
		profile?: HullProfile; corners?: CornerTuple; cornerStyle?: CornerVertex; fontScalePct?: number; highContrastMode?: boolean;
		chamferPx?: number; chevrons?: boolean; chevronSide?: 'left' | 'right'; tweenedHeightPx?: number | null; starburst?: boolean;
		style?: string; inert?: boolean; dataHelpTarget?: string; dataHudZone?: string; ariaLabel?: string;
		className?: string; contentClassName?: string; backgroundSlot?: Snippet; children: Snippet;
	}

	let {
		profile = HULL_PROFILES.CHAMFER_OCTAGON, corners, cornerStyle = CORNER_STYLES.CHAMFER, fontScalePct = 100, highContrastMode = false,
		chamferPx, chevrons = true, chevronSide = 'right', tweenedHeightPx = null, starburst = false, style = '', inert = false,
		dataHelpTarget, dataHudZone, ariaLabel, className = '', contentClassName = '', backgroundSlot, children,
	}: Props = $props();

	let hostEl = $state<HTMLDivElement | null>(null);
	let w = $state<number>(HULL_TOKENS.MIN_MEASURE_WIDTH_PX);
	let h = $state<number>(HULL_TOKENS.MIN_MEASURE_HEIGHT_PX);

	onMount(() => {
		if (!hostEl || typeof ResizeObserver === 'undefined') return;
		const rect = hostEl.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) { w = Math.round(rect.width); h = Math.round(rect.height); }
		const ro = new ResizeObserver((entries) => {
			const cr = entries[0]?.contentRect;
			if (cr && cr.width > 0 && cr.height > 0) { w = Math.round(cr.width); h = Math.round(cr.height); }
		});
		ro.observe(hostEl);
		return () => ro.disconnect();
	});

	let effH = $derived(tweenedHeightPx && tweenedHeightPx > 0 ? Math.round(tweenedHeightPx) : h);
	let effectiveCorners = $derived(resolveEffectiveCornerTuple({ cornerStyle, explicitCorners: corners, profile }));
	let baseChamfer = $derived(chamferPx ?? (profile === HULL_PROFILES.WING_CREST ? HULL_TOKENS.CREST_CHAMFER_PX : HULL_TOKENS.CHAMFER_PX));
	let cutPx = $derived(resolveChamferCutPx(w, effH, baseChamfer, fontScalePct, cornerStyle, 4));
	let outerPoints = $derived(buildCornerPolygonPoints(w, effH, 1, effectiveCorners, cutPx));
	let innerPoints = $derived(buildCornerPolygonPoints(w, effH, 1 + HULL_TOKENS.INNER_BEZEL_INSET_PX, effectiveCorners, cutPx));
	let cornerCarets = $derived(buildCornerCarets(w, effH, effectiveCorners, cutPx, HULL_TOKENS.CORNER_CAP_LEG_PX));
	let chevronIndices = $derived(chevrons ? Array.from({ length: HULL_TOKENS.CHEVRON_COUNT }, (_, i) => i) : []);
	let chevronBaseX = $derived(chevronSide === 'left' ? HULL_TOKENS.CHAMFER_PX + 8 : Math.max(18, w - HULL_TOKENS.CHAMFER_PX - HULL_TOKENS.CHEVRON_COUNT * (HULL_TOKENS.CHEVRON_WIDTH_PX + HULL_TOKENS.CHEVRON_GAP_PX) - 8));
	let hullClipStyle = $derived(buildHullClipPath(effectiveCorners, cutPx, 1));
</script>

<div bind:this={hostEl} {inert} {style} data-help-target={dataHelpTarget} data-hud-zone={dataHudZone} data-hull-profile={profile} data-corner-tuple={effectiveCorners.join(',')} data-corner-style={cornerStyle} data-chevron-side={chevronSide} aria-label={ariaLabel} class={`relative ${className}`}>
	<div aria-hidden="true" style={hullClipStyle} class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
		<svg viewBox={`0 0 ${w} ${effH}`} preserveAspectRatio="none" class="absolute inset-0 w-full h-full">
			<polygon points={outerPoints} fill="color-mix(in srgb, var(--hud-panel, #0b1120) 94%, transparent)" />
		</svg>
		{#if backgroundSlot}{@render backgroundSlot()}{/if}
		{#if starburst}
			<div class="absolute inset-4 hud-starburst-rays" style="background-image: radial-gradient(ellipse 72% 36% at 50% 0%, var(--hud-ray, transparent), transparent 72%), repeating-conic-gradient(from 180deg at 50% 105%, var(--hud-ray, transparent) 0deg 4deg, transparent 4deg 14deg);"></div>
		{/if}
		<div class="absolute inset-0 hud-glass-reflection"></div>
	</div>
	<div style={contentClassName ? hullClipStyle : ''} class={`relative z-10 w-full h-full ${contentClassName}`}>{@render children()}</div>
	<svg aria-hidden="true" viewBox={`0 0 ${w} ${effH}`} preserveAspectRatio="none" class="pointer-events-none absolute inset-0 w-full h-full z-20">
		<polygon points={outerPoints} fill="none" stroke="var(--hud-accent-primary, #06b6d4)" stroke-width={highContrastMode ? 2 : HULL_TOKENS.OUTER_STROKE_PX + 2} stroke-opacity="0.18" />
		<polygon points={outerPoints} fill="none" stroke="var(--hud-accent-primary, #06b6d4)" stroke-width={highContrastMode ? 2 : HULL_TOKENS.OUTER_STROKE_PX} />
		<polygon points={innerPoints} fill="none" stroke="var(--hud-accent-primary, #06b6d4)" stroke-width="1" stroke-opacity={HULL_TOKENS.INNER_BEZEL_OPACITY} />
		{#each cornerCarets as pts, i (i)}
			<polyline points={pts} fill="none" stroke="var(--hud-accent-secondary, #f59e0b)" stroke-width={HULL_TOKENS.CORNER_CAP_STROKE_PX} stroke-linejoin="miter" />
		{/each}
		{#each chevronIndices as idx (idx)}
			{@const cx = chevronBaseX + idx * (HULL_TOKENS.CHEVRON_WIDTH_PX + HULL_TOKENS.CHEVRON_GAP_PX)}
			{@const cw = HULL_TOKENS.CHEVRON_WIDTH_PX}
			{@const ch = HULL_TOKENS.CHEVRON_HEIGHT_PX}
			{@const sl = chevronSide === 'left' ? -HULL_TOKENS.CHEVRON_SLANT_PX : HULL_TOKENS.CHEVRON_SLANT_PX}
			<polygon points={`${cx + sl},2 ${cx + sl + cw},2 ${cx + cw},${2 + ch} ${cx},${2 + ch}`} fill="var(--hud-accent-secondary, #f59e0b)" opacity="0.88" />
		{/each}
	</svg>
</div>
