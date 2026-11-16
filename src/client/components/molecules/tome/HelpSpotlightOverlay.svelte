<!--
	@author Oblx <code@oblx.dev>
	@description Chronos Live HUD Target Spotlight SVG Reticle & Hover Mini-Tooltip Overlay for the Architect's Field Tome.
-->
<script lang="ts">
	import { CHAMFER_PROFILES, HELP_BOOK_TOKENS } from '@config/hud.tokens';
	import { computeFloatingTooltipPosition, type HelpSubStepSpec } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	interface Props {
		currentStep: HelpSubStepSpec | undefined;
		hoverTooltipsEnabled: boolean;
		spotlightOnlyMode: boolean;
		onFocusTarget: (step: HelpSubStepSpec) => void;
		onReopenBook: () => void;
		onDismissSpotlight: () => void;
	}

	let { currentStep, hoverTooltipsEnabled, spotlightOnlyMode, onFocusTarget, onReopenBook, onDismissSpotlight }: Props = $props();

	let targetRect = $state<{ top: number; left: number; width: number; height: number } | null>(null);
	let hoveredHint = $state<{ chapter: HelpChapterSpec; step: HelpSubStepSpec; x: number; y: number } | null>(null);

	export function syncTargetRect(anchor: string | undefined): void {
		if (!anchor || typeof document === 'undefined') { targetRect = null; return; }
		const el = document.querySelector(`[data-help-target="${anchor}"]`);
		if (!el) { targetRect = null; return; }
		const r = el.getBoundingClientRect();
		targetRect = { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
	}

	export function showHoverHint(chapter: HelpChapterSpec, step: HelpSubStepSpec, rect: DOMRect): void {
		const pos = computeFloatingTooltipPosition({ top: rect.top, left: rect.left, width: rect.width, height: rect.height }, step.tooltipPlacement, window.innerWidth, window.innerHeight);
		hoveredHint = { chapter, step, x: pos.left, y: pos.top };
	}

	export function clearHoverHint(): void {
		hoveredHint = null;
	}
</script>

{#if targetRect && currentStep}
	<div class="fixed inset-0 z-40 pointer-events-none">
		<svg class="w-full h-full">
			<rect x={targetRect.left - 4} y={targetRect.top - 4} width={targetRect.width + 8} height={targetRect.height + 8} fill="none" stroke="var(--hud-accent-secondary)" stroke-width="2" stroke-dasharray="6 3" />
		</svg>
		{#if spotlightOnlyMode}
			<div class="pointer-events-auto fixed bottom-5 left-1/2 -translate-x-1/2 w-[min(92vw,580px)] hud-z3-modal border border-[var(--hud-accent-secondary)] p-3 font-mono text-xs shadow-2xl">
				<div class="flex items-center justify-between text-[11px] text-[var(--hud-accent-secondary)] mb-1">
					<span>SPOTLIGHT // §{currentStep.stepCode} · {currentStep.title}</span>
					<div class="flex items-center gap-1.5">
						<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="accent" onclick={onReopenBook} className="px-2 py-0.5 text-[10px]">Reopen Tome</HudChamferButton>
						<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={5} variant="brass" onclick={onDismissSpotlight} className="px-2 py-0.5 text-[10px]">Dismiss</HudChamferButton>
					</div>
				</div>
				<p class="text-[var(--hud-text)] text-[11px]">{currentStep.actionDrill}</p>
			</div>
		{/if}
	</div>
{/if}

{#if hoverTooltipsEnabled && hoveredHint}
	<div data-testid="help-mini-tooltip" style={`left: ${hoveredHint.x}px; top: ${hoveredHint.y}px; width: ${HELP_BOOK_TOKENS.CARD_WIDTH_PX}px;`} class="fixed z-50 hud-z3-modal border border-[var(--hud-accent-primary)] p-3 font-mono text-xs shadow-xl pointer-events-auto">
		<div class="flex items-center justify-between text-[11px] text-[var(--hud-accent-secondary)] mb-1">
			<span>§{hoveredHint.step.stepCode} · {hoveredHint.chapter.tier}</span>
			<button type="button" onclick={() => (hoveredHint = null)} class="text-[var(--hud-muted)] cursor-pointer">×</button>
		</div>
		<div class="font-bold text-[var(--hud-text)] mb-1">{hoveredHint.step.title}</div>
		<p class="text-[11px] text-[var(--hud-muted)] line-clamp-2 mb-2">{hoveredHint.step.keyTakeaway}</p>
		<div class="flex items-center justify-between">
			<span class="text-[11px] text-[var(--hud-accent-primary)]">Key: {hoveredHint.chapter.shortcutKey}</span>
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={5} variant="accent" onclick={() => { onFocusTarget(hoveredHint!.step); hoveredHint = null; }} className="px-2 py-0.5 text-[11px]">Focus Target →</HudChamferButton>
		</div>
	</div>
{/if}
