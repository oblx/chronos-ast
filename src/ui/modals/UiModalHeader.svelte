<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic modal header with centered title, subtitle, optional tabs, and zero-CLS 2.25rem x 2.25rem close control (v1.9.6).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { UI_CORNER_STYLES, UI_CORNER_TUPLES, type CornerVertex } from '../tokens';
	import UiChamferButton from '../atoms/UiChamferButton.svelte';
	import UiIcon from '../atoms/UiIcon.svelte';

	interface Props {
		title: string;
		subtitle?: string;
		preventDismiss?: boolean;
		dismissRemainingMs?: number;
		cornerStyle?: CornerVertex;
		onClose: () => void;
		tabs?: Snippet;
	}

	let {
		title,
		subtitle = '',
		preventDismiss = false,
		dismissRemainingMs = 0,
		cornerStyle = UI_CORNER_STYLES.CHAMFER,
		onClose,
		tabs,
	}: Props = $props();
	let ringOffset = $derived(88 * (1 - Math.max(0, Math.min(1, dismissRemainingMs / 5000))));
</script>

<header class="relative px-6 pt-5 pb-3.5 border-b border-[var(--ui-border,var(--hud-border))] flex flex-col gap-3 shrink-0">
	<div class="flex items-start justify-between gap-4 pb-1">
		<div class="w-9 h-9 shrink-0" style="width: 2.25rem; height: 2.25rem; flex: 0 0 2.25rem;" aria-hidden="true"></div>
		<div class="flex-1 text-center min-w-0">
			{#if subtitle}
				<p class="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-[var(--ui-accent-primary,var(--hud-accent))] mb-0.5 truncate">
					{subtitle}
				</p>
			{/if}
			<h2 class="font-display text-2xl md:text-3xl font-bold tracking-wide text-[var(--ui-text,var(--hud-text))] leading-tight">
				{title}
			</h2>
		</div>
		<div class="shrink-0" style="width: 2.25rem; height: 2.25rem; flex: 0 0 2.25rem; contain: size layout;">
			<UiChamferButton
				corners={UI_CORNER_TUPLES.PERIMETER_CHAMFER}
				{cornerStyle}
				cutPx={6}
				variant={preventDismiss ? 'default' : 'brass'}
				ariaLabel={preventDismiss ? `Dismiss locked for ${(dismissRemainingMs / 1000).toFixed(1)}s` : 'Close modal'}
				testid="modal-close-btn"
				disabled={preventDismiss}
				onclick={onClose}
				style="width: 2.25rem; height: 2.25rem; flex: 0 0 2.25rem; contain: size layout;"
				className="w-9 h-9 min-w-[2.25rem] max-w-[2.25rem] min-h-[2.25rem] max-h-[2.25rem] p-0 font-mono text-[0.625rem] tabular-nums shrink-0"
			>
				{#if preventDismiss}
					<svg viewBox="0 0 36 36" aria-hidden="true" class="pointer-events-none absolute inset-0.5 w-[calc(100%-0.25rem)] h-[calc(100%-0.25rem)] -rotate-90">
						<circle cx="18" cy="18" r="14" fill="none" stroke="var(--ui-accent-primary, var(--hud-accent-primary))" stroke-width="1.5" stroke-dasharray="88" stroke-dashoffset={ringOffset} opacity="0.45" />
					</svg>
					<span class="tabular-nums text-[0.625rem] tracking-tighter leading-none">{(dismissRemainingMs / 1000).toFixed(1)}s</span>
				{:else}
					<span class="inline-flex items-center justify-center transition-transform duration-150 scale-100">
						<UiIcon name="close" className="text-sm" />
					</span>
				{/if}
			</UiChamferButton>
		</div>
	</div>
	{#if tabs}
		<div role="tablist" aria-label="{title} sections" class="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
			{@render tabs()}
		</div>
	{/if}
</header>
