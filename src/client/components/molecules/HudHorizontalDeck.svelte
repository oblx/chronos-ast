<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.3 Horizontal Bento Carousel Deck with ResizeObserver overflow steppers, wheel-to-horizontal pan & drag momentum.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { CHAMFER_PROFILES } from '@config/hud.tokens';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	interface Props {
		children: Snippet;
		className?: string;
		trackClassName?: string;
		testid?: string;
		stepPx?: number;
		showSteppers?: boolean;
		gridMode?: boolean;
	}

	let { children, className = '', trackClassName = '', testid = 'hud-horizontal-deck', stepPx = 320, showSteppers = true, gridMode = false }: Props = $props();
	let wrapEl = $state<HTMLDivElement | null>(null);
	let trackEl = $state<HTMLDivElement | null>(null);
	let hasOverflow = $state(false);
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);
	let isDragging = $state(false);
	let dragStartX = 0;
	let dragScrollLeft = 0;
	let movedDuringDrag = false;

	function syncScrollMetrics(): void {
		if (!trackEl) return;
		const wrapWidth = wrapEl?.clientWidth ?? trackEl.clientWidth;
		hasOverflow = trackEl.scrollWidth > wrapWidth + 4;
		const maxScroll = Math.max(0, trackEl.scrollWidth - trackEl.clientWidth);
		canScrollLeft = trackEl.scrollLeft > 4;
		canScrollRight = maxScroll - trackEl.scrollLeft > 4;
	}

	function stepScroll(direction: -1 | 1): void {
		if (!trackEl) return;
		const delta = gridMode ? trackEl.clientWidth + 16 : stepPx;
		trackEl.scrollBy({ left: direction * delta, behavior: 'smooth' });
	}

	function handleWheel(e: WheelEvent): void {
		if (!trackEl || trackEl.scrollWidth <= trackEl.clientWidth + 2) return;
		if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
			const target = e.target as HTMLElement | null;
			if (target?.closest('[data-hud-vscroll]')) return;
			e.preventDefault();
			trackEl.scrollLeft += e.deltaY;
			syncScrollMetrics();
		}
	}

	function onPointerDown(e: PointerEvent): void {
		if (!trackEl || e.button !== 0) return;
		const t = e.target as HTMLElement | null;
		if (t?.closest('button, input, textarea, select, a, label')) return;
		isDragging = true;
		movedDuringDrag = false;
		dragStartX = e.clientX;
		dragScrollLeft = trackEl.scrollLeft;
	}

	function onPointerMove(e: PointerEvent): void {
		if (!isDragging || !trackEl) return;
		const dx = e.clientX - dragStartX;
		if (Math.abs(dx) > 4) movedDuringDrag = true;
		trackEl.scrollLeft = dragScrollLeft - dx;
		syncScrollMetrics();
	}

	function stopDrag(): void {
		isDragging = false;
		setTimeout(() => { movedDuringDrag = false; }, 0);
	}

	onMount(() => {
		if (!trackEl) return;
		syncScrollMetrics();
		const ro = new ResizeObserver(() => syncScrollMetrics());
		ro.observe(trackEl);
		if (wrapEl) ro.observe(wrapEl);
		const mo = new MutationObserver(() => syncScrollMetrics());
		mo.observe(trackEl, { childList: true });
		return () => { ro.disconnect(); mo.disconnect(); };
	});
</script>

<div bind:this={wrapEl} data-testid={testid} class={`relative flex-1 min-h-0 flex items-center gap-2 ${className}`}>
	{#if showSteppers && (hasOverflow || canScrollLeft || canScrollRight)}
		<HudChamferButton chamferCorner={CHAMFER_PROFILES.LEFT_END_CAP} cutPx={6} variant={canScrollLeft ? 'accent' : 'default'} disabled={!canScrollLeft} testid={`${testid}-prev`} tip="Scroll Left" ariaLabel="Scroll Deck Left" onclick={() => stepScroll(-1)} className="w-8 h-10 shrink-0 font-mono text-xs font-bold shadow-lg">◄</HudChamferButton>
	{/if}
	<div
		bind:this={trackEl}
		onscroll={syncScrollMetrics}
		onwheel={handleWheel}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={stopDrag}
		onpointercancel={stopDrag}
		onclickcapture={(e) => { if (movedDuringDrag) e.stopPropagation(); }}
		role="region"
		aria-label="Horizontal Bento Deck"
		class={`hud-cyber-scroll flex-1 min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory pb-2 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'} ${gridMode ? `grid ${trackClassName}` : `flex items-stretch gap-4 ${trackClassName}`}`}
	>
		{@render children()}
	</div>
	{#if showSteppers && (hasOverflow || canScrollLeft || canScrollRight)}
		<HudChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={6} variant={canScrollRight ? 'accent' : 'default'} disabled={!canScrollRight} testid={`${testid}-next`} tip="Scroll Right" ariaLabel="Scroll Deck Right" onclick={() => stepScroll(1)} className="w-8 h-10 shrink-0 font-mono text-xs font-bold shadow-lg">►</HudChamferButton>
	{/if}
</div>
