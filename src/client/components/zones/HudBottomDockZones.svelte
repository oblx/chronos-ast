<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Bottom Perimeter Zones: Bilateral 4-Corner Chamfer Symmetry (X = 50vw) and rem-driven 8.25rem docks.
-->
<script lang="ts">
	import { HUD_VIEWS } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { HUD_INTENT_KINDS } from '@config/hud/hud.intents';
	import { CHAMFER_PROFILES, HULL_PROFILES, HUD_GLYPHS, HUD_MOTION, HUD_ZONES, ZONE_CORNER_TUPLES } from '@config/hud.tokens';
	import { CAPABILITY_BITS, PRINCIPAL_KINDS } from '@config/security.constants';
	import {
		type GraphEntityNode,
		type SnapshotDiffReport,
		clientDagKernel,
		helpContext,
		hudWire,
		securityWire,
		wsClient
	} from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import DiegeticRadarMinimap from '@client/components/molecules/radar/DiegeticRadarMinimap.svelte';
	import HudVirtualCursorsOverlay from '@client/components/molecules/overlays/HudVirtualCursorsOverlay.svelte';
	import HudAiCommandDeck from './HudAiCommandDeck.svelte';
	import { UI_SPOTLIGHT_TARGETS, uiSpotlight } from '@ui';

	interface Props {
		nodes: readonly GraphEntityNode[]; focalEntity: GraphEntityNode | undefined; focalEntityId: number;
		hasWorkspace: boolean; hasBaseline: boolean; hasCycles?: boolean; violationCount?: number;
		providerUrl?: string; providerBearer?: string;
		diffReport: SnapshotDiffReport | null; statusBanner: string;
		camera: { readonly panX: number; readonly panY: number; readonly zoomScale: number };
		onSelectNode: (id: number) => void; onPinBaseline: () => void; onClearBaseline: () => void;
		onSaveWorkspace: () => Promise<void>; onExportBundle: () => Promise<void>;
	}

	let { nodes, focalEntity, focalEntityId, hasWorkspace, hasBaseline, hasCycles = false, violationCount = 0, providerUrl = '', providerBearer = '', statusBanner, camera, onSelectNode, onPinBaseline, onClearBaseline }: Props = $props();
	const cornerStyle = 'height: var(--hud-bottom-dock-h, 8.25rem);';
	let collabOverlayActive = $state(true);
	let isGuest = $derived(securityWire.principalKind === PRINCIPAL_KINDS.GUEST);
	let canCompare = $derived(securityWire.can(CAPABILITY_BITS.COMPARE_DIFF_EXEC));
	let canObserveWire = $derived(securityWire.can(CAPABILITY_BITS.ADMIN_WIRE_OBSERVE));
	let compactStatus = $derived(hasWorkspace && statusBanner.startsWith('Restored ') ? '1 Workspace Ready' : statusBanner);

	function openCodeCheckForensic(): void {
		hudWire.setRightDrawerTab('FORENSIC', true);
	}
	function openCollabModal(): void {
		wsClient.sendFocalLock(focalEntityId);
		hudWire.openModal(HUD_MODALS.COLLAB_SOCIAL);
		hudWire.pushTicker('COLLAB', `WebSocket room (${wsClient.connectedCount}/${wsClient.maxClients} active)`);
	}
	function openWireObservatory(): void {
		void clientDagKernel.fetchServerWireHistory();
		hudWire.openModal(HUD_MODALS.WIRE_OBSERVATORY);
	}
	function triggerCompare(event: MouseEvent): void {
		const el = event.currentTarget as HTMLElement;
		const r = el.getBoundingClientRect();
		hudWire.triggerParticleBurst(r.left + r.width / 2, r.top + r.height / 2, 'compare');
		if (hasBaseline) {
			hudWire.dispatchIntent({ intentKind: HUD_INTENT_KINDS.COMPARE_CLEAR_BASELINE, sourceZone: HUD_ZONES.BOTTOM_CENTER });
			onClearBaseline();
		} else {
			hudWire.dispatchIntent({ intentKind: HUD_INTENT_KINDS.COMPARE_PIN_BASELINE, sourceZone: HUD_ZONES.BOTTOM_CENTER, targetId: focalEntityId });
			onPinBaseline();
		}
	}
