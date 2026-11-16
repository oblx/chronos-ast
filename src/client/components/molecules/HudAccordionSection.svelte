<!--
	@author Oblx <code@oblx.dev>
	@description Reusable collapsible fold/unfold accordion section for progressive disclosure across Settings, Help Book, IB, and CodeCheck.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		badge?: string | number;
		glyph?: string;
		defaultOpen?: boolean;
		open?: boolean;
		onToggle?: (nextOpen: boolean) => void;
		children: Snippet;
	}

	let { title, badge, glyph, defaultOpen = false, open, onToggle, children }: Props = $props();
	let internalOpen = $state<boolean | null>(null);
	let isOpen = $derived(open !== undefined ? open : (internalOpen ?? defaultOpen));

	function handleToggle(): void {
		const next = !isOpen;
		internalOpen = next;
		onToggle?.(next);
	}
</script>

<div class="border border-[var(--hud-border)] bg-[var(--hud-panel)]/90 font-mono">
	<button
		type="button"
		aria-expanded={isOpen}
		onclick={handleToggle}
		class="w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-xs leading-4 hover:bg-[var(--hud-surface)] cursor-pointer transition-colors"
	>
		<span class="flex items-center gap-1.5 font-semibold text-[var(--hud-accent-primary)] truncate">
			<span class="text-[var(--hud-accent-secondary)]">{isOpen ? '▾' : '▸'}</span>
			{#if glyph}<span>{glyph}</span>{/if}
			<span class="truncate">{title}</span>
		</span>
		{#if badge !== undefined}
			<span class="px-1.5 py-0.5 text-[11px] leading-4 border border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-muted)] tabular-nums shrink-0">
				{badge}
			</span>
		{/if}
	</button>
	{#if isOpen}
		<div class="p-3 border-t border-[var(--hud-border)] bg-[var(--hud-bg)]/80 flex flex-col gap-2 text-[13px] leading-5">
			{@render children()}
		</div>
	{/if}
</div>
