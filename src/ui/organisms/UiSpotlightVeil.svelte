<!--
	@author Oblx <code@oblx.dev>
	@description Universal SVG Spotlight Veil with CornerTuple-matched polygon cutouts, dual-phosphor neon halo, 135/90-deg corner carets, and zero-CLS callout placement (v1.9.6).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { UI_CORNER_STYLES, buildCornerCarets, buildCornerPolygonPoints, resolveCornerTuple, type CornerVertex } from '../tokens';
	import { uiSpotlightMachine, type SpotlightRect } from '../machines';
	import UiChamferButton from '../atoms/UiChamferButton.svelte';

	interface Props {
		cornerStyle?: CornerVertex;
		onNextStep?: () => void;
		onSkipTour?: () => void;
		onClose?: () => void;
	}

	let { cornerStyle = UI_CORNER_STYLES.CHAMFER, onNextStep, onSkipTour, onClose }: Props = $props();
	let vw = $state(1440);
	let vh = $state(900);

	function syncViewport(): void {
		if (typeof window === 'undefined') return;
		vw = window.innerWidth;
		vh = window.innerHeight;
		uiSpotlightMachine.recomputeRects();
	}

	onMount(() => {
		syncViewport();
		window.addEventListener('resize', syncViewport);
		return () => window.removeEventListener('resize', syncViewport);
	});

	function buildCutout(rect: SpotlightRect) {
		const pad = 6;
		const rx = Math.max(2, rect.x - pad), ry = Math.max(2, rect.y - pad);
		const rw = Math.min(vw - rx - 2, rect.width + pad * 2), rh = Math.min(vh - ry - 2, rect.height + pad * 2);
		const tuple = resolveCornerTuple(rect.corners, cornerStyle);
		const cutPx = cornerStyle === UI_CORNER_STYLES.STRAIGHT ? 0 : 12;
		return {
			id: rect.id, rx, ry, rw, rh,
			points: buildCornerPolygonPoints(rw, rh, 0, tuple, cutPx, rx, ry),
			carets: buildCornerCarets(rw, rh, tuple, cutPx, 14, rx, ry),
		};
	}

	let cutouts = $derived(uiSpotlightMachine.rects.map(buildCutout));
	let primaryRect = $derived(
		uiSpotlightMachine.primaryRect ?? {
			id: 'fallback', x: Math.round(vw * 0.2), y: Math.round(vh * 0.2), width: Math.round(vw * 0.6), height: Math.round(vh * 0.55),
			top: Math.round(vh * 0.2), left: Math.round(vw * 0.2), right: Math.round(vw * 0.8), bottom: Math.round(vh * 0.75),
			corners: resolveCornerTuple(undefined, cornerStyle),
		},
	);
	let isMultiRail = $derived(cutouts.length > 1);
	let cardWidth = 352;
	let cardLeft = $derived(
		isMultiRail ? Math.round((vw - cardWidth) / 2) : Math.max(16, Math.min(vw - cardWidth - 16, primaryRect.x + Math.round((primaryRect.width - cardWidth) / 2))),
	);
	let cardTop = $derived(
		isMultiRail ? Math.round(vh * 0.42) : primaryRect.y > 240 ? Math.max(16, primaryRect.y - 196) : Math.min(vh - 204, primaryRect.y + primaryRect.height + 20),
	);
</script>

