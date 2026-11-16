<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.5.0 Zone 04 RIGHT_EDGE Inspector & Governance Dock with persistent 48px outer mini-rail and slide-from-behind drawer panel.
-->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { EXPORT_FORMATS, GRAPH_ENGINES, HUD_CONFIG, type ExportFormat, type GraphEngineMode } from '@config/constants';
	import { HUD_DISCLOSURE_TIERS, HUD_MODALS, type HudDisclosureTier } from '@config/hud.events';
	import { DOCK_PLACEMENT_MODES, CHAMFER_PROFILES, HULL_PROFILES, HUD_GLYPHS, HUD_ZONE_VISIBILITY, HUD_ZONES } from '@config/hud.tokens';
	import type { AnnotationKind } from '@config/metamodel.constants';
	import type { DeviationTemplateId } from '@config/registries/annotation.templates';
	import { CAPABILITY_BITS } from '@config/security.constants';
	import { formatScaledRatio, hudWire, securityWire, type AuditAnnotationRecord, type CodeCheckViolation, type EntityCkMetrics, type GraphEntityNode, type GraphReferenceEdge } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import MetricGauge from '@client/components/atoms/MetricGauge.svelte';
	import HologramCard from '@client/components/molecules/HologramCard.svelte';
	import CodeCheckDrawer from '@client/components/molecules/overlays/CodeCheckDrawer.svelte';
	import InformationBrowser from '@client/components/organisms/perimeter/InformationBrowser.svelte';

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

	function selectTierTab(tier: HudDisclosureTier, toggleIfSame = false): void {
		if (toggleIfSame && isOpen && hudWire.disclosureTier === tier) { hudWire.setZoneVisibility(HUD_ZONES.RIGHT_EDGE, HUD_ZONE_VISIBILITY.COMPACT); return; }
		hudWire.setDisclosureTier(tier); hudWire.setZoneVisibility(HUD_ZONES.RIGHT_EDGE, HUD_ZONE_VISIBILITY.OPEN);
	}
	function startDockDrag(e: PointerEvent): void { dragging = true; dragOffset = { x: e.clientX - placement.x, y: e.clientY - placement.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
	function moveDockDrag(e: PointerEvent): void { if (dragging) hudWire.moveFloatingDock('RIGHT_EDGE', e.clientX - dragOffset.x, e.clientY - dragOffset.y, window.innerWidth, window.innerHeight); }
</script>

<aside aria-label="Entity Telemetry and Governance Inspector" data-help-target="RIGHT_IB_TELEMETRY" data-hud-zone={HUD_ZONES.RIGHT_EDGE} data-dock-mode={placement.mode} data-drawer-mode={hudWire.edgeDrawerMode} inert={isFolded} style={isFloating && !isFolded ? `transform: translate3d(${placement.x}px, ${placement.y}px, 0); opacity: 1;` : hudWire.zoneStyle(HUD_ZONES.RIGHT_EDGE)} class={`${isFloating ? 'fixed top-0 left-0 h-[460px] z-30' : 'fixed right-3 top-1/2 h-auto max-h-[calc(100vh-320px)] z-25 hud-zone-transition'} flex items-center gap-3 ${isFolded ? 'pointer-events-none' : 'pointer-events-auto'}`}>
	<!-- Slide-From-Behind Unfolded Drawer Panel -->
	{#if isOpen}
		<div data-testid="right-drawer-panel" in:fly={{ x: 18, duration: dur }} out:fade={{ duration: dur }} class="hud-track-w max-h-[calc(100vh-320px)] flex flex-col z-10">
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_CORNER_POD} chevrons={false} className="w-full max-h-[calc(100vh-320px)] flex flex-col" contentClassName="flex flex-col min-h-0 max-h-[calc(100vh-320px)]">
				<div class="flex flex-col min-h-0 max-h-[calc(100vh-320px)]">
					<div role="toolbar" tabindex="-1" onpointerdown={startDockDrag} onpointermove={moveDockDrag} onpointerup={() => (dragging = false)} class="shrink-0 pl-3 pr-4 pt-3 pb-2.5 border-b border-[var(--hud-border)] bg-[var(--hud-surface)]/80 flex items-center justify-between gap-1 font-mono text-[10px] leading-4 cursor-grab active:cursor-grabbing">
						<div class="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
							<span class="text-[var(--hud-muted)] mr-0.5 shrink-0" data-hud-tip="Drag to float dock">⋮⋮</span>
							<button type="button" onclick={() => selectTierTab(HUD_DISCLOSURE_TIERS.TIER_1_VERDICT)} class={`px-1.5 py-0.5 border whitespace-nowrap cursor-pointer hud-hover-lift ${hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_1_VERDICT ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Verdict</button>
							<button type="button" onclick={() => selectTierTab(HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY)} class={`px-1.5 py-0.5 border whitespace-nowrap cursor-pointer hud-hover-lift ${hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Relations</button>
							<button type="button" onclick={() => selectTierTab(HUD_DISCLOSURE_TIERS.TIER_3_FORENSIC)} class={`px-1.5 py-0.5 border whitespace-nowrap cursor-pointer hud-hover-lift ${hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_3_FORENSIC ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Forensic</button>
						</div>
						<div class="flex items-center gap-1 shrink-0 mr-1">
							<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={5} variant={isFloating ? 'accent' : 'default'} testid="right-dock-float-toggle" tip={isFloating ? 'Snap to Right Rail' : 'Detach Floating Dock'} onclick={() => hudWire.toggleDockFloat('RIGHT_EDGE')} className="px-2 py-0.5 text-[10px] shrink-0">{isFloating ? 'PIN' : 'FLOAT'}</HudChamferButton>
						</div>
					</div>
					<div class="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2.5">
						{#if hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_1_VERDICT}
							<div class="border-b border-[var(--hud-border)] pb-2">
								<span class="font-mono text-[11px] leading-4 uppercase tracking-widest text-[var(--hud-accent-secondary)]">{HUD_GLYPHS.ENTITY_FUNCTION} {entity.kind} · ID #{entity.id}</span>
								<h2 class="font-display text-lg font-bold text-[var(--hud-text)] truncate" data-hud-tip={entity.qualifiedName}>{entity.name}</h2>
								<span class={`inline-block mt-1 px-1.5 py-0.5 font-mono text-[11px] leading-4 border ${entityViolations.length > 0 ? 'border-[var(--hud-warning)] text-[var(--hud-warning)]' : 'border-[var(--hud-nominal)] text-[var(--hud-nominal)]'}`}>{entityViolations.length > 0 ? `${entityViolations.length} Rule Flag(s)` : 'Governance Nominal'}</span>
							</div>
							<dl class="grid grid-cols-3 gap-1.5 font-mono text-xs hud-z1-entity p-2 border border-[var(--hud-border)] tabular-nums">
								<div><dt class="text-[11px] text-[var(--hud-muted)]">v(G)</dt><dd class="font-bold text-[var(--hud-text)]">{entity.cyclomatic}</dd></div>
								<div><dt class="text-[11px] text-[var(--hud-muted)]">LCOM4</dt><dd class="font-bold text-[var(--hud-text)]">{lcomScore}</dd></div>
								<div><dt class="text-[11px] text-[var(--hud-muted)]">Instab</dt><dd class="font-bold text-[var(--hud-accent-secondary)]">{formatScaledRatio(entity.instability, HUD_CONFIG.PRECISION_SCALE)}</dd></div>
							</dl>
							<div class="flex flex-col gap-1.5 font-mono text-xs leading-4">
								<button type="button" onclick={() => selectTierTab(HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY)} class="w-full px-2.5 py-1.5 text-left border border-[var(--hud-border)] hud-z1-entity hud-hover-lift text-[var(--hud-text)] cursor-pointer">Explore IB Relations →</button>
								<button type="button" onclick={() => selectTierTab(HUD_DISCLOSURE_TIERS.TIER_3_FORENSIC)} class="w-full px-2.5 py-1.5 text-left border border-[var(--hud-border)] hud-z1-entity hud-hover-lift text-[var(--hud-accent-primary)] cursor-pointer">Open Forensic Metrics &amp; Export →</button>
								{#if securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF)}<button type="button" onclick={() => hudWire.openModal(HUD_MODALS.DEVIATION_SIGN_OFF)} class="w-full px-2.5 py-1.5 text-left border border-[var(--hud-accent-secondary)] bg-[var(--hud-bg)]/80 hud-glint-trigger text-[var(--hud-warning)] cursor-pointer">Record Deviation Sign-Off (Atn)</button>{/if}
							</div>
						{:else if hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY}
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
									<div class="flex items-center justify-between"><span class="text-[11px] text-[var(--hud-muted)]">EXPORTERS &amp; AUDIT</span>{#if securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF)}<button type="button" onclick={() => hudWire.openModal(HUD_MODALS.DEVIATION_SIGN_OFF)} class="text-[11px] text-[var(--hud-warning)] underline cursor-pointer">Sign-Off Atn</button>{/if}</div>
									<div class="grid grid-cols-4 gap-1">
										<button type="button" onclick={() => onExport(EXPORT_FORMATS.SARIF_210)} class="px-1.5 py-1 text-[11px] bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-danger)] cursor-pointer hud-hover-lift">SARIF</button>
										<button type="button" onclick={() => onExport(EXPORT_FORMATS.VECTOR_SVG)} class="px-1.5 py-1 text-[11px] bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-accent-primary)] cursor-pointer hud-hover-lift">SVG</button>
										<button type="button" onclick={() => onExport(EXPORT_FORMATS.GRAPHVIZ_DOT)} class="px-1.5 py-1 text-[11px] bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-nominal)] cursor-pointer hud-hover-lift">DOT</button>
										<button type="button" onclick={() => onExport(EXPORT_FORMATS.COMPLIANCE_HTML)} class="px-1.5 py-1 text-[11px] bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-warning)] cursor-pointer hud-hover-lift">HTML</button>
									</div>
									{#if exportedPayloadPreview}
										<div class="border border-[var(--hud-border)] bg-[var(--hud-bg)] p-2"><div class="flex items-center justify-between text-[11px] text-[var(--hud-muted)] mb-1"><span>Export Output</span><button type="button" onclick={onClearExportPreview} class="text-[var(--hud-accent-primary)] cursor-pointer">Close</button></div><pre class="text-[11px] max-h-24 overflow-auto">{exportedPayloadPreview}</pre></div>
									{/if}
								</div>
							{/if}
						{/if}
					</div>
				</div>
			</HudChamferFrame>
		</div>
	{/if}

	<!-- Persistent 48px Outer Mini-Rail -->
	<div data-testid="right-mini-rail" class="hud-rail-w shrink-0 z-20">
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={false} className="w-full p-1.5 py-2 font-mono text-[11px] leading-4">
			<div class="flex flex-col items-center gap-2">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.TOP_CAP_CHAMFER} cutPx={6} variant="brass" testid="right-rail-expand-btn" tip={isOpen ? 'Collapse Inspector' : 'Expand Inspector'} ariaLabel={isOpen ? 'Collapse telemetry inspector' : 'Expand telemetry inspector'} onclick={() => hudWire.toggleEdgeZone(HUD_ZONES.RIGHT_EDGE)} className="w-8 h-7 font-bold">{isOpen ? '»' : '«'}</HudChamferButton>
				<button type="button" data-testid="right-rail-float-toggle" data-hud-tip={isFloating ? 'Dock to Rail' : 'Float Rail'} onclick={() => hudWire.toggleDockFloat('RIGHT_EDGE')} class="w-7 h-5 border border-[var(--hud-border)] text-[9px] text-[var(--hud-muted)] cursor-pointer">⋮⋮</button>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isOpen && hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_1_VERDICT} variant={isOpen && hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_1_VERDICT ? 'brass' : 'default'} onclick={() => selectTierTab(HUD_DISCLOSURE_TIERS.TIER_1_VERDICT, true)} tip="Tier 1 Verdict" ariaLabel="1 Verdict" className="w-8 h-7">1</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isOpen && hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY} variant={isOpen && hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY ? 'accent' : 'default'} onclick={() => selectTierTab(HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY, true)} tip="Tier 2 IB Relations" ariaLabel="2 Relations" className="w-8 h-7 text-[var(--hud-accent-primary)]">2</HudChamferButton>
				<HudChamferButton chamferCorner={securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF) ? CHAMFER_PROFILES.INTERIOR_CHAMFER : CHAMFER_PROFILES.BOTTOM_CAP_CHAMFER} cutPx={securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF) ? 4 : 6} active={isOpen && hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_3_FORENSIC} variant={isOpen && hudWire.disclosureTier === HUD_DISCLOSURE_TIERS.TIER_3_FORENSIC ? 'nominal' : 'default'} testid={!securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF) ? 'right-rail-bottom-cap' : undefined} onclick={() => selectTierTab(HUD_DISCLOSURE_TIERS.TIER_3_FORENSIC, true)} tip="Tier 3 Forensic Metrics" ariaLabel="3 Forensic" className="w-8 h-7 text-[var(--hud-nominal)]">3</HudChamferButton>
				{#if securityWire.can(CAPABILITY_BITS.DEVIATION_SIGN_OFF)}<HudChamferButton chamferCorner={CHAMFER_PROFILES.BOTTOM_CAP_CHAMFER} cutPx={6} variant="brass" testid="right-rail-bottom-cap" ariaLabel="Record Deviation Sign-Off" tip="Deviation Sign-Off" onclick={() => hudWire.openModal(HUD_MODALS.DEVIATION_SIGN_OFF)} className="w-8 h-7 mt-0.5 font-bold">✎</HudChamferButton>{/if}
			</div>
		</HudChamferFrame>
	</div>
</aside>
