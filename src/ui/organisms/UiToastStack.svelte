<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic non-blocking toast stack organism (v1.9.6).
-->
<script lang="ts">
	export interface UiToastItem {
		readonly id: string | number;
		readonly tag: string;
		readonly message: string;
		readonly timeLabel?: string;
	}

	interface Props {
		items?: readonly UiToastItem[];
		className?: string;
	}

	let { items = [], className = '' }: Props = $props();
</script>

<div class={`flex flex-col gap-1 font-mono text-[0.6875rem] ${className}`}>
	{#each items as item (item.id)}
		<div class="flex items-center gap-1.5 min-w-0 leading-snug">
			{#if item.timeLabel}
				<span class="text-[var(--ui-muted,var(--hud-muted))] shrink-0">{item.timeLabel}</span>
			{/if}
			<span class="text-[var(--ui-accent-primary,var(--hud-accent-primary))] font-bold shrink-0">[{item.tag}]</span>
			<span class="truncate text-[var(--ui-text,var(--hud-text))]">{item.message}</span>
		</div>
	{/each}
</div>
