<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Zone 04 RIGHT_EDGE Inspector & Governance Dock with persistent 3rem outer mini-rail, Dotted Grip drag/float mechanics & chamfered action buttons.
-->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { EXPORT_FORMATS, GRAPH_ENGINES, HUD_CONFIG, type ExportFormat, type GraphEngineMode } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { DOCK_PLACEMENT_MODES, CHAMFER_PROFILES, HULL_PROFILES, HUD_GLYPHS, HUD_ZONE_VISIBILITY, HUD_ZONES, ZONE_CORNER_TUPLES } from '@config/hud.tokens';
	import type { AnnotationKind } from '@config/metamodel.constants';
	import type { DeviationTemplateId } from '@config/registries/annotation.templates';
	import { CAPABILITY_BITS } from '@config/security.constants';
	import { formatScaledRatio, hudWire, securityWire, type AuditAnnotationRecord, type CodeCheckViolation, type EntityCkMetrics, type GraphEntityNode, type GraphReferenceEdge, type RightEdgeDrawerTab } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudIcon from '@client/components/atoms/HudIcon.svelte';
	import MetricGauge from '@client/components/atoms/MetricGauge.svelte';
	import HologramCard from '@client/components/molecules/HologramCard.svelte';
	import HudAnimatedResizeBody from '@client/components/molecules/HudAnimatedResizeBody.svelte';
	import CodeCheckDrawer from '@client/components/molecules/overlays/CodeCheckDrawer.svelte';
	import InformationBrowser from '@client/components/organisms/perimeter/InformationBrowser.svelte';
	import { UI_SPOTLIGHT_TARGETS, uiDrawerGrip, uiSpotlight } from '@ui';

	interface Props {
		entity: GraphEntityNode; nodes: readonly GraphEntityNode[]; edges: readonly GraphReferenceEdge[]; ckMetrics?: EntityCkMetrics; lcomScore: number; sourceByteLength: number;
		violations: readonly CodeCheckViolation[]; suppressedCount: number; useHisSafetyProfile: boolean; auditAnnotations: readonly AuditAnnotationRecord[];
		graphEngine: GraphEngineMode; activeCentrality: number; exportedPayloadPreview: string; onSelectEntity: (id: number, line?: number) => void; onToggleHisProfile: () => void;
		onImportSarifJson: (raw: string) => void; onExport: (format: ExportFormat) => Promise<void>; onClearExportPreview: () => void;
		onAddAnnotation: (tagKind: AnnotationKind, note: string, ruleCode: string | null, templateId?: DeviationTemplateId | null, ticketId?: string | null) => void;
	}
	let { entity, nodes, edges, ckMetrics, lcomScore, sourceByteLength, violations, suppressedCount, useHisSafetyProfile, auditAnnotations, graphEngine, activeCentrality, exportedPayloadPreview, onSelectEntity, onToggleHisProfile, onImportSarifJson, onExport, onClearExportPreview, onAddAnnotation }: Props = $props();
	let isFolded = $derived(hudWire.isZoneFolded(HUD_ZONES.RIGHT_EDGE)), isOpen = $derived(hudWire.zoneStates[HUD_ZONES.RIGHT_EDGE] === HUD_ZONE_VISIBILITY.OPEN);
	let placement = $derived(hudWire.dockPlacements.RIGHT_EDGE), isFloating = $derived(placement.mode === DOCK_PLACEMENT_MODES.FLOATING_PANEL);
	let entityViolations = $derived(violations.filter((v) => v.entityId === entity.id)), dur = $derived(hudWire.kineticMotionEnabled ? 200 : 0);
	let dragging = $state(false), dragOffset = { x: 0, y: 0 };

	function selectRightTab(tab: RightEdgeDrawerTab, toggleIfSame = false): void {
		if (toggleIfSame && isOpen && hudWire.rightEdgeActiveTab === tab) { hudWire.setZoneVisibility(HUD_ZONES.RIGHT_EDGE, HUD_ZONE_VISIBILITY.COMPACT); return; }
		hudWire.setRightDrawerTab(tab, true);
	}
	function startDockDrag(e: PointerEvent): void { if ((e.target as HTMLElement | null)?.closest('button, [data-grip-control]')) return; dragging = true; dragOffset = { x: e.clientX - placement.x, y: e.clientY - placement.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
	function moveDockDrag(e: PointerEvent): void { if (dragging) hudWire.moveFloatingDock('RIGHT_EDGE', e.clientX - dragOffset.x, e.clientY - dragOffset.y, window.innerWidth, window.innerHeight); }
</script>

<aside use:uiSpotlight={UI_SPOTLIGHT_TARGETS.RIGHT_EDGE_RAIL} aria-label="Entity Telemetry and Governance Inspector" data-help-target="RIGHT_IB_TELEMETRY" data-hud-zone={HUD_ZONES.RIGHT_EDGE} data-dock-mode={placement.mode} data-drawer-mode={hudWire.edgeDrawerMode} inert={isFolded} style={isFloating && !isFolded ? `transform: translate3d(${placement.x}px, ${placement.y}px, 0); opacity: 1;` : hudWire.zoneStyle(HUD_ZONES.RIGHT_EDGE)} class={`${isFloating ? 'fixed top-0 left-0 h-[28.75rem] z-30' : 'fixed right-3 top-1/2 h-auto max-h-[calc(100vh-20rem)] z-25 hud-zone-transition'} flex items-center gap-3 ${isFolded ? 'pointer-events-none' : 'pointer-events-auto'}`}>
	{#if isOpen}
		<div data-testid="right-drawer-panel" in:fly={{ x: 18, duration: dur }} out:fade={{ duration: dur }} class="hud-track-w max-h-[calc(100vh-20rem)] flex flex-col z-10">
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER} chevrons={false} className="w-full max-h-[calc(100vh-20rem)] flex flex-col" contentClassName="flex flex-col min-h-0 max-h-[calc(100vh-20rem)]">
				<div class="flex flex-col min-h-0 max-h-[calc(100vh-20rem)]">
					<div role="toolbar" tabindex="-1" onpointerdown={startDockDrag} onpointermove={moveDockDrag} onpointerup={() => (dragging = false)} class="shrink-0 pl-3 pr-4 pt-3 pb-2.5 border-b border-[var(--hud-border)] bg-[var(--hud-surface)]/80 flex items-center justify-between gap-1 font-mono text-[0.625rem] leading-4 cursor-grab active:cursor-grabbing">
						<div role="tablist" aria-label="Inspector Disclosure Tiers" class="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
							<button type="button" role="tab" data-testid="right-drawer-tab-verdict" aria-selected={hudWire.rightEdgeActiveTab === 'VERDICT'} onclick={() => selectRightTab('VERDICT')} class={`px-1.5 py-0.5 border whitespace-nowrap cursor-pointer hud-hover-lift ${hudWire.rightEdgeActiveTab === 'VERDICT' ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Verdict</button>
							<button type="button" role="tab" data-testid="right-drawer-tab-relations" aria-selected={hudWire.rightEdgeActiveTab === 'RELATIONS'} onclick={() => selectRightTab('RELATIONS')} class={`px-1.5 py-0.5 border whitespace-nowrap cursor-pointer hud-hover-lift ${hudWire.rightEdgeActiveTab === 'RELATIONS' ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Relations</button>
							<button type="button" role="tab" data-testid="right-drawer-tab-forensic" aria-selected={hudWire.rightEdgeActiveTab === 'FORENSIC'} onclick={() => selectRightTab('FORENSIC')} class={`px-1.5 py-0.5 border whitespace-nowrap cursor-pointer hud-hover-lift ${hudWire.rightEdgeActiveTab === 'FORENSIC' ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Forensic</button>
						</div>
						<div
							data-grip-control="true"
							class="flex items-center gap-1 shrink-0 mr-1"
							use:uiDrawerGrip={{
								side: 'RIGHT',
								mode: 'DRAWER',
								getInitialOffsetRem: () => ({ xRem: placement.x / 16, yRem: placement.y / 16, railOffsetYRem: placement.railOffsetYRem }),
								onToggleFloat: () => hudWire.toggleDockFloat('RIGHT_EDGE'),
								onMoveDrawer: (_s, xRem, yRem) => hudWire.moveFloatingDock('RIGHT_EDGE', xRem * 16, yRem * 16, typeof window !== 'undefined' ? window.innerWidth : 1440, typeof window !== 'undefined' ? window.innerHeight : 900),
							}}
						>
							<HudChamferButton corners={ZONE_CORNER_TUPLES.RADAR_TOP_RIGHT} cutPx={5} active={isFloating} variant={isFloating ? 'accent' : 'default'} testid="right-dock-float-toggle" ariaLabel="Right Drawer Dotted Grip" tip={isFloating ? 'Click to Dock · Drag to Move' : 'Click to Float · Drag to Detach'} className="px-2 py-1 shrink-0 cursor-grab active:cursor-grabbing"><HudIcon name="grip" sizeRem={0.8125} /></HudChamferButton>
						</div>
					</div>
					<div class="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2.5">
						<HudAnimatedResizeBody transitionKey={hudWire.rightEdgeActiveTab} className="w-full" innerClassName="flex flex-col gap-2.5">
							{#if hudWire.rightEdgeActiveTab === 'VERDICT'}
								<div class="border-b border-[var(--hud-border)] pb-2">
									<span class="font-mono text-[0.6875rem] leading-4 uppercase tracking-widest text-[var(--hud-accent-secondary)]">{HUD_GLYPHS.ENTITY_FUNCTION} {entity.kind} · ID #{entity.id}</span>
									<h2 class="font-display text-lg font-bold text-[var(--hud-text)] truncate" data-hud-tip={entity.qualifiedName}>{entity.name}</h2>
									<span class={`inline-block mt-1 px-1.5 py-0.5 font-mono text-[0.6875rem] leading-4 border ${entityViolations.length > 0 ? 'border-[var(--hud-warning)] text-[var(--hud-warning)]' : 'border-[var(--hud-nominal)] text-[var(--hud-nominal)]'}`}>{entityViolations.length > 0 ? `${entityViolations.length} Rule Flag(s)` : 'Governance Nominal'}</span>
								</div>
								<dl class="grid grid-cols-3 gap-1.5 font-mono text-xs hud-z1-entity p-2 border border-[var(--hud-border)] tabular-nums">
									<div><dt class="text-[0.6875rem] text-[var(--hud-muted)]">v(G)</dt><dd class="font-bold text-[var(--hud-text)]">{entity.cyclomatic}</dd></div>
									<div><dt class="text-[0.6875rem] text-[var(--hud-muted)]">LCOM4</dt><dd class="font-bold text-[var(--hud-text)]">{lcomScore}</dd></div>
									<div><dt class="text-[0.6875rem] text-[var(--hud-muted)]">Instab</dt><dd class="font-bold text-[var(--hud-accent-secondary)]">{formatScaledRatio(entity.instability, HUD_CONFIG.PRECISION_SCALE)}</dd></div>
								</dl>
								<div class="flex flex-col gap-1.5 font-mono text-xs leading-4">
									<HudChamferButton corners={ZONE_CORNER_TUPLES.DIAGONAL_CHAMFER} cutPx={6} testid="right-explore-relations-btn" onclick={() => selectRightTab('RELATIONS')} className="w-full px-2.5 py-1.5 justify-between whitespace-nowrap text-left">Explore IB Relations →</HudChamferButton>
									<HudChamferButton corners={ZONE_CORNER_TUPLES.DIAGONAL_CHAMFER} cutPx={6} variant="accent" testid="right-open-forensic-btn" onclick={() => selectRightTab('FORENSIC')} className="w-full px-2.5 py-1.5 justify-between whitespace-nowrap text-left">Forensic Metrics &amp; Export →</HudChamferButton>
									{#if securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF)}<HudChamferButton corners={ZONE_CORNER_TUPLES.DIAGONAL_CHAMFER} cutPx={6} variant="brass" onclick={() => hudWire.openModal(HUD_MODALS.DEVIATION_SIGN_OFF)} className="w-full px-2.5 py-1.5 justify-between whitespace-nowrap text-left">Record Deviation Sign-Off (Atn)</HudChamferButton>{/if}
								</div>
							{:else if hudWire.rightEdgeActiveTab === 'RELATIONS'}
								<InformationBrowser {entity} {nodes} {edges} {ckMetrics} annotations={auditAnnotations} {onAddAnnotation} {onSelectEntity} />
							{:else}
								<HologramCard {entity} {lcomScore} {sourceByteLength} />
								<MetricGauge label="Cyclomatic Complexity" value={entity.cyclomatic} thresholdWarning={HUD_CONFIG.METRIC_THRESHOLDS.COMPLEXITY_WARNING} thresholdCritical={HUD_CONFIG.METRIC_THRESHOLDS.COMPLEXITY_CRITICAL} />
								<MetricGauge label="Architectural Instability" value={entity.instability / HUD_CONFIG.PRECISION_SCALE} thresholdWarning={HUD_CONFIG.METRIC_THRESHOLDS.INSTABILITY_WARNING} thresholdCritical={HUD_CONFIG.METRIC_THRESHOLDS.INSTABILITY_CRITICAL} />
								{#if graphEngine === GRAPH_ENGINES.MEMGRAPH_BOLT}
									<div class="px-2.5 py-1.5 border border-[var(--hud-accent-primary)]/50 bg-[var(--hud-surface)] text-xs font-mono flex items-center justify-between"><span class="text-[var(--hud-muted)]">MAGE Betweenness</span><span class="text-[var(--hud-accent-secondary)] font-bold">{activeCentrality}</span></div>
								{/if}
								<CodeCheckDrawer {violations} {suppressedCount} {useHisSafetyProfile} {onToggleHisProfile} {onImportSarifJson} {onSelectEntity} />
								{#if securityWire.can(CAPABILITY_BITS.EXPORT_ARTIFACTS)}
									<div data-help-target="EXPORTERS_DOCK" class="border-t border-[var(--hud-border)] pt-2 flex flex-col gap-1.5 font-mono">
										<div class="flex items-center justify-between"><span class="text-[0.6875rem] text-[var(--hud-muted)]">EXPORTERS &amp; AUDIT</span>{#if securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF)}<button type="button" onclick={() => hudWire.openModal(HUD_MODALS.DEVIATION_SIGN_OFF)} class="text-[0.6875rem] text-[var(--hud-warning)] underline cursor-pointer">Sign-Off Atn</button>{/if}</div>
										<div class="grid grid-cols-4 gap-1">
											<button type="button" onclick={() => onExport(EXPORT_FORMATS.SARIF_210)} class="px-1.5 py-1 text-[0.6875rem] bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-danger)] cursor-pointer hud-hover-lift">SARIF</button>
											<button type="button" onclick={() => onExport(EXPORT_FORMATS.VECTOR_SVG)} class="px-1.5 py-1 text-[0.6875rem] bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-accent-primary)] cursor-pointer hud-hover-lift">SVG</button>
											<button type="button" onclick={() => onExport(EXPORT_FORMATS.GRAPHVIZ_DOT)} class="px-1.5 py-1 text-[0.6875rem] bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-nominal)] cursor-pointer hud-hover-lift">DOT</button>
											<button type="button" onclick={() => onExport(EXPORT_FORMATS.COMPLIANCE_HTML)} class="px-1.5 py-1 text-[0.6875rem] bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-warning)] cursor-pointer hud-hover-lift">HTML</button>
										</div>
										{#if exportedPayloadPreview}
											<div class="border border-[var(--hud-border)] bg-[var(--hud-bg)] p-2"><div class="flex items-center justify-between text-[0.6875rem] text-[var(--hud-muted)] mb-1"><span>Export Output</span><button type="button" onclick={onClearExportPreview} class="text-[var(--hud-accent-primary)] cursor-pointer">Close</button></div><pre class="text-[0.6875rem] max-h-24 overflow-auto">{exportedPayloadPreview}</pre></div>
										{/if}
									</div>
								{/if}
							{/if}
						</HudAnimatedResizeBody>
					</div>
				</div>
			</HudChamferFrame>
		</div>
	{/if}

	<div data-testid="right-mini-rail" class="hud-rail-w shrink-0 z-20">
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER} chevrons={false} className="w-full p-1.5 py-2 font-mono text-[0.6875rem] leading-4">
			<div class="flex flex-col items-center gap-2">
				<HudChamferButton corners={ZONE_CORNER_TUPLES.RAIL_TOP_CAP} cutPx={6} variant="brass" testid="right-rail-expand-btn" tip={isOpen ? 'Collapse Inspector' : 'Expand Inspector'} ariaLabel={isOpen ? 'Collapse telemetry inspector' : 'Expand telemetry inspector'} onclick={() => hudWire.toggleEdgeZone(HUD_ZONES.RIGHT_EDGE)} className="w-8 h-7 font-bold">{isOpen ? '»' : '«'}</HudChamferButton>
				<div
					data-grip-control="true"
					use:uiDrawerGrip={{
						side: 'RIGHT',
						mode: 'RAIL',
						getInitialOffsetRem: () => ({ xRem: placement.x / 16, yRem: placement.y / 16, railOffsetYRem: placement.railOffsetYRem }),
						onToggleFloat: () => hudWire.toggleDockFloat('RIGHT_EDGE'),
						onMoveRail: (_s, nextYRem) => hudWire.moveEdgeRail('RIGHT', nextYRem, typeof window !== 'undefined' ? window.innerHeight : 900),
					}}
				>
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isFloating} variant={isFloating ? 'accent' : 'default'} testid="right-rail-float-toggle" ariaLabel="Right Rail Dotted Grip" tip={isFloating ? 'Click to Dock · Drag Vertically' : 'Click to Float · Drag Vertically'} className="w-8 h-6 cursor-grab active:cursor-grabbing"><HudIcon name="grip" sizeRem={0.8125} /></HudChamferButton>
				</div>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isOpen && hudWire.rightEdgeActiveTab === 'VERDICT'} variant={isOpen && hudWire.rightEdgeActiveTab === 'VERDICT' ? 'brass' : 'default'} testid="right-rail-tier-1" onclick={() => selectRightTab('VERDICT', true)} tip="Tier 1 Verdict" ariaLabel="1 Verdict" className="w-8 h-7">1</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isOpen && hudWire.rightEdgeActiveTab === 'RELATIONS'} variant={isOpen && hudWire.rightEdgeActiveTab === 'RELATIONS' ? 'accent' : 'default'} testid="right-rail-tier-2" onclick={() => selectRightTab('RELATIONS', true)} tip="Tier 2 IB Relations" ariaLabel="2 Relations" className="w-8 h-7 text-[var(--hud-accent-primary)]">2</HudChamferButton>
				<HudChamferButton corners={securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF) ? ZONE_CORNER_TUPLES.DIAGONAL_CHAMFER : ZONE_CORNER_TUPLES.RAIL_BOTTOM_CAP} cutPx={securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF) ? 4 : 6} active={isOpen && hudWire.rightEdgeActiveTab === 'FORENSIC'} variant={isOpen && hudWire.rightEdgeActiveTab === 'FORENSIC' ? 'nominal' : 'default'} testid={!securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF) ? 'right-rail-bottom-cap' : 'right-rail-tier-3'} onclick={() => selectRightTab('FORENSIC', true)} tip="Tier 3 Forensic Metrics" ariaLabel="3 Forensic" className="w-8 h-7 text-[var(--hud-nominal)]">3</HudChamferButton>
				{#if securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF)}<HudChamferButton corners={ZONE_CORNER_TUPLES.RAIL_BOTTOM_CAP} cutPx={6} variant="brass" testid="right-rail-bottom-cap" ariaLabel="Record Deviation Sign-Off" tip="Deviation Sign-Off" onclick={() => hudWire.openModal(HUD_MODALS.DEVIATION_SIGN_OFF)} className="w-8 h-7 mt-0.5 font-bold">✎</HudChamferButton>{/if}
			</div>
		</HudChamferFrame>
	</div>
</aside>
