<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.1 Interactive Full-Project Codemap Stage: Camera Cluster Parity, Context Menu, 3-Slot Symbol Rows & Port-Anchored Travel Splines.
-->
<script lang="ts">
	import { GRAPH_PROJECTIONS, HUD_VIEWS, type GraphProjectionMode } from '@config/constants';
	import { CHAMFER_CORNERS } from '@config/hud.tokens';
	import { CODEMAP_LOD_TOKENS } from '@config/hud/hud.projections';
	import {
		type CodemapLodTier, type GraphEntityNode, type GraphReferenceEdge,
		buildProjectCodemapProjection, hudWire, navigationSync,
		queryFrustumVisibleIds, resolveCodemapLodTier, traceCodemapEntryPath,
	} from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudContextMenu, { type HudContextMenuItem } from '@client/components/molecules/overlays/HudContextMenu.svelte';
	import HudInteractiveCanvasStage, { type InteractiveStageCamera } from '@client/components/organisms/perimeter/HudInteractiveCanvasStage.svelte';

	interface Props {
		nodes: readonly GraphEntityNode[]; edges: readonly GraphReferenceEdge[]; selectedEntityId: number | null;
		cyclicEntityIds?: ReadonlySet<number>; onSelectEntity: (id: number) => void; onSelectGraphProjection?: (mode: GraphProjectionMode) => void;
	}

	let { nodes, edges, selectedEntityId, cyclicEntityIds = new Set(), onSelectEntity, onSelectGraphProjection }: Props = $props();
	let lodOverride = $state<CodemapLodTier | 'AUTO'>('AUTO');
	let travelMode = $state<boolean>(navigationSync.cursor.codemapTravelMode);
	let camPanX = $state<number>(navigationSync.cursor.codemapPanX), camPanY = $state<number>(navigationSync.cursor.codemapPanY), camZoom = $state<number>(navigationSync.cursor.codemapZoom);
	let stageCamRef = $state<InteractiveStageCamera | null>(null);
	let ctxOpen = $state(false), ctxX = $state(0), ctxY = $state(0), ctxEntityId = $state<number>(1), ctxLabel = $state('Entity');

	let projection = $derived(buildProjectCodemapProjection(nodes, edges, cyclicEntityIds));
	let activeLod = $derived<CodemapLodTier>(lodOverride === 'AUTO' ? resolveCodemapLodTier(camZoom) : lodOverride);
	let visibleIds = $derived(queryFrustumVisibleIds(projection.frustumIndex, { panX: camPanX, panY: camPanY, zoomScale: camZoom, viewportWidth: 1440, viewportHeight: 900 }, CODEMAP_LOD_TOKENS.MAX_DOM_NODES));
	let visibleFiles = $derived(projection.fileContainers.filter((f) => visibleIds.has(f.id)));
	let travelHops = $derived(travelMode ? traceCodemapEntryPath(projection, selectedEntityId) : []);
	let travelHopByEntityId = $derived(new Map(travelHops.map((h) => [h.entityId, h])));
	let ctxItems = $derived<readonly HudContextMenuItem[]>([
		{ id: 'focal', icon: '⌖', label: 'Lock as Focal', shortcut: 'Click', action: () => pickEntity(ctxEntityId) },
		{ id: 'trace', icon: '⚡', label: 'Trace from Entry Point', shortcut: 'T', action: () => { pickEntity(ctxEntityId); travelMode = true; } },
		{ id: 'bfy', icon: '⑂', label: 'Open Butterfly', shortcut: '1', action: () => { pickEntity(ctxEntityId); jumpToView(HUD_VIEWS.BUTTERFLY, GRAPH_PROJECTIONS.BUTTERFLY); } },
		{ id: 'cfg', icon: '⇢', label: 'Open CFG', shortcut: '3', action: () => { pickEntity(ctxEntityId); jumpToView(HUD_VIEWS.CONTROL_FLOW, GRAPH_PROJECTIONS.CONTROL_FLOW); } },
		{ id: 'src', icon: '⌥', label: 'Open Source', shortcut: '9', action: () => { pickEntity(ctxEntityId); jumpToView(HUD_VIEWS.INSPECTOR); } },
		{ id: 'ai', icon: '◈', label: 'Send @Entity to AI', shortcut: '↵', action: () => hudWire.prefillAiPrompt(`/explain @${ctxLabel}`) },
	]);

	function pickEntity(entityId: number, filePath?: string): void {
		onSelectEntity(entityId); navigationSync.selectEntity(entityId, filePath ?? null, 1);
		navigationSync.setCodemapTravel(travelMode, travelHops.map((h) => h.entityId));
	}
	function jumpToView(mode: (typeof HUD_VIEWS)[keyof typeof HUD_VIEWS], proj?: GraphProjectionMode): void {
		navigationSync.recordCamera(HUD_VIEWS.CODEMAP, camPanX, camPanY, camZoom);
		if (proj) onSelectGraphProjection?.(proj);
		hudWire.selectView(mode);
	}
	function toggleTravel(): void { travelMode = !travelMode; navigationSync.setCodemapTravel(travelMode, travelHops.map((h) => h.entityId)); }
	function openCtxMenu(e: MouseEvent, id: number, label: string): void { e.preventDefault(); e.stopPropagation(); ctxEntityId = id; ctxLabel = label; ctxX = e.clientX; ctxY = e.clientY; ctxOpen = true; }
