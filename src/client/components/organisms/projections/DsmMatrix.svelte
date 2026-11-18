<!--
	@author Oblx <code@oblx.dev>
	@description Layered Dependency Structure Matrix (DSM) with collapsible architecture rings, Tarjan SCC diagonal boxes, and cell reference popover.
-->
<script lang="ts">
	import { DSM_TOKENS, HUD_INTENT_KINDS } from '@config/hud.tokens';
	import {
		type DsmCellDescriptor,
		type GraphEntityNode,
		type GraphReferenceEdge,
		buildLayeredDsmProjection,
		hudWire
	} from '@client/state';
	import HudInteractiveCanvasStage from '../perimeter/HudInteractiveCanvasStage.svelte';

	interface Props {
		nodes: readonly GraphEntityNode[]; edges: readonly GraphReferenceEdge[];
		selectedEntityId: number; onSelectNode: (id: number) => void;
	}

	let { nodes, edges, selectedEntityId, onSelectNode }: Props = $props();
	let showCyclesOnly = $state(false);
	let collapsedRings = $state<string[]>([]);
	let inspectedCell = $state<DsmCellDescriptor | null>(null);

	let dsm = $derived(buildLayeredDsmProjection(nodes, edges, DSM_TOKENS.MAX_MATRIX_ENTITIES));
	let displayedEntities = $derived(
		showCyclesOnly
			? dsm.orderedEntities.filter((_, r) => dsm.cells[r]?.some((c) => c.isUpperTriangleCycle || c.isLayerViolation))
			: dsm.orderedEntities
	);
	let stageW = $derived(Math.max(480, 220 + dsm.orderedEntities.length * DSM_TOKENS.CELL_SIZE_PX));
	let stageH = $derived(Math.max(320, 120 + displayedEntities.length * 32));

	function ringKey(id: number): string {
		return dsm.layerLabelsByEntityId[id]?.split('//')[0]?.trim() ?? 'RING';
	}
	function toggleRing(key: string): void {
		collapsedRings = collapsedRings.includes(key) ? collapsedRings.filter((k) => k !== key) : [...collapsedRings, key];
		hudWire.emitUiIntent(HUD_INTENT_KINDS.PROJECTION_OPTION_TOGGLE, 'WORLD_CANVAS', { view: 'DSM', ring: key, collapsed: collapsedRings.includes(key) });
	}
	function toggleCyclesFilter(): void { showCyclesOnly = !showCyclesOnly; hudWire.emitUiIntent(HUD_INTENT_KINDS.PROJECTION_OPTION_TOGGLE, 'WORLD_CANVAS', { view: 'DSM', showCyclesOnly }); }
	function selectDsmEntity(id: number): void { hudWire.emitUiIntent(HUD_INTENT_KINDS.FOCUS_ENTITY, 'WORLD_CANVAS', { view: 'DSM', entityId: id }, id); onSelectNode(id); }
	function setInspectedCell(cell: DsmCellDescriptor | null): void { inspectedCell = cell; hudWire.emitUiIntent(HUD_INTENT_KINDS.PROJECTION_OPTION_TOGGLE, 'WORLD_CANVAS', { view: 'DSM', inspectedCell: cell ? `${cell.rowIdx}:${cell.colIdx}` : null }); }
	function sccBoxBorderStyle(r: number, c: number): string {
		const box = dsm.sccDiagonalBoxes.find((b) => r >= b.startIdx && r <= b.endIdx && c >= b.startIdx && c <= b.endIdx);
		if (!box) return '';
		const sides = [r === box.startIdx ? 'border-t-2 border-t-dashed' : '', r === box.endIdx ? 'border-b-2 border-b-dashed' : '', c === box.startIdx ? 'border-l-2 border-l-dashed' : '', c === box.endIdx ? 'border-r-2 border-r-dashed' : ''];
		return `${sides.filter(Boolean).join(' ')} border-[var(--hud-warning)]`;
	}
</script>

