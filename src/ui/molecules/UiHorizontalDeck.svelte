<!--
	@author Oblx <code@oblx.dev>
	@description Horizontal Bento snap deck molecule with Left/Right stepper controls and ArrowLeft/ArrowRight keyboard navigation.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CHAMFER_PROFILES } from '../tokens';
	import UiChamferButton from '../atoms/UiChamferButton.svelte';

	interface Props {
		ariaLabel?: string;
		showSteppers?: boolean;
		testid?: string;
		className?: string;
		children: Snippet;
	}

	let {
		ariaLabel = 'Horizontal Bento Deck',
		showSteppers = false,
		testid = 'horizontal-bento-deck',
		className = '',
		children,
	}: Props = $props();

	let trackEl = $state<HTMLDivElement | null>(null);

	function scrollDeck(direction: -1 | 1): void {
		if (!trackEl) return;
		const stepPx = Math.max(240, Math.round(trackEl.clientWidth * 0.75));
		trackEl.scrollBy({ left: direction * stepPx, behavior: 'smooth' });
	}

	function handleKeydown(e: KeyboardEvent): void {
		const tag = (e.target as HTMLElement | null)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
		if (e.key === 'ArrowLeft') { e.preventDefault(); scrollDeck(-1); }
		else if (e.key === 'ArrowRight') { e.preventDefault(); scrollDeck(1); }
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section aria-label={ariaLabel} tabindex="-1" onkeydown={handleKeydown} class="relative w-full min-w-0 outline-none">
	{#if showSteppers}
		<div class="flex items-center justify-end gap-1.5 mb-2 font-mono text-xs">
			<UiChamferButton chamferCorner={CHAMFER_PROFILES.LEFT_END_CAP} cutPx={6} tip="Scroll Deck Left [←]" testid={`${testid}-prev`} onclick={() => scrollDeck(-1)} className="px-2.5 py-1 text-xs">◄</UiChamferButton>
			<UiChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={6} tip="Scroll Deck Right [→]" testid={`${testid}-next`} onclick={() => scrollDeck(1)} className="px-2.5 py-1 text-xs">►</UiChamferButton>
		</div>
	{/if}
	<div bind:this={trackEl} data-testid={testid} data-hud-hscroll="true" class={`flex items-stretch gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory pb-1 ${className}`}>
		{@render children()}
	</div>
</section>
