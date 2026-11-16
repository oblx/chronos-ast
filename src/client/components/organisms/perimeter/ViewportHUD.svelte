<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.6.0 11-Zone Zero-CLS Game-HUD Orchestrator: strict Guest RBAC DOM omission, Compare Staging Tray, Particle FX & Compact Drawer.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { createStructuredDeviationMetadata, type DeviationTemplateId } from '@config/registries/annotation.templates';
	import { API_ROUTES, APP_METADATA, GRAPH_ENGINES, GRAPH_PROJECTIONS, HUD_CONFIG, HUD_VIEWS, WORKSPACE_DEFAULTS, type ExportFormat, type GraphEngineMode, type GraphProjectionMode } from '@config/constants';
	import { HUD_DISCLOSURE_TIERS, HUD_MODALS, type StationActionKind } from '@config/hud.events';
	import { EDGE_DRAWER_MODES, HUD_ZONE_VISIBILITY, HUD_ZONES } from '@config/hud.tokens';
	import { resolveEntitySourceSlice, type AnnotationKind } from '@config/metamodel.constants';
	import { RULE_SEVERITIES } from '@config/registries/rules.registry';
	import { PRINCIPAL_KINDS } from '@config/security.constants';
	import {
		Island, buildHudExportPayload, clientDagKernel, computeBetweennessCentrality, computeChidamberKemererSuite,
		computeEntityLcom4FromGraph, computeTarjanScc, diffWorkspaceSnapshots, evaluateWorkspaceCodeCheck,
		executeTwinClientIntent, hudWire, importSarif210Diagnostics, navigationSync, securityWire, subscribeWorkspaceDomainEvents, wsClient,
		type AuditAnnotationRecord, type CodeCheckViolation, type SourceFileUnit, type WorkspaceSnapshot, type WorkspaceTabDescriptor,
	} from '@client/state';
	import GamificationOverlays from '@client/components/molecules/gamification/GamificationOverlays.svelte';
	import WorldAtmosphere from '@client/components/atoms/fx/WorldAtmosphere.svelte';
	import HudAlignmentGuides from '@client/components/atoms/HudAlignmentGuides.svelte'; import HudCyberTooltip from '@client/components/atoms/HudCyberTooltip.svelte';
	import HudParticleEmitter from '@client/components/atoms/fx/HudParticleEmitter.svelte';
	import HudGuestTutorialQuest from '@client/components/molecules/overlays/HudGuestTutorialQuest.svelte';
	import CompareStagingTray from '@client/components/molecules/overlays/CompareStagingTray.svelte';
	import HudTopBarZones from '@client/components/zones/HudTopBarZones.svelte'; import ProjectTabDeck from '@client/components/zones/ProjectTabDeck.svelte';
	import HudCompactOverflowDrawer from '@client/components/zones/HudCompactOverflowDrawer.svelte';
	import HudLeftEdgeZone from '@client/components/zones/HudLeftEdgeZone.svelte'; import HudRightEdgeZone from '@client/components/zones/HudRightEdgeZone.svelte';
	import HudBottomDockZones from '@client/components/zones/HudBottomDockZones.svelte'; import HudIdleCommandBay from '@client/components/zones/HudIdleCommandBay.svelte';
	import HudModalsLayer from '@client/components/modals/HudModalsLayer.svelte'; import CodemapCanvas from '@client/components/organisms/projections/CodemapCanvas.svelte';
	import ButterflyGraph from '@client/components/organisms/projections/ButterflyGraph.svelte'; import ControlFlowCanvas from '@client/components/organisms/projections/ControlFlowCanvas.svelte';
	import DataFlowCanvas from '@client/components/organisms/projections/DataFlowCanvas.svelte'; import TreemapCanvas from '@client/components/organisms/projections/TreemapCanvas.svelte';
	import DsmMatrix from '@client/components/organisms/projections/DsmMatrix.svelte'; import MermaidStudioCanvas from '@client/components/organisms/projections/MermaidStudioCanvas.svelte';
	import TelemetryTerminal from '@client/components/organisms/perimeter/TelemetryTerminal.svelte';

	interface Props {
		tabs: readonly WorkspaceTabDescriptor[]; activeTabId: string; selectedEntityId: number; isAnalyzing: boolean; statusBanner: string;
		onSelectTab: (tabId: string) => void; onCloseTab: (tabId: string) => void; onOpenPreset: () => Promise<void>; onOpenProject?: (projectKey: string) => Promise<void>; onSaveWorkspace: () => Promise<void>;
		onImportBundleJson: (rawJson: string) => Promise<void>; onUploadZipBytes: (zipBytes: Uint8Array, workspaceName: string) => Promise<void>; onUploadSourceFiles: (workspaceName: string, files: readonly SourceFileUnit[]) => Promise<void>;
		onIngestSampleZip: () => Promise<void>; onIngestRemoteUrl: (url: string, workspaceName?: string) => Promise<void>; onIngestGitRepo?: (repoUrl: string, branch?: string, secretId?: string) => Promise<void>;
		onExportBundle: () => Promise<string>; onSelectEntity: (id: number) => void; onAnalyzeSource: (filePath: string, sourceCode: string) => Promise<void>; onReindexWorkspace: () => Promise<void>;
	}
	const EMPTY_SNAPSHOT: WorkspaceSnapshot = { indexedFilesCount: 0, workerDurationMicros: 0, hasCycles: false, nodes: [], edges: [], sourceMap: {} };
	let { tabs, activeTabId, selectedEntityId, isAnalyzing, statusBanner, onSelectTab, onCloseTab, onOpenPreset, onOpenProject, onSaveWorkspace, onImportBundleJson, onUploadZipBytes, onUploadSourceFiles, onIngestSampleZip, onIngestRemoteUrl, onIngestGitRepo = async () => {}, onExportBundle, onSelectEntity, onAnalyzeSource, onReindexWorkspace }: Props = $props();
	let graphEngine = $state<GraphEngineMode>(GRAPH_ENGINES.SQLITE_LOCAL), modalExportJson = $state(''), exportedPayloadPreview = $state(''), activeGraphProjection = $state<GraphProjectionMode>(GRAPH_PROJECTIONS.BUTTERFLY), useHisSafetyProfile = $state(false);
	let baselineSnapshot = $state.raw<WorkspaceSnapshot | null>(null), auditAnnotations = $state.raw<AuditAnnotationRecord[]>([]), sarifViolations = $state.raw<CodeCheckViolation[]>([]), providerUrl = $state(''), providerBearer = $state(''), searchQuery = $state(''), activeKindFilter = $state<string>(WORKSPACE_DEFAULTS.FILTER_ALL), camera = $state({ panX: 0, panY: 0, zoomScale: 1 });
	let isGuest = $derived(securityWire.principalKind === PRINCIPAL_KINDS.GUEST);
	let activeTab = $derived(tabs.find((t) => t.id === activeTabId) ?? tabs[0]), snapshot = $derived(activeTab?.snapshot ?? EMPTY_SNAPSHOT);
	let diffReport = $derived(baselineSnapshot && activeTab ? diffWorkspaceSnapshots(baselineSnapshot, snapshot) : null);
	let activeEntity = $derived(snapshot.nodes.find((n) => n.id === selectedEntityId) ?? snapshot.nodes[0]);
	let ckMap = $derived(computeChidamberKemererSuite(snapshot.nodes, snapshot.edges)), sccReport = $derived(computeTarjanScc(snapshot.nodes, snapshot.edges));
	let codeCheck = $derived(evaluateWorkspaceCodeCheck(snapshot.nodes, snapshot.edges, snapshot.sourceMap, auditAnnotations, sarifViolations, useHisSafetyProfile, ckMap));
	let blockerCount = $derived(codeCheck.violations.filter((v) => v.severity === RULE_SEVERITIES.BLOCKER).length), criticalCount = $derived(codeCheck.violations.filter((v) => v.severity === RULE_SEVERITIES.CRITICAL).length), warningCount = $derived(codeCheck.violations.length - blockerCount - criticalCount);
	let activeLcomScore = $derived(activeEntity ? computeEntityLcom4FromGraph(activeEntity, snapshot.nodes, snapshot.edges) : HUD_CONFIG.METRIC_DEFAULTS.LCOM_MIN);
	let centralityMap = $derived(graphEngine === GRAPH_ENGINES.MEMGRAPH_BOLT ? computeBetweennessCentrality(snapshot.nodes, snapshot.edges) : {});
	let activeCentrality = $derived(activeEntity ? Math.round((centralityMap[activeEntity.id] ?? 0) * 100) / 100 : 0);
	let activeSourceCode = $derived(activeEntity ? resolveEntitySourceSlice(activeEntity.qualifiedName, snapshot.sourceMap, `// Entity: ${activeEntity.qualifiedName}`) : '');
	let canvasPadClass = $derived(hudWire.isStealthMode ? 'p-4' : `pt-[88px] pb-[156px] hud-world-safe-corridor ${!isGuest && hudWire.edgeDrawerMode !== EDGE_DRAWER_MODES.OVERLAY_HOVER && hudWire.zoneStates[HUD_ZONES.LEFT_EDGE] === HUD_ZONE_VISIBILITY.OPEN ? 'md:pl-[calc(var(--hud-rail-collapsed-w)+var(--hud-edge-track-w)+1.75rem)]' : ''} ${!isGuest && hudWire.edgeDrawerMode !== EDGE_DRAWER_MODES.OVERLAY_HOVER && hudWire.zoneStates[HUD_ZONES.RIGHT_EDGE] === HUD_ZONE_VISIBILITY.OPEN ? 'md:pr-[calc(var(--hud-rail-collapsed-w)+var(--hud-edge-track-w)+1.75rem)]' : ''}`);

	clientDagKernel.bindHooks(() => securityWire.buildHeaders(), (tag, msg) => hudWire.pushTicker(tag, msg));
	$effect(() => { const fmt = hudWire.requestedExportFormat; if (fmt) { hudWire.requestedExportFormat = ''; void handleExport(fmt as ExportFormat); } });
	$effect(() => { const _uid = securityWire.uid; const _tok = securityWire.accessToken; if (_uid > 0 && wsClient.status === 'CONNECTED') wsClient.connectWorkspace(activeTabId || 'chronos-core', activeEntity?.id ?? null); });
	$effect(() => {
		wsClient.registerTwinExecutor((intent) => executeTwinClientIntent(intent, { onOpenProject, onSelectTab, onSelectEntity, hasTab: (k) => tabs.some((t) => t.id === k || t.slug === k), onSwitchProjection: (view) => executeStationAction({ type: 'VIEW', view }) }));
	});
	onMount(() => {
		hudWire.setTheme(hudWire.activeThemeId);
		void securityWire.bootstrapIdentity().then(() => wsClient.connectWorkspace(activeTabId || 'chronos-core', activeEntity?.id ?? null));
		const onIdbWarn = (e: Event) => hudWire.pushTicker('IDB', String((e as CustomEvent<string>).detail ?? 'IndexedDB fallback active'));
		window.addEventListener('chronos:idb-warning', onIdbWarn);
		const unsubWs = subscribeWorkspaceDomainEvents((evt) => hudWire.pushTicker(evt.kind.replace('WORKSPACE_', ''), evt.message));
		return () => { wsClient.registerTwinExecutor(null); window.removeEventListener('chronos:idb-warning', onIdbWarn); unsubWs(); wsClient.disconnect(); };
	});
	function handleKeydown(e: KeyboardEvent): void {
		const tag = (e.target as HTMLElement | null)?.tagName ?? '', inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
		if (!isGuest && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); hudWire.openModal(hudWire.activeModal === HUD_MODALS.INSTANT_SEARCH ? HUD_MODALS.NONE : HUD_MODALS.INSTANT_SEARCH); return; }
		if (e.altKey && e.key.toLowerCase() === 'g') { e.preventDefault(); hudWire.toggleAlignmentGuides(); return; }
		if (e.key === 'Escape') { if (hudWire.activeModal === HUD_MODALS.AUTH_LOBBY || (hudWire.tourActive && isGuest)) { e.preventDefault(); hudWire.unfoldPermittedHudZones(); return; } if (hudWire.activeModal !== HUD_MODALS.NONE) { hudWire.closeModal(); return; } }
		if (inInput) return;
		if (e.key === '?' || e.key === 'F1') { e.preventDefault(); hudWire.openModal(hudWire.activeModal === HUD_MODALS.SSOT_HELP_BOOK ? HUD_MODALS.NONE : HUD_MODALS.SSOT_HELP_BOOK); }
		else if (!isGuest && (e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); hudWire.openModal(hudWire.activeModal === HUD_MODALS.STATIONS_LAUNCHER ? HUD_MODALS.NONE : HUD_MODALS.STATIONS_LAUNCHER); }
		else if ((e.key === 'f' || e.key === 'F' || e.key === '0') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); hudWire.triggerCanvasRecenter(); }
		else if ((e.key === 'Tab' || e.key === 'z' || e.key === 'Z') && hudWire.activeModal === HUD_MODALS.NONE && !e.ctrlKey && !e.metaKey) { e.preventDefault(); hudWire.toggleStealth(); }
	}
	function handleAddAnnotation(tagKind: AnnotationKind, note: string, ruleCode: string | null, templateId?: DeviationTemplateId | null, ticketId?: string | null): void {
		if (!activeEntity) return;
		const meta = templateId ? createStructuredDeviationMetadata(templateId, note, ticketId ?? undefined) : null;
		auditAnnotations = [...auditAnnotations, { id: auditAnnotations.length + 1, entityKind: activeEntity.kind, qualifiedName: activeEntity.qualifiedName, tagKind, ruleCode, templateId: templateId ?? null, reviewer: meta?.reviewer ?? APP_METADATA.AUTHOR, ticketId: meta?.ticketId ?? ticketId ?? null, expiresAt: meta?.expiresAt ?? null, note, author: securityWire.username, createdAt: Date.now() }];
		void securityWire.enqueueAnnotationOp(activeEntity.qualifiedName, { entityKind: activeEntity.kind, tagKind, ruleCode, note, author: securityWire.username });
		wsClient.sendAnnotation(activeEntity.id, note); hudWire.pushTicker('ATN', `Recorded ${tagKind} on ${activeEntity.name}`);
	}
	async function toggleGraphEngine(): Promise<void> {
		const next = graphEngine === GRAPH_ENGINES.SQLITE_LOCAL ? GRAPH_ENGINES.MEMGRAPH_BOLT : GRAPH_ENGINES.SQLITE_LOCAL; graphEngine = next;
		if (next === GRAPH_ENGINES.MEMGRAPH_BOLT && activeEntity) { const res = await clientDagKernel.requestJson(API_ROUTES.GRAPH_QUERY, { method: 'POST', body: { focalEntityId: activeEntity.id }, sourceZone: 'TOP_RIGHT', intentKind: 'MEMGRAPH_BOLT_QUERY' }); if (!res.ok) graphEngine = GRAPH_ENGINES.SQLITE_LOCAL; }
		hudWire.pushTicker('ENGINE', `Switched to ${graphEngine}`);
	}
	async function handleExport(format: ExportFormat): Promise<void> {
		if (!activeTab) return;
		exportedPayloadPreview = buildHudExportPayload({ format, workspaceName: activeTab.name, activeView: hudWire.activeView, activeThemeId: hudWire.activeThemeId, activeEntity, activeSourceCode, snapshot, violations: codeCheck.violations, auditAnnotations });
		hudWire.setDisclosureTier(HUD_DISCLOSURE_TIERS.TIER_3_FORENSIC); hudWire.setZoneVisibility(HUD_ZONES.RIGHT_EDGE, HUD_ZONE_VISIBILITY.OPEN);
		hudWire.pushTicker('EXPORT', `Generated ${format} payload`);
	}
	function executeStationAction(action: StationActionKind): void {
		if (action.type === 'VIEW') { activeGraphProjection = (action.view === HUD_VIEWS.UML_CLASS || action.view === HUD_VIEWS.UML_SEQUENCE || action.view === HUD_VIEWS.SHARED_OBJECTS || action.view === HUD_VIEWS.MERMAID) ? action.view : (action.view === HUD_VIEWS.BUTTERFLY ? GRAPH_PROJECTIONS.BUTTERFLY : activeGraphProjection); hudWire.selectView(action.view); }
		else if (action.type === 'MODAL') { if (action.modal === HUD_MODALS.WORKSPACE_INGEST) modalExportJson = ''; hudWire.openModal(action.modal); }
		else if (action.type === 'EXPORT') void handleExport(action.format);
		else if (action.type === 'STEALTH') hudWire.toggleStealth();
		else if (action.type === 'OPEN_PRESET') void onOpenPreset();
		else if (action.type === 'PIN_COMPARE' && activeTab) { baselineSnapshot = snapshot; hudWire.pushTicker('DELTA', 'Pinned comparison baseline'); }
		else if (action.type === 'ENGINE_TOGGLE') void toggleGraphEngine();
		else if (action.type === 'REINDEX') void onReindexWorkspace();
	}
