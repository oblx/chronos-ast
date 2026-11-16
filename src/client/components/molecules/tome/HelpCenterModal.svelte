<!--
	@author Oblx <code@oblx.dev>
	@description Chronos Architect's Field Tome: HudModalShell Octagonal Frame, Internal 136px Chronicle Spine, Paginated 6-Card Chapter Grid & Dual-Page Spread.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { API_ROUTES, type HudViewMode } from '@config/constants';
	import { HELP_SKILL_TIERS, type HelpSkillTier } from '@config/registries/help.registry';
	import { CHAMFER_PROFILES } from '@config/hud.tokens';
	import { clientDagKernel, compileHelpBookFromDocs, filterHelpChapters, hudWire, type HelpChapterSpec, type HelpSubStepSpec } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudModalShell from '@client/components/modals/HudModalShell.svelte';
	import HudModalHeader from '@client/components/modals/HudModalHeader.svelte';
	import HudModalFooter from '@client/components/modals/HudModalFooter.svelte';
	import HelpSpotlightOverlay from './HelpSpotlightOverlay.svelte';
	import HelpTomeSpread from './HelpTomeSpread.svelte';

	interface Props { isOpen: boolean; activeView: HudViewMode; onClose: () => void; onSelectView: (view: HudViewMode) => void; }
	let { isOpen, onClose, onSelectView }: Props = $props();

	const BUNDLED_DOCS = import.meta.glob('/docs/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

	let chapters = $state<readonly HelpChapterSpec[]>(compileHelpBookFromDocs(BUNDLED_DOCS));
	let activeTier = $state<'ALL' | HelpSkillTier>('ALL'), activeChronicle = $state<string>('ALL'), searchQuery = $state('');
	let selectedChapterId = $state('00-01'), selectedStepIdx = $state(0), chapterPage = $state(0);
	let completedStepIds = $state<Record<string, boolean>>({}), hoverTooltipsEnabled = $state(false), spotlightOnlyMode = $state(false);
	let overlayRef = $state<{ syncTargetRect: (anchor: string | undefined) => void; showHoverHint: (c: HelpChapterSpec, s: HelpSubStepSpec, r: DOMRect) => void; clearHoverHint: () => void } | null>(null);

	let visibleChapters = $derived(filterHelpChapters(chapters, activeTier, searchQuery).filter((c) => activeChronicle === 'ALL' || c.docCode === activeChronicle || c.docCode.startsWith(`${activeChronicle}-`)));
	let activeChapter = $derived(visibleChapters.find((c) => c.id === selectedChapterId) ?? visibleChapters[0] ?? chapters[0]);
	let currentStep = $derived<HelpSubStepSpec | undefined>(activeChapter?.subSteps[selectedStepIdx] ?? activeChapter?.subSteps[0]);
	let totalStepsCount = $derived(chapters.reduce((acc, c) => acc + c.subSteps.length, 0));
	let completedCount = $derived(Object.keys(completedStepIds).filter((k) => completedStepIds[k]).length);
	let tierCounts = $derived({
		BEGINNER: chapters.filter((c) => c.tier === HELP_SKILL_TIERS.BEGINNER).length,
		ADVANCED: chapters.filter((c) => c.tier === HELP_SKILL_TIERS.ADVANCED).length,
		EXPERT: chapters.filter((c) => c.tier === HELP_SKILL_TIERS.EXPERT).length,
	});
	let showcaseFormula = $derived(currentStep?.formulas[0] ?? activeChapter?.subSteps.find((s) => s.formulas.length > 0)?.formulas[0] ?? 'v(G) = E - N + 2P');

	function pickChronicle(prefix: string): void {
		activeChronicle = activeChronicle === prefix ? 'ALL' : prefix;
		chapterPage = 0;
		const first = chapters.find((c) => c.docCode === prefix || c.docCode.startsWith(`${prefix}-`));
		if (first) { selectedChapterId = first.id; selectedStepIdx = 0; }
	}
	function selectChapter(id: string): void {
		selectedChapterId = id; selectedStepIdx = 0; spotlightOnlyMode = false;
		const idx = visibleChapters.findIndex((c) => c.id === id);
		if (idx >= 0) chapterPage = Math.floor(idx / 6);
	}
	function jumpToStepTarget(step: HelpSubStepSpec | undefined, enterSpotlight: boolean): void {
		if (!step) return;
		completedStepIds = { ...completedStepIds, [step.id]: true };
		onSelectView(step.recommendedView as HudViewMode);
		if (enterSpotlight) spotlightOnlyMode = true;
		setTimeout(() => overlayRef?.syncTargetRect(step.anchorId), 25);
	}
	function completeAndAdvanceSubStep(e: MouseEvent): void {
		if (!currentStep) return;
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		hudWire.triggerParticleBurst(r.left + r.width / 2, r.top + r.height / 2, 'quest');
		completedStepIds = { ...completedStepIds, [currentStep.id]: true };
		nextStep();
	}
	function nextStep(): void {
		if (!activeChapter) return;
		if (selectedStepIdx + 1 < activeChapter.subSteps.length) { selectedStepIdx += 1; return; }
		const idx = visibleChapters.findIndex((c) => c.id === activeChapter.id);
		if (idx >= 0 && idx + 1 < visibleChapters.length) selectChapter(visibleChapters[idx + 1]!.id);
	}
	function prevStep(): void {
		if (!activeChapter) return;
		if (selectedStepIdx > 0) { selectedStepIdx -= 1; return; }
		const idx = visibleChapters.findIndex((c) => c.id === activeChapter.id);
		if (idx > 0) { const prev = visibleChapters[idx - 1]!; selectChapter(prev.id); selectedStepIdx = Math.max(0, prev.subSteps.length - 1); }
	}
	$effect(() => { if ((isOpen || spotlightOnlyMode) && currentStep) overlayRef?.syncTargetRect(currentStep.anchorId); else overlayRef?.syncTargetRect(undefined); });
	onMount(() => {
		void clientDagKernel.requestJson<{ chapters?: readonly HelpChapterSpec[] }>(API_ROUTES.HELP_BOOK, { sourceZone: 'APP_MODAL', intentKind: 'HELP_BOOK_LOAD' }).then((r) => { if (r.ok && r.data.chapters?.length) chapters = r.data.chapters; });
		const onOver = (ev: MouseEvent) => {
			if (!hoverTooltipsEnabled || isOpen) return;
			const host = (ev.target as HTMLElement | null)?.closest?.('[data-help-target]') as HTMLElement | null;
			const anchor = host?.getAttribute('data-help-target');
			if (!host || !anchor) { overlayRef?.clearHoverHint(); return; }
			for (const ch of chapters) for (const st of ch.subSteps) if (st.anchorId === anchor) { overlayRef?.showHoverHint(ch, st, host.getBoundingClientRect()); return; }
		};
		window.addEventListener('mouseover', onOver, { passive: true });
		return () => window.removeEventListener('mouseover', onOver);
	});
</script>

<HelpSpotlightOverlay bind:this={overlayRef} {currentStep} {hoverTooltipsEnabled} {spotlightOnlyMode} onFocusTarget={(st) => jumpToStepTarget(st, false)} onReopenBook={() => (spotlightOnlyMode = false)} onDismissSpotlight={() => { spotlightOnlyMode = false; onClose(); }} />

<HudModalShell isOpen={isOpen && !spotlightOnlyMode} ariaLabel="Architect's Field Tome" maxWidthClass="max-w-6xl" {onClose}>
	{#snippet header()}
		<HudModalHeader title="Architect's Field Tome" subtitle={`INTERACTIVE ARCHITECTURAL ENCYCLOPEDIA · 8 CHRONICLES · ${chapters.length} CHAPTERS`} {onClose} />
		<div class="px-5 py-2 border-b border-[var(--hud-border)] bg-[var(--hud-bg)]/90 flex flex-wrap items-center justify-between gap-2 shrink-0 font-mono text-xs">
			<div class="flex items-center gap-1.5 flex-wrap">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.LEFT_END_CAP} cutPx={5} active={activeTier === 'ALL' && activeChronicle === 'ALL'} variant={activeTier === 'ALL' && activeChronicle === 'ALL' ? 'accent' : 'default'} testid="help-tier-all" onclick={() => { activeTier = 'ALL'; activeChronicle = 'ALL'; chapterPage = 0; }} className="px-3 py-1 text-[11px] shrink-0">All [{chapters.length}]</HudChamferButton>
				{#each [HELP_SKILL_TIERS.BEGINNER, HELP_SKILL_TIERS.ADVANCED, HELP_SKILL_TIERS.EXPERT] as tier, idx (tier)}
					<HudChamferButton chamferCorner={idx === 2 ? CHAMFER_PROFILES.RIGHT_END_CAP : CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} active={activeTier === tier} variant={activeTier === tier ? 'brass' : 'default'} testid={`help-tier-${tier.toLowerCase()}`} onclick={() => { activeTier = tier; chapterPage = 0; }} className="px-3 py-1 text-[11px] shrink-0">{tier.charAt(0) + tier.slice(1).toLowerCase()} [{tierCounts[tier]}]</HudChamferButton>
				{/each}
			</div>
			<div class="flex items-center gap-1.5 flex-nowrap shrink-0">
				<input type="search" data-testid="help-search-input" bind:value={searchQuery} oninput={() => (chapterPage = 0)} placeholder="Search tome (CFG, LCOM4)..." class="min-w-[200px] w-[224px] bg-[var(--hud-surface)] border border-[var(--hud-border)] px-2.5 py-1 text-xs text-[var(--hud-text)] shrink-0" />
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={5} variant="accent" testid="resume-hud-tour-btn" onclick={() => { hudWire.resumeTour(); onClose(); }} className="px-3 py-1 text-[11px] font-bold shrink-0">⚡ Replay HUD Tour</HudChamferButton>
			</div>
		</div>
	{/snippet}

	<HelpTomeSpread {visibleChapters} {activeChapter} {currentStep} {selectedStepIdx} {completedStepIds} {completedCount} {totalStepsCount} {showcaseFormula} {activeChronicle} {chapterPage} onSelectChronicle={pickChronicle} onSetChapterPage={(p) => (chapterPage = p)} onSelectChapter={selectChapter} onSelectStepIdx={(i) => (selectedStepIdx = i)} onSpotlight={(st) => jumpToStepTarget(st, true)} onCompleteStep={completeAndAdvanceSubStep} onPrevFolio={prevStep} onNextFolio={nextStep} />

	{#snippet footer()}
		<HudModalFooter metaText={`Active Chronicle: ${activeChronicle} · Mastered: ${completedCount}/${totalStepsCount} § · Chapter: ${activeChapter?.docCode ?? '00-01'}`}>
			{#snippet actions()}<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={6} variant="brass" testid="help-close-btn" onclick={onClose} className="px-3.5 py-1 text-xs">Close Tome</HudChamferButton>{/snippet}
		</HudModalFooter>
	{/snippet}
</HudModalShell>
