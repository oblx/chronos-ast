<!--
	@author Oblx <code@oblx.dev>
	@description Renders inline $...$ and block $$...$$ LaTeX markdown prose as native Chromium/WebKit/Gecko MathML alongside crisp text spans.
-->
<script lang="ts">
	import { splitLatexMarkdownSegments } from '@client/state';
	import HudMathFormula from '@client/components/atoms/HudMathFormula.svelte';

	interface Props {
		text: string;
		className?: string;
	}

	let { text, className = '' }: Props = $props();
	let segments = $derived(splitLatexMarkdownSegments(text));
</script>

<span class={className}>
	{#each segments as seg, idx (`${seg.kind}-${idx}`)}
		{#if seg.kind === 'text'}
			{seg.content}
		{:else if seg.kind === 'inline'}
			<HudMathFormula formula={seg.content} displayMode={false} />
		{:else}
			<HudMathFormula formula={seg.content} displayMode={true} />
		{/if}
	{/each}
</span>
