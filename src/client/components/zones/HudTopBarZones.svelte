<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.1 Top Perimeter Zones: Identity Pod (TOP_LEFT with parallel chamfered badges), 8-Slot Crown (TOP_CENTER), and Visor (TOP_RIGHT).
-->
<script lang="ts">
	import { Sun, Moon, Settings, HelpCircle, ShieldCheck, Menu, Activity } from 'lucide-svelte';
	import { GRAPH_ENGINES, GRAPH_PROJECTIONS, HUD_VIEWS, type GraphEngineMode, type GraphProjectionMode, type HudViewMode } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { CHAMFER_PROFILES, HULL_PROFILES, HUD_GLYPHS, HUD_THEME_PRESETS, HUD_ZONES } from '@config/hud.tokens';
	import { CAPABILITY_BITS, PRINCIPAL_KINDS, SYNC_POSTURES } from '@config/security.constants';
	import { type GraphEntityNode, type WorkspaceTabDescriptor, clientDagKernel, computeWorkspaceHealthGrade, gamificationWire, hudWire, securityWire, wsClient } from '@client/state';
	import HexReticle from '@client/components/atoms/HexReticle.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';

	interface Props {
		tabs: readonly WorkspaceTabDescriptor[]; activeTabId: string; activeEntity: GraphEntityNode | undefined; indexedFilesCount: number; entityCount: number; blockerCount: number; criticalCount: number; warningCount: number;
		isAnalyzing: boolean; graphEngine: GraphEngineMode; activeGraphProjection?: GraphProjectionMode; onToggleEngine: () => void; onReindexWorkspace: () => Promise<void>; onSelectGraphProjection?: (mode: GraphProjectionMode) => void;
	}
	let { tabs, activeTabId, activeEntity, indexedFilesCount, entityCount, blockerCount, criticalCount, warningCount, isAnalyzing, graphEngine, activeGraphProjection = GRAPH_PROJECTIONS.BUTTERFLY, onToggleEngine, onReindexWorkspace, onSelectGraphProjection }: Props = $props();
	interface CrownSlot { readonly id: string; readonly mode: HudViewMode; readonly graphProj?: GraphProjectionMode; readonly label: string; readonly shortLabel: string; readonly glyph: string; }

	const CROWN_SLOTS: readonly CrownSlot[] = [
		{ id: 'CODEMAP', mode: HUD_VIEWS.CODEMAP, graphProj: GRAPH_PROJECTIONS.CODEMAP, label: 'Codemap', shortLabel: 'Map', glyph: '⚡' },
		{ id: 'BUTTERFLY', mode: HUD_VIEWS.BUTTERFLY, graphProj: GRAPH_PROJECTIONS.BUTTERFLY, label: 'Butterfly', shortLabel: 'Bfly', glyph: '⌖' },
		{ id: 'DFG', mode: HUD_VIEWS.DATA_FLOW, label: 'DFG', shortLabel: 'DFG', glyph: '⟡' },
		{ id: 'CFG', mode: HUD_VIEWS.CONTROL_FLOW, label: 'CFG', shortLabel: 'CFG', glyph: '⑂' },
		{ id: 'TREEMAP', mode: HUD_VIEWS.TREEMAP, label: 'Treemap', shortLabel: 'Tree', glyph: '⊞' },
		{ id: 'DSM', mode: HUD_VIEWS.DSM, label: 'DSM', shortLabel: 'DSM', glyph: '▦' },
		{ id: 'UML', mode: HUD_VIEWS.UML_CLASS, graphProj: GRAPH_PROJECTIONS.UML_CLASS, label: 'UML', shortLabel: 'UML', glyph: '◈' },
		{ id: 'MERMAID', mode: HUD_VIEWS.MERMAID, graphProj: GRAPH_PROJECTIONS.MERMAID, label: 'Mermaid', shortLabel: 'Mmd', glyph: '❖' },
		{ id: 'SOURCE', mode: HUD_VIEWS.INSPECTOR, label: 'Source', shortLabel: 'Src', glyph: '⌥' },
	];

	let health = $derived(computeWorkspaceHealthGrade(blockerCount * 2 + criticalCount + Math.ceil(warningCount / 2), entityCount));
	let xpPercent = $derived(Math.min(100, Math.round(gamificationWire.levelMeta.ratio * 100)));
	let healthToneClass = $derived(health.grade === 'A' || health.grade === 'B' ? 'border-[var(--hud-nominal)]/70 text-[var(--hud-nominal)]' : health.grade === 'C' || health.grade === 'D' ? 'border-[var(--hud-warning)]/70 text-[var(--hud-warning)]' : 'border-[var(--hud-danger)]/70 text-[var(--hud-danger)]');
	let activeTab = $derived(tabs.find((t) => t.id === activeTabId) ?? tabs[0]);
	let activeTheme = $derived(HUD_THEME_PRESETS[hudWire.activeThemeId]);
	let isDark = $derived(activeTheme.polarity === 'DARK');
	let isGuest = $derived(securityWire.principalKind === PRINCIPAL_KINDS.GUEST);
	let canIndexLocal = $derived(securityWire.can(CAPABILITY_BITS.WORKSPACE_INDEX_LOCAL));
	let canObserveWire = $derived(securityWire.can(CAPABILITY_BITS.ADMIN_WIRE_OBSERVE));
	let ledColor = $derived(securityWire.syncPosture === SYNC_POSTURES.REPLAY_ALERT || !securityWire.auditChainValid ? 'bg-[var(--hud-danger)]' : securityWire.lockdownActive || isGuest ? 'bg-[var(--hud-warning)]' : 'bg-[var(--hud-nominal)]');

	function isSlotActive(slot: CrownSlot): boolean {
		const isUml = hudWire.activeView === HUD_VIEWS.UML_CLASS || hudWire.activeView === HUD_VIEWS.UML_SEQUENCE || hudWire.activeView === HUD_VIEWS.SHARED_OBJECTS || (hudWire.activeView === HUD_VIEWS.BUTTERFLY && activeGraphProjection !== GRAPH_PROJECTIONS.BUTTERFLY && activeGraphProjection !== GRAPH_PROJECTIONS.MERMAID && activeGraphProjection !== GRAPH_PROJECTIONS.CODEMAP);
		if (slot.id === 'UML') return isUml;
		if (slot.id === 'BUTTERFLY') return hudWire.activeView === HUD_VIEWS.BUTTERFLY && !isUml;
		return hudWire.activeView === slot.mode;
	}
	function activateSlot(slot: CrownSlot): void { if (slot.graphProj) onSelectGraphProjection?.(slot.graphProj); hudWire.selectView(slot.mode); }
	function openWireObservatory(): void { void clientDagKernel.fetchServerWireHistory(); hudWire.openModal(HUD_MODALS.WIRE_OBSERVATORY); }
