<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic 2rem x 2rem "off-when-idle / accent-on-hover-or-active" vector utility icon button with optional 6-sparkle glitter emitter.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CHAMFER_PROFILES, CORNER_STYLES, buildCornerPolygonPoints, resolveEffectiveCornerTuple, type ChamferCorner, type CornerTuple, type CornerVertex, type UiIconName } from '../tokens';
	import UiIcon from './UiIcon.svelte';

	interface Props {
		icon: UiIconName;
		corners?: CornerTuple;
		chamferCorner?: ChamferCorner;
		cornerStyle?: CornerVertex;
		variant?: 'accent' | 'brass' | 'nominal' | 'danger';
		active?: boolean;
		glitterActive?: boolean;
		glitterKey?: number;
		tip?: string;
		tipKey?: string;
		ariaLabel: string;
		testid?: string;
		className?: string;
		onclick?: (event: MouseEvent) => void;
		badge?: Snippet;
	}

	let {
		icon,
		corners,
		chamferCorner = CHAMFER_PROFILES.INTERIOR_CHAMFER,
		cornerStyle = CORNER_STYLES.CHAMFER,
		variant = 'accent',
		active = false,
		glitterActive = false,
		glitterKey = 0,
		tip,
		tipKey,
		ariaLabel,
		testid,
		className = '',
		onclick,
		badge,
	}: Props = $props();

	const SPARKS = [
		{ x: '14%', y: '14%', delay: '0ms', size: '0.32rem' },
		{ x: '84%', y: '18%', delay: '180ms', size: '0.28rem' },
		{ x: '18%', y: '82%', delay: '340ms', size: '0.26rem' },
		{ x: '86%', y: '80%', delay: '500ms', size: '0.32rem' },
		{ x: '50%', y: '6%', delay: '260ms', size: '0.24rem' },
		{ x: '92%', y: '48%', delay: '420ms', size: '0.24rem' },
	] as const;

	let effectiveCorners = $derived(resolveEffectiveCornerTuple({ cornerStyle, explicitCorners: corners, legacyCorner: chamferCorner }));
	let outerPoints = $derived(buildCornerPolygonPoints(32, 32, 1, effectiveCorners, 6));
	let accentColor = $derived(variant === 'brass' ? 'var(--hud-accent-secondary)' : variant === 'nominal' ? 'var(--hud-nominal)' : variant === 'danger' ? 'var(--hud-danger)' : 'var(--hud-accent-primary)');
</script>

<button
	type="button"
	data-testid={testid}
	data-hud-tip={tip ?? ariaLabel}
	data-hud-tip-key={tipKey}
	data-active={active ? 'true' : 'false'}
	data-glitter-active={glitterActive ? 'true' : 'false'}
	data-corner-style={cornerStyle}
	aria-label={ariaLabel}
	aria-pressed={active}
	{onclick}
	style={`--hud-util-accent: ${accentColor};`}
	class={`hud-utility-icon-btn group relative w-8 h-8 shrink-0 inline-flex items-center justify-center cursor-pointer bg-transparent select-none ${active ? 'hud-utility-icon-active' : ''} ${className}`}
>
	<svg viewBox="0 0 32 32" aria-hidden="true" class="pointer-events-none absolute inset-0 w-full h-full">
		<polygon
			points={outerPoints}
			class="hud-utility-icon-hull"
			stroke-width={active ? '1.6' : '1.25'}
		/>
	</svg>
	<span class="relative z-10 inline-flex items-center justify-center transition-colors duration-150">
		<UiIcon name={icon} sizeRem={0.9375} />
	</span>
	{#if badge}{@render badge()}{/if}
	{#if glitterActive}
		{#key glitterKey}
			<span aria-hidden="true" class="pointer-events-none absolute inset-0 z-20 overflow-visible">
				{#each SPARKS as sp, idx (idx)}
					<span
						class="hud-glitter-spark"
						style={`left:${sp.x};top:${sp.y};width:${sp.size};height:${sp.size};animation-delay:${sp.delay};`}
					></span>
				{/each}
			</span>
		{/key}
	{/if}
</button>
