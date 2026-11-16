<!--
	@author Oblx <code@oblx.dev>
	@description Industry-Benchmarked Studio UML Workspace wrapped in HudInteractiveCanvasStage with auto-centering & LOD (v2.6.0).
-->
<script lang="ts">
	import { EXPORT_FORMATS, GRAPH_PROJECTIONS, type GraphProjectionMode } from '@config/constants';
	import { CHAMFER_CORNERS, HUD_GLYPHS } from '@config/hud.tokens';
	import { REFERENCE_KINDS } from '@config/metamodel.constants';
	import {
		type GraphEntityNode,
		type GraphReferenceEdge,
		buildBezierSpline,
		buildSharedObjectsProjection,
		buildUmlClassProjection,
		buildUmlSequenceProjection,
		computeContentionRatio,
		computeUmlClassLayout,
		computeUmlSequenceLayout,
		exportMermaidClassDiagram,
		hudWire,
		resolveMemberVisibility,
		visibilityColorVar
	} from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudInteractiveCanvasStage from '../perimeter/HudInteractiveCanvasStage.svelte';

	interface Props { entityId: number; nodes: readonly GraphEntityNode[]; edges: readonly GraphReferenceEdge[]; subMode: GraphProjectionMode; resetNonce?: number; onSelectNode?: (id: number) => void; onCameraChange?: (cam: { panX: number; panY: number; zoomScale: number }) => void; }
	let { entityId, nodes, edges, subMode = GRAPH_PROJECTIONS.UML_CLASS, resetNonce = 0, onSelectNode = () => {}, onCameraChange }: Props = $props();
	let publicOnly = $state(false), hidePrivate = $state(false), showMetrics = $state(true), isolatedStateId = $state<number | null>(null);
	let liveZoom = $state(1);
	let umlSeq = $derived(buildUmlSequenceProjection(entityId, { nodes, edges })), seqLayout = $derived(umlSeq ? computeUmlSequenceLayout(umlSeq) : null);
	let umlClass = $derived(buildUmlClassProjection([], { nodes, edges })), classLayout = $derived(computeUmlClassLayout(umlClass));
	let sharedObjs = $derived(buildSharedObjectsProjection({ nodes, edges })), compactLod = $derived(liveZoom < 0.65);

	function filterMember(name: string): boolean { const vis = resolveMemberVisibility(name); return publicOnly ? vis === '+' : hidePrivate ? vis !== '-' : true; }
	function openInMermaidStudio(): void { hudWire.openMermaidWithDsl(exportMermaidClassDiagram(umlClass)); }
	let boundsW = $derived(subMode === GRAPH_PROJECTIONS.UML_SEQUENCE && seqLayout ? seqLayout.viewWidth : subMode === GRAPH_PROJECTIONS.UML_CLASS ? classLayout.viewWidth : 960);
	let boundsH = $derived(subMode === GRAPH_PROJECTIONS.UML_SEQUENCE && seqLayout ? seqLayout.viewHeight : subMode === GRAPH_PROJECTIONS.UML_CLASS ? classLayout.viewHeight : 540);
	let visibleShared = $derived(isolatedStateId ? sharedObjs.sharedObjects.filter((s) => s.stateEntity.id === isolatedStateId) : sharedObjs.sharedObjects.slice(0, 6));
</script>