</script>

<header class="fixed top-3 inset-x-3 z-20 flex items-start justify-between gap-2 pointer-events-none select-none hud-uwqhd-corridor">
	<HudChamferFrame profile={HULL_PROFILES.CHAMFER_CORNER_POD} chevrons={true} dataHelpTarget="WORKSPACE_TABS" dataHudZone={HUD_ZONES.TOP_LEFT} inert={hudWire.isZoneFolded(HUD_ZONES.TOP_LEFT)} style={hudWire.zoneStyle(HUD_ZONES.TOP_LEFT)} className={`${hudWire.isZoneFolded(HUD_ZONES.TOP_LEFT) ? 'pointer-events-none' : 'pointer-events-auto'} hud-zone-transition hud-track-w h-16 px-3 py-1.5 shrink-0`}>
		<div class="h-full flex flex-col justify-between gap-1">
			<div class="flex items-center justify-between gap-1.5 flex-nowrap min-w-0">
				<div class="flex items-center gap-1 min-w-0 shrink-0">
					<HexReticle state={isAnalyzing ? 'SCANNING' : activeTab ? 'ACTIVE' : 'WARNING'} size={14} />
					<span class="font-display text-sm font-bold tracking-wide text-[var(--hud-text)] whitespace-nowrap">{HUD_GLYPHS.BRAND_CREST} Chronos</span>
				</div>
				<div class="flex items-center gap-1 shrink-0 min-w-0">
					{#if isGuest}
						<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={6} variant="accent" testid="unlock-studio-cta" onclick={() => hudWire.openModal(HUD_MODALS.AUTH_LOBBY)} className="px-2.5 py-0.5 font-mono text-[11px] leading-4">
							<span class={`w-1.5 h-1.5 rounded-full shrink-0 hud-led-pulse ${ledColor}`}></span>Sign In
						</HudChamferButton>
					{:else}
						<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={6} variant="nominal" tip={`Operator Lobby (${securityWire.roleId} · ${securityWire.maskHex()} · ${securityWire.syncPosture})`} testid="principal-mask-badge" onclick={() => hudWire.openModal(HUD_MODALS.AUTH_LOBBY)} className="px-2 py-0.5 font-mono text-[11px] leading-4 max-w-[168px]">
							<ShieldCheck size={11} class="shrink-0 text-[var(--hud-nominal)]" />
							<span class="truncate">OP // {securityWire.username}</span>
						</HudChamferButton>
					{/if}
					<button type="button" data-testid="compact-menu-trigger-mobile" onclick={() => hudWire.toggleCompactMenu()} aria-label="Open Navigation Menu" data-hud-tip="Open Navigation Menu" class="md:hidden w-6 h-6 flex items-center justify-center border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] cursor-pointer"><Menu size={12} /></button>
				</div>
			</div>
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT} cutPx={5} testid="hud-gamification-level-badge" onclick={() => hudWire.openModal(HUD_MODALS.ACHIEVEMENT_VAULT)} tip={`Open Card Vault (${gamificationWire.levelMeta.rankTitle})`} tipKey="A" className="w-full h-6 px-2 font-mono text-[10px] leading-4">
				<div class="w-full flex items-center justify-between gap-2 min-w-0">
					<span class="inline-flex items-center gap-1 text-[var(--hud-accent-primary)] font-bold shrink-0">{HUD_GLYPHS.BRAND_CREST} LV {gamificationWire.levelMeta.level}</span>
					<span class="flex-1 min-w-0 flex items-center gap-1.5">
						<span class="flex-1 h-1.5 bg-[var(--hud-bg)] border border-[var(--hud-border)] overflow-hidden">
							<span class="block h-full bg-gradient-to-r from-[var(--hud-accent-primary)] to-[var(--hud-accent-secondary)]" style={`width: ${xpPercent}%`}></span>
						</span>
						<span class="text-[9px] text-[var(--hud-muted)] tabular-nums shrink-0">{gamificationWire.levelMeta.currentLevelXp}/{gamificationWire.levelMeta.xpForNextLevel} XP</span>
					</span>
					<span class={`px-1 border text-[9px] font-bold whitespace-nowrap shrink-0 ${healthToneClass}`}>GRADE {health.grade}</span>
				</div>
			</HudChamferButton>
		</div>
	</HudChamferFrame>

	<div data-hud-zone={HUD_ZONES.TOP_CENTER} inert={hudWire.isZoneFolded(HUD_ZONES.TOP_CENTER)} style={hudWire.zoneStyle(HUD_ZONES.TOP_CENTER)} class={`${hudWire.isZoneFolded(HUD_ZONES.TOP_CENTER) ? 'pointer-events-none' : 'pointer-events-auto'} hud-zone-transition hud-top-crown-locked hud-center-corridor-w hidden lg:flex items-center justify-center min-w-0`}>
		<HudChamferFrame profile={HULL_PROFILES.WING_CREST} chevrons={true} dataHelpTarget="HEADER_NAV" className="w-full h-10 px-3 xl:px-4">
			<nav aria-label="World Projections Crest" class="h-full flex items-center justify-center gap-1 xl:gap-1.5 flex-nowrap">
				{#each CROWN_SLOTS as slot (slot.id)}
					{@const active = isSlotActive(slot)}
					<button type="button" data-testid={`crown-slot-${slot.id.toLowerCase()}`} onclick={() => activateSlot(slot)} class={`px-1.5 xl:px-2 py-0.5 font-mono text-xs leading-4 whitespace-nowrap cursor-pointer hud-hover-lift ${active ? 'text-[var(--hud-accent-secondary)] border-b-2 border-[var(--hud-accent-secondary)] font-bold bg-[var(--hud-surface)]/65' : 'text-[var(--hud-muted)] hover:text-[var(--hud-text)]'}`}>
						<span class="opacity-80 mr-0.5">{slot.glyph}</span><span class="hidden xl:inline">{slot.label}</span><span class="xl:hidden">{slot.shortLabel}</span>
					</button>
				{/each}
				{#if activeEntity && !isGuest}<span class="hidden 2xl:inline ml-1 pl-2 border-l border-[var(--hud-border)] font-mono text-[11px] leading-4 text-[var(--hud-accent-secondary)] truncate max-w-[116px]" data-hud-tip={activeEntity.qualifiedName}>{HUD_GLYPHS.FOCAL_RETICLE} {activeEntity.name}</span>{/if}
			</nav>
		</HudChamferFrame>
	</div>
	<HudChamferFrame profile={HULL_PROFILES.CHAMFER_CORNER_POD} chevrons={true} dataHelpTarget="BREADCRUMB_RADAR" dataHudZone={HUD_ZONES.TOP_RIGHT} inert={hudWire.isZoneFolded(HUD_ZONES.TOP_RIGHT)} style={hudWire.zoneStyle(HUD_ZONES.TOP_RIGHT)} className={`${hudWire.isZoneFolded(HUD_ZONES.TOP_RIGHT) ? 'pointer-events-none' : 'pointer-events-auto'} hud-zone-transition hud-track-w h-16 px-3 py-2 font-mono text-[11px] leading-4 shrink-0 hidden md:block`}>
		<div class="h-full flex flex-col justify-between gap-1">
			<div class="flex items-center justify-between gap-1.5 flex-nowrap min-w-0">
				<div class="flex items-center gap-1 min-w-0 flex-nowrap">
					<button type="button" data-testid="ws-presence-badge" onclick={() => hudWire.openModal(HUD_MODALS.COLLAB_SOCIAL)} class="px-1.5 py-0.5 border border-[var(--hud-accent-primary)]/50 text-[10px] leading-3 uppercase text-[var(--hud-accent-primary)] tabular-nums whitespace-nowrap shrink-0 cursor-pointer" data-hud-tip="Open Social Hub & Collaborators">{isGuest ? `WS ${wsClient.connectedCount} · SANDBOX` : wsClient.clusterId ? `${wsClient.seatCount}/${wsClient.seatCap}` : `WS ${wsClient.connectedCount}`}</button>
					{#if !isGuest}
						<span data-testid="sync-queue-badge" class="px-1 py-0.5 border border-[var(--hud-border)] text-[10px] leading-3 text-[var(--hud-nominal)] tabular-nums whitespace-nowrap shrink-0" data-hud-tip="Queued HLC Sync Operations">SYNC {securityWire.queuedOpsCount}</span>
						<button type="button" onclick={onToggleEngine} data-hud-tip="Toggle Graph Engine (SQLite / Memgraph)" class="px-1 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[10px] leading-3 text-[var(--hud-accent-primary)] cursor-pointer hud-hover-lift shrink-0">{graphEngine === GRAPH_ENGINES.SQLITE_LOCAL ? 'SQLITE' : 'MAGE'}</button>
					{/if}
				</div>
				<div class="flex items-center gap-1 shrink-0">
					{#if canObserveWire}<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="accent" testid="top-wire-tap-btn" tip="Wire Observatory" ariaLabel="Wire Observatory" onclick={openWireObservatory} className="w-6 h-6"><Activity size={12} /></HudChamferButton>{/if}
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="brass" tip={`Switch Polarity (${activeTheme.label})`} ariaLabel={`Switch Polarity (${activeTheme.label})`} onclick={() => hudWire.randomizePolarityTheme()} className="w-6 h-6">{#if isDark}<Sun size={12} />{:else}<Moon size={12} />{/if}</HudChamferButton>
					<HudChamferButton chamferCorner={isGuest ? CHAMFER_PROFILES.CORNER_TOP_RIGHT : CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="accent" tip="Open Architect's Field Tome" tipKey="?" ariaLabel="Open Architect's Field Tome" onclick={() => hudWire.openModal(HUD_MODALS.SSOT_HELP_BOOK)} className="w-6 h-6"><HelpCircle size={12} /></HudChamferButton>
					{#if !isGuest}<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={5} variant="default" tip="HUD & Engine Settings" tipKey="," ariaLabel="HUD & Engine Settings" onclick={() => hudWire.openModal(HUD_MODALS.SETTINGS)} className="w-6 h-6"><Settings size={12} /></HudChamferButton>{/if}
					<button type="button" data-testid="compact-menu-trigger-tablet" onclick={() => hudWire.toggleCompactMenu()} data-hud-tip="Compact Navigation Drawer" aria-label="Compact Navigation Drawer" class="lg:hidden w-6 h-6 flex items-center justify-center border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-text)] cursor-pointer"><Menu size={12} /></button>
				</div>
			</div>
			<div class="flex items-center justify-between gap-1 flex-nowrap min-w-0">
				<div class="flex items-center gap-1 shrink-0">
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT} cutPx={5} variant="brass" tip="Stations Directory" tipKey="S" onclick={() => hudWire.openModal(HUD_MODALS.STATIONS_LAUNCHER)} className="h-5 px-1.5 text-[10px]">Stations</HudChamferButton>
					{#if !isGuest && canIndexLocal}<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="accent" disabled={isAnalyzing} tip="Re-index Active Workspace" onclick={() => void onReindexWorkspace()} className="h-5 px-1.5 text-[10px]">{isAnalyzing ? 'Scan...' : 'Index'}</HudChamferButton>{/if}
				</div>
				<div class="flex items-center gap-1 min-w-0 truncate">
					<div data-testid="codecheck-visor" class="flex items-center gap-1 shrink-0" data-hud-tip={`CodeCheck Matrix: ${blockerCount} Blocker, ${criticalCount} Critical, ${warningCount} Warnings`}>
						<div class="grid grid-cols-3 gap-0.5 shrink-0" aria-hidden="true">
							<span class={`w-1.5 h-1.5 ${blockerCount > 0 ? 'bg-[var(--hud-danger)]' : 'bg-[var(--hud-border)]'}`}></span>
							<span class={`w-1.5 h-1.5 ${criticalCount > 0 ? 'bg-[var(--hud-warning)]' : 'bg-[var(--hud-border)]'}`}></span>
							<span class={`w-1.5 h-1.5 ${warningCount > 0 ? 'bg-[var(--hud-accent-secondary)]' : 'bg-[var(--hud-nominal)]'}`}></span>
						</div>
						<span class="tabular-nums text-[10px] text-[var(--hud-text)]">{blockerCount}/{criticalCount}/{warningCount}</span>
					</div>
					<span class="text-[10px] text-[var(--hud-muted)] tabular-nums truncate" data-hud-tip={`Scope ${indexedFilesCount} files · ${entityCount} symbols · Shield ${securityWire.syncPosture}`}>{indexedFilesCount}F · {isGuest ? 'SHIELD' : securityWire.syncPosture}</span>
				</div>
			</div>
		</div>
	</HudChamferFrame>
</header>
