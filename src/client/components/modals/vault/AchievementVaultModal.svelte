<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.3 Card Vault: Horizontal Bento Card Deck, Semantic Polarity Surfaces, 16px Untruncated Titles & Native MathML XP Curve.
-->
<script lang="ts">
	import { ACHIEVEMENT_CARDS, CARD_CATEGORIES, CARD_TIERS } from '@config/gamification/gamification.registry';
	import { CHAMFER_PROFILES } from '@config/hud.tokens';
	import { gamificationWire } from '@client/state/gamification.wire.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudMathFormula from '@client/components/atoms/HudMathFormula.svelte';
	import HudHorizontalDeck from '@client/components/molecules/HudHorizontalDeck.svelte';
	import HudSubTabBar from '@client/components/molecules/HudSubTabBar.svelte';
	import HudModalShell from '../HudModalShell.svelte';
	import HudModalHeader from '../HudModalHeader.svelte';
	import HudModalFooter from '../HudModalFooter.svelte';

	interface Props { isOpen: boolean; onClose: () => void; }
	let { isOpen, onClose }: Props = $props();
	let selectedCategory = $state<string>('ALL');

	const CATEGORY_TABS = [
		{ id: 'ALL', label: `All (${ACHIEVEMENT_CARDS.length})`, glyph: '★' },
		{ id: CARD_CATEGORIES.CODEMAP_PIONEER, label: 'Codemap', glyph: '⚡' },
		{ id: CARD_CATEGORIES.AST_CARTOGRAPHER, label: 'Cartography', glyph: '⊞' },
		{ id: CARD_CATEGORIES.GRAPH_NAVIGATOR, label: 'Navigator', glyph: '⌖' },
		{ id: CARD_CATEGORIES.ARCHITECT_SENTINEL, label: 'Sentinel', glyph: '✎' },
		{ id: CARD_CATEGORIES.MODELING_ARTISAN, label: 'Modeling', glyph: '❖' },
		{ id: CARD_CATEGORIES.GIT_FORGE_OPERATOR, label: 'Git Forge', glyph: '⇣' },
		{ id: CARD_CATEGORIES.CRYPTO_GUARDIAN, label: 'Crypto', glyph: '◈' },
		{ id: CARD_CATEGORIES.SQUAD_COMMANDER, label: 'Squad', glyph: '⬡' },
		{ id: CARD_CATEGORIES.STUDIO_CUSTOMIZER, label: 'Studio', glyph: '🎨' },
	];

	let filteredCards = $derived(selectedCategory === 'ALL' ? ACHIEVEMENT_CARDS : ACHIEVEMENT_CARDS.filter((c) => c.category === selectedCategory));
	let meta = $derived(gamificationWire.levelMeta);
	let percent = $derived(Math.min(100, Math.round(meta.ratio * 100)));

	function getTierConfig(tierLevel: number) {
		if (tierLevel >= 5) return CARD_TIERS.TIER_5_HOLO;
		if (tierLevel === 4) return CARD_TIERS.TIER_4_EMERALD;
		if (tierLevel === 3) return CARD_TIERS.TIER_3_GOLD;
		if (tierLevel === 2) return CARD_TIERS.TIER_2_SILVER;
		if (tierLevel === 1) return CARD_TIERS.TIER_1_COPPER;
		return null;
	}
</script>

<HudModalShell {isOpen} ariaLabel="Card Vault & Progression Deck" maxWidthClass="max-w-6xl" {onClose}>
	{#snippet header()}
		<HudModalHeader title="Card Vault" subtitle={`CHRONOS CUBIC XP ENGINE · LEVEL ${meta.level} · ${meta.rankTitle.toUpperCase()}`} {onClose}>
			{#snippet tabs()}<HudSubTabBar items={CATEGORY_TABS} activeId={selectedCategory} ariaLabel="Achievement Categories" onSelect={(id) => (selectedCategory = id)} />{/snippet}
		</HudModalHeader>
	{/snippet}

	<div class="flex-1 min-h-0 flex flex-col gap-3 font-mono text-[13px] leading-relaxed">
		<div class="p-3 border border-[var(--hud-accent-primary)]/60 bg-[var(--hud-bg)] flex flex-col gap-2 shrink-0">
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
		</div>

		<HudHorizontalDeck
			gridMode={true}
			testid="achievement-cards-scroll-grid"
			stepPx={320}
			className="px-2"
			trackClassName="grid-rows-2 grid-flow-col auto-cols-[calc((100%-32px)/3)] gap-4 h-[310px]"
		>
			{#each filteredCards as card (card.id)}
				{@const tier = gamificationWire.cardLevels[card.id] ?? 0}
				{@const cfg = getTierConfig(tier)}
				{@const progress = gamificationWire.cardProgress[card.metricKey] ?? 0}
				{@const threshold = card.tierThresholds[Math.min(4, Math.max(0, tier))] ?? 5}
				<div class={`snap-start p-3 border flex flex-col justify-between gap-2 bg-[var(--hud-panel)] transition-all ${cfg ? cfg.borderStyle : 'border-[var(--hud-border)]'} ${tier === 5 ? 'shadow-[0_0_15px_rgba(139,92,246,0.35)]' : ''}`}>
					<div class="flex items-start justify-between gap-2">
						<div class="flex items-start gap-2 min-w-0">
							<span class="text-lg shrink-0 leading-none pt-0.5">{card.glyph}</span>
							<div class="min-w-0">
								<div class="text-base font-bold text-[var(--hud-text)] leading-snug">{card.title}</div>
								<span class="text-[10px] text-[var(--hud-muted)] uppercase tracking-wider block">{card.category.replace(/_/g, ' ')}</span>
							</div>
						</div>
						{#if cfg}
							<span class="text-[10px] font-bold px-1.5 py-0.5 border border-current text-[var(--hud-accent-secondary)] uppercase shrink-0">{cfg.label}</span>
						{:else}
							<span class="text-[10px] px-1.5 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-accent-primary)] font-semibold whitespace-nowrap shrink-0">TIER I · {progress}/{threshold}</span>
						{/if}
					</div>
					<p class="text-xs text-[var(--hud-muted)] m-0 leading-snug">{card.description}</p>
					<div class="flex flex-col gap-1 pt-1.5 border-t border-[var(--hud-border)]/60 text-[11px]">
						<div class="flex items-center justify-between text-[var(--hud-muted)]">
							<span>Progress</span>
							<strong class="text-[var(--hud-text)]">{progress} / {threshold}</strong>
						</div>
						<div class="w-full bg-[var(--hud-surface)] h-1.5 overflow-hidden">
							<div class="h-full bg-[var(--hud-accent-primary)] transition-all duration-300" style="width: {Math.min(100, Math.round((progress / Math.max(1, threshold)) * 100))}%;"></div>
						</div>
					</div>
				</div>
			{/each}
		</HudHorizontalDeck>
	</div>

	{#snippet footer()}
		<HudModalFooter>
			{#snippet meta()}
				<span>Chronos Cubic Progression Curve</span>
				<HudMathFormula formula="XP(n)=n^3" displayMode={false} />
				<span>· 100 Level Architecture Hierarchy</span>
			{/snippet}
			{#snippet actions()}<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={6} tip="Close Card Vault" onclick={onClose} className="px-3.5 py-1 text-xs">Close Vault</HudChamferButton>{/snippet}
		</HudModalFooter>
	{/snippet}
</HudModalShell>
