<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic chamfered/straight vector button atom with spring press detents and unbroken polygon stroke.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import {
		CHAMFER_PROFILES, CORNER_STYLES, buildCornerPolygonPoints, resolveChamferCutPx, resolveEffectiveCornerTuple,
		type ChamferCorner, type CornerTuple, type CornerVertex,
	} from '../tokens';

	interface Props {
		corners?: CornerTuple; chamferCorner?: ChamferCorner; profile?: ChamferCorner; cornerStyle?: CornerVertex; fontScalePct?: number; highContrastMode?: boolean;
		cutPx?: 4 | 5 | 6 | 8 | 9; variant?: 'default' | 'accent' | 'brass' | 'nominal' | 'danger' | 'primary'; size?: 'xs' | 'sm' | 'md';
		active?: boolean; disabled?: boolean; type?: 'button' | 'submit'; role?: 'button' | 'tab'; ariaSelected?: boolean;
		tip?: string; tipKey?: string; title?: string; ariaLabel?: string; testid?: string; style?: string; className?: string;
		onclick?: (event: MouseEvent) => void; children?: Snippet;
	}

	let {
		corners, chamferCorner = CHAMFER_PROFILES.INTERIOR_CHAMFER, profile, cornerStyle = CORNER_STYLES.CHAMFER, fontScalePct = 100, highContrastMode = false,
		cutPx = 6, variant = 'default', active = false, disabled = false, type = 'button', role, ariaSelected,
		tip, tipKey, title, ariaLabel, testid, style = '', className = '', onclick, children,
	}: Props = $props();

	let btnEl = $state<HTMLButtonElement | null>(null);
	let w = $state<number>(96);
	let h = $state<number>(28);
	let resolvedTip = $derived(tip ?? title);

	function syncSize(): void {
		if (!btnEl) return;
		const rect = btnEl.getBoundingClientRect();
		const nextW = Math.round(rect.width || btnEl.offsetWidth || 96);
		const nextH = Math.round(rect.height || btnEl.offsetHeight || 28);
		if (nextW > 0 && nextH > 0 && (nextW !== w || nextH !== h)) { w = nextW; h = nextH; }
	}

	onMount(() => {
		syncSize();
		if (!btnEl || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => syncSize());
		ro.observe(btnEl);
		return () => ro.disconnect();
	});

	let normVariant = $derived(variant === 'primary' ? 'accent' : variant);
	let effectiveCorners = $derived(resolveEffectiveCornerTuple({ cornerStyle, explicitCorners: corners, legacyCorner: profile ?? chamferCorner }));
	let resolvedCut = $derived(resolveChamferCutPx(w, h, Math.max(4, cutPx), fontScalePct, cornerStyle, 3));
	let outerPoints = $derived(buildCornerPolygonPoints(w, h, 1, effectiveCorners, resolvedCut));
	let innerPoints = $derived(buildCornerPolygonPoints(w, h, 3, effectiveCorners, resolvedCut));
	let strokeColor = $derived(active || normVariant === 'accent' ? 'var(--hud-accent-primary, #06b6d4)' : normVariant === 'brass' ? 'var(--hud-accent-secondary, #f59e0b)' : normVariant === 'nominal' ? 'var(--hud-nominal, #10b981)' : normVariant === 'danger' ? 'var(--hud-danger, #ef4444)' : 'var(--hud-border, #334155)');
	let fillTint = $derived(active || normVariant === 'accent' ? 'color-mix(in srgb, var(--hud-accent-primary, #06b6d4) 16%, var(--hud-surface, #0f172a))' : normVariant === 'brass' ? 'color-mix(in srgb, var(--hud-accent-secondary, #f59e0b) 16%, var(--hud-surface, #0f172a))' : normVariant === 'nominal' ? 'color-mix(in srgb, var(--hud-nominal, #10b981) 16%, var(--hud-surface, #0f172a))' : normVariant === 'danger' ? 'color-mix(in srgb, var(--hud-danger, #ef4444) 16%, var(--hud-surface, #0f172a))' : 'color-mix(in srgb, var(--hud-surface, #0f172a) 90%, transparent)');
	let textClass = $derived(active || normVariant === 'accent' ? 'text-[var(--hud-accent-primary)] font-semibold' : normVariant === 'brass' ? 'text-[var(--hud-accent-secondary)] font-semibold' : normVariant === 'nominal' ? 'text-[var(--hud-nominal)] font-semibold' : normVariant === 'danger' ? 'text-[var(--hud-danger)] font-semibold' : 'text-[var(--hud-text)] hover:text-[var(--hud-accent-primary)]');
</script>

<button
	bind:this={btnEl}
	{type} {role} {disabled} {style}
	data-hud-tip={resolvedTip} data-hud-tip-key={tipKey}
	aria-label={ariaLabel ?? resolvedTip} aria-selected={ariaSelected} aria-pressed={role === 'tab' ? undefined : active}
	data-testid={testid} data-chamfer-corner={profile ?? chamferCorner} data-chamfer-profile={profile ?? chamferCorner}
	data-corner-tuple={effectiveCorners.join(',')} data-corner-style={cornerStyle} data-vector-hull="true"
	onclick={onclick}
	class="group relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap select-none overflow-hidden min-w-0 max-w-full bg-transparent hud-hover-lift cursor-pointer disabled:opacity-45 disabled:pointer-events-none {textClass} {className}"
>
	<svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" class="pointer-events-none absolute inset-0 w-full h-full z-0">
		{#if active}<polygon points={outerPoints} fill="none" stroke={strokeColor} stroke-width="3.5" stroke-opacity="0.22" class="transition-all duration-150 ease-out" />{/if}
		<polygon points={outerPoints} fill={fillTint} stroke={strokeColor} stroke-width={highContrastMode ? '2' : '1.5'} class="transition-all duration-150 ease-out group-hover:stroke-[var(--hud-accent-primary)]" />
		<polygon points={innerPoints} fill="none" stroke={strokeColor} stroke-width="1" stroke-opacity={active ? '0.5' : '0.25'} class="transition-all duration-150 ease-out group-hover:stroke-opacity-60" />
	</svg>
	<span class="relative z-10 w-full inline-flex items-center justify-center gap-1.5 leading-none min-w-0 max-w-full overflow-hidden">
		{#if children}{@render children()}{/if}
	</span>
</button>