</script>

<section data-testid="codemap-projection-canvas" class="w-full h-full flex flex-col bg-[var(--hud-bg)]/35 font-mono text-xs select-none overflow-hidden">
	<header data-testid="codemap-toolbar" class="px-3 py-1.5 border-b border-[var(--hud-border)] bg-[var(--hud-surface)]/85 flex items-center justify-between gap-2 flex-wrap shrink-0 z-10">
		<div class="flex items-center gap-1.5 flex-wrap">
			<span class="font-bold text-[var(--hud-accent-primary)] uppercase tracking-wider">⚡ Codemap</span>
			<button type="button" data-testid="codemap-travel-toggle" onclick={toggleTravel} class={`px-2 py-0.5 border text-[11px] cursor-pointer ${travelMode ? 'border-[var(--hud-accent-secondary)] bg-[var(--hud-accent-secondary)]/15 text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>
				⚡ Trace from Entry Point ({travelHops.length} Hops)
			</button>
			{#each (['AUTO', 'MACRO', 'MESO', 'MICRO'] as const) as tier (tier)}
				<button type="button" data-testid={`codemap-lod-${tier.toLowerCase()}`} onclick={() => (lodOverride = tier)} class={`px-1.5 py-0.5 border text-[10px] cursor-pointer ${lodOverride === tier ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>{tier === 'AUTO' ? `AUTO (${activeLod})` : tier}</button>
			{/each}
			{#each projection.entryPoints.filter((e) => e.isGenesis).slice(0, 2) as ep (ep.entityId)}
				<button type="button" data-testid={`codemap-entry-chip-${ep.entityId}`} onclick={() => pickEntity(ep.entityId, ep.qualifiedName)} class="px-1.5 py-0.5 border border-[var(--hud-nominal)]/70 bg-[var(--hud-nominal)]/10 text-[10px] text-[var(--hud-nominal)] cursor-pointer truncate max-w-[148px]">⚡ {ep.name}</button>
			{/each}
		</div>
		<div class="flex items-center gap-1.5">
			<button type="button" data-testid="codemap-jump-butterfly" onclick={() => jumpToView(HUD_VIEWS.BUTTERFLY, GRAPH_PROJECTIONS.BUTTERFLY)} class="px-2 py-0.5 border border-[var(--hud-border)] text-[10px] text-[var(--hud-accent-secondary)] cursor-pointer">→ Butterfly</button>
			<button type="button" data-testid="codemap-jump-cfg" onclick={() => jumpToView(HUD_VIEWS.CONTROL_FLOW, GRAPH_PROJECTIONS.CONTROL_FLOW)} class="px-2 py-0.5 border border-[var(--hud-border)] text-[10px] text-[var(--hud-accent-primary)] cursor-pointer">→ CFG</button>
			<button type="button" data-testid="codemap-jump-source" onclick={() => jumpToView(HUD_VIEWS.INSPECTOR)} class="px-2 py-0.5 border border-[var(--hud-border)] text-[10px] text-[var(--hud-text)] cursor-pointer">→ Source</button>
			{#if stageCamRef}
				<div data-testid="codemap-camera-controls" class="flex items-center gap-1 ml-1">
					<HudChamferButton chamferCorner={CHAMFER_CORNERS.BOTTOM_LEFT} cutPx={4} ariaLabel="Pan left" onclick={() => stageCamRef?.panBy(72, 0)} className="px-1.5 py-0.5 text-[10px]">←</HudChamferButton>
					<HudChamferButton chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={4} ariaLabel="Pan right" onclick={() => stageCamRef?.panBy(-72, 0)} className="px-1.5 py-0.5 text-[10px]">→</HudChamferButton>
					<HudChamferButton chamferCorner={CHAMFER_CORNERS.BOTTOM_LEFT} cutPx={4} ariaLabel="Zoom out" onclick={() => stageCamRef?.stepZoom(-0.15)} className="px-1.5 py-0.5 text-[10px]">-</HudChamferButton>
					<span class="px-1 text-[10px] text-[var(--hud-text)] tabular-nums">{Math.round(stageCamRef.zoomScale * 100)}%</span>
					<HudChamferButton chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={4} ariaLabel="Zoom in" onclick={() => stageCamRef?.stepZoom(0.15)} className="px-1.5 py-0.5 text-[10px]">+</HudChamferButton>
					<HudChamferButton chamferCorner={CHAMFER_CORNERS.DIAGONAL_PAIR} cutPx={4} variant="accent" onclick={() => stageCamRef?.resetView()} className="px-2 py-0.5 text-[10px]">Fit</HudChamferButton>
				</div>
			{/if}
		</div>
	</header>

	<div class="flex-1 min-h-0 relative">
		<HudInteractiveCanvasStage ariaLabel="Full-Project Codemap Stage" boundsWidth={projection.worldWidth} boundsHeight={projection.worldHeight} nodeCount={nodes.length} fitKey={`CODEMAP:${selectedEntityId ?? 0}:${projection.fileContainers.length}`} resetNonce={hudWire.canvasResetNonce} onStageReady={(c) => (stageCamRef = c)} onCameraChange={(c) => { camPanX = c.panX; camPanY = c.panY; camZoom = c.zoomScale; navigationSync.recordCamera(HUD_VIEWS.CODEMAP, c.panX, c.panY, c.zoomScale); }}>
			<svg width={projection.worldWidth} height={projection.worldHeight} viewBox={`0 0 ${projection.worldWidth} ${projection.worldHeight}`} class="block select-none">
				<defs><marker id="codemap-hop-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hud-accent-secondary)" /></marker></defs>
				{#each projection.moduleClusters as cluster (cluster.id)}
					<g data-testid={`codemap-cluster-${cluster.dirPath}`}>
						<rect x={cluster.x} y={cluster.y} width={cluster.width} height={cluster.height} rx="4" fill="var(--hud-surface)" fill-opacity="0.32" stroke={cluster.hasCycles ? 'var(--hud-danger)' : cluster.isEntryCluster ? 'var(--hud-nominal)' : 'var(--hud-border)'} stroke-width={cluster.isEntryCluster ? '1.6' : '1'} stroke-dasharray={cluster.hasCycles ? '5 3' : undefined} />
						<text x={cluster.x + 10} y={cluster.y + 18} fill="var(--hud-accent-secondary)" font-size="11" font-weight="bold">RING {cluster.ringDepth} · {cluster.dirPath} ({cluster.fileCount} files · {cluster.totalLoc} LOC)</text>
					</g>
				{/each}
				{#if activeLod === 'MACRO'}
					{#each projection.macroHighways as hwy (hwy.id)}<path d={`M ${hwy.x1} ${hwy.y1} C ${(hwy.x1 + hwy.x2) / 2} ${hwy.y1}, ${(hwy.x1 + hwy.x2) / 2} ${hwy.y2}, ${hwy.x2} ${hwy.y2}`} fill="none" stroke="var(--hud-accent-primary)" stroke-width={hwy.strokeWidth} stroke-opacity="0.65" />{/each}
				{:else}
					{#each projection.mesoEdges.slice(0, 140) as edge (edge.id)}<path d={`M ${edge.x1} ${edge.y1} C ${(edge.x1 + edge.x2) / 2} ${edge.y1}, ${(edge.x1 + edge.x2) / 2} ${edge.y2}, ${edge.x2} ${edge.y2}`} fill="none" stroke="var(--hud-accent-primary)" stroke-width="1.2" stroke-opacity="0.38" />{/each}
				{/if}
				{#each visibleFiles as file (file.id)}
					<g data-testid={`codemap-file-${file.primaryEntityId}`} onclick={() => pickEntity(file.primaryEntityId, file.filePath)} oncontextmenu={(ev) => openCtxMenu(ev, file.primaryEntityId, file.filePath)} onkeydown={(e) => e.key === 'Enter' && pickEntity(file.primaryEntityId, file.filePath)} role="button" tabindex="0" class="cursor-pointer">
						<rect x={file.x} y={file.y} width={file.width} height={activeLod === 'MACRO' ? 48 : file.height} fill="var(--hud-bg)" fill-opacity="0.92" stroke={file.isCyclic ? 'var(--hud-danger)' : file.isEntryFile ? 'var(--hud-nominal)' : 'var(--hud-accent-primary)'} stroke-width={file.symbols.some((s) => s.id === selectedEntityId) ? '2.2' : '1.1'} />
						<text x={file.x + 10} y={file.y + 20} fill="var(--hud-text)" font-size="11" font-weight="bold">{file.isEntryFile ? '⚡ ' : ''}{file.filePath.split('/').pop()}</text>
						<text x={file.x + 10} y={file.y + 38} fill="var(--hud-muted)" font-size="10">GRADE {file.healthGrade} · LOC {file.loc} · v(G) {file.maxCyclomatic}</text>
						{#if activeLod === 'MICRO' || activeLod === 'MESO'}
							{#each file.symbols as sym (sym.id)}
								{@const hop = travelHopByEntityId.get(sym.id)}
								{@const active = sym.id === selectedEntityId || Boolean(hop)}
								{@const displayLabel = hop ? (sym.name.length > 13 ? `${sym.name.slice(0, 12)}…` : sym.name) : sym.name}
								<g data-testid={`codemap-symbol-${sym.id}`} onclick={(ev) => { ev.stopPropagation(); pickEntity(sym.id, sym.filePath); }} oncontextmenu={(ev) => openCtxMenu(ev, sym.id, sym.name)} onkeydown={(ev) => ev.key === 'Enter' && pickEntity(sym.id, sym.filePath)} role="button" tabindex="0">
									<rect x={sym.x} y={sym.y} width={sym.width} height={sym.height} rx="2" fill={active ? 'var(--hud-surface)' : 'var(--hud-bg)'} stroke={sym.id === selectedEntityId ? 'var(--hud-accent-secondary)' : sym.isGenesis ? 'var(--hud-nominal)' : 'var(--hud-border)'} stroke-width={active ? '1.6' : '0.9'} />
									<text x={sym.x + 6} y={sym.y + 16} fill="var(--hud-accent-primary)" font-size="9" font-weight="bold">{sym.kind.slice(0, 3)}</text>
									<text data-testid={`codemap-symbol-name-${sym.id}`} x={sym.x + 34} y={sym.y + 16} fill={sym.id === selectedEntityId ? 'var(--hud-accent-secondary)' : 'var(--hud-text)'} font-size="10">{displayLabel}</text>
									{#if hop}
										{@const badgeW = hop.hopIndex === 0 ? 88 : 54}
										<rect x={sym.x + sym.width - badgeW - 4} y={sym.y + 3} width={badgeW} height={sym.height - 6} rx="2" fill="var(--hud-bg)" stroke="var(--hud-accent-secondary)" stroke-width="1" />
										<text data-testid={`codemap-hop-badge-${hop.hopIndex}`} x={sym.x + sym.width - 8} y={sym.y + 16} text-anchor="end" fill="var(--hud-accent-secondary)" font-size="8.5" font-weight="bold">{hop.badgeText}</text>
									{/if}
								</g>
							{/each}
						{/if}
					</g>
				{/each}
				{#if travelMode && travelHops.length > 0}
					<g data-testid="codemap-travel-spine">
						<g data-testid="codemap-travel-layer">
							{#each travelHops.slice(0, -1) as srcHop, idx (srcHop.hopIndex)}
								{@const dstHop = travelHops[idx + 1]!}
								{@const midX = (srcHop.rowRightX + dstHop.rowLeftX) / 2} {@const midY = (srcHop.rowMidY + dstHop.rowMidY) / 2}
								{@const splineD = `M ${srcHop.rowRightX} ${srcHop.rowMidY} C ${midX} ${srcHop.rowMidY}, ${midX} ${dstHop.rowMidY}, ${dstHop.rowLeftX} ${dstHop.rowMidY}`}
								<path d={splineD} fill="none" stroke="var(--hud-accent-secondary)" stroke-width="4" stroke-opacity="0.3" />
								<path data-testid={`codemap-travel-edge-${idx}`} d={splineD} fill="none" stroke="var(--hud-accent-secondary)" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#codemap-hop-arrow)" />
								<rect x={midX - 30} y={midY - 9} width="60" height="16" rx="3" fill="var(--hud-bg)" stroke="var(--hud-accent-secondary)" stroke-width="1" />
								<text x={midX} y={midY + 3} text-anchor="middle" fill="var(--hud-accent-secondary)" font-size="8.5" font-weight="bold">HOP {srcHop.hopIndex}→{dstHop.hopIndex}</text>
							{/each}
						</g>
					</g>
				{/if}
			</svg>
		</HudInteractiveCanvasStage>
		<HudContextMenu isOpen={ctxOpen} x={ctxX} y={ctxY} title={ctxLabel} items={ctxItems} onClose={() => (ctxOpen = false)} />
	</div>
</section>
