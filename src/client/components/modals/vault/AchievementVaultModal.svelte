<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Card Vault: 4-Corner Chamfered Cards & Rank Strip, Persistent Non-Remounting Progression Bar & Monochrome-to-Color Filter.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { ACHIEVEMENT_CARDS, CARD_CATEGORIES, CARD_TIERS, INITIAL_DAG_XP_RULES } from '@config/gamification/gamification.registry';
	import { HUD_INTENT_KINDS } from '@config/hud/hud.intents';
	import { CHAMFER_PROFILES, HULL_PROFILES, HUD_ZONES, ZONE_CORNER_TUPLES } from '@config/hud.tokens';
	import { gamificationWire } from '@client/state/gamification.wire.svelte';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudMathFormula from '@client/components/atoms/HudMathFormula.svelte';
	import HudHorizontalDeck from '@client/components/molecules/HudHorizontalDeck.svelte';
	import HudSubTabBar from '@client/components/molecules/HudSubTabBar.svelte';
	import HudModalShell from '../HudModalShell.svelte';
	import HudModalHeader from '../HudModalHeader.svelte';
	import HudModalFooter from '../HudModalFooter.svelte';

	interface Props { isOpen: boolean; onClose: () => void; }
	let { isOpen, onClose }: Props = $props();
	let selectedCategory = $state<string>('ALL');
	let selectedCardId = $state<string>(ACHIEVEMENT_CARDS[0]?.id ?? 'card-codemap-1');
	let deckRef = $state<{ stepScroll: (direction: -1 | 1) => void } | null>(null);

	const CATEGORY_TABS = [
		{ id: 'ALL', label: `All (${ACHIEVEMENT_CARDS.length})`, glyph: '★' },
		{ id: CARD_CATEGORIES.CODEMAP_PIONEER, label: 'Codemap', glyph: '↯' },
		{ id: CARD_CATEGORIES.AST_CARTOGRAPHER, label: 'Cartography', glyph: '⊞' },
		{ id: CARD_CATEGORIES.GRAPH_NAVIGATOR, label: 'Navigator', glyph: '⌖' },
		{ id: CARD_CATEGORIES.ARCHITECT_SENTINEL, label: 'Sentinel', glyph: '✎' },
		{ id: CARD_CATEGORIES.MODELING_ARTISAN, label: 'Modeling', glyph: '❖' },
		{ id: CARD_CATEGORIES.GIT_FORGE_OPERATOR, label: 'Git Forge', glyph: '⇣' },
		{ id: CARD_CATEGORIES.CRYPTO_GUARDIAN, label: 'Crypto', glyph: '◈' },
		{ id: CARD_CATEGORIES.SQUAD_COMMANDER, label: 'Squad', glyph: '⬡' },
		{ id: CARD_CATEGORIES.STUDIO_CUSTOMIZER, label: 'Studio', glyph: '◐' },
	];
	const TIER_LIST = [CARD_TIERS.TIER_1_COPPER, CARD_TIERS.TIER_2_SILVER, CARD_TIERS.TIER_3_GOLD, CARD_TIERS.TIER_4_EMERALD, CARD_TIERS.TIER_5_HOLO] as const;

	let filteredCards = $derived(selectedCategory === 'ALL' ? ACHIEVEMENT_CARDS : ACHIEVEMENT_CARDS.filter((c) => c.category === selectedCategory));
	let inspectedCard = $derived(filteredCards.find((c) => c.id === selectedCardId) ?? ACHIEVEMENT_CARDS.find((c) => c.id === selectedCardId) ?? filteredCards[0] ?? ACHIEVEMENT_CARDS[0]!);
	let inspectedRule = $derived(INITIAL_DAG_XP_RULES.find((r) => r.category === inspectedCard.category) ?? INITIAL_DAG_XP_RULES[0]!);
	let inspectedTier = $derived(gamificationWire.cardLevels[inspectedCard.id] ?? 0);
	let inspectedProgress = $derived(gamificationWire.cardProgress[inspectedCard.metricKey] ?? 0);
	let inspectedThreshold = $derived(inspectedCard.tierThresholds[Math.min(4, Math.max(0, inspectedTier))] ?? 5);
	let inspectedPct = $derived(Math.min(100, Math.round((inspectedProgress / Math.max(1, inspectedThreshold)) * 100)));
	let meta = $derived(gamificationWire.levelMeta);
	let percent = $derived(Math.min(100, Math.round(meta.ratio * 100)));

	function getTierConfig(tierLevel: number) { return TIER_LIST[Math.min(5, Math.max(0, tierLevel)) - 1] ?? null; }
	function selectCard(cardId: string): void { selectedCardId = cardId; hudWire.emitUiIntent(HUD_INTENT_KINDS.VAULT_SELECT_CARD, HUD_ZONES.APP_MODAL, { cardId }); }
	function selectCategory(catId: string): void {
		selectedCategory = catId;
		const nextPool = catId === 'ALL' ? ACHIEVEMENT_CARDS : ACHIEVEMENT_CARDS.filter((c) => c.category === catId);
		if (!nextPool.some((c) => c.id === selectedCardId) && nextPool[0]) selectCard(nextPool[0].id);
	}
	function handleKeydown(ev: KeyboardEvent): void {
		if (!isOpen) return;
		const tag = (ev.target as HTMLElement | null)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
		if (ev.key === 'ArrowRight') { ev.preventDefault(); deckRef?.stepScroll(1); }
		else if (ev.key === 'ArrowLeft') { ev.preventDefault(); deckRef?.stepScroll(-1); }
		else if (ev.key >= '1' && ev.key <= '9') { const tab = CATEGORY_TABS[Number(ev.key) - 1]; if (tab) { ev.preventDefault(); selectCategory(tab.id); } }
	}
	onMount(() => { window.addEventListener('keydown', handleKeydown); return () => window.removeEventListener('keydown', handleKeydown); });
