<!--
	@author Oblx <code@oblx.dev>
	@description Frame-locked requestAnimationFrame height morphing wrapper observing inner block height via ResizeObserver (220ms cubic-bezier(0.22, 1, 0.36, 1)).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import { HUD_MOTION_TOKENS } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';

	interface Props {
		children: Snippet;
		transitionKey?: string | number;
		axis?: 'x' | 'y';
		direction?: -1 | 1;
		className?: string;
		innerClassName?: string;
		testid?: string;
		onHeightFrame?: (heightPx: number) => void;
	}

	let {
		children,
		transitionKey = 'static',
		axis = 'y',
		direction = 1,
		className = '',
		innerClassName = '',
		testid = 'hud-animated-resize-body',
		onHeightFrame,
	}: Props = $props();

	let innerEl = $state<HTMLDivElement | null>(null);
	let renderedHeightPx = $state<number | null>(null);
	let lastFramePx: number | null = null;
	let motionAllowed = $derived(hudWire.kineticMotionEnabled);
	let flyDur = $derived(motionAllowed ? HUD_MOTION_TOKENS.DIRECTIONAL_FLY_MS : 0);
	let flyOffset = $derived(axis === 'x' ? direction * HUD_MOTION_TOKENS.DIRECTIONAL_FLY_X_PX : direction * HUD_MOTION_TOKENS.DIRECTIONAL_FLY_Y_PX);

	function animateHeightTo(targetH: number): () => void {
		if (lastFramePx === null || !motionAllowed || Math.abs(targetH - lastFramePx) < 2 || typeof requestAnimationFrame === 'undefined') {
			lastFramePx = targetH;
			renderedHeightPx = targetH;
			onHeightFrame?.(targetH);
			return () => {};
		}
		const startH = lastFramePx;
		const deltaH = targetH - startH;
		const durationMs = HUD_MOTION_TOKENS.RESIZE_SPRING_MS;
		const t0 = performance.now();
		let rafId = 0;
		const step = (now: number) => {
			const elapsed = Math.min(1, Math.max(0, (now - t0) / durationMs));
			const eased = 1 - Math.pow(1 - elapsed, 3);
			const nextH = Math.round(startH + deltaH * eased);
			lastFramePx = nextH;
			renderedHeightPx = nextH;
			onHeightFrame?.(nextH);
			if (elapsed < 1) rafId = requestAnimationFrame(step);
		};
		rafId = requestAnimationFrame(step);
		return () => cancelAnimationFrame(rafId);
	}

	$effect(() => {
		const el = innerEl;
		if (!el || typeof ResizeObserver === 'undefined') return;
		let cancelTween = () => {};
		const updateHeight = () => {
			const nextH = Math.ceil(el.getBoundingClientRect().height || el.offsetHeight || 0);
			if (nextH > 0) {
				cancelTween();
				cancelTween = animateHeightTo(nextH);
			}
		};
		updateHeight();
		const ro = new ResizeObserver(() => updateHeight());
		ro.observe(el);
		return () => {
			cancelTween();
			ro.disconnect();
		};
	});
</script>

<div
	data-testid={testid}
	style:height={renderedHeightPx !== null ? `${renderedHeightPx}px` : undefined}
	class={`overflow-hidden min-w-0 ${className}`}
>
	{#key transitionKey}
		<div
			bind:this={innerEl}
			in:fly={{ x: axis === 'x' ? flyOffset : 0, y: axis === 'y' ? flyOffset : 0, duration: flyDur, opacity: 0 }}
			class={`w-full min-w-0 flex flex-col ${innerClassName}`}
		>
			{@render children()}
		</div>
	{/key}
</div>
