<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.1 Parallel Corner-Safe Vector Button (ResizeObserver 1:1 45° polygon, 7 CHAMFER_PROFILES, unbroken closed stroke, zero clip-path).
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { CHAMFER_PROFILES, type ChamferCorner } from '@config/hud.tokens';

	interface Props {
		chamferCorner?: ChamferCorner; profile?: ChamferCorner; cutPx?: 5 | 6 | 8 | 9;
		variant?: 'default' | 'accent' | 'brass' | 'nominal' | 'danger';
		active?: boolean; disabled?: boolean; type?: 'button' | 'submit';
		role?: 'button' | 'tab'; ariaSelected?: boolean;
		tip?: string; tipKey?: string; title?: string; ariaLabel?: string; testid?: string; className?: string;
		onclick?: (event: MouseEvent) => void; children?: Snippet;
	}

	let {
		chamferCorner = CHAMFER_PROFILES.INTERIOR_CHAMFER, profile, cutPx = 6, variant = 'default',
		active = false, disabled = false, type = 'button', role, ariaSelected, tip, tipKey, title, ariaLabel, testid, className = '', onclick, children,
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

	function buildPolygon(width: number, height: number, inset: number): string {
		const c = Math.max(3, Math.min(Math.max(5, cutPx), Math.floor(Math.min(width, height) * 0.36)));
		const x0 = inset, y0 = inset, x1 = Math.max(inset + 6, width - inset), y1 = Math.max(inset + 6, height - inset);
		const activeCorner = profile ?? chamferCorner;
		if (activeCorner === CHAMFER_PROFILES.CORNER_TOP_LEFT) return `${x0 + c},${y0} ${x1},${y0} ${x1},${y1} ${x0},${y1} ${x0},${y0 + c}`;
		if (activeCorner === CHAMFER_PROFILES.CORNER_BOTTOM_LEFT) return `${x0},${y0} ${x1},${y0} ${x1},${y1} ${x0 + c},${y1} ${x0},${y1 - c}`;
		if (activeCorner === CHAMFER_PROFILES.CORNER_TOP_RIGHT) return `${x0},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y1} ${x0},${y1}`;
		if (activeCorner === CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT) return `${x0},${y0} ${x1},${y0} ${x1},${y1 - c} ${x1 - c},${y1} ${x0},${y1}`;
		if (activeCorner === CHAMFER_PROFILES.RIGHT_END_CAP) return `${x0},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y1 - c} ${x1 - c},${y1} ${x0},${y1}`;
		if (activeCorner === CHAMFER_PROFILES.LEFT_END_CAP) return `${x0 + c},${y0} ${x1},${y0} ${x1},${y1} ${x0 + c},${y1} ${x0},${y1 - c} ${x0},${y0 + c}`;
		if (activeCorner === CHAMFER_PROFILES.WING_SLOT || activeCorner === CHAMFER_PROFILES.TOP_CAP_CHAMFER) return `${x0 + c},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y1} ${x0},${y1} ${x0},${y0 + c}`;
		if (activeCorner === CHAMFER_PROFILES.BOTTOM_CAP_CHAMFER) return `${x0},${y0} ${x1},${y0} ${x1},${y1 - c} ${x1 - c},${y1} ${x0 + c},${y1} ${x0},${y1 - c}`;
		if (activeCorner === CHAMFER_PROFILES.OCTAGON_PILL || activeCorner === CHAMFER_PROFILES.CHAMFER_OCTAGON) return `${x0 + c},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y1 - c} ${x1 - c},${y1} ${x0 + c},${y1} ${x0},${y1 - c} ${x0},${y0 + c}`;
		return `${x0},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y1} ${x0 + c},${y1} ${x0},${y1 - c}`;
	}

	let outerPoints = $derived(buildPolygon(w, h, 1));
	let innerPoints = $derived(buildPolygon(w, h, 3));
	let strokeColor = $derived(
		active || variant === 'accent' ? 'var(--hud-accent-primary)'
		: variant === 'brass' ? 'var(--hud-accent-secondary)'
		: variant === 'nominal' ? 'var(--hud-nominal)'
		: variant === 'danger' ? 'var(--hud-danger)'
		: 'var(--hud-border)'
	);
	let fillTint = $derived(
		active || variant === 'accent' ? 'color-mix(in srgb, var(--hud-accent-primary) 16%, var(--hud-surface))'
		: variant === 'brass' ? 'color-mix(in srgb, var(--hud-accent-secondary) 16%, var(--hud-surface))'
		: variant === 'nominal' ? 'color-mix(in srgb, var(--hud-nominal) 16%, var(--hud-surface))'
		: variant === 'danger' ? 'color-mix(in srgb, var(--hud-danger) 16%, var(--hud-surface))'
		: 'color-mix(in srgb, var(--hud-surface) 90%, transparent)'
	);
	let textClass = $derived(
		active || variant === 'accent' ? 'text-[var(--hud-accent-primary)] font-semibold'
		: variant === 'brass' ? 'text-[var(--hud-accent-secondary)] font-semibold'
		: variant === 'nominal' ? 'text-[var(--hud-nominal)] font-semibold'
		: variant === 'danger' ? 'text-[var(--hud-danger)] font-semibold'
		: 'text-[var(--hud-text)] hover:text-[var(--hud-accent-primary)]'
	);
</script>

<button
	bind:this={btnEl}
	{type}
	{role}
	{disabled}
	data-hud-tip={resolvedTip}
	data-hud-tip-key={tipKey}
	aria-label={ariaLabel ?? resolvedTip}
	aria-selected={ariaSelected}
	aria-pressed={role === 'tab' ? undefined : active}
	data-testid={testid}
	data-chamfer-corner={profile ?? chamferCorner}
	data-chamfer-profile={profile ?? chamferCorner}
	data-vector-hull="true"
	onclick={onclick}
	class="relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap select-none overflow-hidden min-w-0 max-w-full bg-transparent hud-hover-lift cursor-pointer disabled:opacity-45 disabled:pointer-events-none {textClass} {className}"
>
	<svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" class="pointer-events-none absolute inset-0 w-full h-full z-0">
		{#if active}<polygon points={outerPoints} fill="none" stroke={strokeColor} stroke-width="3.5" stroke-opacity="0.22" />{/if}
		<polygon points={outerPoints} fill={fillTint} stroke={strokeColor} stroke-width="1.5" />
		<polygon points={innerPoints} fill="none" stroke={strokeColor} stroke-width="1" stroke-opacity={active ? '0.5' : '0.25'} />
	</svg>
	<span class="relative z-10 w-full inline-flex items-center justify-center gap-1.5 leading-none min-w-0 max-w-full overflow-hidden">
		{#if children}{@render children()}{/if}
	</span>
</button>
