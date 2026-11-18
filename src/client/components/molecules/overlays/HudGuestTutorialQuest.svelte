<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.1 30-Second Progressive HUD Unfolding Tour Bar (LEFT_END_CAP 1/5 badge, RIGHT_END_CAP Next Step [→], Skip Tour [Esc], >=10px inner clearance).
-->
<script lang="ts">
	import { HUD_VIEWS, type HudViewMode } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { CHAMFER_PROFILES, HULL_PROFILES } from '@config/hud.tokens';
	import { PRINCIPAL_KINDS } from '@config/security.constants';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import { securityWire } from '@client/state/security.wire.svelte';
	import { uiSpotlightMachine } from '@ui';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';

	interface QuestStepSpec {
		readonly step: number;
		readonly code: string;
		readonly stageTitle: string;
		readonly summary: string;
		readonly targetView: HudViewMode;
		readonly actionLabel: string;
	}

	const QUEST_STEPS: readonly QuestStepSpec[] = [
		{ step: 1, code: '1/5', stageTitle: '0s–6s · Center Stage', summary: 'Butterfly Call Graph — trace upstream callers (Ca) & callees (Ce) around dispatch_ast_job.', targetView: HUD_VIEWS.BUTTERFLY, actionLabel: 'Next Step [→]' },
		{ step: 2, code: '2/5', stageTitle: '6s–12s · Top Crown', summary: 'Top Projection Crown unfolded — switch live between Butterfly, CFG, Treemap, DSM & UML.', targetView: HUD_VIEWS.CONTROL_FLOW, actionLabel: 'Next Step [→]' },
		{ step: 3, code: '3/5', stageTitle: '12s–18s · Bento Radar', summary: '3-Column Bento Radar unfolded — zoom (+/-), fit safe corridor (⊡), or filter hotspots (!).', targetView: HUD_VIEWS.TREEMAP, actionLabel: 'Next Step [→]' },
		{ step: 4, code: '4/5', stageTitle: '18s–24s · Edge Mini-Rails', summary: 'Left & Right 48px Mini-Rails unfolded — inspect AST Explorer («/») & 3-Tier Telemetry (1/2/3).', targetView: HUD_VIEWS.MERMAID, actionLabel: 'Next Step [→]' },
		{ step: 5, code: '5/5', stageTitle: '24s–30s · Full Studio', summary: 'Top Identity & Visor unfolded — Tour Complete! Create Account or Sign In to unlock Full Studio.', targetView: HUD_VIEWS.BUTTERFLY, actionLabel: 'Sign In →' },
	];

	let isGuest = $derived(securityWire.principalKind === PRINCIPAL_KINDS.GUEST);
	let currentSpec = $derived(QUEST_STEPS[Math.max(0, Math.min(4, hudWire.tutorialStep - 1))]!);

	function runCurrentSpotlight(event: MouseEvent): void {
		const el = event.currentTarget as HTMLElement;
		const r = el.getBoundingClientRect();
		hudWire.triggerParticleBurst(r.left + r.width / 2, r.top + r.height / 2, 'quest');
		if (currentSpec.step < 5) {
			const nextStep = QUEST_STEPS[currentSpec.step]!;
			if (currentSpec.step === 1) hudWire.setButterflyMaxHops(2);
			hudWire.advanceTourStep(nextStep.step, nextStep.targetView);
		} else {
			hudWire.completeTourAndOpenAuth();
		}
	}

	function jumpToStep(item: QuestStepSpec): void {
		hudWire.advanceTourStep(item.step, item.targetView);
	}
</script>

{#if isGuest && !hudWire.isStealthMode && hudWire.tourActive && !uiSpotlightMachine.active && !hudWire.spotlightTarget && !hudWire.tutorialCompleted && hudWire.activeModal === HUD_MODALS.NONE}
	<aside
		data-testid="guest-tutorial-quest"
		aria-label="Guided 30-Second Progressive HUD Tour"
		class="fixed bottom-4 left-1/2 -translate-x-1/2 z-24 pointer-events-auto hud-center-corridor-w max-w-[min(740px,calc(100vw-24px))]"
	>
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={false} className="w-full px-3.5 py-2.5 font-mono text-[11px] shadow-2xl">
			<div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
				<div class="flex items-center gap-2 min-w-0 flex-1">
					<HudChamferButton
						chamferCorner={CHAMFER_PROFILES.LEFT_END_CAP}
						cutPx={6}
						variant="brass"
						testid="quest-step-badge"
						tip={currentSpec.stageTitle}
						onclick={() => jumpToStep(currentSpec)}
						className="px-2.5 py-1 text-[11px] font-bold shrink-0"
					>
						{currentSpec.code}
					</HudChamferButton>
					<div class="hidden sm:flex items-center gap-1 shrink-0" role="progressbar" aria-valuenow={hudWire.tutorialStep} aria-valuemin={1} aria-valuemax={5}>
						{#each QUEST_STEPS as item (item.step)}
							<button type="button" aria-label={`Jump to step ${item.step}: ${item.stageTitle}`} onclick={() => jumpToStep(item)} data-hud-tip={`${item.stageTitle}: ${item.summary}`} class={`w-3.5 h-1.5 cursor-pointer transition-colors ${item.step <= hudWire.tutorialStep ? 'bg-[var(--hud-accent-primary)]' : 'bg-[var(--hud-border)]'}`}></button>
						{/each}
					</div>
					<span class="truncate text-[var(--hud-text)]">{currentSpec.summary}</span>
				</div>
				<div class="flex items-center gap-1.5 shrink-0">
					<HudChamferButton
						chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER}
						cutPx={5}
						testid="quest-skip-tour-btn"
						tip="Skip Tour and Unfold Guest Workspace HUD"
						tipKey="Esc"
						onclick={() => hudWire.skipTourAndUnfoldHud()}
						className="px-2 py-1 text-[10px]"
					>
						Skip Tour [Esc]
					</HudChamferButton>
					<HudChamferButton
						chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP}
						cutPx={6}
						variant={currentSpec.step === 5 ? 'brass' : 'accent'}
						testid="quest-spotlight-btn"
						onclick={runCurrentSpotlight}
						className="px-3 py-1 text-[11px] shrink-0"
					>
						{currentSpec.actionLabel}
					</HudChamferButton>
				</div>
			</div>
		</HudChamferFrame>
	</aside>
{/if}
