<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic 3-column Bento Radar organism with zoom/fit controls, circular sweep scope, and filter rail (v1.9.6).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { UI_CORNER_STYLES, UI_CORNER_TUPLES, type CornerVertex } from '../tokens';
	import UiChamferFrame from '../atoms/UiChamferFrame.svelte';

	interface Props {
		cornerStyle?: CornerVertex;
		className?: string;
		leftColumn?: Snippet;
		centerScope?: Snippet;
		rightColumn?: Snippet;
	}

	let {
		cornerStyle = UI_CORNER_STYLES.CHAMFER,
		className = '',
		leftColumn,
		centerScope,
		rightColumn,
	}: Props = $props();
</script>

<UiChamferFrame
	corners={UI_CORNER_TUPLES.BOTTOM_RIGHT_POD}
	{cornerStyle}
	chamferPx={12}
	chevrons={true}
	className={`w-full h-full ${className}`}
	contentClassName="grid grid-cols-[2rem_1fr_2rem] items-center gap-1.5 px-4 py-2.5 h-full"
>
	<div class="flex flex-col items-center justify-between gap-1 h-full">
		{#if leftColumn}{@render leftColumn()}{/if}
	</div>
	<div class="flex flex-col items-center justify-center min-w-0 h-full">
		{#if centerScope}{@render centerScope()}{/if}
	</div>
	<div class="flex flex-col items-center justify-between gap-1 h-full">
		{#if rightColumn}{@render rightColumn()}{/if}
	</div>
</UiChamferFrame>
