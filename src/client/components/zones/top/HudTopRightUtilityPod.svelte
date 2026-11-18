<!--
	@author Oblx <code@oblx.dev>
	@description Chronos TOP_RIGHT Utility Visor: Presence/Sync/Engine Telemetry, 5 Off-When-Idle 2rem Vector Triggers, Glitter Contextual Help, Stations/CodeCheck, and Privacy Posture.
-->
<script lang="ts">
	import { GRAPH_ENGINES, type GraphEngineMode } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { CHAMFER_PROFILES, HULL_PROFILES, HUD_THEME_PRESETS, HUD_ZONES, ZONE_CORNER_TUPLES } from '@config/hud.tokens';
	import { CAPABILITY_BITS, PRINCIPAL_KINDS, SYNC_POSTURES } from '@config/security.constants';
	import { clientDagKernel, helpContext, hudWire, securityWire, wsClient } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudIcon from '@client/components/atoms/HudIcon.svelte';
	import { UiUtilityIconButton } from '@ui';

	interface Props {
		indexedFilesCount: number;
		entityCount: number;
		blockerCount: number;
		criticalCount: number;
		warningCount: number;
		isAnalyzing: boolean;
		graphEngine: GraphEngineMode;
		onToggleEngine: () => void;
		onReindexWorkspace: () => Promise<void>;
	}

	let { indexedFilesCount, entityCount, blockerCount, criticalCount, warningCount, isAnalyzing, graphEngine, onToggleEngine, onReindexWorkspace }: Props = $props();

	let activeTheme = $derived(HUD_THEME_PRESETS[hudWire.activeThemeId]);
	let isDark = $derived(activeTheme.polarity === 'DARK');
	let isGuest = $derived(securityWire.principalKind === PRINCIPAL_KINDS.GUEST);
	let canIndexLocal = $derived(securityWire.can(CAPABILITY_BITS.WORKSPACE_INDEX_LOCAL));
	let canObserveWire = $derived(securityWire.can(CAPABILITY_BITS.ADMIN_WIRE_OBSERVE));
	let presenceLabel = $derived(isGuest ? `WS ${wsClient.connectedCount}` : wsClient.clusterId ? `${wsClient.seatCount}/${wsClient.seatCap}` : `WS ${wsClient.connectedCount}`);
	let privacyToneClass = $derived(
		securityWire.syncPosture === SYNC_POSTURES.REPLAY_ALERT || !securityWire.auditChainValid
			? 'text-[var(--hud-danger)]'
			: securityWire.lockdownActive
				? 'text-[var(--hud-warning)]'
				: 'text-[var(--hud-nominal)]'
	);

	function openWireObservatory(): void { void clientDagKernel.fetchServerWireHistory(); hudWire.openModal(HUD_MODALS.WIRE_OBSERVATORY); }
	function openForensicShield(): void { hudWire.setRightDrawerTab('FORENSIC', true); }
</script>

<HudChamferFrame
	profile={HULL_PROFILES.CHAMFER_OCTAGON}
	corners={ZONE_CORNER_TUPLES.TOP_RIGHT}
	chamferPx={10}
	chevrons={true}
	chevronSide="left"
	dataHelpTarget="BREADCRUMB_RADAR"
	dataHudZone={HUD_ZONES.TOP_RIGHT}
	inert={hudWire.isZoneFolded(HUD_ZONES.TOP_RIGHT)}
	style={hudWire.zoneStyle(HUD_ZONES.TOP_RIGHT)}
	className={`${hudWire.isZoneFolded(HUD_ZONES.TOP_RIGHT) ? 'pointer-events-none' : 'pointer-events-auto'} hud-zone-transition hud-track-w hud-top-band-h px-3.5 py-2 font-mono text-[0.6875rem] leading-4 shrink-0 hidden md:block`}
