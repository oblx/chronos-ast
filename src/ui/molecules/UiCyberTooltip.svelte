<!--
	@author Oblx <code@oblx.dev>
	@description Corner-aware chamfered/straight vector tooltip overlay molecule listening to data-hud-tip attributes.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		CORNER_STYLES, ZONE_CORNER_TUPLES, buildCornerPolygonPoints, resolveChamferCutPx,
		type CornerVertex,
	} from '../tokens';

	interface Props {
		cornerStyle?: CornerVertex;
		fontScalePct?: number;
	}

	let { cornerStyle = CORNER_STYLES.CHAMFER, fontScalePct = 100 }: Props = $props();

	let visible = $state(false);
	let label = $state('');
	let keycap = $state('');
	let posX = $state(0);
	let posY = $state(0);

	onMount(() => {
		const onOver = (e: PointerEvent) => {
			const el = (e.target as HTMLElement | null)?.closest('[data-hud-tip]') as HTMLElement | null;
			if (!el) { visible = false; return; }
			const tip = el.getAttribute('data-hud-tip') ?? '';
			if (!tip) { visible = false; return; }
			label = tip;
			keycap = el.getAttribute('data-hud-tip-key') ?? '';
			const rect = el.getBoundingClientRect();
			const vw = window.innerWidth || 1440;
			const vh = window.innerHeight || 900;
			posX = Math.max(12, Math.min(vw - 260, Math.round(rect.left + rect.width / 2 - 90)));
			posY = rect.top > 56 ? Math.round(rect.top - 36) : Math.min(vh - 40, Math.round(rect.bottom + 8));
			visible = true;
		};
		const onOut = () => { visible = false; };
		window.addEventListener('pointerover', onOver, { passive: true });
		window.addEventListener('pointerdown', onOut, { passive: true });
		return () => {
			window.removeEventListener('pointerover', onOver);
			window.removeEventListener('pointerdown', onOut);
		};
	});

	let tuple = $derived(cornerStyle === CORNER_STYLES.STRAIGHT ? ZONE_CORNER_TUPLES.STRAIGHT_QUAD : ZONE_CORNER_TUPLES.DIAGONAL_CHAMFER);
	let cut = $derived(resolveChamferCutPx(180, 28, 6, fontScalePct, cornerStyle, 3));
	let polyPts = $derived(buildCornerPolygonPoints(180, 28, 1, tuple, cut));
</script>

{#if visible && label}
	<div
		role="tooltip"
		style={`transform: translate3d(${posX}px, ${posY}px, 0);`}
		class="fixed top-0 left-0 z-50 pointer-events-none select-none px-2.5 py-1 font-mono text-[0.6875rem] leading-4 text-[var(--hud-text)] shadow-xl flex items-center gap-1.5 max-w-[18rem]"
	>
		<svg viewBox="0 0 180 28" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 w-full h-full z-0">
			<polygon points={polyPts} fill="color-mix(in srgb, var(--hud-bg, #050811) 96%, transparent)" stroke="var(--hud-accent-primary, #06b6d4)" stroke-width="1.5" />
		</svg>
		<span class="relative z-10 truncate">{label}</span>
		{#if keycap}
			<kbd class="relative z-10 px-1 py-0.5 bg-[var(--hud-surface)] border border-[var(--hud-accent-secondary)]/60 text-[0.625rem] text-[var(--hud-accent-secondary)] font-bold shrink-0">[{keycap}]</kbd>
		{/if}
	</div>
{/if}
