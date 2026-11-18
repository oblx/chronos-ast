<!--
	@author Oblx <code@oblx.dev>
	@description Composable top-level Game-HUD modal shell featuring high-transmission tinted glass veil (38% opacity), 4px blur, frame-locked outer polygon height morphing, and engagement lock guard (v1.9.6).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { HULL_PROFILES, ZONE_CORNER_TUPLES } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudAnimatedResizeBody from '@client/components/molecules/HudAnimatedResizeBody.svelte';

	interface Props {
		isOpen: boolean;
		ariaLabel: string;
		maxWidthClass?: string;
		preventDismiss?: boolean;
		transitionKey?: string | number;
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
		transitionKey = 'modal',
		onClose,
		header,
		children,
		footer,
	}: Props = $props();

	let panelEl = $state<HTMLElement | null>(null);
	let headerWrapEl = $state<HTMLDivElement | null>(null);
	let footerWrapEl = $state<HTMLDivElement | null>(null);
	let tweenedOuterHeightPx = $state<number | null>(null);
	let dur = $derived(hudWire.kineticMotionEnabled ? 180 : 0);

	function handleBodyHeightFrame(bodyHeightPx: number): void {
		const headerH = headerWrapEl?.offsetHeight ?? 0;
		const footerH = footerWrapEl?.offsetHeight ?? 0;
		const bodyPadPx = 36;
		const rawTotal = headerH + bodyHeightPx + bodyPadPx + footerH;
		const maxVhPx = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.86) : 780;
		tweenedOuterHeightPx = Math.min(maxVhPx, Math.max(180, rawTotal));
	}

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
				corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER}
				chamferPx={16}
				chevrons={true}
				tweenedHeightPx={tweenedOuterHeightPx}
				style={tweenedOuterHeightPx ? `height: ${tweenedOuterHeightPx}px;` : ''}
				surfacePatternId={hudWire.surfacePatterns.MODALS}
				patternOpacity={0.32}
				starburst={true}
				className="w-full max-h-[86vh] flex flex-col"
				contentClassName="flex flex-col min-h-0 max-h-[86vh]"
			>
				{#if header}
					<div bind:this={headerWrapEl} class="shrink-0">
						{@render header()}
					</div>
				{/if}
				<div data-testid="hud-modal-body" class="flex-1 min-h-0 overflow-y-auto flex flex-col px-6 pt-5 pb-4">
					<HudAnimatedResizeBody {transitionKey} onHeightFrame={handleBodyHeightFrame} className="w-full" innerClassName="w-full">
						{@render children()}
					</HudAnimatedResizeBody>
				</div>
				{#if footer}
					<div bind:this={footerWrapEl} class="shrink-0">
						{@render footer()}
					</div>
				{/if}
			</HudChamferFrame>
		</div>
	</div>
{/if}