>
	<div class="h-full flex flex-col justify-between gap-1">
		<div class="flex items-center justify-between gap-1 flex-nowrap min-w-0">
			<div class="flex items-center gap-1 min-w-0 flex-nowrap overflow-hidden">
				<button type="button" data-testid="ws-presence-badge" onclick={() => hudWire.openModal(HUD_MODALS.COLLAB_SOCIAL)} class="px-1.5 py-0.5 border border-[var(--hud-accent-primary)]/50 text-[0.625rem] leading-3 uppercase text-[var(--hud-accent-primary)] tabular-nums whitespace-nowrap shrink-0 cursor-pointer" data-hud-tip="Open Social Hub & Collaborators">{presenceLabel}</button>
				{#if !isGuest}
					<span data-testid="sync-queue-badge" class="hidden xl:inline-flex px-1 py-0.5 border border-[var(--hud-border)] text-[0.625rem] leading-3 text-[var(--hud-nominal)] tabular-nums whitespace-nowrap shrink-0" data-hud-tip="Queued HLC Sync Operations">SYNC {securityWire.queuedOpsCount}</span>
				{/if}
			</div>
			<div class="flex items-center gap-0.5 shrink-0">
				<UiUtilityIconButton
					icon={isGuest ? 'user' : 'shield'}
					variant={isGuest ? 'accent' : 'nominal'}
					active={!isGuest}
					cornerStyle={hudWire.cornerStyle}
					testid={isGuest ? 'unlock-studio-cta' : 'principal-mask-badge'}
					tip={isGuest ? 'Sign In / Operator Lobby' : `OP // ${securityWire.username} (${securityWire.roleId} · ${securityWire.syncPosture})`}
					ariaLabel={isGuest ? 'Sign In' : `OP // ${securityWire.username}`}
					onclick={() => hudWire.openModal(HUD_MODALS.AUTH_LOBBY)}
				/>
				{#if canObserveWire}
					<UiUtilityIconButton icon="activity" variant="accent" cornerStyle={hudWire.cornerStyle} active={hudWire.activeModal === HUD_MODALS.WIRE_OBSERVATORY} testid="top-wire-tap-btn" tip="Wire Observatory" ariaLabel="Wire Observatory" onclick={openWireObservatory} />
				{/if}
				<UiUtilityIconButton icon={isDark ? 'sun' : 'moon'} variant="brass" cornerStyle={hudWire.cornerStyle} tip={`Switch Polarity (${activeTheme.label})`} ariaLabel={`Switch Polarity (${activeTheme.label})`} onclick={() => hudWire.randomizePolarityTheme()} />
				<UiUtilityIconButton icon="help" variant="accent" cornerStyle={hudWire.cornerStyle} active={hudWire.activeModal === HUD_MODALS.SSOT_HELP_BOOK} glitterActive={helpContext.glitterActive} glitterKey={helpContext.glitterKey} testid="hud-help-btn" tip={`Contextual Tome: ${helpContext.current.topicTitle}`} tipKey="F1 / ?" ariaLabel="Open Contextual Field Tome" onclick={() => hudWire.openContextualHelp(helpContext.current)} />
				<UiUtilityIconButton icon="sliders" variant="accent" cornerStyle={hudWire.cornerStyle} corners={ZONE_CORNER_TUPLES.RADAR_TOP_RIGHT} active={hudWire.activeModal === HUD_MODALS.SETTINGS} testid="hud-settings-btn" tip="HUD & Engine Settings" tipKey="," ariaLabel="HUD & Engine Settings" onclick={() => hudWire.openModal(HUD_MODALS.SETTINGS)} />
				<button type="button" data-testid="compact-menu-trigger-tablet" onclick={() => hudWire.toggleCompactMenu()} data-hud-tip="Compact Navigation Drawer" aria-label="Compact Navigation Drawer" class="lg:hidden w-6 h-6 flex items-center justify-center border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-text)] cursor-pointer"><HudIcon name="layers" className="text-xs" /></button>
			</div>
		</div>

		<div class="flex items-center justify-between gap-1 flex-nowrap min-w-0">
			<div class="flex items-center gap-1 shrink-0">
				<HudChamferButton corners={ZONE_CORNER_TUPLES.RADAR_BOTTOM_LEFT} cutPx={5} variant="brass" tip="Stations Directory" tipKey="S" onclick={() => hudWire.openModal(HUD_MODALS.STATIONS_LAUNCHER)} className="h-5 px-1.5 text-[0.5625rem]">Stations</HudChamferButton>
				{#if !isGuest && canIndexLocal}
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="accent" disabled={isAnalyzing} tip="Re-index Active Workspace" onclick={() => void onReindexWorkspace()} className="h-5 px-1.5 text-[0.5625rem]">{isAnalyzing ? 'Scan...' : 'Index'}</HudChamferButton>
				{/if}
			</div>
			<div class="flex items-center gap-1 min-w-0">
				<button type="button" data-testid="codecheck-visor" onclick={openForensicShield} class="flex items-center gap-1 shrink-0 cursor-pointer hover:text-[var(--hud-accent-primary)]" data-hud-tip={`Metamodel Taxonomy & CodeCheck: ${blockerCount} Blocker, ${criticalCount} Critical, ${warningCount} Warnings across ${entityCount} symbols`}>
					<span class="grid grid-cols-3 gap-0.5 shrink-0" aria-hidden="true">
						<span class={`w-1.5 h-1.5 ${blockerCount > 0 ? 'bg-[var(--hud-danger)]' : 'bg-[var(--hud-border)]'}`}></span>
						<span class={`w-1.5 h-1.5 ${criticalCount > 0 ? 'bg-[var(--hud-warning)]' : 'bg-[var(--hud-border)]'}`}></span>
						<span class={`w-1.5 h-1.5 ${warningCount > 0 ? 'bg-[var(--hud-accent-secondary)]' : 'bg-[var(--hud-nominal)]'}`}></span>
					</span>
					<span class="tabular-nums text-[0.5625rem] text-[var(--hud-text)]">{blockerCount}/{criticalCount}/{warningCount}</span>
				</button>
				<button type="button" data-testid="shield-posture-trigger" onclick={openForensicShield} class="text-[0.5625rem] text-[var(--hud-muted)] hover:text-[var(--hud-accent-primary)] tabular-nums truncate cursor-pointer" data-hud-tip={`Scope ${indexedFilesCount} files · ${entityCount} symbols · Shield ${securityWire.syncPosture} (Click to inspect CodeCheck)`}>{indexedFilesCount}F · {isGuest ? 'SHIELD' : securityWire.syncPosture}</button>
			</div>
		</div>

		<div class="flex items-center justify-between gap-1.5 font-mono text-[0.5625rem] leading-3 text-[var(--hud-muted)] uppercase tabular-nums min-w-0">
			<span class={`truncate ${privacyToneClass}`}>Privacy Shield: Active</span>
			<div class="flex items-center gap-1.5 shrink-0">
				{#if !isGuest}
					<button type="button" onclick={onToggleEngine} data-hud-tip="Toggle Graph Engine (SQLite / Memgraph)" class="hidden xl:inline-flex px-1 py-0 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[0.5625rem] leading-3 text-[var(--hud-accent-primary)] cursor-pointer hover:border-[var(--hud-accent-primary)]">{graphEngine === GRAPH_ENGINES.SQLITE_LOCAL ? 'SQLITE' : 'MAGE'}</button>
				{/if}
				<span class="shrink-0">Hull: {hudWire.cornerStyle}</span>
			</div>
		</div>
	</div>
</HudChamferFrame>