</script>

<footer class="fixed bottom-3 inset-x-3 z-20 flex items-end justify-between gap-3 pointer-events-none select-none hud-uwqhd-corridor">
	<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.BOTTOM_LEFT} chamferPx={10} chevrons={false} dataHudZone={HUD_ZONES.BOTTOM_LEFT} inert={hudWire.isZoneFolded(HUD_ZONES.BOTTOM_LEFT)} style={`${hudWire.zoneStyle(HUD_ZONES.BOTTOM_LEFT)} ${cornerStyle}`} className={`${hudWire.isZoneFolded(HUD_ZONES.BOTTOM_LEFT) ? 'pointer-events-none' : 'pointer-events-auto'} hud-zone-transition hud-track-w px-4 py-2.5 font-mono text-[0.6875rem] leading-4 shrink-0 hidden md:block`}>
		<div class="h-full flex flex-col justify-between">
			<div class="flex items-center justify-between gap-2 border-b border-[var(--hud-border)] pb-1 min-w-0">
				<span class="text-[var(--hud-accent-secondary)] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">LIVE STREAM</span>
				<div class="flex items-center justify-end gap-1.5 flex-1 min-w-0">
					{#if canObserveWire}
						<button type="button" data-testid="wire-tap-toggle-btn" onclick={openWireObservatory} class="px-1.5 py-0.5 border border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] text-[0.625rem] font-bold cursor-pointer shrink-0 hover:bg-[var(--hud-accent-primary)]/15">[◈ Tap]</button>
					{/if}
					<span role="status" data-testid="bottom-left-status-pill" class="flex-1 min-w-0 truncate text-right text-[var(--hud-nominal)]">{compactStatus}</span>
				</div>
			</div>
			<div class="flex-1 flex flex-col justify-center gap-1 overflow-hidden text-xs leading-4">
				{#each hudWire.eventLog.slice(0, HUD_MOTION.TICKER_VISIBLE_ITEMS) as item (item.id)}
					<div class="flex items-center gap-1.5 truncate text-[var(--hud-muted)]">
						<span class="text-[0.6875rem] leading-4 tabular-nums shrink-0">{item.timeLabel}</span>
						<span class="text-[0.6875rem] leading-4 text-[var(--hud-accent-primary)] shrink-0">[{item.tag}]</span>
						<span class="text-[var(--hud-text)] truncate">{item.message}</span>
					</div>
				{/each}
			</div>
		</div>
	</HudChamferFrame>

	<div use:uiSpotlight={UI_SPOTLIGHT_TARGETS.BOTTOM_CENTER_DECK} data-hud-zone={HUD_ZONES.BOTTOM_CENTER} inert={hudWire.isZoneFolded(HUD_ZONES.BOTTOM_CENTER)} style={`${hudWire.zoneStyle(HUD_ZONES.BOTTOM_CENTER)} ${cornerStyle}`} class={`${hudWire.isZoneFolded(HUD_ZONES.BOTTOM_CENTER) ? 'pointer-events-none' : 'pointer-events-auto'} hud-zone-transition hud-center-corridor-w mx-auto min-w-0`}>
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.BOTTOM_CENTER} chamferPx={10} chevrons={true} dataHelpTarget="COMPARE_BANNER" className="w-full h-full px-4 py-2.5 flex flex-col justify-between font-mono text-[0.6875rem] leading-4">
			<div data-testid="tactical-action-hotbar" class="h-8 w-full grid grid-cols-6 gap-2 items-center whitespace-nowrap">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.LEFT_END_CAP} cutPx={5} variant="brass" testid="hotbar-slot-1" tip="Stations Launcher" tipKey="S" onclick={() => hudWire.openModal(HUD_MODALS.STATIONS_LAUNCHER)} className="h-7 px-2 text-[0.6875rem]">
					<span class="opacity-75 text-[0.625rem]">1</span><span class="hidden sm:inline">Stations</span><span class="sm:hidden">Hub</span>
				</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="nominal" testid="hotbar-slot-2" tip="Instant Search" tipKey="Ctrl+K" onclick={() => hudWire.openModal(HUD_MODALS.INSTANT_SEARCH)} className="h-7 px-2 text-[0.6875rem]">
					<span class="opacity-75 text-[0.625rem]">2</span><span class="hidden sm:inline">Search</span><span class="sm:hidden">Find</span>
				</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="accent" testid="hotbar-slot-3" tip="CFG Stepper" onclick={() => hudWire.selectView(HUD_VIEWS.CONTROL_FLOW)} className="h-7 px-2 text-[0.6875rem]">
					<span class="opacity-75 text-[0.625rem]">3</span><span class="hidden xl:inline">Stepper</span><span class="xl:hidden">CFG</span>
				</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="default" testid="hotbar-slot-4" tip={isGuest ? 'Architect Field Tome' : 'CodeCheck Audit'} onclick={() => isGuest ? hudWire.openContextualHelp(helpContext.current) : openCodeCheckForensic()} className="h-7 px-2 text-[0.6875rem]">
					<span class="opacity-75 text-[0.625rem]">4</span><span class="hidden xl:inline">{isGuest ? 'Tome' : 'CodeCheck'}</span><span class="xl:hidden">{isGuest ? 'Help' : 'Audit'}</span>
				</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} active={collabOverlayActive} variant={collabOverlayActive ? 'accent' : 'default'} testid="hotbar-slot-5" tip="Collaboration & Social Hub" onclick={openCollabModal} className="h-7 px-2 text-[0.6875rem]">
					<span class="opacity-75 text-[0.625rem]">5</span><span>Collab</span>
				</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={5} variant="default" testid="hotbar-slot-6" tip="Toggle Stealth Mode" tipKey="Z" onclick={() => hudWire.toggleStealth()} className="h-7 px-2 text-[0.6875rem]">
					<span class="opacity-75 text-[0.625rem]">6</span><span>{HUD_GLYPHS.STEALTH_MODE}</span><span class="hidden xl:inline">Stealth</span>
				</HudChamferButton>
			</div>
			<HudAiCommandDeck {focalEntity} entityCount={nodes.length} {violationCount} {hasCycles} {providerUrl} {providerBearer} {canCompare} {hasWorkspace} {hasBaseline} onToggleCompare={triggerCompare} />
		</HudChamferFrame>
	</div>

	<div use:uiSpotlight={UI_SPOTLIGHT_TARGETS.BOTTOM_RIGHT_RADAR} data-hud-zone={HUD_ZONES.BOTTOM_RIGHT} inert={hudWire.isZoneFolded(HUD_ZONES.BOTTOM_RIGHT)} style={`${hudWire.zoneStyle(HUD_ZONES.BOTTOM_RIGHT)} ${cornerStyle}`} class={`${hudWire.isZoneFolded(HUD_ZONES.BOTTOM_RIGHT) ? 'pointer-events-none' : 'pointer-events-auto'} hud-zone-transition hud-track-w shrink-0 hidden md:block`}>
		<DiegeticRadarMinimap inline={true} {nodes} {focalEntityId} panX={camera.panX} panY={camera.panY} zoomScale={camera.zoomScale} {onSelectNode} onRecenter={() => hudWire.triggerCanvasRecenter()} />
	</div>
</footer>
<HudVirtualCursorsOverlay {camera} {focalEntityId} />