<div data-testid="uml-studio-canvas" class="relative w-full h-full flex flex-col overflow-hidden">
	<div class="relative z-10 px-3 py-1 border-b border-[var(--hud-border)]/70 bg-[var(--hud-surface)]/85 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono shrink-0">
		<div class="flex items-center gap-1.5">
			<span class="text-[var(--hud-accent-primary)] font-bold uppercase tracking-wider">STUDIO :: {subMode} {compactLod ? '[LOD:COMPACT]' : ''}</span>
			{#if subMode === GRAPH_PROJECTIONS.UML_CLASS}
				<button type="button" onclick={() => (publicOnly = !publicOnly)} class={`px-2 py-0.5 border cursor-pointer ${publicOnly ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Public Only</button>
				<button type="button" onclick={() => (hidePrivate = !hidePrivate)} class={`px-2 py-0.5 border cursor-pointer ${hidePrivate ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Hide Private</button>
				<button type="button" onclick={() => (showMetrics = !showMetrics)} class={`px-2 py-0.5 border cursor-pointer ${showMetrics ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Show Metrics</button>
			{:else if subMode === GRAPH_PROJECTIONS.SHARED_OBJECTS && isolatedStateId !== null}
				<button type="button" onclick={() => (isolatedStateId = null)} class="px-2 py-0.5 border border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] cursor-pointer">Show All Shared State ✕</button>
			{/if}
		</div>
		<div class="flex items-center gap-1">
			<HudChamferButton chamferCorner={CHAMFER_CORNERS.DIAGONAL_PAIR} cutPx={5} variant="brass" onclick={openInMermaidStudio} className="px-2.5 py-0.5 text-[11px]">Open in Mermaid</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={5} variant="accent" testid="uml-export-puml" onclick={() => hudWire.requestExport(EXPORT_FORMATS.PLANTUML_PUML)} className="px-2 py-0.5 text-[11px]">.puml</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={5} variant="brass" testid="uml-export-mermaid" onclick={() => hudWire.requestExport(EXPORT_FORMATS.MERMAID_CLASS)} className="px-2 py-0.5 text-[11px]">Mermaid</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_CORNERS.BOTTOM_LEFT} cutPx={5} variant="nominal" testid="uml-export-svg" onclick={() => hudWire.requestExport(EXPORT_FORMATS.VECTOR_SVG)} className="px-2 py-0.5 text-[11px]">SVG</HudChamferButton>
		</div>
	</div>
	<div class="relative flex-1 overflow-hidden">
		<HudInteractiveCanvasStage boundsWidth={boundsW} boundsHeight={boundsH} fitKey={`uml-${subMode}-${entityId}-${nodes.length}`} {resetNonce} ariaLabel={`UML Studio ${subMode} Canvas`} onCameraChange={(c) => { liveZoom = c.zoomScale; onCameraChange?.(c); }}>
			{#snippet children()}
				<svg viewBox={`0 0 ${boundsW} ${boundsH}`} width={boundsW} height={boundsH} class="select-none" role="img" aria-label={`UML Studio ${subMode} diagram`}>
					<defs>
						<marker id="uml-hollow-tri" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><polygon points="0,1 9,5 0,9" fill="var(--hud-bg)" stroke="var(--hud-accent-primary)" stroke-width="1.4" /></marker>
						<marker id="uml-open-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><polyline points="1,1 9,5 1,9" fill="none" stroke="var(--hud-accent-secondary)" stroke-width="1.5" /></marker>
						<marker id="uml-return-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><polyline points="1,1 9,5 1,9" fill="none" stroke="var(--hud-muted)" stroke-width="1.3" /></marker>
					</defs>
					{#if subMode === GRAPH_PROJECTIONS.UML_CLASS}
						{#each classLayout.relations as rel (rel.key)}<path d={rel.path} fill="none" stroke={rel.kind === REFERENCE_KINDS.TYPED ? 'var(--hud-accent-secondary)' : 'var(--hud-accent-primary)'} stroke-width="1.6" stroke-dasharray={rel.kind === REFERENCE_KINDS.IMPLEMENTS ? '5 3' : undefined} marker-end={rel.kind === REFERENCE_KINDS.TYPED ? 'url(#uml-open-arrow)' : 'url(#uml-hollow-tri)'} />{/each}
						{#each classLayout.cards as card (card.comp.entity.id)}
							{@const visFields = card.comp.fields.filter((f) => filterMember(f.name)).slice(0, 3)}{@const visMethods = card.comp.methods.filter((m) => filterMember(m.name)).slice(0, 4)}
							<g data-graph-node="true" transform={`translate(${card.x}, ${card.y})`} class="cursor-pointer" role="button" tabindex="0" aria-label={`Inspect UML class ${card.comp.entity.name}`} onclick={() => onSelectNode(card.comp.entity.id)} onkeydown={(e) => e.key === 'Enter' && onSelectNode(card.comp.entity.id)}>
								<polygon points={compactLod ? `0,0 ${card.width - 12},0 ${card.width},12 ${card.width},56 12,56 0,44` : `0,0 ${card.width - 12},0 ${card.width},12 ${card.width},${card.height} 12,${card.height} 0,${card.height - 12}`} fill="var(--hud-panel)" stroke="var(--hud-accent-primary)" stroke-width="1.6" />
								<text x="10" y="15" fill="var(--hud-muted)" font-size="10" font-family="Fira Code, monospace">{card.comp.stereotype} · T{card.comp.tier}</text>
								<text x="10" y="33" fill="var(--hud-accent-secondary)" font-size="12" font-family="Fira Code, monospace" font-weight="700">{HUD_GLYPHS.ENTITY_CLASS} {card.comp.entity.name.slice(0, 24)}</text>
								{#if showMetrics}<text x={card.width - 10} y="15" text-anchor="end" fill="var(--hud-nominal)" font-size="10" font-family="Fira Code, monospace">WMC:{card.comp.entity.cyclomatic} · LOC:{card.comp.entity.loc}</text>{/if}
								{#if !compactLod}
									<line x1="0" y1="42" x2={card.width} y2="42" stroke="var(--hud-accent-primary)" stroke-opacity="0.55" /><line x1="0" y1="100" x2={card.width} y2="100" stroke="var(--hud-border)" />
									{#each visFields as fld, fIdx (fld.id)}{@const vis = resolveMemberVisibility(fld.name)}<text x="10" y={58 + fIdx * 13} fill={visibilityColorVar(vis)} font-size="11" font-family="Fira Code, monospace">{vis}</text><text x="24" y={58 + fIdx * 13} fill="var(--hud-text)" font-size="11" font-family="Fira Code, monospace">{fld.name.slice(0, 22)} : any</text>{/each}
									{#if visFields.length === 0}<text x="10" y="64" fill="var(--hud-muted)" font-size="10" font-family="Fira Code, monospace">(no visible attributes)</text>{/if}
									{#each visMethods as mth, mIdx (mth.id)}{@const vis = resolveMemberVisibility(mth.name)}<text x="10" y={118 + mIdx * 16} fill={visibilityColorVar(vis)} font-size="11" font-family="Fira Code, monospace">{vis}</text><text x="24" y={118 + mIdx * 16} fill="var(--hud-text)" font-size="11" font-family="Fira Code, monospace">{mth.name.slice(0, 20)}()</text><text x={card.width - 10} y={118 + mIdx * 16} text-anchor="end" fill="var(--hud-accent-primary)" font-size="10" font-family="Fira Code, monospace">v(G)={mth.cyclomatic}</text>{/each}
								{/if}
							</g>
						{/each}
					{:else if subMode === GRAPH_PROJECTIONS.UML_SEQUENCE && seqLayout}
						{#each seqLayout.lifelines as lf (lf.id)}{@const hw = Math.round(lf.width / 2)}
							<g class="cursor-pointer" role="button" tabindex="0" onclick={() => onSelectNode(lf.id)} onkeydown={(e) => e.key === 'Enter' && onSelectNode(lf.id)}>
								<polygon points={`${lf.cx - hw},16 ${lf.cx + hw - 10},16 ${lf.cx + hw},26 ${lf.cx + hw},56 ${lf.cx - hw},56`} fill="var(--hud-surface)" stroke="var(--hud-accent-primary)" stroke-width="1.5" />
								<text x={lf.cx - hw + 10} y="32" fill="var(--hud-muted)" font-size="9" font-family="Fira Code, monospace">:{lf.kind}</text>
								<text x={lf.cx - hw + 10} y="48" fill="var(--hud-text)" font-size="11" font-family="Fira Code, monospace" font-weight="700">{lf.name}</text>
								<polygon points={`${lf.cx - hw},${seqLayout.footboxY} ${lf.cx + hw - 10},${seqLayout.footboxY} ${lf.cx + hw},${seqLayout.footboxY + 10} ${lf.cx + hw},${seqLayout.footboxY + 34} ${lf.cx - hw},${seqLayout.footboxY + 34}`} fill="var(--hud-surface)" stroke="var(--hud-border)" stroke-width="1.2" />
								<text x={lf.cx} y={seqLayout.footboxY + 21} text-anchor="middle" fill="var(--hud-muted)" font-size="10" font-family="Fira Code, monospace">{lf.name}</text>
							</g>
							<line x1={lf.cx} y1="56" x2={lf.cx} y2={seqLayout.footboxY} stroke="var(--hud-border)" stroke-dasharray="5 4" />
							<rect x={lf.cx - 5} y="92" width="10" height={Math.max(48, seqLayout.lifelineEndY - 104)} fill="var(--hud-accent-primary)" fill-opacity="0.24" stroke="var(--hud-accent-primary)" stroke-width="1.2" />
						{/each}
						{#each seqLayout.fragments as frag (frag.label)}<rect x={frag.x} y={frag.y} width={frag.width} height={frag.height} fill="none" stroke="var(--hud-accent-secondary)" stroke-dasharray="4 2" /><polygon points={`${frag.x},${frag.y} ${frag.x + 178},${frag.y} ${frag.x + 190},${frag.y + 12} ${frag.x + 190},${frag.y + 24} ${frag.x},${frag.y + 24}`} fill="var(--hud-surface)" stroke="var(--hud-accent-secondary)" /><text x={frag.x + 8} y={frag.y + 16} fill="var(--hud-accent-secondary)" font-size="10" font-family="Fira Code, monospace" font-weight="700">{frag.kind} {frag.label}</text>{/each}
						{#each seqLayout.messages as msg (msg.stepOrder)}
							{#if msg.isSelfCall}<path d={`M ${msg.callerCx + 5} ${msg.y} L ${msg.callerCx + 42} ${msg.y} L ${msg.callerCx + 42} ${msg.y + 16} L ${msg.callerCx + 12} ${msg.y + 16}`} fill="none" stroke="var(--hud-nominal)" stroke-width="1.6" marker-end="url(#uml-open-arrow)" /><rect x={msg.callerCx + 7} y={msg.y + 6} width="10" height="16" fill="var(--hud-accent-secondary)" fill-opacity="0.3" stroke="var(--hud-accent-secondary)" stroke-width="1" /><text x={msg.callerCx + 48} y={msg.y + 11} fill="var(--hud-accent-secondary)" font-size="10" font-family="Fira Code, monospace">{msg.label}</text>
							{:else}<line x1={msg.callerCx} y1={msg.y} x2={msg.calleeCx} y2={msg.y} stroke="var(--hud-nominal)" stroke-width="1.6" marker-end="url(#uml-open-arrow)" /><line x1={msg.calleeCx} y1={msg.returnY} x2={msg.callerCx} y2={msg.returnY} stroke="var(--hud-muted)" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#uml-return-arrow)" /><text x={Math.min(msg.callerCx, msg.calleeCx) + 12} y={msg.y - 6} fill="var(--hud-accent-secondary)" font-size="10.5" font-family="Fira Code, monospace">{msg.label}</text>{/if}
						{/each}
					{:else}
						<text x="64" y="28" fill="var(--hud-warning)" font-size="11" font-family="Fira Code, monospace" font-weight="700">◀ MUTATORS (SETS / MODIFIES)</text><text x="372" y="28" fill="var(--hud-accent-secondary)" font-size="11" font-family="Fira Code, monospace" font-weight="700">◆ SHARED STATE CONTENTION HUB</text><text x="695" y="28" fill="var(--hud-accent-primary)" font-size="11" font-family="Fira Code, monospace" font-weight="700">READERS (USES) ▶</text>
						{#each visibleShared as sh, sIdx (sh.stateEntity.id)}{@const cy = 68 + sIdx * 76}{@const ratio = computeContentionRatio(sh)}
							<g class="cursor-pointer" role="button" tabindex="0" onclick={() => { isolatedStateId = isolatedStateId === sh.stateEntity.id ? null : sh.stateEntity.id; onSelectNode(sh.stateEntity.id); }} onkeydown={(e) => e.key === 'Enter' && onSelectNode(sh.stateEntity.id)}>
								<polygon points={`356,${cy - 25} 592,${cy - 25} 604,${cy - 13} 604,${cy + 25} 356,${cy + 25}`} fill="var(--hud-surface)" stroke={ratio.isHotspot ? 'var(--hud-danger)' : 'var(--hud-warning)'} stroke-width="1.6" />
								<text x="368" y={cy - 7} fill="var(--hud-accent-secondary)" font-size="11" font-family="Fira Code, monospace" font-weight="700">{HUD_GLYPHS.ENTITY_VARIABLE} {sh.stateEntity.name.slice(0, 20)}</text>
								<text x="368" y={cy + 8} fill="var(--hud-muted)" font-size="9.5" font-family="Fira Code, monospace">{sh.mutators.length}w · {sh.readers.length}r · score={sh.contentionScore} {ratio.isHotspot ? '· CONTENTION HOTSPOT' : ''}</text>
								<rect x="368" y={cy + 14} width="220" height="5" fill="var(--hud-accent-primary)" fill-opacity="0.35" /><rect x="368" y={cy + 14} width={Math.round(2.2 * ratio.writePct)} height="5" fill="var(--hud-warning)" />
							</g>
							{#each sh.mutators.slice(0, 2) as mut, mIdx (mut.fn.id)}{@const my = cy - 12 + mIdx * 24}<path d={buildBezierSpline(252, my, 356, cy)} fill="none" stroke="var(--hud-warning)" stroke-width="1.5" stroke-dasharray="5 3" /><rect x="52" y={my - 11} width="200" height="20" fill="var(--hud-panel)" stroke="var(--hud-warning)" /><text x="60" y={my + 3} fill="var(--hud-text)" font-size="10" font-family="Fira Code, monospace">{mut.fn.name.slice(0, 18)} ({mut.referenceKind})</text>{/each}
							{#each sh.readers.slice(0, 2) as rdr, rIdx (rdr.fn.id)}{@const ry = cy - 12 + rIdx * 24}<path d={buildBezierSpline(604, cy, 695, ry)} fill="none" stroke="var(--hud-accent-primary)" stroke-width="1.5" /><rect x="695" y={ry - 11} width="205" height="20" fill="var(--hud-panel)" stroke="var(--hud-accent-primary)" /><text x="703" y={ry + 3} fill="var(--hud-text)" font-size="10" font-family="Fira Code, monospace">{rdr.fn.name.slice(0, 18)} (@L{rdr.line})</text>{/each}
						{/each}
					{/if}
				</svg>
			{/snippet}
		</HudInteractiveCanvasStage>
	</div>
</div>
