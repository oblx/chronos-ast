<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.7 4-Stage Horizontal Data-Flow Pipeline (Ingress -> SETS -> MODIFIES -> USES/CALLS) with stage/hazard filter & FOCUS_ENTITY wiring.
-->
<script lang="ts">
	import { HUD_INTENT_KINDS } from '@config/hud.tokens';
	import { DFG_PIPELINE_STAGES } from '@config/hud/hud.projections';
	import {
		type CodeCheckViolation,
		type GraphEntityNode,
		type GraphReferenceEdge,
		type VariableFlowStep,
		hudWire,
		traceVariableDataFlow
	} from '@client/state';
	import HudSurfacePattern from '@client/components/atoms/fx/HudSurfacePattern.svelte';
	import HudInteractiveCanvasStage from '../perimeter/HudInteractiveCanvasStage.svelte';
	import SourceSpanViewer from '../perimeter/SourceSpanViewer.svelte';

	interface Props {
		entity: GraphEntityNode; sourceCode: string; nodes: readonly GraphEntityNode[];
		edges?: readonly GraphReferenceEdge[]; sourceMap?: Readonly<Record<string, string>>;
		violations?: readonly CodeCheckViolation[]; onSelectEntity: (id: number, line?: number) => void;
	}

	let { entity, sourceCode, nodes, edges = [], sourceMap = {}, violations = [], onSelectEntity }: Props = $props();
	let selectedLine = $state<number | null>(null);
	let stageFilter = $state<string>('ALL');
	let hazardsOnly = $state<boolean>(false);
	let effectiveSourceMap = $derived({ ...sourceMap, [entity.qualifiedName]: sourceCode });
	let dfg = $derived(traceVariableDataFlow(entity.id, nodes, edges, undefined, effectiveSourceMap));
	let visibleLanes = $derived(stageFilter === 'ALL' ? DFG_PIPELINE_STAGES : DFG_PIPELINE_STAGES.filter((l) => l.id === stageFilter));

	function stepsForStage(stageId: string): readonly VariableFlowStep[] {
		if (!dfg) return [];
		const base = stageId === 'INGRESS'
			? dfg.steps.filter((s) => s.stage === 'BIRTH_DEFINES')
			: stageId === 'SETS'
				? dfg.steps.filter((s) => s.stage === 'INITIAL_SETS')
				: stageId === 'MODIFIES'
					? dfg.steps.filter((s) => s.stage === 'MUTATION_MODIFIES')
					: dfg.steps.filter((s) => s.stage === 'READ_USES' || s.stage === 'PROPAGATION_CALLS');
		return hazardsOnly ? base.filter((s) => s.hasUninitializedHazard) : base;
	}
	function toggleFilter(patch: { stageFilter?: string; hazardsOnly?: boolean }): void {
		if (patch.stageFilter !== undefined) stageFilter = patch.stageFilter;
		if (patch.hazardsOnly !== undefined) hazardsOnly = patch.hazardsOnly;
		hudWire.emitUiIntent(HUD_INTENT_KINDS.PROJECTION_OPTION_TOGGLE, 'WORLD_CANVAS', { view: 'DFG', stageFilter, hazardsOnly });
	}
	function selectDfgStep(targetId: number, line: number): void {
		selectedLine = line;
		hudWire.emitUiIntent(HUD_INTENT_KINDS.FOCUS_ENTITY, 'WORLD_CANVAS', { view: 'DFG', line, entityId: targetId }, targetId);
		onSelectEntity(targetId, line);
	}
</script>