</script>

<HudModalShell {isOpen} ariaLabel="Card Vault & Progression Deck" maxWidthClass="max-w-6xl" transitionKey="card-vault-persistent" {onClose}>
	{#snippet header()}
		<HudModalHeader title="Card Vault" subtitle={`CHRONOS CUBIC XP ENGINE · LEVEL ${meta.level} · ${meta.rankTitle.toUpperCase()}`} {onClose}>
			{#snippet tabs()}<HudSubTabBar items={CATEGORY_TABS} activeId={selectedCategory} ariaLabel="Achievement Categories" onSelect={selectCategory} />{/snippet}
		</HudModalHeader>
	{/snippet}

	<div class="flex-1 min-h-0 flex flex-col gap-3 font-mono text-[0.8125rem] leading-[1.55]">
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER} chamferPx={8} chevrons={false} strokeColor="var(--hud-accent-primary)" fillColor="var(--hud-bg)" testid="vault-xp-rank-strip" className="shrink-0" contentClassName="p-3 flex flex-col gap-2">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-2.5">
					<span class="px-2.5 py-0.5 text-xs font-bold bg-[var(--hud-accent-primary)] text-[var(--hud-bg-base)] font-mono">LV {meta.level}</span>
					<strong class="text-sm text-[var(--hud-text)] tracking-wide">{meta.rankTitle}</strong>
				</div>
				<div class="flex items-center gap-3 text-xs">
					<span class="text-[var(--hud-muted)] hidden sm:inline">{meta.currentLevelXp.toLocaleString()} / {meta.xpForNextLevel.toLocaleString()} XP ({percent}%)</span>
					<span class="text-[var(--hud-accent-secondary)] font-bold">{gamificationWire.totalXp.toLocaleString()} XP TOTAL</span>
				</div>
			</div>
			<div class="w-full bg-[var(--hud-surface)] h-2 border border-[var(--hud-border)] overflow-hidden relative">
				<div class="h-full bg-gradient-to-r from-[var(--hud-accent-primary)] to-[var(--hud-accent-secondary)] transition-all duration-300" style="width: {percent}%;"></div>
			</div>
		</HudChamferFrame>

		<HudHorizontalDeck bind:this={deckRef} gridMode={true} testid="achievement-cards-scroll-grid" stepPx={320} className="px-2" trackClassName="grid-rows-2 grid-flow-col auto-cols-[calc((100%-2rem)/3)] gap-4 h-[19.375rem]">
			{#each filteredCards as card (card.id)}
				{@const tier = gamificationWire.cardLevels[card.id] ?? 0} {@const cfg = getTierConfig(tier)} {@const progress = gamificationWire.cardProgress[card.metricKey] ?? 0} {@const threshold = card.tierThresholds[Math.min(4, Math.max(0, tier))] ?? 5} {@const isSelected = selectedCardId === card.id}
				<div role="button" tabindex="0" data-testid={`vault-card-${card.id}`} data-card-selected={isSelected ? 'true' : 'false'} onclick={() => selectCard(card.id)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCard(card.id); } }} class={`snap-start cursor-pointer h-full ${isSelected ? 'ui-vault-card-active' : 'ui-vault-card-idle'}`}>
					<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER} chamferPx={8} chevrons={false} patternOpacity={0} strokeColor={isSelected ? 'var(--hud-accent-primary)' : 'var(--hud-border)'} fillColor="var(--hud-panel)" className="w-full h-full" contentClassName="p-3 h-full flex flex-col justify-between gap-2">
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-start gap-2 min-w-0">
								<span class="text-lg shrink-0 leading-none pt-0.5 text-[var(--hud-accent-primary)]">{card.glyph}</span>
								<div class="min-w-0">
									<div class="text-base font-bold text-[var(--hud-text)] leading-snug">{card.title}</div>
									<span class="text-[0.625rem] text-[var(--hud-muted)] uppercase tracking-wider block">{card.category.replace(/_/g, ' ')}</span>
								</div>
							</div>
							{#if cfg}<span class="text-[0.625rem] font-bold px-1.5 py-0.5 border border-current text-[var(--hud-accent-secondary)] uppercase shrink-0">{cfg.label}</span>
							{:else}<span class="text-[0.625rem] px-1.5 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-accent-primary)] font-semibold whitespace-nowrap shrink-0">TIER I · {progress}/{threshold}</span>{/if}
						</div>
						<p class="text-sm text-[var(--hud-muted)] m-0 leading-[1.55]">{card.description}</p>
						<div class="flex flex-col gap-1 pt-1.5 border-t border-[var(--hud-border)]/60 text-[0.6875rem]">
							<div class="flex items-center justify-between text-[var(--hud-muted)]"><span>Progress · 5-Tier Spec</span><strong class="text-[var(--hud-text)]">{progress} / {threshold}</strong></div>
							<div class="w-full bg-[var(--hud-surface)] h-1.5 overflow-hidden"><div class="h-full bg-[var(--hud-accent-primary)] transition-all duration-300" style="width: {Math.min(100, Math.round((progress / Math.max(1, threshold)) * 100))}%;"></div></div>
						</div>
					</HudChamferFrame>
				</div>
			{/each}
		</HudHorizontalDeck>

		<div data-testid="vault-card-progression-strip" data-selected-card-id={inspectedCard.id} class="shrink-0">
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER} chamferPx={8} chevrons={false} strokeColor="var(--hud-accent-secondary)" fillColor="var(--hud-bg)" className="w-full" contentClassName="p-2.5 flex flex-col gap-1.5 text-xs">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex items-center gap-2 min-w-0">
						<span data-testid="vault-progression-title" class="text-[var(--hud-accent-secondary)] font-bold">{inspectedCard.glyph} {inspectedCard.title}</span>
						<span data-testid="vault-progression-category" class="text-[0.65rem] uppercase text-[var(--hud-muted)]">{inspectedCard.category.replace(/_/g, ' ')}</span>
						<span data-testid="vault-progression-dag-key" class="px-1.5 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[0.65rem] text-[var(--hud-accent-primary)]">DAG Event: {inspectedRule.eventKind} · Metric: {inspectedCard.metricKey}</span>
					</div>
					<div class="flex flex-wrap items-center gap-1.5">
						<span data-testid="vault-progression-count" class="px-2 py-0.5 border border-[var(--hud-accent-primary)]/60 bg-[var(--hud-surface)] text-[0.65rem] text-[var(--hud-accent-primary)] font-bold">{inspectedProgress} / {inspectedThreshold} ({inspectedPct}%)</span>
						{#each TIER_LIST as t, idx (t.level)}<span class="px-2 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-panel)] text-[0.65rem] text-[var(--hud-text)]">{t.label}: <strong>{inspectedCard.tierThresholds[idx]}</strong> (+{t.tierBonusXp} XP)</span>{/each}
					</div>
				</div>
				<div class="w-full bg-[var(--hud-surface)] h-1.5 border border-[var(--hud-border)] overflow-hidden">
					<div data-testid="vault-progression-fill" class="h-full bg-gradient-to-r from-[var(--hud-accent-primary)] to-[var(--hud-accent-secondary)] transition-all duration-200" style="width: {inspectedPct}%;"></div>
				</div>
			</HudChamferFrame>
		</div>
	</div>

	{#snippet footer()}
		<HudModalFooter>
			{#snippet meta()}<span>Chronos Cubic Progression Curve</span><HudMathFormula formula="XP(n)=n^3" displayMode={false} /><span>· 100 Level Architecture Hierarchy · [←/→] Step Carousel</span>{/snippet}
			{#snippet actions()}<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={6} tip="Close Card Vault" onclick={onClose} className="px-3.5 py-1 text-xs">Close Vault</HudChamferButton>{/snippet}
		</HudModalFooter>
	{/snippet}
</HudModalShell>
