<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.1 Vector CRT Butterfly Graph Canvas: parallel chamfered sub-toolbar, untruncated dynamic cartridges, >=176px swimlane channels & top-layer edge pills.
-->
<script lang="ts">
	import { COMPARE_STATUS, GRAPH_PROJECTIONS, HUD_CONFIG, type ExportFormat, type GraphProjectionMode } from '@config/constants';
	import { REF_KIND_STYLE_MAP } from '@config/hud/hud.projections';
	import { CHAMFER_PROFILES, HUD_GLYPHS, HUD_THEME } from '@config/hud.tokens';
	import { CAPABILITY_BITS } from '@config/security.constants';
	import {
		type GraphEntityNode,
		type GraphReferenceEdge,
		type SnapshotDiffReport,
		buildCubicBezierPath,
		buildMultiHopButterfly,
		hudWire,
		securityWire
	} from '@client/state';
	import HudSurfacePattern from '@client/components/atoms/fx/HudSurfacePattern.svelte';
	import HudEntityCartridge from '@client/components/atoms/HudEntityCartridge.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudContextMenu from '@client/components/molecules/overlays/HudContextMenu.svelte';
	import HudInteractiveCanvasStage from '../perimeter/HudInteractiveCanvasStage.svelte';
	import UmlStudioCanvas from './UmlStudioCanvas.svelte';

	interface Props {
		entityId: number; nodes: readonly GraphEntityNode[]; edges: readonly GraphReferenceEdge[];
		projectionMode?: GraphProjectionMode; diffReport?: SnapshotDiffReport | null; resetNonce?: number;
		onToggleCompare?: () => void; onSelectNode?: (id: number) => void; onCameraChange?: (cam: { panX: number; panY: number; zoomScale: number }) => void;
	}
	const L = HUD_THEME.GRAPH_LAYOUT, B = HUD_THEME.CANVAS_BOUNDS;
	const SUB_MODES = [GRAPH_PROJECTIONS.BUTTERFLY, GRAPH_PROJECTIONS.UML_SEQUENCE, GRAPH_PROJECTIONS.UML_CLASS, GRAPH_PROJECTIONS.SHARED_OBJECTS] as const;
	let { entityId, nodes, edges, projectionMode = GRAPH_PROJECTIONS.BUTTERFLY, diffReport = null, resetNonce = 0, onToggleCompare, onSelectNode = () => {}, onCameraChange }: Props = $props();
	let activeSubMode = $state<GraphProjectionMode>(GRAPH_PROJECTIONS.BUTTERFLY), localCam = $state({ panX: 0, panY: 0, zoomScale: 1 });
	let stageCamRef = $state<{ reset: () => void; stepZoom: (d: number) => void; panBy: (dx: number, dy: number) => void; focusNodeAt: (x: number, y: number) => void; closeContextMenu: () => void; contextMenu: { open: boolean; x: number; y: number; entityId: number | null } } | null>(null);

	$effect(() => { activeSubMode = projectionMode; });
	let bf = $derived(buildMultiHopButterfly(entityId, nodes, edges, hudWire.butterflyMaxHops, L.CENTER_Y, 72));
	let maxWingLen = $derived(Math.max(bf?.afferentEntries.length ?? 0, bf?.efferentEntries.length ?? 0, 5));
	let svgH = $derived(Math.max(L.VIEWBOX_HEIGHT, maxWingLen * 76 + 100)), centerY = $derived(Math.round(svgH / 2));
	let compareActive = $derived(Boolean(diffReport)), canCompare = $derived(securityWire.can(CAPABILITY_BITS.COMPARE_DIFF_EXEC));
	let ctxEntity = $derived(stageCamRef?.contextMenu.entityId !== null && stageCamRef?.contextMenu.entityId !== undefined ? nodes.find((n) => n.id === stageCamRef!.contextMenu.entityId) : undefined);

	function calcCartridgeWidth(titleText: string, subText: string, minW: number = L.NODE_WIDTH): number {
		return Math.max(minW, Math.round(Math.max(titleText.length, Math.ceil(subText.length * 0.78)) * 8.5 + 48));
	}
	let focalW = $derived(bf ? calcCartridgeWidth(bf.focalEntity.name, `LOC:${bf.focalEntity.loc} · v(G):${bf.focalEntity.cyclomatic} · V:${bf.focalEntity.halsteadVolume}`, L.FOCAL_WIDTH) : L.FOCAL_WIDTH);
	let leftLaneW = $derived(bf ? Math.max(L.NODE_WIDTH, ...bf.afferentEntries.map((e) => calcCartridgeWidth(`H${e.hop} · ${e.node.name}`, `${e.edgeKind} ×${e.callCount} · v(G)=${e.node.cyclomatic}`))) : L.NODE_WIDTH);
	let rightLaneW = $derived(bf ? Math.max(L.NODE_WIDTH, ...bf.efferentEntries.map((e) => calcCartridgeWidth(`H${e.hop} · ${e.node.name}`, `${e.edgeKind} ×${e.callCount} · v(G)=${e.node.cyclomatic}`))) : L.NODE_WIDTH);
	let leftWingX = $derived(Math.round(leftLaneW / 2 + 28)), centerX = $derived(Math.round(leftWingX + leftLaneW / 2 + 196 + focalW / 2));
	let rightWingX = $derived(Math.round(centerX + focalW / 2 + 196 + rightLaneW / 2)), svgW = $derived(Math.max(L.VIEWBOX_WIDTH, Math.round(rightWingX + rightLaneW / 2 + 28)));

	function nodeCompareStroke(qName: string, fallback: string): string {
		if (!diffReport) return fallback;
		const st = diffReport.entityDeltas[qName]?.status;
		return st === COMPARE_STATUS.ADDED ? 'var(--hud-nominal)' : st === COMPARE_STATUS.MODIFIED ? 'var(--hud-warning)' : st === COMPARE_STATUS.REMOVED ? 'var(--hud-danger)' : fallback;
	}
	function edgeColor(kind: keyof typeof REF_KIND_STYLE_MAP): string { return REF_KIND_STYLE_MAP[kind]?.colorVar ?? 'var(--hud-accent-primary)'; }
	function handleCompareClick(e: MouseEvent): void {
		const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
		hudWire.triggerParticleBurst(r.left + r.width / 2, r.top + r.height / 2, 'compare');
		onToggleCompare?.();
	}
