<!--
	@author Oblx <code@oblx.dev>
	@description Retro-editorial centered modal header with serif title, uppercase subtitle, optional tabs, and engagement-guarded close button (v1.6.2).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CHAMFER_PROFILES } from '@config/hud.tokens';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	interface Props {
		title: string;
		subtitle?: string;
		preventDismiss?: boolean;
		dismissRemainingMs?: number;
		onClose: () => void;
		tabs?: Snippet;
	}

	let { title, subtitle = '', preventDismiss = false, dismissRemainingMs = 0, onClose, tabs }: Props = $props();
</script>

<header class="relative px-6 pt-5 pb-3.5 border-b border-[var(--hud-border)] flex flex-col gap-3 shrink-0">
	<div class="flex items-start justify-between gap-4 pb-1">
		<div class="w-9 shrink-0" aria-hidden="true"></div>
		<div class="flex-1 text-center min-w-0">
			{#if subtitle}
				<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--hud-accent)] mb-0.5 truncate">
					{subtitle}
				</p>
			{/if}
			<h2 class="font-display text-2xl md:text-3xl font-bold tracking-wide text-[var(--hud-text)] leading-tight">
				{title}
			</h2>
		</div>
		<div class="pt-0.5 pr-1 shrink-0">
			<HudChamferButton
				chamferCorner={CHAMFER_PROFILES.CHAMFER_OCTAGON}
				cutPx={6}
				variant={preventDismiss ? 'default' : 'brass'}
				ariaLabel={preventDismiss ? `Dismiss locked for ${(dismissRemainingMs / 1000).toFixed(1)}s` : 'Close modal'}
				testid="modal-close-btn"
				disabled={preventDismiss}
				onclick={onClose}
				className="min-w-8 h-8 px-1.5 font-mono text-xs shrink-0"
			>
				{preventDismiss ? `${(dismissRemainingMs / 1000).toFixed(1)}s` : '×'}
			</HudChamferButton>
		</div>
	</div>
	{#if tabs}
		<div class="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
			{@render tabs()}
		</div>
	{/if}
</header>
