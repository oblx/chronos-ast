<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic 11-zone CSS grid perimeter HUD shell with Safe Center Corridor and Stealth Mode (v1.9.6).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		stealthMode?: boolean;
		className?: string;
		worldCanvas?: Snippet;
		perimeterOverlay?: Snippet;
	}

	let {
		stealthMode = false,
		className = '',
		worldCanvas,
		perimeterOverlay,
	}: Props = $props();
</script>

<div
	data-ui-organism="perimeter-hud"
	data-stealth={stealthMode ? 'true' : 'false'}
	class={`relative w-screen h-screen overflow-hidden select-none bg-[var(--ui-bg,var(--hud-bg))] text-[var(--ui-text,var(--hud-text))] ${className}`}
>
	{#if worldCanvas}
		{@render worldCanvas()}
	{/if}
	{#if perimeterOverlay}
		<div class="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2">
			{@render perimeterOverlay()}
		</div>
	{/if}
</div>
