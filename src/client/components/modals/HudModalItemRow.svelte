<!--
	@author Oblx <code@oblx.dev>
	@description Tactile editorial directory row with geometric icon, serif label, right-aligned shortcut keycap badge, 1-line description, and bottom hairline rule.
-->
<script lang="ts">
	interface Props {
		iconGlyph: string;
		label: string;
		description: string;
		shortcutKey?: string;
		isActive?: boolean;
		onclick: () => void;
	}

	let {
		iconGlyph,
		label,
		description,
		shortcutKey = '—',
		isActive = false,
		onclick,
	}: Props = $props();
</script>

<button
	type="button"
	{onclick}
	class={`w-full text-left py-2.5 px-2.5 border-b border-[var(--hud-border)] flex items-start gap-3 cursor-pointer group hud-hover-lift ${
		isActive ? 'hud-z1-entity' : 'hover:bg-[var(--hud-surface)]/65'
	}`}
>
	<span class="w-5 text-center font-mono text-sm text-[var(--hud-accent)] shrink-0 pt-0.5" aria-hidden="true">
		{iconGlyph}
	</span>
	<div class="flex-1 min-w-0">
		<div class="flex items-center justify-between gap-2">
			<span class="font-display text-[15px] font-semibold text-[var(--hud-text)] group-hover:text-[var(--hud-accent)] leading-tight transition-colors">
				{label}
			</span>
			<kbd class="px-1.5 py-0.5 font-mono text-[11px] border border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-muted)] shrink-0">
				{shortcutKey}
			</kbd>
		</div>
		<p class="text-[11px] text-[var(--hud-muted)] line-clamp-2 mt-0.5 leading-snug">
			{description}
		</p>
	</div>
</button>
