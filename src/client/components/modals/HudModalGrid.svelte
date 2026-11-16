<!--
	@author Oblx <code@oblx.dev>
	@description Balanced multi-column editorial grid container for Stations, Command, and Directory views.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		columns?: 1 | 2 | 3 | 4;
		goldenSplit?: boolean;
		children: Snippet;
	}

	let { columns = 4, goldenSplit = false, children }: Props = $props();

	let gridClass = $derived(
		columns === 1
			? 'grid-cols-1'
			: columns === 2
				? goldenSplit ? 'grid-cols-1 md:grid-cols-[38.2fr_61.8fr]' : 'grid-cols-1 md:grid-cols-2'
				: columns === 3
					? 'grid-cols-1 md:grid-cols-3'
					: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
	);
</script>

<div data-hud-vscroll="true" class={`grid ${gridClass} gap-6 items-start flex-1 min-h-0 overflow-y-auto pr-1`}>
	{@render children()}
</div>
