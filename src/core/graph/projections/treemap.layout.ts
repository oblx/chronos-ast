/**
 * @author Oblx <code@oblx.dev>
 * @description Two-level hierarchical cushion Treemap layout (File/Module containers + leaf squarified tiling) and backward-compatible flat squarified builder.
 */
import { ARCH_GROUPING_MODES, resolveArchitectureGroupLabel, resolveVirtualLayerForEntity, type ArchGroupingMode } from '@config/registries/architecture.schema';
import { HUD_CONFIG } from '@config/constants';
import { TREEMAP_CUSHION_TOKENS } from '@config/hud/hud.projections';
import type { GraphEntityNode } from '../graph_traversal';

export interface TreemapTile {
	readonly entity: GraphEntityNode; readonly layerLabel: string; readonly x: number; readonly y: number;
	readonly width: number; readonly height: number; readonly areaWeight: number; readonly heatRatio: number; readonly violationCount: number;
}
export interface TreemapContainerGroup {
	readonly containerName: string; readonly shortName: string; readonly layerLabel: string; readonly x: number;
	readonly y: number; readonly width: number; readonly height: number; readonly totalLoc: number; readonly maxHeat: number; readonly children: readonly TreemapTile[];
}
export interface HierarchicalTreemapProjection { readonly containers: readonly TreemapContainerGroup[]; readonly flatTiles: readonly TreemapTile[]; }
export type TreemapAreaMetric = 'LOC' | 'HALSTEAD';
export type TreemapHeatMetric = 'CYCLOMATIC' | 'INSTABILITY' | 'VIOLATIONS';
interface RectBox { readonly x: number; readonly y: number; readonly w: number; readonly h: number; }

function entityWeight(entity: GraphEntityNode, areaMode: TreemapAreaMetric): number {
	return Math.max(4, areaMode === 'LOC' ? entity.loc : Math.round(entity.halsteadVolume / 10));
}

function computeHeatRatio(entity: GraphEntityNode, violationCount: number, heatMode: TreemapHeatMetric): number {
	const raw = heatMode === 'CYCLOMATIC' ? entity.cyclomatic / HUD_CONFIG.METRIC_THRESHOLDS.COMPLEXITY_CRITICAL : heatMode === 'INSTABILITY' ? entity.instability / HUD_CONFIG.PRECISION_SCALE : violationCount / 3;
	return Math.min(1, Math.max(0, raw));
}

function binarySplitLayout<T extends { readonly weight: number }>(items: readonly T[], x: number, y: number, w: number, h: number, onLeaf: (item: T, box: RectBox) => void): void {
	if (items.length === 0 || w <= 1 || h <= 1) return;
	if (items.length === 1) { onLeaf(items[0]!, { x, y, w, h }); return; }
	const total = items.reduce((acc, it) => acc + it.weight, 0);
	let accum = 0, splitIdx = 1;
	for (let i = 0; i < items.length - 1; i++) { accum += items[i]!.weight; splitIdx = i + 1; if (accum >= total / 2) break; }
	const ratio = total > 0 ? accum / total : 0.5;
	if (w >= h) {
		const splitW = w * ratio;
		binarySplitLayout(items.slice(0, splitIdx), x, y, splitW, h, onLeaf);
		binarySplitLayout(items.slice(splitIdx), x + splitW, y, w - splitW, h, onLeaf);
	} else {
		const splitH = h * ratio;
		binarySplitLayout(items.slice(0, splitIdx), x, y, w, splitH, onLeaf);
		binarySplitLayout(items.slice(splitIdx), x, y + splitH, w, h - splitH, onLeaf);
	}
}

function makeTile(entity: GraphEntityNode, box: RectBox, weight: number, heatRatio: number, violationCount: number, inset = 0): TreemapTile {
	return {
		entity, layerLabel: resolveVirtualLayerForEntity(entity.qualifiedName).label,
		x: Math.round(box.x) + inset, y: Math.round(box.y) + inset,
		width: Math.max(6, Math.round(box.w) - inset * 2), height: Math.max(6, Math.round(box.h) - inset * 2),
		areaWeight: weight, heatRatio, violationCount,
	};
}

