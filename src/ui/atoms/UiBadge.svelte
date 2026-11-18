<!--
	@author Oblx <code@oblx.dev>
	@description Semantic status badge atom for @chronos-ui/svelte.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tone?: 'default' | 'accent' | 'brass' | 'nominal' | 'warning' | 'danger';
		testid?: string;
		className?: string;
		children: Snippet;
	}

	let {
		tone = 'default',
		testid,
		className = '',
		children,
	}: Props = $props();

	let toneCls = $derived(
		tone === 'accent'
			? 'border-[var(--hud-accent-primary)]/60 text-[var(--hud-accent-primary)]'
			: tone === 'brass'
				? 'border-[var(--hud-accent-secondary)]/60 text-[var(--hud-accent-secondary)]'
				: tone === 'nominal'
					? 'border-[var(--hud-nominal)]/60 text-[var(--hud-nominal)]'
					: tone === 'warning'
						? 'border-[var(--hud-warning)]/60 text-[var(--hud-warning)]'
						: tone === 'danger'
							? 'border-[var(--hud-danger)]/60 text-[var(--hud-danger)]'
							: 'border-[var(--hud-border)] text-[var(--hud-muted)]',
	);
</script>

<span
	data-testid={testid}
	class={`inline-flex items-center gap-1 px-1.5 py-0.5 border bg-[var(--hud-bg)]/80 font-mono text-[0.625rem] leading-3 whitespace-nowrap ${toneCls} ${className}`}
>
	{@render children()}
</span>
