<!--
	@author Oblx <code@oblx.dev>
	@description Standardized modal footer displaying context breadcrumb metadata and primary/secondary actions.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import HudMathText from '@client/components/molecules/tome/HudMathText.svelte';

	interface Props {
		metaText?: string;
		meta?: Snippet;
		actions?: Snippet;
	}

	let { metaText = '', meta, actions }: Props = $props();
</script>

<footer class="relative px-6 py-3 bg-[var(--hud-surface-recessed)] flex items-center justify-between gap-4 text-[11px] font-mono text-[var(--hud-muted)] shrink-0">
	<div aria-hidden="true" class="pointer-events-none absolute top-0 inset-x-0 h-[7px]">
		<div class="w-full h-px" style="background: color-mix(in srgb, var(--hud-accent-primary) 35%, transparent);"></div>
		<svg viewBox="0 0 12 7" class="absolute left-0 top-0 w-3 h-[7px]"><polyline points="0,7 6,1 12,1" fill="none" stroke="color-mix(in srgb, var(--hud-accent-primary) 55%, transparent)" stroke-width="1.2" /></svg>
		<svg viewBox="0 0 12 7" class="absolute right-0 top-0 w-3 h-[7px]"><polyline points="0,1 6,1 12,7" fill="none" stroke="color-mix(in srgb, var(--hud-accent-primary) 55%, transparent)" stroke-width="1.2" /></svg>
	</div>
	<span class="truncate flex items-center gap-1.5">
		{#if meta}
			{@render meta()}
		{:else}
			<HudMathText text={metaText} />
		{/if}
	</span>
	{#if actions}
		<div class="flex items-center gap-2 shrink-0">
			{@render actions()}
		</div>
	{/if}
</footer>