</script>
<svelte:window onkeydown={handleKeydown} />
<div data-hud-theme={hudWire.activeThemeId} data-hud-motion={hudWire.kineticMotionEnabled ? 'ACTIVE' : 'REDUCED'} class="fixed inset-0 overflow-hidden bg-[var(--hud-bg)] text-[var(--hud-text)] select-none">
	<WorldAtmosphere />
	<main data-hud-zone="WORLD_CANVAS" data-help-target="PRIMARY_CANVAS" class={`fixed inset-0 z-10 flex flex-col transition-transform duration-300 ${hudWire.activeModal !== HUD_MODALS.NONE ? 'scale-[0.985]' : 'scale-100'} ${activeTab && activeEntity ? canvasPadClass : 'items-center justify-center p-6'}`}>
		{#if activeTab && activeEntity}
			<Island id="chronos-primary-viewport" label="ISLAND_HYDRATED">
				{#if hudWire.activeView === HUD_VIEWS.CODEMAP}<CodemapCanvas nodes={snapshot.nodes} edges={snapshot.edges} selectedEntityId={activeEntity.id} cyclicEntityIds={sccReport.cyclicEntityIds} onSelectEntity={(id) => { onSelectEntity(id); navigationSync.selectEntity(id, activeEntity?.qualifiedName ?? null); wsClient.sendFocalLock(id); }} onSelectGraphProjection={(m) => (activeGraphProjection = m)} />
				{:else if hudWire.activeView === HUD_VIEWS.BUTTERFLY || hudWire.activeView === HUD_VIEWS.UML_CLASS || hudWire.activeView === HUD_VIEWS.UML_SEQUENCE || hudWire.activeView === HUD_VIEWS.SHARED_OBJECTS}<ButterflyGraph entityId={activeEntity.id} nodes={snapshot.nodes} edges={snapshot.edges} projectionMode={hudWire.activeView === HUD_VIEWS.UML_CLASS || hudWire.activeView === HUD_VIEWS.UML_SEQUENCE || hudWire.activeView === HUD_VIEWS.SHARED_OBJECTS ? hudWire.activeView : activeGraphProjection} {diffReport} resetNonce={hudWire.canvasResetNonce} onToggleCompare={() => (baselineSnapshot = baselineSnapshot ? null : snapshot)} onSelectNode={(id) => { onSelectEntity(id); navigationSync.selectEntity(id, activeEntity?.qualifiedName ?? null); wsClient.sendFocalLock(id); }} onCameraChange={(c) => { camera = c; navigationSync.recordCamera(hudWire.activeView, c.panX, c.panY, c.zoomScale); }} />
				{:else if hudWire.activeView === HUD_VIEWS.CONTROL_FLOW}<ControlFlowCanvas entity={activeEntity} sourceCode={activeSourceCode} nodes={snapshot.nodes} edges={snapshot.edges} sourceMap={snapshot.sourceMap} violations={codeCheck.violations} {onSelectEntity} />
				{:else if hudWire.activeView === HUD_VIEWS.DATA_FLOW}<DataFlowCanvas entity={activeEntity} sourceCode={activeSourceCode} nodes={snapshot.nodes} edges={snapshot.edges} sourceMap={snapshot.sourceMap} violations={codeCheck.violations} {onSelectEntity} />
				{:else if hudWire.activeView === HUD_VIEWS.MERMAID}<MermaidStudioCanvas focalEntity={activeEntity} nodes={snapshot.nodes} edges={snapshot.edges} sourceMap={snapshot.sourceMap} {onSelectEntity} />
				{:else if hudWire.activeView === HUD_VIEWS.TREEMAP}<TreemapCanvas nodes={snapshot.nodes} violationMap={codeCheck.violationCountByEntityId} selectedEntityId={activeEntity.id} {diffReport} onToggleCompare={() => (baselineSnapshot = baselineSnapshot ? null : snapshot)} onSelectNode={onSelectEntity} />
				{:else if hudWire.activeView === HUD_VIEWS.DSM || hudWire.activeView === HUD_VIEWS.MATRIX}<DsmMatrix nodes={snapshot.nodes} edges={snapshot.edges} selectedEntityId={activeEntity.id} onSelectNode={onSelectEntity} />
				{:else}<TelemetryTerminal entity={activeEntity} sourceCode={activeSourceCode} nodes={snapshot.nodes} violations={codeCheck.violations} {onSelectEntity} {isAnalyzing} {onAnalyzeSource} />{/if}
			</Island>
		{:else}<HudIdleCommandBay {statusBanner} onOpenIngest={() => { modalExportJson = ''; hudWire.openModal(HUD_MODALS.WORKSPACE_INGEST); }} {onOpenPreset} {onIngestSampleZip} />{/if}
	</main>
	<HudTopBarZones {tabs} {activeTabId} {activeEntity} indexedFilesCount={snapshot.indexedFilesCount} entityCount={snapshot.nodes.length} {blockerCount} {criticalCount} {warningCount} {isAnalyzing} {graphEngine} {activeGraphProjection} onToggleEngine={toggleGraphEngine} {onReindexWorkspace} onSelectGraphProjection={(m) => (activeGraphProjection = m)} />
	{#if !hudWire.isStealthMode && !hudWire.isZoneFolded(HUD_ZONES.TOP_CENTER)}<ProjectTabDeck {tabs} {activeTabId} {onSelectTab} {onCloseTab} {onOpenPreset} />{/if}
	<HudGuestTutorialQuest /><HudCompactOverflowDrawer onSelectGraphProjection={(m) => (activeGraphProjection = m)} {onReindexWorkspace} />
	{#if activeTab && activeEntity && (!isGuest || !hudWire.isZoneFolded(HUD_ZONES.LEFT_EDGE))}<HudLeftEdgeZone entities={snapshot.nodes} selectedEntityId={activeEntity.id} {searchQuery} {activeKindFilter} {ckMap} cyclicIds={sccReport.cyclicEntityIds} violationMap={codeCheck.violationCountByEntityId} {onSelectEntity} onSearchChange={(q) => (searchQuery = q)} onKindChange={(k) => (activeKindFilter = k)} /><HudRightEdgeZone entity={activeEntity} nodes={snapshot.nodes} edges={snapshot.edges} ckMetrics={ckMap[activeEntity.id]} lcomScore={activeLcomScore} sourceByteLength={activeSourceCode.length} violations={codeCheck.violations} suppressedCount={codeCheck.suppressedCount} {useHisSafetyProfile} {auditAnnotations} {graphEngine} {activeCentrality} {exportedPayloadPreview} {onSelectEntity} onToggleHisProfile={() => (useHisSafetyProfile = !useHisSafetyProfile)} onImportSarifJson={(raw) => { try { sarifViolations = [...sarifViolations, ...importSarif210Diagnostics(raw, snapshot.nodes)]; } catch {} }} onExport={handleExport} onClearExportPreview={() => (exportedPayloadPreview = '')} onAddAnnotation={handleAddAnnotation} />{/if}
	{#if !isGuest}<CompareStagingTray {diffReport} baselineLabel={activeTab?.shortCode ?? 'Baseline'} onClearBaseline={() => (baselineSnapshot = null)} />{/if}
	<HudBottomDockZones nodes={snapshot.nodes} focalEntity={activeEntity} focalEntityId={activeEntity?.id ?? 1} hasWorkspace={Boolean(activeTab && activeEntity)} hasBaseline={Boolean(baselineSnapshot)} hasCycles={snapshot.hasCycles} violationCount={codeCheck.violations.length} {providerUrl} {providerBearer} {diffReport} {statusBanner} {camera} onSelectNode={onSelectEntity} onPinBaseline={() => (baselineSnapshot = snapshot)} onClearBaseline={() => (baselineSnapshot = null)} {onSaveWorkspace} onExportBundle={async () => { modalExportJson = await onExportBundle(); hudWire.openModal(HUD_MODALS.WORKSPACE_INGEST); }} />
	<HudAlignmentGuides /><HudParticleEmitter /><GamificationOverlays />
	{#if hudWire.isStealthMode}<button type="button" onclick={() => hudWire.toggleStealth()} class="fixed bottom-4 right-4 z-30 px-3 py-1.5 font-mono text-[11px] hud-z2-dock border border-[var(--hud-brass)] text-[var(--hud-accent)] cursor-pointer hud-glint-trigger">Restore HUD [Z]</button>{/if}
	<HudModalsLayer {activeEntity} nodes={snapshot.nodes} sourceMap={snapshot.sourceMap} workspaceIds={tabs.map((t) => t.id)} {modalExportJson} {providerUrl} {providerBearer} {graphEngine} {useHisSafetyProfile} {onSelectEntity} onExecuteStationAction={executeStationAction} onAddAnnotation={handleAddAnnotation} {onImportBundleJson} {onUploadZipBytes} {onUploadSourceFiles} {onIngestSampleZip} {onIngestRemoteUrl} {onIngestGitRepo} onSaveAiConfig={(url, bearer) => { providerUrl = url; providerBearer = bearer; hudWire.closeModal(); }} onToggleEngine={toggleGraphEngine} onToggleHisProfile={() => (useHisSafetyProfile = !useHisSafetyProfile)} {onReindexWorkspace} /><HudCyberTooltip />
</div>