</script>

<div data-testid="butterfly-graph-surface" class="relative w-full h-full bg-[var(--hud-bg)]/55 flex flex-col overflow-hidden border border-[var(--hud-accent-primary)]/45">
	<HudSurfacePattern patternId={hudWire.surfacePatterns.SUBSTRATE} opacity={hudWire.surfaceOpacity * 0.25} tileScale={hudWire.surfaceScale} />
	<div data-testid="butterfly-sub-toolbar" class="relative z-10 min-h-9 px-3 py-1.5 border-b border-[var(--hud-border)] bg-[var(--hud-panel)]/90 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
		<div class="flex flex-wrap items-center gap-1 min-w-0">
			{#each SUB_MODES as gMode, idx (gMode)}
				<HudChamferButton chamferCorner={idx === 0 ? CHAMFER_PROFILES.CORNER_TOP_LEFT : CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} active={activeSubMode === gMode} variant={activeSubMode === gMode ? 'brass' : 'default'} onclick={() => { activeSubMode = gMode; hudWire.selectView(gMode); }} className="px-2 py-0.5 text-[11px]">{gMode}</HudChamferButton>
			{/each}
			{#if activeSubMode === GRAPH_PROJECTIONS.BUTTERFLY}
				<div class="flex items-center gap-1 px-1 text-[11px]">
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} testid="butterfly-depth-dec" tip="Decrease Hop Depth" onclick={() => hudWire.setButterflyMaxHops(hudWire.butterflyMaxHops - 1)} className="px-1.5 py-0.5 text-[11px]">-</HudChamferButton>
					<span class="text-[var(--hud-accent-primary)] font-bold px-1">Depth {hudWire.butterflyMaxHops}/3</span>
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} testid="butterfly-depth-inc" tip="Increase Hop Depth" onclick={() => hudWire.setButterflyMaxHops(hudWire.butterflyMaxHops + 1)} className="px-1.5 py-0.5 text-[11px]">+</HudChamferButton>
				</div>
			{/if}
			{#if canCompare}<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} active={compareActive} variant={compareActive ? 'nominal' : 'default'} testid="butterfly-compare-btn" onclick={handleCompareClick} className="px-2 py-0.5 text-[11px]">COMPARE</HudChamferButton>{/if}
			<span class="text-[var(--hud-accent-secondary)] font-bold ml-1 truncate max-w-[220px]">{HUD_GLYPHS.FOCAL_RETICLE} {bf?.focalEntity.name ?? 'Focal'}</span>
		</div>
		<div class="flex items-center gap-1 shrink-0">
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} tip="Pan Left" onclick={() => stageCamRef?.panBy(-B.PAN_STEP_X, 0)} className="px-1.5 py-0.5 text-[11px]">←</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} tip="Pan Right" onclick={() => stageCamRef?.panBy(B.PAN_STEP_X, 0)} className="px-1.5 py-0.5 text-[11px]">→</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} tip="Zoom Out" onclick={() => stageCamRef?.stepZoom(-B.ZOOM_STEP)} className="px-1.5 py-0.5 text-[11px]">-</HudChamferButton>
			<span class="px-1 tabular-nums">{Math.round(localCam.zoomScale * HUD_CONFIG.PERCENTAGE_MAX)}%</span>
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} tip="Zoom In" onclick={() => stageCamRef?.stepZoom(B.ZOOM_STEP)} className="px-1.5 py-0.5 text-[11px]">+</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={6} variant="accent" onclick={() => hudWire.triggerCanvasRecenter()} className="px-2.5 py-0.5 text-[11px]">Fit</HudChamferButton>
		</div>
	</div>
	{#if activeSubMode !== GRAPH_PROJECTIONS.BUTTERFLY}
		<div class="relative z-10 flex-1 overflow-hidden"><UmlStudioCanvas {entityId} {nodes} {edges} subMode={activeSubMode} {resetNonce} {onSelectNode} {onCameraChange} /></div>
	{:else if bf}
		<div class="relative z-10 flex-1 overflow-hidden">
			<HudInteractiveCanvasStage boundsWidth={svgW} boundsHeight={svgH} nodeCount={1 + bf.afferentEntries.length + bf.efferentEntries.length} fitKey={`bf-${entityId}-${hudWire.butterflyMaxHops}-${nodes.length}`} {resetNonce} ariaLabel="Interactive Butterfly Graph Canvas" onStageReady={(c) => (stageCamRef = c)} onCameraChange={(c) => { localCam = c; onCameraChange?.(c); }}>
				{#snippet children({ cam })}
					<svg viewBox={`0 0 ${svgW} ${svgH}`} width={svgW} height={svgH} class="select-none" role="img" aria-label={`Butterfly dependency graph for ${bf.focalEntity.name}`}>
						<text x={leftWingX - leftLaneW / 2} y="22" fill="var(--hud-nominal)" font-size="11" font-family="IBM Plex Mono" font-weight="600">◀ INBOUND CALLERS (Ca · H1-{hudWire.butterflyMaxHops})</text>
						<text x={centerX - 68} y="22" fill="var(--hud-accent-secondary)" font-size="11" font-family="IBM Plex Mono" font-weight="600">{HUD_GLYPHS.FOCAL_RETICLE} FOCAL LOCK</text>
						<text x={rightWingX - rightLaneW / 2} y="22" fill="var(--hud-accent-primary)" font-size="11" font-family="IBM Plex Mono" font-weight="600">OUTBOUND TARGETS (Ce · H1-{hudWire.butterflyMaxHops}) ▶</text>
						{#each bf.afferentLanes as lane (lane.moduleLabel + lane.yStart)}
							<rect x={leftWingX - leftLaneW / 2 - 8} y={lane.yStart - 10} width={leftLaneW + 16} height={lane.height + 10} fill="var(--hud-surface)" fill-opacity="0.18" stroke="var(--hud-border)" stroke-dasharray="4 3" />
							<text x={leftWingX - leftLaneW / 2 - 2} y={lane.yStart + 2} fill="var(--hud-muted)" font-size="10" font-family="IBM Plex Mono">{lane.moduleLabel}</text>
						{/each}
						{#each bf.efferentLanes as lane (lane.moduleLabel + lane.yStart)}
							<rect x={rightWingX - rightLaneW / 2 - 8} y={lane.yStart - 10} width={rightLaneW + 16} height={lane.height + 10} fill="var(--hud-surface)" fill-opacity="0.18" stroke="var(--hud-border)" stroke-dasharray="4 3" />
							<text x={rightWingX - rightLaneW / 2 - 2} y={lane.yStart + 2} fill="var(--hud-muted)" font-size="10" font-family="IBM Plex Mono">{lane.moduleLabel}</text>
						{/each}
						{#each bf.afferentEntries as item (item.node.id)}
							{@const fullTitle = `H${item.hop} · ${item.node.name}`}{@const subLabel = `${item.edgeKind} ×${item.callCount} · v(G)=${item.node.cyclomatic}`}{@const nodeW = calcCartridgeWidth(fullTitle, subLabel, leftLaneW)}
							<path d={buildCubicBezierPath({ x: leftWingX + nodeW / 2, y: item.y }, { x: centerX - focalW / 2, y: centerY })} fill="none" stroke={edgeColor(item.edgeKind)} stroke-width={1.5 + Math.min(2.5, item.callCount * 0.6)} stroke-dasharray={item.hop > 1 ? '4 4' : undefined} />
							<HudEntityCartridge entityId={item.node.id} x={leftWingX - nodeW / 2} y={item.y - L.NODE_HALF_HEIGHT} width={nodeW} height={L.NODE_HEIGHT} title={fullTitle} subtitle={subLabel} strokeColor={nodeCompareStroke(item.node.qualifiedName, edgeColor(item.edgeKind))} railColor={edgeColor(item.edgeKind)} onSelect={() => onSelectNode(item.node.id)} />
						{/each}
						<HudEntityCartridge entityId={bf.focalEntity.id} x={centerX - focalW / 2} y={centerY - L.FOCAL_HALF_HEIGHT} width={focalW} height={L.FOCAL_HEIGHT} chamfer={14} isFocal={true} badge={`${HUD_GLYPHS.FOCAL_RETICLE} FOCAL::${bf.focalEntity.kind}`} title={bf.focalEntity.name} subtitle={`LOC:${bf.focalEntity.loc} · v(G):${bf.focalEntity.cyclomatic} · V:${bf.focalEntity.halsteadVolume}`} strokeColor={nodeCompareStroke(bf.focalEntity.qualifiedName, 'var(--hud-accent-primary)')} railColor="var(--hud-accent-secondary)" onDoubleClick={() => cam.focusNodeAt(0, 0)} />
						{#each bf.efferentEntries as item (item.node.id)}
							{@const fullTitle = `H${item.hop} · ${item.node.name}`}{@const subLabel = `${item.edgeKind} ×${item.callCount} · v(G)=${item.node.cyclomatic}`}{@const nodeW = calcCartridgeWidth(fullTitle, subLabel, rightLaneW)}
							<path d={buildCubicBezierPath({ x: centerX + focalW / 2, y: centerY }, { x: rightWingX - nodeW / 2, y: item.y })} fill="none" stroke={edgeColor(item.edgeKind)} stroke-width={1.5 + Math.min(2.5, item.callCount * 0.6)} stroke-dasharray={item.hop > 1 ? '4 4' : undefined} />
							<HudEntityCartridge entityId={item.node.id} x={rightWingX - nodeW / 2} y={item.y - L.NODE_HALF_HEIGHT} width={nodeW} height={L.NODE_HEIGHT} title={fullTitle} subtitle={subLabel} strokeColor={nodeCompareStroke(item.node.qualifiedName, edgeColor(item.edgeKind))} railColor={edgeColor(item.edgeKind)} onSelect={() => onSelectNode(item.node.id)} />
						{/each}
						<g data-testid="butterfly-edge-pills">
							{#each bf.afferentEntries as item (item.node.id)}
								{@const pillLabel = `${item.edgeKind} ×${item.callCount} @L${item.line}`}{@const pillW = Math.max(96, Math.round(pillLabel.length * 6.4 + 16))}
								{@const midX = Math.round((leftWingX + leftLaneW / 2 + 8 + (centerX - focalW / 2)) / 2)}{@const midY = Math.round((item.y + centerY) / 2)}
								<rect x={midX - pillW / 2} y={midY - 9} width={pillW} height="16" rx="2" fill="var(--hud-panel)" fill-opacity="1" stroke={edgeColor(item.edgeKind)} stroke-width="1.2" />
								<text x={midX} y={midY + 2} text-anchor="middle" fill={edgeColor(item.edgeKind)} font-size="9.5" font-family="IBM Plex Mono" font-weight="600">{pillLabel}</text>
							{/each}
							{#each bf.efferentEntries as item (item.node.id)}
								{@const pillLabel = `${item.edgeKind} ×${item.callCount} @L${item.line}`}{@const pillW = Math.max(96, Math.round(pillLabel.length * 6.4 + 16))}
								{@const midX = Math.round((centerX + focalW / 2 + (rightWingX - rightLaneW / 2 - 8)) / 2)}{@const midY = Math.round((item.y + centerY) / 2)}
								<rect x={midX - pillW / 2} y={midY - 9} width={pillW} height="16" rx="2" fill="var(--hud-panel)" fill-opacity="1" stroke={edgeColor(item.edgeKind)} stroke-width="1.2" />
								<text x={midX} y={midY + 2} text-anchor="middle" fill={edgeColor(item.edgeKind)} font-size="9.5" font-family="IBM Plex Mono" font-weight="600">{pillLabel}</text>
							{/each}
						</g>
					</svg>
				{/snippet}
			</HudInteractiveCanvasStage>
		</div>
	{/if}
	<HudContextMenu open={Boolean(stageCamRef?.contextMenu.open)} x={stageCamRef?.contextMenu.x ?? 0} y={stageCamRef?.contextMenu.y ?? 0} targetEntity={ctxEntity} onClose={() => stageCamRef?.closeContextMenu()} {onSelectNode} onResetZoom={() => hudWire.triggerCanvasRecenter()} onFitCorridor={() => hudWire.triggerCanvasRecenter()} onToggleCompare={() => onToggleCompare?.()} onRequestExport={(fmt: ExportFormat) => hudWire.requestExport(fmt)} />
</div>
