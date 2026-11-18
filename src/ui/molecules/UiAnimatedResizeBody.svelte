<!--
	@author Oblx <code@oblx.dev>
	@description Frame-interpolated ResizeObserver container with 220ms cubic-bezier height morphing and directional fly/fade transition.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { UI_MOTION_TOKENS } from '../tokens';

	interface Props {
		transitionKey?: string | number;
		axis?: 'x' | 'y';
		kineticMotionEnabled?: boolean;
		durationMs?: number;
		className?: string;
		innerClassName?: string;
		onHeightFrame?: (heightPx: number | null) => void;
		children: Snippet;
	}

	let {
		transitionKey = 'default',
		axis = 'x',
		kineticMotionEnabled = true,
		durationMs = UI_MOTION_TOKENS.MODAL_RESIZE_DURATION_MS,
		className = '',
		innerClassName = '',
		onHeightFrame,
		children,
	}: Props = $props();

	let innerEl = $state<HTMLDivElement | null>(null);
	let blockHeightPx = $state<number | null>(null);
	let currentFramePx: number | null = null;

	let activeDuration = $derived(kineticMotionEnabled ? durationMs : 0);
	let flyParams = $derived(
		kineticMotionEnabled
			? {
					x: axis === 'x' ? UI_MOTION_TOKENS.DIRECTIONAL_FLY_X_PX : 0,
					y: axis === 'y' ? UI_MOTION_TOKENS.DIRECTIONAL_FLY_Y_PX : 0,
					duration: UI_MOTION_TOKENS.DIRECTIONAL_FLY_MS,
				}
			: { x: 0, y: 0, duration: 0 },
	);
	let fadeParams = $derived({ duration: kineticMotionEnabled ? UI_MOTION_TOKENS.DIRECTIONAL_FLY_MS : 0 });

	$effect(() => {
		const el = innerEl;
		if (!el || typeof ResizeObserver === 'undefined') return;
		const initialRect = el.getBoundingClientRect();
		if (initialRect.height > 0) blockHeightPx = Math.ceil(initialRect.height);
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
				if (h > 0) blockHeightPx = Math.ceil(h);
			}
		});
		ro.observe(el);
		return () => ro.disconnect();
	});

	$effect(() => {
		const target = blockHeightPx;
		if (target === null) return;
		if (!kineticMotionEnabled || typeof requestAnimationFrame === 'undefined' || currentFramePx === null || Math.abs(target - currentFramePx) < 1) {
			currentFramePx = target;
			onHeightFrame?.(target);
			return;
		}
		const startH = currentFramePx;
		const delta = target - startH;
		const dur = Math.max(16, activeDuration);
		const t0 = performance.now();
		let raf = 0;
		const step = (now: number) => {
			const p = Math.min(1, (now - t0) / dur);
			const eased = 1 - Math.pow(1 - p, 3);
			const next = Math.round(startH + delta * eased);
			currentFramePx = next;
			onHeightFrame?.(next);
			if (p < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	});
</script>

<div
	data-testid="hud-animated-resize-body"
	style={blockHeightPx !== null ? `height: ${blockHeightPx}px; transition: height ${activeDuration}ms ${UI_MOTION_TOKENS.MODAL_RESIZE_EASING};` : ''}
	class={`overflow-hidden will-change-[height] ${className}`}
>
	{#key transitionKey}
		<div bind:this={innerEl} in:fly={flyParams} out:fade={fadeParams} class={`w-full ${innerClassName}`}>
			{@render children()}
		</div>
	{/key}
</div>
