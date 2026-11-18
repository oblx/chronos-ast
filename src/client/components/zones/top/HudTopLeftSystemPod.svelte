<!--
	@author Oblx <code@oblx.dev>
	@description Chronos TOP_LEFT System Identity Pod: Brand Crest, Dynamic Version Badge, Single-Letter Grade Crest, Full-Width XP Cartridge, and Workspace Posture.
-->
<script lang="ts">
	import { APP_METADATA } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { HULL_PROFILES, HUD_GLYPHS, HUD_ZONES, ZONE_CORNER_TUPLES } from '@config/hud.tokens';
	import { PRINCIPAL_KINDS } from '@config/security.constants';
	import { type WorkspaceTabDescriptor, computeWorkspaceHealthGrade, gamificationWire, hudWire, securityWire } from '@client/state';
	import HexReticle from '@client/components/atoms/HexReticle.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudIcon from '@client/components/atoms/HudIcon.svelte';
	import { UI_SPOTLIGHT_TARGETS, uiSpotlight } from '@ui';

	interface Props {
		tabs: readonly WorkspaceTabDescriptor[];
		activeTabId: string;
		entityCount: number;
		blockerCount: number;
		criticalCount: number;
		warningCount: number;
		isAnalyzing: boolean;
	}

	let { tabs, activeTabId, entityCount, blockerCount, criticalCount, warningCount, isAnalyzing }: Props = $props();

	let health = $derived(computeWorkspaceHealthGrade(blockerCount * 2 + criticalCount + Math.ceil(warningCount / 2), entityCount));
	let gradeLetter = $derived((health.grade || '—').charAt(0));
	let xpPercent = $derived(Math.min(100, Math.round(gamificationWire.levelMeta.ratio * 100)));
	let healthToneClass = $derived(
		health.grade === 'A' || health.grade === 'B'
			? 'border-[var(--hud-nominal)]/80 text-[var(--hud-nominal)] bg-[var(--hud-nominal)]/12'
			: health.grade === 'C' || health.grade === 'D'
				? 'border-[var(--hud-warning)]/80 text-[var(--hud-warning)] bg-[var(--hud-warning)]/12'
				: 'border-[var(--hud-danger)]/80 text-[var(--hud-danger)] bg-[var(--hud-danger)]/12'
	);
	let activeTab = $derived(tabs.find((t) => t.id === activeTabId) ?? tabs[0]);
	let isGuest = $derived(securityWire.principalKind === PRINCIPAL_KINDS.GUEST);
</script>

<HudChamferFrame
	profile={HULL_PROFILES.CHAMFER_OCTAGON}
	corners={ZONE_CORNER_TUPLES.TOP_LEFT}
	chamferPx={10}
	chevrons={true}
	chevronSide="right"
	dataHelpTarget="WORKSPACE_TABS"
	dataHudZone={HUD_ZONES.TOP_LEFT}
	inert={hudWire.isZoneFolded(HUD_ZONES.TOP_LEFT)}
	style={hudWire.zoneStyle(HUD_ZONES.TOP_LEFT)}
	className={`${hudWire.isZoneFolded(HUD_ZONES.TOP_LEFT) ? 'pointer-events-none' : 'pointer-events-auto'} hud-zone-transition hud-track-w hud-top-band-h px-4 py-2 shrink-0`}
>
	<div use:uiSpotlight={UI_SPOTLIGHT_TARGETS.TOP_LEFT_IDENTITY} class="h-full flex flex-col justify-between gap-1">
		<div class="flex items-center justify-between gap-1.5 flex-nowrap min-w-0">
			<div data-testid="top-left-brand-cluster" class="flex items-center gap-1.5 min-w-0">
				<HexReticle state={isAnalyzing ? 'SCANNING' : activeTab ? 'ACTIVE' : 'WARNING'} size={15} />
				<span data-testid="top-left-brand-title" class="font-display text-lg leading-none font-bold tracking-wide text-[var(--hud-text)] whitespace-nowrap">Chronos</span>
				<span data-testid="top-left-version-badge" class="px-1 py-0.5 border border-[var(--hud-border)] font-mono text-[0.625rem] leading-3 text-[var(--hud-accent-primary)] whitespace-nowrap shrink-0">v{APP_METADATA.VERSION}</span>
			</div>
			<div class="flex items-center gap-1.5 shrink-0">
				{#if isGuest}
					<HudChamferButton corners={ZONE_CORNER_TUPLES.RADAR_TOP_RIGHT} cutPx={5} variant="accent" testid="mobile-unlock-studio-cta" onclick={() => hudWire.openModal(HUD_MODALS.AUTH_LOBBY)} className="md:hidden h-6 px-2 font-mono text-[0.625rem]">
						Sign In
					</HudChamferButton>
				{/if}
				<button type="button" data-testid="compact-menu-trigger-mobile" onclick={() => hudWire.toggleCompactMenu()} aria-label="Open Navigation Menu" data-hud-tip="Open Navigation Menu" class="md:hidden w-6 h-6 flex items-center justify-center border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] cursor-pointer">
					<HudIcon name="layers" className="text-xs" />
				</button>
				<span
					data-testid="top-left-grade-crest"
					data-hud-tip={`Workspace Health Grade ${health.grade} (${blockerCount} Blocker · ${criticalCount} Critical · ${warningCount} Warning)`}
					class={`inline-flex items-center justify-center w-6 h-6 border font-mono text-xs font-bold shrink-0 ${healthToneClass}`}
					style="clip-path: polygon(22% 0, 100% 0, 100% 78%, 78% 100%, 0 100%, 0 22%);"
				>{gradeLetter}</span>
			</div>
		</div>

		<HudChamferButton corners={ZONE_CORNER_TUPLES.RADAR_BOTTOM_LEFT} cutPx={5} testid="hud-gamification-level-badge" onclick={() => hudWire.openModal(HUD_MODALS.ACHIEVEMENT_VAULT)} tip={`Open Card Vault (${gamificationWire.levelMeta.rankTitle})`} tipKey="A" className="w-full h-6 px-2 font-mono text-[0.625rem] leading-4">
			<div class="w-full flex items-center justify-between gap-2 min-w-0">
				<span class="inline-flex items-center gap-1 text-[var(--hud-accent-primary)] font-bold shrink-0">{HUD_GLYPHS.BRAND_CREST} LV {gamificationWire.levelMeta.level}</span>
				<span class="flex-1 min-w-0 flex items-center gap-1.5">
					<span class="flex-1 h-1.5 bg-[var(--hud-bg)] border border-[var(--hud-border)] overflow-hidden">
						<span class="block h-full bg-gradient-to-r from-[var(--hud-accent-primary)] to-[var(--hud-accent-secondary)]" style={`width: ${xpPercent}%`}></span>
					</span>
					<span class="text-[0.5625rem] text-[var(--hud-muted)] tabular-nums shrink-0">{gamificationWire.levelMeta.currentLevelXp}/{gamificationWire.levelMeta.xpForNextLevel} XP</span>
				</span>
			</div>
		</HudChamferButton>

		<div class="flex items-center justify-between gap-2 font-mono text-[0.5625rem] leading-3 text-[var(--hud-muted)] uppercase tabular-nums min-w-0">
			<span class="truncate text-[var(--hud-accent-secondary)]">{activeTab?.shortCode ?? 'CHR-CORE'} · {entityCount}E</span>
			<span class="shrink-0">LOCAL WAL · 60 FPS</span>
		</div>
	</div>
</HudChamferFrame>
