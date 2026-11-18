<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Pixel-True Vector Chassis: Configurable 4-Tuple Corner Engine ([TL, TR, BR, BL]), STRAIGHT | CHAMFER mode, Bilateral Chevron Mirroring & Frame-Locked Height Tween.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import {
		HULL_PROFILES, HULL_TOKENS, buildCornerCarets, buildCornerPolygonPoints, buildHullClipPath,
		resolveChamferCutPx, resolveEffectiveCornerTuple,
		type CornerTuple, type HullProfile, type SurfacePatternId,
	} from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import HudSurfacePattern from './fx/HudSurfacePattern.svelte';

	interface Props {
		profile?: HullProfile; corners?: CornerTuple; chamferPx?: number; chevrons?: boolean; chevronSide?: 'left' | 'right';
		tweenedHeightPx?: number | null; patternOpacity?: number; surfacePatternId?: SurfacePatternId; starburst?: boolean;
		fillColor?: string; strokeColor?: string; testid?: string;
		style?: string; inert?: boolean; dataHelpTarget?: string; dataHudZone?: string; ariaLabel?: string;
		className?: string; contentClassName?: string; children: Snippet;
	}

	let {
		profile = HULL_PROFILES.CHAMFER_OCTAGON, corners, chamferPx, chevrons = true, chevronSide = 'right',
		tweenedHeightPx = null, patternOpacity = 0.24, surfacePatternId, starburst = false,
		fillColor, strokeColor, testid, style = '', inert = false,
		dataHelpTarget, dataHudZone, ariaLabel, className = '', contentClassName = '', children,
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
	let effectiveCorners = $derived(resolveEffectiveCornerTuple({ cornerStyle: hudWire.cornerStyle, explicitCorners: corners, profile }));
	let baseChamfer = $derived(chamferPx ?? (profile === HULL_PROFILES.WING_CREST ? HULL_TOKENS.CREST_CHAMFER_PX : HULL_TOKENS.CHAMFER_PX));
	let cutPx = $derived(resolveChamferCutPx(w, effH, baseChamfer, hudWire.fontScalePct, hudWire.cornerStyle, 4));
	let outerPoints = $derived(buildCornerPolygonPoints(w, effH, 1, effectiveCorners, cutPx));
	let innerPoints = $derived(buildCornerPolygonPoints(w, effH, 1 + HULL_TOKENS.INNER_BEZEL_INSET_PX, effectiveCorners, cutPx));
	let cornerCarets = $derived(buildCornerCarets(w, effH, effectiveCorners, cutPx, HULL_TOKENS.CORNER_CAP_LEG_PX));
	let chevronIndices = $derived(chevrons ? Array.from({ length: HULL_TOKENS.CHEVRON_COUNT }, (_, i) => i) : []);
	let chevronBaseX = $derived(chevronSide === 'left' ? HULL_TOKENS.CHAMFER_PX + 8 : Math.max(18, w - HULL_TOKENS.CHAMFER_PX - HULL_TOKENS.CHEVRON_COUNT * (HULL_TOKENS.CHEVRON_WIDTH_PX + HULL_TOKENS.CHEVRON_GAP_PX) - 8));
	let hullClipStyle = $derived(buildHullClipPath(effectiveCorners, cutPx, 1));
	let resolvedFill = $derived(fillColor ?? 'color-mix(in srgb, var(--hud-panel) 94%, transparent)');
	let resolvedStroke = $derived(strokeColor ?? 'var(--hud-accent-primary)');
	let isTransparentFill = $derived(fillColor === 'transparent');
</script>

<div bind:this={hostEl} {inert} {style} data-testid={testid} data-help-target={dataHelpTarget} data-hud-zone={dataHudZone} data-hull-profile={profile} data-corner-tuple={effectiveCorners.join(',')} data-corner-style={hudWire.cornerStyle} data-chevron-side={chevronSide} aria-label={ariaLabel} class={`relative ${className}`}>
	<div aria-hidden="true" style={hullClipStyle} class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
		<svg viewBox={`0 0 ${w} ${effH}`} preserveAspectRatio="none" class="absolute inset-0 w-full h-full">
			<polygon points={outerPoints} fill={resolvedFill} />
		</svg>
		{#if !isTransparentFill && patternOpacity > 0}
			<HudSurfacePattern patternId={surfacePatternId ?? hudWire.surfacePatterns.DOCKS} opacity={hudWire.surfaceOpacity * patternOpacity} tileScale={hudWire.surfaceScale} />
			{#if starburst}
				<div class="absolute inset-4 hud-starburst-rays" style="background-image: radial-gradient(ellipse 72% 36% at 50% 0%, var(--hud-ray), transparent 72%), repeating-conic-gradient(from 180deg at 50% 105%, var(--hud-ray) 0deg 4deg, transparent 4deg 14deg);"></div>
			{/if}
			<div class="absolute inset-0 hud-glass-reflection"></div>
		{/if}
	</div>
	<div style={contentClassName ? hullClipStyle : ''} class={`relative z-10 w-full h-full ${contentClassName}`}>{@render children()}</div>
	<svg aria-hidden="true" viewBox={`0 0 ${w} ${effH}`} preserveAspectRatio="none" class="pointer-events-none absolute inset-0 w-full h-full z-20">
		<polygon points={outerPoints} fill="none" stroke={resolvedStroke} stroke-width={hudWire.highContrastMode ? 2 : HULL_TOKENS.OUTER_STROKE_PX + 2} stroke-opacity="0.18" />
		<polygon points={outerPoints} fill="none" stroke={resolvedStroke} stroke-width={hudWire.highContrastMode ? 2 : HULL_TOKENS.OUTER_STROKE_PX} />
		<polygon points={innerPoints} fill="none" stroke={resolvedStroke} stroke-width="1" stroke-opacity={HULL_TOKENS.INNER_BEZEL_OPACITY} />
		{#each cornerCarets as pts, i (i)}
			<polyline points={pts} fill="none" stroke="var(--hud-accent-secondary)" stroke-width={HULL_TOKENS.CORNER_CAP_STROKE_PX} stroke-linejoin="miter" />
		{/each}
		{#each chevronIndices as idx (idx)}
			{@const cx = chevronBaseX + idx * (HULL_TOKENS.CHEVRON_WIDTH_PX + HULL_TOKENS.CHEVRON_GAP_PX)}
			{@const cw = HULL_TOKENS.CHEVRON_WIDTH_PX}
			{@const ch = HULL_TOKENS.CHEVRON_HEIGHT_PX}
			{@const sl = chevronSide === 'left' ? -HULL_TOKENS.CHEVRON_SLANT_PX : HULL_TOKENS.CHEVRON_SLANT_PX}
			<polygon points={`${cx + sl},2 ${cx + sl + cw},2 ${cx + cw},${2 + ch} ${cx},${2 + ch}`} fill="var(--hud-accent-secondary)" opacity="0.88" />
		{/each}
	</svg>
</div>
