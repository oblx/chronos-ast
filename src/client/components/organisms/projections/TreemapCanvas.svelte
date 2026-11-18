<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.4.0 2-Level Hierarchical Cushion Treemap with SVG heat gradients, adaptive LOD, hover tooltip, and drill-down breadcrumbs.
-->
<script lang="ts">
	import { ARCH_GROUPING_MODES, resolveArchitectureGroupLabel, type ArchGroupingMode } from '@config/registries/architecture.schema';
	import { COMPARE_STATUS, HUD_CONFIG } from '@config/constants';
	import { HUD_INTENT_KINDS } from '@config/hud.tokens';
	import { TREEMAP_CUSHION_TOKENS } from '@config/hud/hud.projections';
	import { CAPABILITY_BITS } from '@config/security.constants';
	import {
		type GraphEntityNode,
		type SnapshotDiffReport,
		type TreemapAreaMetric,
		type TreemapHeatMetric,
		type TreemapTile,
		computeHierarchicalTreemap,
		hudWire,
		securityWire
	} from '@client/state';
	import HudSurfacePattern from '@client/components/atoms/fx/HudSurfacePattern.svelte';
	import HudInteractiveCanvasStage from '../perimeter/HudInteractiveCanvasStage.svelte';

	interface Props {
		nodes: readonly GraphEntityNode[]; violationMap: Readonly<Record<number, number>>;
		selectedEntityId: number; diffReport?: SnapshotDiffReport | null; onToggleCompare?: () => void; onSelectNode: (id: number) => void;
	}

	let { nodes, violationMap, selectedEntityId, diffReport = null, onToggleCompare, onSelectNode }: Props = $props();
	let areaMode = $state<TreemapAreaMetric>('LOC');
	let heatMode = $state<TreemapHeatMetric>('CYCLOMATIC');
	let archMode = $state<ArchGroupingMode>(ARCH_GROUPING_MODES.CUSTOM_RULES);
	let focusedContainer = $state<string | null>(null);
	let hoveredTile = $state<TreemapTile | null>(null);

	const VIEW_W = 880, VIEW_H = 500;
	let tree = $derived(computeHierarchicalTreemap(nodes, violationMap, VIEW_W, VIEW_H, areaMode, heatMode, focusedContainer, archMode));
	let useCanvasFallback = $derived(nodes.length > HUD_CONFIG.CANVAS_RENDER_NODE_THRESHOLD);
	let compareActive = $derived(Boolean(diffReport));
	let canCompare = $derived(securityWire.can(CAPABILITY_BITS.COMPARE_DIFF_EXEC));

	function tileGradientId(heat: number): string {
		if (heat >= 0.75) return 'url(#tm-grad-crit)';
		if (heat >= 0.4) return 'url(#tm-grad-warn)';
		if (heat > 0.15) return 'url(#tm-grad-nominal)';
		return 'url(#tm-grad-default)';
	}

	function tileColor(qualifiedName: string, heat: number): string {
		if (compareActive && diffReport) {
			const status = diffReport.entityDeltas[qualifiedName]?.status;
			if (status === COMPARE_STATUS.ADDED) return 'var(--hud-nominal)';
			if (status === COMPARE_STATUS.MODIFIED) return 'var(--hud-warning)';
			if (status === COMPARE_STATUS.REMOVED) return 'var(--hud-danger)';
		}
		if (heat >= 0.75) return 'var(--hud-danger)';
		if (heat >= 0.4) return 'var(--hud-warning)';
		return 'var(--hud-accent-primary)';
	}

	function handleCompareClick(e: MouseEvent): void {
		const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
		hudWire.triggerParticleBurst(r.left + r.width / 2, r.top + r.height / 2, 'compare');
		onToggleCompare?.();
	}
	function setTreeOpt(patch: { focusedContainer?: string | null; areaMode?: TreemapAreaMetric; heatMode?: TreemapHeatMetric; archMode?: ArchGroupingMode }): void {
		if (patch.focusedContainer !== undefined) focusedContainer = patch.focusedContainer;
		if (patch.areaMode !== undefined) areaMode = patch.areaMode;
		if (patch.heatMode !== undefined) heatMode = patch.heatMode;
		if (patch.archMode !== undefined) archMode = patch.archMode;
		hudWire.emitUiIntent(HUD_INTENT_KINDS.PROJECTION_OPTION_TOGGLE, 'WORLD_CANVAS', { view: 'TREEMAP', ...patch });
	}
	function selectTileEntity(id: number): void { hudWire.emitUiIntent(HUD_INTENT_KINDS.FOCUS_ENTITY, 'WORLD_CANVAS', { view: 'TREEMAP', entityId: id }, id); onSelectNode(id); }
