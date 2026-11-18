<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic live DAG intent log inspector organism (v1.9.6).
-->
<script lang="ts">
	import type { UiIntentEnvelope } from '../wire';

	interface Props {
		history?: readonly UiIntentEnvelope[];
		maxEntries?: number;
		className?: string;
	}

	let { history = [], maxEntries = 8, className = '' }: Props = $props();
	let visible = $derived(history.slice(-maxEntries).reverse());
</script>

<div
	data-testid="ui-wire-inspector"
	class={`flex flex-col gap-1 p-2 font-mono text-[0.625rem] border border-[var(--ui-border,var(--hud-border))] bg-[var(--ui-surface,var(--hud-surface))]/90 ${className}`}
>
	{#each visible as entry (entry.seq)}
		<div class="flex items-center justify-between gap-2 truncate">
			<span class="text-[var(--ui-accent-secondary,var(--hud-brass))] font-bold">#{entry.seq}</span>
			<span class="text-[var(--ui-accent-primary,var(--hud-accent-primary))] truncate">{entry.intentKind}</span>
			<span class="text-[var(--ui-muted,var(--hud-muted))] shrink-0">{entry.sourceZone}</span>
		</div>
	{/each}
</div>