export function computeSquarifiedTreemap(
	nodes: readonly GraphEntityNode[], violationMap: Readonly<Record<number, number>>,
	viewportWidth = 840, viewportHeight = 480, areaMode: TreemapAreaMetric = 'LOC', heatMode: TreemapHeatMetric = 'CYCLOMATIC'
): readonly TreemapTile[] {
	const weighted = [...nodes].map((entity) => ({ entity, weight: entityWeight(entity, areaMode) })).sort((a, b) => b.weight - a.weight);
	const tiles: TreemapTile[] = [];
	binarySplitLayout(weighted, 0, 0, viewportWidth, viewportHeight, (item, box) => {
		const vCount = violationMap[item.entity.id] ?? 0;
		tiles.push(makeTile(item.entity, box, item.weight, computeHeatRatio(item.entity, vCount, heatMode), vCount));
	});
	return tiles;
}

function buildContainerGroup(
	containerName: string, members: readonly GraphEntityNode[], box: RectBox,
	violationMap: Readonly<Record<number, number>>, areaMode: TreemapAreaMetric, heatMode: TreemapHeatMetric
): TreemapContainerGroup {
	const { HEADER_HEIGHT_PX: hdrH, INNER_PAD_PX: iPad } = TREEMAP_CUSHION_TOKENS;
	const cx = Math.round(box.x) + iPad, cy = Math.round(box.y) + iPad;
	const cw = Math.max(18, Math.round(box.w) - iPad * 2), ch = Math.max(18, Math.round(box.h) - iPad * 2);
	const innerY = cy + (ch > hdrH + 16 ? hdrH : 2), innerH = Math.max(12, cy + ch - innerY - 2);
	const leafItems = members.map((entity) => ({ entity, weight: entityWeight(entity, areaMode) })).sort((a, b) => b.weight - a.weight);
	const children: TreemapTile[] = [];
	binarySplitLayout(leafItems, cx + 2, innerY, Math.max(10, cw - 4), innerH, (leaf, lBox) => {
		const vCount = violationMap[leaf.entity.id] ?? 0;
		children.push(makeTile(leaf.entity, lBox, leaf.weight, computeHeatRatio(leaf.entity, vCount, heatMode), vCount, 1));
	});
	return {
		containerName, shortName: containerName.split('/').pop() ?? containerName, layerLabel: resolveVirtualLayerForEntity(containerName).label,
		x: cx, y: cy, width: cw, height: ch, totalLoc: members.reduce((sum, m) => sum + m.loc, 0),
		maxHeat: children.reduce((mx, c) => Math.max(mx, c.heatRatio), 0), children,
	};
}

export function computeHierarchicalTreemap(
	nodes: readonly GraphEntityNode[], violationMap: Readonly<Record<number, number>>,
	viewportWidth = 860, viewportHeight = 480, areaMode: TreemapAreaMetric = 'LOC',
	heatMode: TreemapHeatMetric = 'CYCLOMATIC', focusedContainerName: string | null = null,
	archMode: ArchGroupingMode = ARCH_GROUPING_MODES.CUSTOM_RULES
): HierarchicalTreemapProjection {
	const groups = new Map<string, GraphEntityNode[]>();
	for (const node of nodes) {
		const sep = node.qualifiedName.indexOf('::'), filePrefix = sep >= 0 ? node.qualifiedName.slice(0, sep) : node.qualifiedName;
		const container = archMode === ARCH_GROUPING_MODES.CUSTOM_RULES ? filePrefix : resolveArchitectureGroupLabel(node.qualifiedName, archMode);
		if (focusedContainerName && container !== focusedContainerName) continue;
		const list = groups.get(container) ?? []; list.push(node); groups.set(container, list);
	}
	const weighted = Array.from(groups.entries()).map(([containerName, members]) => ({ containerName, members, weight: members.reduce((s, m) => s + entityWeight(m, areaMode), 0) })).sort((a, b) => b.weight - a.weight);
	const containers: TreemapContainerGroup[] = [], flatTiles: TreemapTile[] = [], oPad = TREEMAP_CUSHION_TOKENS.OUTER_PAD_PX;
	binarySplitLayout(weighted, oPad, oPad, Math.max(40, viewportWidth - oPad * 2), Math.max(40, viewportHeight - oPad * 2), (grp, box) => {
		const group = buildContainerGroup(grp.containerName, grp.members, box, violationMap, areaMode, heatMode);
		containers.push(group); flatTiles.push(...group.children);
	});
	return { containers, flatTiles };
}
