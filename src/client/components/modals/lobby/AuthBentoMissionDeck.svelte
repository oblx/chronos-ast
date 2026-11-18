<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.3 Three-Column Horizontal Bento Lobby Deck: Guided Tour, Instant Workspace Access & Verified Identity Slot.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Compass, FastForward } from 'lucide-svelte';
	import { CHAMFER_PROFILES, HULL_PROFILES, SURFACE_PATTERN_IDS } from '@config/hud.tokens';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudSurfacePattern from '@client/components/atoms/fx/HudSurfacePattern.svelte';
	import HudHorizontalDeck from '../../molecules/HudHorizontalDeck.svelte';

	interface Props {
		onStartTour: () => void;
		onSkipTour: () => void;
		signInCard?: Snippet;
	}
	let { onStartTour, onSkipTour, signInCard }: Props = $props();
</script>

<HudHorizontalDeck testid="welcome-lobby-bento-deck" trackClassName="items-stretch">
	<div class="relative min-w-[290px] lg:min-w-0 lg:flex-1 snap-start h-full">
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={true} surfacePatternId={SURFACE_PATTERN_IDS.ISOMETRIC_HEX_MESH} patternOpacity={0.22} className="h-full" contentClassName="p-5 flex flex-col justify-between gap-3">
			<div class="flex flex-col gap-2 min-w-0">
				<span class="text-[10.5px] font-mono font-bold tracking-wider text-[var(--hud-accent-primary)] uppercase">↯ NEW OPERATOR BRIEFING · 30 SEC</span>
				<h3 class="font-display text-lg font-bold text-[var(--hud-text)] leading-snug">Interactive HUD Tour</h3>
				<p class="text-[12px] text-[var(--hud-muted)] leading-relaxed m-0 font-mono">Guided 5-step unfolding across all 11 tactical zones, unlocking your first Level-Up XP burst.</p>
				<ul class="text-[11px] text-[var(--hud-text)]/85 font-mono space-y-1 pt-1">
					<li class="truncate">1 · Progressive HUD Reveal DAG</li>
					<li class="truncate">2 · Call Graph &amp; CFG Target Spotlights</li>
					<li class="truncate">3 · Ambient Telemetry Radar Calibration</li>
				</ul>
			</div>
			<div class="mt-auto pt-3">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_LEFT} cutPx={6} variant="accent" testid="start-hud-tour-btn" tip="Start the 5-step interactive HUD walkthrough" onclick={onStartTour} className="w-full justify-center py-2 text-xs font-bold">
					<Compass size={14} /> Launch 30s Guided Tour &rarr;
				</HudChamferButton>
			</div>
		</HudChamferFrame>
	</div>

	<div class="relative min-w-[290px] lg:min-w-0 lg:flex-1 snap-start h-full">
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={true} surfacePatternId={SURFACE_PATTERN_IDS.ARCHITECTURAL_BLUEPRINT} patternOpacity={0.22} className="h-full" contentClassName="p-5 flex flex-col justify-between gap-3">
			<div class="flex flex-col gap-2 min-w-0">
				<span class="text-[10.5px] font-mono font-bold tracking-wider text-[var(--hud-accent-secondary)] uppercase">⌖ INSTANT WORKSPACE ACCESS</span>
				<h3 class="font-display text-lg font-bold text-[var(--hud-text)] leading-snug">Open Studio HUD</h3>
				<p class="text-[12px] text-[var(--hud-muted)] leading-relaxed m-0 font-mono">Bypass onboarding and immediately deploy all 9 projections &amp; perimeter zones in Guest Sandbox mode.</p>
				<ul class="text-[11px] text-[var(--hud-text)]/85 font-mono space-y-1 pt-1">
					<li class="truncate">1 · Canonical 9-Projection Crown</li>
					<li class="truncate">2 · Embedded SQLite &amp; IndexedDB Parity</li>
					<li class="truncate">3 · Local AST, Metrics &amp; Source Lenses</li>
				</ul>
			</div>
			<div class="mt-auto pt-3">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={6} variant="brass" testid="skip-tour-open-hud-btn" tip="Unfold full HUD immediately [Esc]" onclick={onSkipTour} className="w-full justify-center py-2 text-xs font-bold">
					<FastForward size={14} /> Open Full Workspace [Esc]
				</HudChamferButton>
			</div>
		</HudChamferFrame>
	</div>

	{#if signInCard}
		<div class="min-w-[300px] lg:min-w-0 lg:flex-1 snap-start h-full">
			{@render signInCard()}
		</div>
	{/if}
</HudHorizontalDeck>
