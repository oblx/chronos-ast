<!--
	@author Oblx <code@oblx.dev>
	@description Chronos Architect's Field Tome Spread: 136px Internal Chronicle Spine | Left Folio (6-Card 2x3 Paginated Grid + Corner-Safe MathML Pedestal) | Right Folio (Reader + Drill Pedestal).
-->
<script lang="ts">
	import { CHAMFER_PROFILES, HULL_PROFILES } from '@config/hud.tokens';
	import type { HelpChapterSpec, HelpSubStepSpec } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudMathFormula from '@client/components/atoms/HudMathFormula.svelte';
	import HudSubTabBar, { type HudSubTabItem } from '../HudSubTabBar.svelte';
	import HudMathText from './HudMathText.svelte';

	interface Props {
		visibleChapters: readonly HelpChapterSpec[]; activeChapter: HelpChapterSpec | undefined; currentStep: HelpSubStepSpec | undefined;
		selectedStepIdx: number; completedStepIds: Readonly<Record<string, boolean>>; completedCount: number; totalStepsCount: number;
		showcaseFormula: string; activeChronicle: string; chapterPage: number;
		onSelectChronicle: (id: string) => void; onSetChapterPage: (page: number) => void; onSelectChapter: (id: string) => void;
		onSelectStepIdx: (idx: number) => void; onSpotlight: (step: HelpSubStepSpec) => void; onCompleteStep: (e: MouseEvent) => void;
		onPrevFolio: () => void; onNextFolio: () => void;
	}
	let {
		visibleChapters, activeChapter, currentStep, selectedStepIdx, completedStepIds, completedCount, totalStepsCount,
		showcaseFormula, activeChronicle, chapterPage, onSelectChronicle, onSetChapterPage, onSelectChapter, onSelectStepIdx, onSpotlight, onCompleteStep, onPrevFolio, onNextFolio,
	}: Props = $props();

	const CHRONICLES = [
		{ id: '00', label: '00 Vision', sigil: '◈' }, { id: '01', label: '01 Arch', sigil: '⬡' }, { id: '02', label: '02 Model', sigil: '⊞' },
		{ id: '03', label: '03 Math', sigil: '∑' }, { id: '04', label: '04 Ingest', sigil: '⇣' }, { id: '05', label: '05 HUD', sigil: '⌖' },
		{ id: '06', label: '06 Ops', sigil: '⚙' }, { id: '07', label: '07 Print', sigil: '📐' },
	] as const;
	const PAGE_SIZE = 6;
	let rightScrollTab = $state<'OVERVIEW' | 'PATHS'>('OVERVIEW');
	let pageCount = $derived(Math.max(1, Math.ceil(visibleChapters.length / PAGE_SIZE)));
	let clampedPage = $derived(Math.min(chapterPage, pageCount - 1));
	let pagedChapters = $derived(visibleChapters.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE));
	let rightTabs = $derived<readonly HudSubTabItem[]>([{ id: 'OVERVIEW', label: 'Overview & Rules' }, { id: 'PATHS', label: 'Engine & Storage Paths', badge: (currentStep?.tableRows.length ?? 0) + 1 }]);

	function cleanChapterTitle(chap: HelpChapterSpec): string {
		return chap.title.replace(/^\d{2}(?:-\d{2})?\s*(?:\/\/|[—·:-])\s*/, '').replace(/^\d{2}(?:-\d{2})?\s*(?:\/\/|[—·:-])\s*/, '').replace(/^Chronos\s+(?:v\d+\.\d+\.\d+\s*)?/i, '').split(/[—(]/)[0]!.trim();
	}
</script>

<div data-testid="help-tome-spread" class="grid grid-cols-1 lg:grid-cols-[136px_2px_1fr_2px_1fr] overflow-hidden font-mono text-xs border border-[var(--hud-border)] bg-[var(--hud-bg)]/60">
	<nav data-testid="tome-left-spine" aria-label="Chronicle Spine Bookmarks" class="w-full lg:w-[136px] p-2.5 bg-[var(--hud-bg)]/90 flex flex-row lg:flex-col flex-wrap lg:flex-nowrap justify-start gap-1.5 shrink-0">
		<span class="hidden lg:block text-[10px] uppercase tracking-wider text-[var(--hud-muted)] px-1 pb-1 border-b border-[var(--hud-border)]">Chronicles (8)</span>
		{#each CHRONICLES as chr (chr.id)}
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.LEFT_END_CAP} cutPx={6} active={activeChronicle === chr.id} variant={activeChronicle === chr.id ? 'brass' : 'default'} testid={`tome-bookmark-${chr.id}`} onclick={() => onSelectChronicle(chr.id)} className="lg:w-full px-2.5 py-1.5 font-mono text-[11px] justify-start">
				<span class="text-[var(--hud-accent-secondary)] font-bold">{chr.sigil}</span><span>{chr.label}</span>
			</HudChamferButton>
		{/each}
	</nav>
	<div aria-hidden="true" class="hidden lg:block w-[2px] h-full bg-gradient-to-b from-[var(--hud-accent-primary)] via-[var(--hud-accent-secondary)] to-[var(--hud-accent-primary)] opacity-75"></div>

	<section data-testid="tome-left-page" class="p-3.5 flex flex-col justify-between gap-3 bg-[var(--hud-bg)]/55 min-w-0">
		<div class="flex flex-col gap-2 min-w-0">
			<div class="flex items-center justify-between gap-2 text-[11px] text-[var(--hud-muted)]">
				<span class="uppercase tracking-wider text-[var(--hud-accent-secondary)] font-bold truncate">Chronicle Advancement Index ({visibleChapters.length})</span>
				<div class="flex items-center gap-1.5 shrink-0">
					{#if pageCount > 1}
						<HudChamferButton chamferCorner={CHAMFER_PROFILES.LEFT_END_CAP} cutPx={5} disabled={clampedPage <= 0} testid="tome-grid-prev-page" onclick={() => onSetChapterPage(Math.max(0, clampedPage - 1))} className="px-2 py-0.5 text-[10px]">◄</HudChamferButton>
						<span data-testid="tome-grid-page-indicator" class="text-[10.5px] text-[var(--hud-accent-primary)] font-bold tabular-nums">Page {clampedPage + 1}/{pageCount}</span>
						<HudChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={5} disabled={clampedPage + 1 >= pageCount} testid="tome-grid-next-page" onclick={() => onSetChapterPage(Math.min(pageCount - 1, clampedPage + 1))} className="px-2 py-0.5 text-[10px]">►</HudChamferButton>
					{:else}<span>Mastered: {completedCount}/{totalStepsCount} §</span>{/if}
				</div>
			</div>
			<div data-testid="tome-advancement-grid" class="grid grid-cols-2 grid-rows-3 gap-2 min-w-0">
				{#each pagedChapters as chap (chap.id)}
					{@const mastered = chap.subSteps.every((s) => completedStepIds[s.id])}
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={6} active={activeChapter?.id === chap.id} variant={mastered ? 'brass' : activeChapter?.id === chap.id ? 'accent' : 'default'} tip={chap.title} testid={`tome-tile-${chap.docCode}`} onclick={() => onSelectChapter(chap.id)} className="w-full h-[58px] px-3 py-1.5 text-left justify-between overflow-hidden min-w-0">
						<span class="flex flex-col justify-center min-w-0 flex-1 pr-1.5 whitespace-normal">
							<span class="text-[9.5px] uppercase tracking-wider text-[var(--hud-accent-secondary)] font-bold leading-tight">{chap.docCode} · {chap.tier}</span>
							<span class="text-[11px] font-bold text-[var(--hud-text)] leading-tight line-clamp-2">{cleanChapterTitle(chap)}</span>
						</span>
						<span class="px-1.5 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-bg)]/80 text-[10px] shrink-0">{mastered ? '★' : `${chap.subSteps.length} §`}</span>
					</HudChamferButton>
				{/each}
			</div>
		</div>

		<div data-testid="tome-formula-pedestal" class="min-h-[136px] flex flex-col justify-center min-w-0">
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chamferPx={12} chevrons={false} className="w-full px-5 py-3.5 flex flex-col justify-between gap-2">
				<div class="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-[var(--hud-accent-secondary)]">
					<span class="truncate">◈ Key Equation &amp; Target Pedestal</span>
					<span class="shrink-0">{currentStep?.anchorId ?? 'PRIMARY_CANVAS'} → {currentStep?.recommendedView ?? 'BUTTERFLY'}</span>
				</div>
				<div class="py-1.5 px-3 bg-[var(--hud-bg)]/90 border border-[var(--hud-border)] flex items-center justify-center overflow-x-auto"><HudMathFormula tex={showcaseFormula} display={true} /></div>
				<div class="flex items-center justify-between gap-2 text-[10px] text-[var(--hud-muted)]">
					<span class="truncate">Source: <code>{activeChapter?.docPath}</code></span>
					<span class="shrink-0">Keycap: [{activeChapter?.shortcutKey ?? '?'}]</span>
				</div>
			</HudChamferFrame>
		</div>

		<div class="flex items-center justify-between pt-1">
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT} cutPx={6} testid="tome-prev-folio" onclick={onPrevFolio} className="px-3 py-1.5 text-xs">← Prev Folio</HudChamferButton>
			<span class="text-[11px] text-[var(--hud-muted)]">Chronicle {activeChapter?.docCode ?? '00-01'}</span>
		</div>
	</section>
	<div aria-hidden="true" class="hidden lg:block w-[2px] h-full bg-gradient-to-b from-[var(--hud-accent-primary)] via-[var(--hud-accent-secondary)] to-[var(--hud-accent-primary)] opacity-75 shadow-[0_0_12px_var(--hud-accent-primary)]"></div>

	<section data-testid="tome-right-page" class="p-3.5 flex flex-col justify-between gap-3 bg-[var(--hud-panel)]/75 min-w-0">
		{#if activeChapter && currentStep}
			<div class="flex flex-col gap-2 min-w-0">
				<div class="flex items-center justify-between gap-2 border-b border-[var(--hud-border)] pb-2 min-w-0">
					<div class="min-w-0 flex-1">
						<span class="text-[10px] uppercase tracking-widest text-[var(--hud-accent-secondary)] font-bold block truncate">{activeChapter.docCode} · {activeChapter.tier} · {activeChapter.title}</span>
						<h3 class="font-display text-xl font-bold text-[var(--hud-text)] leading-tight truncate">§{currentStep.stepCode} — {currentStep.title}</h3>
					</div>
					<div class="flex items-center gap-1.5 shrink-0" role="tablist" aria-label="Chapter Sub-Step Pips">
						{#each activeChapter.subSteps as st, idx (st.id)}
							<button type="button" onclick={() => onSelectStepIdx(idx)} data-hud-tip={st.title} class={`text-sm cursor-pointer ${idx === selectedStepIdx ? 'text-[var(--hud-accent-primary)] font-bold' : completedStepIds[st.id] ? 'text-[var(--hud-accent-secondary)]' : 'text-[var(--hud-muted)]'}`}>{idx === selectedStepIdx || completedStepIds[st.id] ? '●' : '○'}</button>
						{/each}
					</div>
				</div>
				<div class="p-2.5 border border-[var(--hud-accent-primary)]/45 bg-[var(--hud-bg)]/90 text-[12.5px] leading-relaxed text-[var(--hud-text)]"><HudMathText text={currentStep.keyTakeaway} /></div>
				<div class="border border-[var(--hud-border)] bg-[var(--hud-surface)]/85 p-3 flex flex-col gap-2">
					<div class="border-b border-[var(--hud-border)] pb-2 flex justify-start"><HudSubTabBar items={rightTabs} activeId={rightScrollTab} ariaLabel="Chapter Specification Tabs" onSelect={(id) => (rightScrollTab = id as 'OVERVIEW' | 'PATHS')} /></div>
					{#if rightScrollTab === 'OVERVIEW'}
						<ul class="flex flex-col gap-1.5 text-xs leading-relaxed">
							{#each currentStep.bullets.slice(0, 4) as pt (pt.term + pt.detail)}<li class="text-[var(--hud-muted)]"><strong class="text-[var(--hud-accent-secondary)]">{pt.term}:</strong> <HudMathText text={pt.detail} /></li>{/each}
						</ul>
					{:else}
						<div class="flex flex-wrap gap-1.5 py-1">
							<code class="px-2 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-bg)] text-[11px] text-[var(--hud-accent-primary)]">{activeChapter.docPath}</code>
							{#each currentStep.tableRows as row (row.join('|'))}<span class="px-2 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-bg)] text-[11px] text-[var(--hud-muted)]">{row.join(' · ')}</span>{/each}
						</div>
					{/if}
				</div>
			</div>
			<div data-testid="tome-drill-pedestal" class="p-3 border border-[var(--hud-accent-secondary)]/60 bg-[var(--hud-bg)]/95 flex flex-col gap-2">
				<span class="text-[11px] text-[var(--hud-accent-secondary)] font-bold">⚡ Interactive Field Drill: <span class="font-normal text-[var(--hud-text)]">{currentStep.actionDrill}</span></span>
				<div class="flex flex-wrap items-center justify-between gap-2">
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT} cutPx={6} variant="accent" testid="help-spotlight-trigger" onclick={() => onSpotlight(currentStep)} className="px-3 py-1.5 text-xs font-bold">⌖ Spotlight in HUD</HudChamferButton>
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={6} variant="nominal" testid="tome-complete-step-btn" onclick={onCompleteStep} className="px-3 py-1.5 text-xs font-bold">✓ Complete Sub-Step</HudChamferButton>
				</div>
			</div>
			<div class="flex items-center justify-between pt-1">
				<span class="text-[11px] text-[var(--hud-muted)] tabular-nums">Folio {selectedStepIdx + 1} / {activeChapter.subSteps.length}</span>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={6} variant="accent" testid="tome-next-folio" onclick={onNextFolio} className="px-3 py-1.5 text-xs">Next Folio →</HudChamferButton>
			</div>
		{/if}
	</section>
</div>
