<!--
	@author Oblx <code@oblx.dev>
	@description Composable top-level Game-HUD modal shell featuring high-transmission tinted glass veil (38% opacity), 4px blur, double-hairline frame, Svelte 5 fly/fade transitions, and engagement lock guard.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { HULL_PROFILES } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';

	interface Props {
		isOpen: boolean;
		ariaLabel: string;
		maxWidthClass?: string;
		preventDismiss?: boolean;
		onClose: () => void;
		header?: Snippet;
		children: Snippet;
		footer?: Snippet;
	}

	let {
		isOpen,
		ariaLabel,
		maxWidthClass = 'max-w-5xl',
		preventDismiss = false,
		onClose,
		header,
		children,
		footer,
	}: Props = $props();

	let panelEl = $state<HTMLElement | null>(null);
	let dur = $derived(hudWire.kineticMotionEnabled ? 180 : 0);

	function handleWindowKeydown(e: KeyboardEvent): void {
		if (isOpen && e.key === 'Escape' && !preventDismiss) {
			e.stopPropagation();
			onClose();
		}
	}

	function handleBackdropPointerDown(e: PointerEvent): void {
		if (e.target === e.currentTarget && !preventDismiss) {
			onClose();
		}
	}

	$effect(() => {
		if (isOpen && panelEl) {
			panelEl.focus();
		}
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if isOpen}
	<div
		in:fade={{ duration: dur }}
		out:fade={{ duration: dur }}
		role="presentation"
		onpointerdown={handleBackdropPointerDown}
		class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-[var(--hud-veil)] backdrop-blur-[4px]"
	>
		<div
			bind:this={panelEl}
			in:fly={{ y: 12, duration: dur }}
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel}
			tabindex="-1"
			class={`relative w-full ${maxWidthClass} max-h-[86vh] flex flex-col text-[var(--hud-text)] outline-none drop-shadow-[0_24px_64px_rgba(0,0,0,0.62)]`}
		>
			<HudChamferFrame
				profile={HULL_PROFILES.CHAMFER_OCTAGON}
				chamferPx={16}
				chevrons={true}
				surfacePatternId={hudWire.surfacePatterns.MODALS}
				patternOpacity={0.32}
				starburst={true}
				className="w-full max-h-[86vh] flex flex-col"
				contentClassName="flex flex-col min-h-0 max-h-[86vh]"
			>
				{#if header}
					{@render header()}
				{/if}
				<div data-testid="hud-modal-body" class="flex-1 min-h-0 overflow-y-hidden flex flex-col px-6 pt-5 pb-4">
					{@render children()}
				</div>
				{#if footer}
					{@render footer()}
				{/if}
			</HudChamferFrame>
		</div>
	</div>
{/if}