</script>

<section aria-label="Hierarchical Cushion Treemap" class="relative w-full h-full flex flex-col bg-[var(--hud-bg)]/85 font-mono text-xs overflow-hidden border border-[var(--hud-border)]">
	<HudSurfacePattern patternId={hudWire.surfacePatterns.SUBSTRATE} opacity={hudWire.surfaceOpacity * 0.35} tileScale={hudWire.surfaceScale} />
	<div class="relative z-10 px-3 py-1.5 border-b border-[var(--hud-border)] bg-[var(--hud-panel)]/95 flex flex-wrap items-center justify-between gap-2 shrink-0">
		<div class="flex items-center gap-2 whitespace-nowrap">
			<span class="text-[var(--hud-accent)] font-bold">⊞ TREEMAP // HIERARCHICAL CUSHION</span>
			<span class="text-[11px] text-[var(--hud-muted)]">({tree.containers.length}M · {tree.flatTiles.length}E · {useCanvasFallback ? '2D' : 'SVG'})</span>
			{#if focusedContainer}
				<button type="button" onclick={() => setTreeOpt({ focusedContainer: null })} class="px-2 py-0.5 text-[11px] border border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] cursor-pointer">All Modules &gt; {focusedContainer.split('/').pop()} ✕</button>
			{/if}
		</div>
		<div class="flex flex-wrap items-center gap-1 text-[11px]">
			{#if canCompare}<button type="button" data-testid="treemap-compare-btn" onclick={handleCompareClick} class={`px-2 py-0.5 border cursor-pointer ${compareActive ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>COMPARE</button>{/if}
			<select aria-label="Architecture Grouping Mode" value={archMode} onchange={(e) => setTreeOpt({ archMode: (e.currentTarget as HTMLSelectElement).value as ArchGroupingMode })} class="px-1.5 py-0.5 bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-text)]">
				<option value={ARCH_GROUPING_MODES.CUSTOM_RULES}>Ring (.arch)</option>
				<option value={ARCH_GROUPING_MODES.DIRECTORY}>Directory</option>
				<option value={ARCH_GROUPING_MODES.LANGUAGE}>Language</option>
			</select>
			{#each (['LOC', 'HALSTEAD'] as const) as aMode (aMode)}<button type="button" onclick={() => setTreeOpt({ areaMode: aMode })} class={`px-1.5 py-0.5 border cursor-pointer ${areaMode === aMode ? 'border-[var(--hud-accent)] text-[var(--hud-accent)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>{aMode}</button>{/each}
			{#each ([['CYCLOMATIC', 'v(G)'], ['INSTABILITY', 'Instab'], ['VIOLATIONS', 'Rules']] as const) as [hKey, hLbl] (hKey)}<button type="button" onclick={() => setTreeOpt({ heatMode: hKey })} class={`px-1.5 py-0.5 border cursor-pointer ${heatMode === hKey ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>{hLbl}</button>{/each}
		</div>
	</div>

	<div class="relative z-10 flex-1 overflow-hidden">
		<HudInteractiveCanvasStage boundsWidth={VIEW_W} boundsHeight={VIEW_H} fitKey={`tm-${nodes.length}-${focusedContainer ?? 'all'}-${archMode}`} ariaLabel="Interactive Cushion Treemap Stage">
			{#snippet children()}
				<svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width={VIEW_W} height={VIEW_H} class="border border-[var(--hud-border)] bg-[var(--hud-panel)]/90 shadow-lg select-none">
					<defs>
						<linearGradient id="tm-grad-nominal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color={TREEMAP_CUSHION_TOKENS.HEAT_COLORS.NOMINAL_TOP} /><stop offset="100%" stop-color={TREEMAP_CUSHION_TOKENS.HEAT_COLORS.NOMINAL_BOT} /></linearGradient>
						<linearGradient id="tm-grad-warn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color={TREEMAP_CUSHION_TOKENS.HEAT_COLORS.WARN_TOP} /><stop offset="100%" stop-color={TREEMAP_CUSHION_TOKENS.HEAT_COLORS.WARN_BOT} /></linearGradient>
						<linearGradient id="tm-grad-crit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color={TREEMAP_CUSHION_TOKENS.HEAT_COLORS.CRIT_TOP} /><stop offset="100%" stop-color={TREEMAP_CUSHION_TOKENS.HEAT_COLORS.CRIT_BOT} /></linearGradient>
						<linearGradient id="tm-grad-default" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color={TREEMAP_CUSHION_TOKENS.HEAT_COLORS.DEFAULT_TOP} /><stop offset="100%" stop-color={TREEMAP_CUSHION_TOKENS.HEAT_COLORS.DEFAULT_BOT} /></linearGradient>
					</defs>
					{#each tree.containers as container (container.containerName)}
						<g data-treemap-container={container.shortName}>
							<rect x={container.x} y={container.y} width={container.width} height={container.height} fill="var(--hud-bg)" fill-opacity="0.82" stroke="var(--hud-border)" stroke-width="1.4" />
							{#if container.width > 74 && container.height > 34}
								<g class="cursor-pointer" role="button" tabindex="0" onclick={() => setTreeOpt({ focusedContainer: focusedContainer === container.containerName ? null : container.containerName })} onkeydown={(e) => e.key === 'Enter' && setTreeOpt({ focusedContainer: container.containerName })}>
									<rect x={container.x} y={container.y} width={container.width} height={TREEMAP_CUSHION_TOKENS.HEADER_HEIGHT_PX} fill="var(--hud-surface)" stroke="var(--hud-border)" stroke-width="0.8" />
									<text x={container.x + 6} y={container.y + 14} fill="var(--hud-accent-secondary)" font-size="11" font-family="IBM Plex Mono" font-weight="700">{container.shortName.slice(0, Math.max(4, Math.floor(container.width / 8)))}</text>
								</g>
							{/if}
							{#each container.children as tile (tile.entity.id)}
								{@const isSelected = tile.entity.id === selectedEntityId}{@const stroke = tileColor(tile.entity.qualifiedName, tile.heatRatio)}{@const archGroup = resolveArchitectureGroupLabel(tile.entity.qualifiedName, archMode)}
								<g role="button" tabindex="0" aria-label={`Treemap entity ${tile.entity.name}`} data-hud-tip={`${tile.entity.qualifiedName} (${archGroup}) — LOC:${tile.entity.loc} v(G):${tile.entity.cyclomatic}`} transform={`translate(${tile.x}, ${tile.y})`} class="cursor-pointer" onclick={() => selectTileEntity(tile.entity.id)} onmouseenter={() => (hoveredTile = tile)} onmouseleave={() => (hoveredTile = null)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectTileEntity(tile.entity.id)}>
									<rect width={tile.width} height={tile.height} fill={tileGradientId(tile.heatRatio)} stroke={isSelected ? 'var(--hud-text)' : stroke} stroke-width={isSelected ? '2.2' : '1.1'} />
									{#if tile.width >= TREEMAP_CUSHION_TOKENS.MIN_LABEL_W && tile.height >= TREEMAP_CUSHION_TOKENS.MIN_LABEL_H}
										<text x="5" y="14" fill={stroke} class="font-mono text-[11px] font-bold">{tile.entity.name.slice(0, Math.floor(tile.width / 7.5))}</text>
										{#if tile.height >= 40}<text x="5" y="28" fill="var(--hud-muted)" class="font-mono text-[11px]">{tile.entity.loc}L · v={tile.entity.cyclomatic}</text>{/if}
									{/if}
								</g>
							{/each}
						</g>
					{/each}
				</svg>
			{/snippet}
		</HudInteractiveCanvasStage>
		{#if hoveredTile}
			<div class="pointer-events-none absolute bottom-4 right-4 z-20 px-3 py-2 bg-[var(--hud-panel)]/95 border border-[var(--hud-accent-primary)] text-[11px] shadow-xl max-w-xs">
				<div class="font-bold text-[var(--hud-accent-secondary)] truncate">{hoveredTile.entity.name}</div>
				<div class="text-[var(--hud-muted)] truncate">{hoveredTile.entity.qualifiedName}</div>
				<div class="mt-1 flex gap-3 text-[var(--hud-text)]"><span>LOC {hoveredTile.entity.loc}</span><span>v(G) {hoveredTile.entity.cyclomatic}</span><span>V {hoveredTile.entity.halsteadVolume}</span><span>Viol {hoveredTile.violationCount}</span></div>
			</div>
		{/if}
	</div>
</section>