<div class="w-full h-full grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-[var(--hud-bg)]/60 border border-[var(--hud-accent-primary)]/45 font-mono text-xs">
	<div class="md:col-span-7 h-full min-h-[240px] flex flex-col md:border-r border-b md:border-b-0 border-[var(--hud-border)] overflow-hidden">
		<div class="px-3 py-1.5 border-b border-[var(--hud-border)] bg-[var(--hud-panel)] flex flex-wrap items-center justify-between gap-2 shrink-0">
			<div class="flex items-center gap-2 min-w-0">
				<span class="text-[var(--hud-accent-secondary)] font-bold">⟡ DFG // 4-STAGE PIPELINE</span>
				{#if dfg}<span class="text-[11px] text-[var(--hud-muted)]">({dfg.steps.length} hops · {dfg.mutationSites.length} mut · {dfg.readSites.length} reads)</span>{/if}
			</div>
			<div class="flex flex-wrap items-center gap-1 text-[10px]">
				<button type="button" data-testid="dfg-stage-all" onclick={() => toggleFilter({ stageFilter: 'ALL' })} class={`px-1.5 py-0.5 border cursor-pointer ${stageFilter === 'ALL' ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>ALL</button>
				{#each DFG_PIPELINE_STAGES as ln (ln.id)}
					<button type="button" data-testid={`dfg-stage-${ln.id.toLowerCase()}`} onclick={() => toggleFilter({ stageFilter: ln.id })} class={`px-1.5 py-0.5 border cursor-pointer ${stageFilter === ln.id ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>{ln.id}</button>
				{/each}
				<button type="button" data-testid="dfg-hazard-filter-btn" onclick={() => toggleFilter({ hazardsOnly: !hazardsOnly })} class={`px-1.5 py-0.5 border cursor-pointer ${hazardsOnly ? 'border-[var(--hud-danger)] text-[var(--hud-danger)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Hazards ({dfg?.uninitializedHazardCount ?? 0})</button>
				{#if stageFilter !== 'ALL' || hazardsOnly || selectedLine !== null}
					<button type="button" data-testid="dfg-reset-filters-btn" onclick={() => { selectedLine = null; toggleFilter({ stageFilter: 'ALL', hazardsOnly: false }); }} class="px-1.5 py-0.5 border border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] cursor-pointer">Reset</button>
				{/if}
				{#if dfg && dfg.uninitializedHazardCount > 0}
					<span class={`px-2 py-0.5 text-[10px] border border-[var(--hud-danger)] bg-[var(--hud-danger)]/15 text-[var(--hud-danger)] font-bold ${hudWire.kineticMotionEnabled ? 'motion-safe:animate-pulse' : ''}`}>CHR-016 GAP ({dfg.uninitializedHazardCount})</span>
				{:else}
					<span class="px-2 py-0.5 text-[10px] border border-[var(--hud-nominal)] text-[var(--hud-nominal)]">USE-DEF CLEAN</span>
				{/if}
			</div>
		</div>

		<div class="relative flex-1 overflow-hidden flex flex-col">
			<HudSurfacePattern patternId={hudWire.surfacePatterns.SUBSTRATE} opacity={hudWire.surfaceOpacity * 0.25} tileScale={hudWire.surfaceScale} />
			{#if dfg}
				<div class="relative z-10 flex-1 min-h-0">
					<HudInteractiveCanvasStage boundsWidth={760} boundsHeight={380} fitKey={`dfg-${entity.id}-${stageFilter}`} ariaLabel="Interactive Data Flow Pipeline Stage">
						{#snippet children()}
							<div class="w-[760px] h-[380px] p-3 flex flex-col gap-3">
								<div class={`grid gap-2 flex-1 min-h-0 ${visibleLanes.length === 1 ? 'grid-cols-1' : 'grid-cols-4'}`}>
									{#each visibleLanes as lane (lane.id)}
										{@const items = stepsForStage(lane.id)}
										<div class="border border-[var(--hud-border)] bg-[var(--hud-panel)]/90 flex flex-col min-h-[160px] overflow-hidden">
											<div class="px-2 py-1.5 border-b border-[var(--hud-border)] bg-[var(--hud-surface)] flex items-center justify-between text-[11px] font-bold" style={`color:${lane.accentVar}`}>
												<span class="truncate">{lane.title}</span><span class="text-[var(--hud-muted)]">{items.length}</span>
											</div>
											<div class="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1.5">
												{#if items.length === 0}
													<div class="text-[11px] text-[var(--hud-muted)] p-1">—</div>
												{:else}
													{#each items as step (step.stepIndex)}
														<button type="button" onclick={() => selectDfgStep(step.targetEntity.id, step.line)} class={`p-2 text-left bg-[var(--hud-bg)] border cursor-pointer hover:border-[var(--hud-accent-primary)] ${step.hasUninitializedHazard ? `border-[var(--hud-danger)] ${hudWire.kineticMotionEnabled ? 'motion-safe:animate-pulse' : ''}` : 'border-[var(--hud-border)]'}`}>
															<div class="flex items-center justify-between text-[11px]"><span class="font-bold text-[var(--hud-text)] truncate">{step.sourceEntity.name}</span><span class="text-[var(--hud-muted)] shrink-0">@L{step.line}</span></div>
															<div class="text-[11px] text-[var(--hud-accent-primary)] truncate">→ {step.targetEntity.name}</div>
															{#if step.snippet}<div class="mt-1 px-1 py-0.5 bg-[var(--hud-surface)] text-[10px] text-[var(--hud-muted)] truncate">{step.snippet}</div>{/if}
															{#if step.hasUninitializedHazard}<div class="mt-1 text-[10px] text-[var(--hud-danger)] font-bold">CHR-016 UNINIT READ</div>{/if}
														</button>
													{/each}
												{/if}
											</div>
										</div>
									{/each}
								</div>
								<div class="p-2 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[11px] text-[var(--hud-muted)] break-all"><strong class="text-[var(--hud-accent-secondary)]">CYPHER TAINT:</strong> {dfg.cypherTaintQuery}</div>
							</div>
						{/snippet}
					</HudInteractiveCanvasStage>
				</div>
			{/if}
		</div>
	</div>
	<div class="md:col-span-5 h-full min-h-[180px] overflow-hidden"><SourceSpanViewer {entity} {sourceCode} highlightedLine={selectedLine} {nodes} {violations} {onSelectEntity} /></div>
</div>
