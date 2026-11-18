<!--
	@author Oblx <code@oblx.dev>
	@description Progressive-disclosure collapsible accordion molecule with 220ms animated height morphing.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import UiAnimatedResizeBody from './UiAnimatedResizeBody.svelte';

	interface Props {
		title: string;
		badge?: string | number;
		defaultOpen?: boolean;
		kineticMotionEnabled?: boolean;
		onToggle?: (open: boolean) => void;
		children: Snippet;
	}

	let {
		title,
		badge,
		defaultOpen = false,
		kineticMotionEnabled = true,
		onToggle,
		children,
	}: Props = $props();

	let isOpen = $state<boolean | null>(null);
	let expanded = $derived(isOpen ?? defaultOpen);

	function toggle(): void {
		const next = !expanded;
		isOpen = next;
		onToggle?.(next);
	}
</script>

<div class="border border-[var(--hud-border)] bg-[var(--hud-surface)]/75 font-mono text-xs">
	<button
		type="button"
		aria-expanded={expanded}
		onclick={toggle}
		class="w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-[var(--hud-bg)]/50 cursor-pointer transition-colors"
	>
		<span class="flex items-center gap-1.5 font-bold text-[var(--hud-text)]">
			<span class="text-[var(--hud-accent-primary)]">{expanded ? '▾' : '▸'}</span>
			<span>{title}</span>
		</span>
		{#if badge !== undefined}
			<span class="px-1.5 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-bg)] text-[10px] text-[var(--hud-accent-secondary)] tabular-nums">
				{badge}
			</span>
		{/if}
	</button>
	<UiAnimatedResizeBody transitionKey={expanded ? 'open' : 'closed'} axis="y" {kineticMotionEnabled}>
		{#if expanded}
			<div class="px-3 pb-3 pt-1.5 border-t border-[var(--hud-border)]/60 flex flex-col gap-2">
				{@render children()}
			</div>
		{/if}
	</UiAnimatedResizeBody>
</div>
