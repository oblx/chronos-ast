<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.6.0 Pixel-True Vector Chassis: ResizeObserver 1:1 chamfers, 90° L-brackets on square corners, 135° obtuse carets on 45° bevels, and zero lock overlays.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { HULL_PROFILES, HULL_TOKENS, type HullProfile, type SurfacePatternId } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import HudSurfacePattern from './fx/HudSurfacePattern.svelte';

	interface Props {
		profile?: HullProfile;
		chamferPx?: number;
		chevrons?: boolean;
		patternOpacity?: number;
		surfacePatternId?: SurfacePatternId;
		starburst?: boolean;
		style?: string;
		inert?: boolean;
		dataHelpTarget?: string;
		dataHudZone?: string;
		ariaLabel?: string;
		className?: string;
		contentClassName?: string;
		children: Snippet;
	}

	let {
		profile = HULL_PROFILES.CHAMFER_CORNER_POD,
		chamferPx,
		chevrons = true,
		patternOpacity = 0.24,
		surfacePatternId,
		starburst = false,
		style = '',
		inert = false,
		dataHelpTarget,
		dataHudZone,
		ariaLabel,
		className = '',
		contentClassName = '',
		children,
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

	function resolveChamferPx(width: number, height: number): number {
		const rawC = chamferPx ?? (profile === HULL_PROFILES.WING_CREST ? HULL_TOKENS.CREST_CHAMFER_PX : profile === HULL_PROFILES.CHAMFER_OCTAGON ? HULL_TOKENS.OCTAGON_CHAMFER_PX : HULL_TOKENS.CHAMFER_PX);
		return Math.max(4, Math.min(rawC, Math.floor(Math.min(width, height) * 0.36)));
	}

	function buildPolygonPoints(width: number, height: number, inset: number): string {
		const c = resolveChamferPx(width, height);
		const x0 = inset, y0 = inset, x1 = Math.max(inset + 8, width - inset), y1 = Math.max(inset + 8, height - inset);
		if (profile === HULL_PROFILES.WING_CREST) return `${x0},${y0} ${x1},${y0} ${x1},${y1 - c} ${x1 - c},${y1} ${x0 + c},${y1} ${x0},${y1 - c}`;
		if (profile === HULL_PROFILES.CHAMFER_OCTAGON) return `${x0 + c},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y1 - c} ${x1 - c},${y1} ${x0 + c},${y1} ${x0},${y1 - c} ${x0},${y0 + c}`;
		return `${x0},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y1} ${x0 + c},${y1} ${x0},${y1 - c}`;
	}

	function buildCornerCarets(width: number, height: number): string[] {
		const c = resolveChamferPx(width, height);
		const leg = Math.min(HULL_TOKENS.CORNER_CAP_LEG_PX, Math.floor(Math.min(width, height) * 0.2));
		const x0 = 2, y0 = 2, x1 = Math.max(10, width - 2), y1 = Math.max(10, height - 2);
		if (profile === HULL_PROFILES.WING_CREST) {
			return [
				`${x0},${y0 + leg} ${x0},${y0} ${x0 + leg},${y0}`,
				`${x1 - leg},${y0} ${x1},${y0} ${x1},${y0 + leg}`,
				`${x0},${y1 - c - leg} ${x0},${y1 - c} ${x0 + c},${y1} ${x0 + c + leg},${y1}`,
				`${x1 - c - leg},${y1} ${x1 - c},${y1} ${x1},${y1 - c} ${x1},${y1 - c - leg}`,
			];
		}
		if (profile === HULL_PROFILES.CHAMFER_OCTAGON) {
			return [
				`${x0},${y0 + c + leg} ${x0},${y0 + c} ${x0 + c},${y0} ${x0 + c + leg},${y0}`,
				`${x1 - c - leg},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y0 + c + leg}`,
				`${x1},${y1 - c - leg} ${x1},${y1 - c} ${x1 - c},${y1} ${x1 - c - leg},${y1}`,
				`${x0 + c + leg},${y1} ${x0 + c},${y1} ${x0},${y1 - c} ${x0},${y1 - c - leg}`,
			];
		}
		return [
			`${x0},${y0 + leg} ${x0},${y0} ${x0 + leg},${y0}`,
			`${x1 - c - leg},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y0 + c + leg}`,
			`${x1 - leg},${y1} ${x1},${y1} ${x1},${y1 - leg}`,
			`${x0},${y1 - c - leg} ${x0},${y1 - c} ${x0 + c},${y1} ${x0 + c + leg},${y1}`,
		];
	}

	let outerPoints = $derived(buildPolygonPoints(w, h, 1));
	let innerPoints = $derived(buildPolygonPoints(w, h, 1 + HULL_TOKENS.INNER_BEZEL_INSET_PX));
	let cornerCarets = $derived(buildCornerCarets(w, h));
	let chevronIndices = $derived(chevrons ? Array.from({ length: HULL_TOKENS.CHEVRON_COUNT }, (_, i) => i) : []);
	let chevronBaseX = $derived(Math.max(18, w - HULL_TOKENS.CHAMFER_PX - HULL_TOKENS.CHEVRON_COUNT * (HULL_TOKENS.CHEVRON_WIDTH_PX + HULL_TOKENS.CHEVRON_GAP_PX) - 8));
	let hullClipStyle = $derived.by(() => {
		const c = resolveChamferPx(w, h);
		if (profile === HULL_PROFILES.CHAMFER_OCTAGON) {
			return `clip-path: polygon(${c}px 1px, calc(100% - ${c}px) 1px, calc(100% - 1px) ${c}px, calc(100% - 1px) calc(100% - ${c}px), calc(100% - ${c}px) calc(100% - 1px), ${c}px calc(100% - 1px), 1px calc(100% - ${c}px), 1px ${c}px);`;
		}
		if (profile === HULL_PROFILES.WING_CREST) {
			return `clip-path: polygon(1px 1px, calc(100% - 1px) 1px, calc(100% - 1px) calc(100% - ${c}px), calc(100% - ${c}px) calc(100% - 1px), ${c}px calc(100% - 1px), 1px calc(100% - ${c}px));`;
		}
		return `clip-path: polygon(1px 1px, calc(100% - ${c}px) 1px, calc(100% - 1px) ${c}px, calc(100% - 1px) calc(100% - 1px), ${c}px calc(100% - 1px), 1px calc(100% - ${c}px));`;
	});
</script>

<div bind:this={hostEl} {inert} {style} data-help-target={dataHelpTarget} data-hud-zone={dataHudZone} data-hull-profile={profile} aria-label={ariaLabel} class={`relative ${className}`}>
	<div aria-hidden="true" style={hullClipStyle} class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
		<svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" class="absolute inset-0 w-full h-full">
			<polygon points={outerPoints} fill="color-mix(in srgb, var(--hud-panel) 94%, transparent)" />
		</svg>
		<HudSurfacePattern patternId={surfacePatternId ?? hudWire.surfacePatterns.DOCKS} opacity={hudWire.surfaceOpacity * patternOpacity} tileScale={hudWire.surfaceScale} />
		{#if starburst}
			<div class="absolute inset-4 hud-starburst-rays" style="background-image: radial-gradient(ellipse 72% 36% at 50% 0%, var(--hud-ray), transparent 72%), repeating-conic-gradient(from 180deg at 50% 105%, var(--hud-ray) 0deg 4deg, transparent 4deg 14deg);"></div>
		{/if}
		<div class="absolute inset-0 hud-glass-reflection"></div>
	</div>
	<div style={contentClassName ? hullClipStyle : ''} class={`relative z-10 w-full h-full ${contentClassName}`}>{@render children()}</div>
	<svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" class="pointer-events-none absolute inset-0 w-full h-full z-20">
		<polygon points={outerPoints} fill="none" stroke="var(--hud-accent-primary)" stroke-width={HULL_TOKENS.OUTER_STROKE_PX + 2} stroke-opacity="0.18" />
		<polygon points={outerPoints} fill="none" stroke="var(--hud-accent-primary)" stroke-width={HULL_TOKENS.OUTER_STROKE_PX} />
		<polygon points={innerPoints} fill="none" stroke="var(--hud-accent-primary)" stroke-width="1" stroke-opacity={HULL_TOKENS.INNER_BEZEL_OPACITY} />
		{#each cornerCarets as pts, i (i)}
			<polyline points={pts} fill="none" stroke="var(--hud-accent-secondary)" stroke-width={HULL_TOKENS.CORNER_CAP_STROKE_PX} stroke-linejoin="miter" />
		{/each}
		{#each chevronIndices as idx (idx)}
			{@const cx = chevronBaseX + idx * (HULL_TOKENS.CHEVRON_WIDTH_PX + HULL_TOKENS.CHEVRON_GAP_PX)}
			{@const cw = HULL_TOKENS.CHEVRON_WIDTH_PX}
			{@const ch = HULL_TOKENS.CHEVRON_HEIGHT_PX}
			{@const sl = HULL_TOKENS.CHEVRON_SLANT_PX}
			<polygon points={`${cx + sl},2 ${cx + sl + cw},2 ${cx + cw},${2 + ch} ${cx},${2 + ch}`} fill="var(--hud-accent-secondary)" opacity="0.88" />
		{/each}
	</svg>
</div>