<section aria-label="Layered Dependency Structure Matrix" class="relative w-full h-full flex flex-col bg-[var(--hud-bg)] font-mono text-xs overflow-hidden">
	<div class="px-4 py-2 border-b border-[var(--hud-border)] bg-[var(--hud-panel)] flex flex-wrap items-center justify-between gap-2 shrink-0">
		<div class="flex items-center gap-3">
			<span class="text-[var(--hud-accent)] font-bold">DSM // LAYERED DEPENDENCY MATRIX</span>
			<span class="text-[11px] text-[var(--hud-muted)]">Cycles: <strong class="text-[var(--hud-warning)]">{dsm.upperTriangleCycleCount}</strong> · Breaches: <strong class="text-[var(--hud-danger)]">{dsm.layerViolationCount}</strong> · SCC Clusters: <strong>{dsm.sccDiagonalBoxes.length}</strong></span>
		</div>
		<button type="button" onclick={toggleCyclesFilter} class={`px-2.5 py-1 text-[11px] border cursor-pointer ${showCyclesOnly ? 'border-[var(--hud-warning)] text-[var(--hud-warning)] bg-[var(--hud-surface)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)] bg-[var(--hud-bg)]'}`}>{showCyclesOnly ? 'Cyclic / Breach Rows' : 'Filter Upper-Triangle Cycles'}</button>
	</div>

	<div class="flex-1 overflow-hidden">
		<HudInteractiveCanvasStage boundsWidth={stageW} boundsHeight={stageH} fitKey={`dsm-${dsm.orderedEntities.length}-${showCyclesOnly ? 'c' : 'a'}`} ariaLabel="Interactive Dependency Structure Matrix Stage">
			{#snippet children()}
				<div class="p-3 inline-block">
					<table class="border-collapse text-[11px]">
						<thead>
							<tr>
								<th class="border border-[var(--hud-border)] bg-[var(--hud-panel)] px-2 py-1 text-left text-[var(--hud-muted)]">Entity // Virtual Ring</th>
								{#each dsm.orderedEntities as colEnt, cIdx (colEnt.id)}
									<th class={`border border-[var(--hud-border)] px-1.5 py-1 text-center tabular-nums ${colEnt.id === selectedEntityId ? 'bg-[var(--hud-surface)] text-[var(--hud-accent-secondary)]' : 'bg-[var(--hud-panel)] text-[var(--hud-accent)]'}`} data-hud-tip={colEnt.qualifiedName}>
										<button type="button" data-testid={`dsm-col-hdr-${colEnt.id}`} onclick={() => selectDsmEntity(colEnt.id)} class="w-full h-full cursor-pointer hover:underline">{String(cIdx + 1).padStart(2, '0')}</button>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each displayedEntities as rowEnt, dispIdx (rowEnt.id)}
								{@const rIdx = dsm.orderedEntities.findIndex((e) => e.id === rowEnt.id)}{@const ring = ringKey(rowEnt.id)}{@const prevRing = dispIdx > 0 ? ringKey(displayedEntities[dispIdx - 1]!.id) : null}
								{#if ring !== prevRing}
									<tr class="bg-[var(--hud-surface)]/80">
										<td colspan={dsm.orderedEntities.length + 1} class="border border-[var(--hud-border)] px-2 py-1">
											<button type="button" onclick={() => toggleRing(ring)} class="text-[11px] font-bold text-[var(--hud-accent-secondary)] cursor-pointer">{collapsedRings.includes(ring) ? '▸' : '▾'} {ring}</button>
										</td>
									</tr>
								{/if}
								{#if !collapsedRings.includes(ring)}
									<tr class={rowEnt.id === selectedEntityId ? 'bg-[var(--hud-surface)]' : ''}>
										<td class="border border-[var(--hud-border)] px-2 py-1 whitespace-nowrap">
											<button type="button" onclick={() => onSelectNode(rowEnt.id)} class="text-left hover:text-[var(--hud-accent)] cursor-pointer flex items-center gap-2 w-full">
												<span class="text-[var(--hud-muted)] tabular-nums">[{String(rIdx + 1).padStart(2, '0')}]</span>
												<span class="font-semibold text-[var(--hud-text)] truncate max-w-[140px]">{rowEnt.name}</span>
											</button>
										</td>
										{#each dsm.cells[rIdx] ?? [] as cell (cell.colIdx)}
											{@const isDiag = cell.rowIdx === cell.colIdx}
											<td style={`width:${DSM_TOKENS.CELL_SIZE_PX}px;height:${DSM_TOKENS.CELL_SIZE_PX}px`} class={`border border-[var(--hud-border)] text-center tabular-nums ${sccBoxBorderStyle(cell.rowIdx, cell.colIdx)} ${isDiag ? 'bg-[var(--hud-border)]/40 text-[var(--hud-muted)]' : cell.isLayerViolation ? 'bg-[var(--hud-danger)]/30 text-[var(--hud-danger)] font-bold' : cell.isUpperTriangleCycle ? 'bg-[var(--hud-warning)]/25 text-[var(--hud-warning)] font-bold' : cell.weight > 0 ? 'bg-[var(--hud-accent-primary)]/20 text-[var(--hud-nominal)] font-semibold' : 'text-[var(--hud-muted)]/20'}`}>
												{#if cell.weight > 0 && !isDiag}
													<button type="button" onclick={() => setInspectedCell(cell)} class="w-full h-full cursor-pointer" data-hud-tip={`${rowEnt.name} -> ${dsm.orderedEntities[cell.colIdx]?.name} (${cell.weight})`}>{cell.weight}</button>
												{:else if isDiag}•{/if}
											</td>
										{/each}
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/snippet}
		</HudInteractiveCanvasStage>
	</div>

	{#if inspectedCell}
		<div class="absolute bottom-3 right-3 z-20 w-80 bg-[var(--hud-panel)] border border-[var(--hud-accent-primary)] p-2.5 shadow-xl text-[11px]">
			<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1 mb-1.5">
				<span class="font-bold text-[var(--hud-accent-secondary)]">CELL REFS ({inspectedCell.references.length})</span>
				<button type="button" onclick={() => setInspectedCell(null)} class="text-[var(--hud-muted)] cursor-pointer">✕</button>
			</div>
			<div class="max-h-32 overflow-y-auto flex flex-col gap-1">
				{#each inspectedCell.references as r, rIdx (`${r.kind}-${r.line}-${rIdx}`)}
					<button type="button" onclick={() => onSelectNode(inspectedCell!.sourceEntityId)} class="text-left px-1.5 py-0.5 bg-[var(--hud-bg)] border border-[var(--hud-border)] hover:border-[var(--hud-accent-primary)] cursor-pointer truncate">{r.sourceName} → {r.targetName} [{r.kind} @L{r.line}]</button>
				{/each}
			</div>
		</div>
	{/if}
</section>