{#if uiSpotlightMachine.active}
	<div data-testid="ui-spotlight-veil" class="fixed inset-0 z-40 pointer-events-none select-none overflow-hidden">
		<svg class="absolute inset-0 w-full h-full" width={vw} height={vh} viewBox="0 0 {vw} {vh}" aria-hidden="true">
			<defs>
				<pattern id="ui-spotlight-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
					<line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" stroke-width="1.2" />
				</pattern>
				<filter id="ui-spotlight-glow" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
					<feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
				</filter>
				<mask id="ui-spotlight-mask">
					<rect width="100%" height="100%" fill="white" />
					{#each cutouts as c (c.id)}<polygon points={c.points} fill="black" />{/each}
				</mask>
			</defs>
			<rect width="100%" height="100%" fill="black" mask="url(#ui-spotlight-mask)" opacity="0.68" />
			<rect width="100%" height="100%" fill="url(#ui-spotlight-hatch)" mask="url(#ui-spotlight-mask)" opacity="0.22" class="text-[var(--ui-text,var(--hud-text))]" />
			{#each cutouts as c (c.id)}
				<polygon data-testid="spotlight-cutout-polygon" data-target-id={c.id} data-corner-style={cornerStyle} points={c.points} fill="none" stroke="var(--ui-accent-primary, var(--hud-accent-primary))" stroke-width="2.4" filter="url(#ui-spotlight-glow)" opacity="0.96" />
				<g stroke="var(--ui-accent-secondary, var(--hud-brass))" stroke-width="2" fill="none" opacity="0.92">
					{#each c.carets as caret, idx (idx)}<polyline points={caret} />{/each}
				</g>
			{/each}
		</svg>

		<aside
			data-testid="spotlight-tour-card"
			aria-label="Guided HUD Spotlight Callout"
			class="absolute pointer-events-auto w-[22rem] bg-[var(--ui-surface,var(--hud-surface))]/96 border border-[var(--ui-accent-primary,var(--hud-accent-primary))] p-3.5 shadow-2xl backdrop-blur-md flex flex-col gap-2 transition-all duration-150"
			style={`left: ${cardLeft}px; top: ${cardTop}px;`}
		>
			<div class="flex items-center justify-between gap-2 border-b border-[var(--ui-border,var(--hud-border))] pb-1.5">
				<div class="flex items-center gap-2">
					<span data-testid="quest-step-badge" class="px-1.5 py-0.5 text-[0.6875rem] font-mono font-bold bg-[var(--ui-accent-secondary,var(--hud-brass))]/20 text-[var(--ui-accent-secondary,var(--hud-brass))] border border-[var(--ui-accent-secondary,var(--hud-brass))]/50">
						{uiSpotlightMachine.stepIndex}/{uiSpotlightMachine.totalSteps}
					</span>
					<span class="text-[0.6875rem] font-mono tracking-widest text-[var(--ui-accent-secondary,var(--hud-brass))] uppercase font-semibold">
						HUD TOUR · STEP {uiSpotlightMachine.stepIndex}/{uiSpotlightMachine.totalSteps}
					</span>
				</div>
				<button type="button" data-testid="spotlight-close-btn" aria-label="Close spotlight" class="text-[0.6875rem] font-mono text-[var(--ui-muted,var(--hud-muted))] hover:text-[var(--ui-text,var(--hud-text))] cursor-pointer" onclick={() => (onClose ? onClose() : uiSpotlightMachine.stopTour())}>[×]</button>
			</div>
			<div data-testid="spotlight-step-title" class="text-sm font-semibold text-[var(--ui-text,var(--hud-text))] tracking-wide">{uiSpotlightMachine.title}</div>
			<p data-testid="spotlight-step-description" class="text-xs leading-relaxed text-[var(--ui-muted,var(--hud-muted))] m-0">{uiSpotlightMachine.description}</p>
			<div class="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--ui-border,var(--hud-border))] mt-0.5">
				<UiChamferButton {cornerStyle} cutPx={5} testid="quest-skip-tour-btn" onclick={() => (onSkipTour ? onSkipTour() : uiSpotlightMachine.stopTour())} className="px-2.5 py-1 text-[0.6875rem]">Skip Tour [Esc]</UiChamferButton>
				<UiChamferButton {cornerStyle} cutPx={6} variant={uiSpotlightMachine.stepIndex >= uiSpotlightMachine.totalSteps ? 'brass' : 'accent'} testid="quest-spotlight-btn" onclick={() => (onNextStep ? onNextStep() : uiSpotlightMachine.nextStep())} className="px-3 py-1 text-[0.6875rem] font-bold">
					{uiSpotlightMachine.stepIndex >= uiSpotlightMachine.totalSteps ? 'Finish [✓]' : 'Next Step [→]'}
				</UiChamferButton>
			</div>
		</aside>
	</div>
{/if}
