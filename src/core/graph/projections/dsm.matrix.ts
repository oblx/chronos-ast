/**
 * @author Oblx <code@oblx.dev>
 * @description Layered Dependency Structure Matrix (DSM) builder with Tarjan SCC diagonal cluster boxes, collapsible rings, and exact cell reference lists.
 */
import { resolveVirtualLayerForEntity, type VirtualArchitectureLayer } from '@config/registries/architecture.schema';
import { DSM_TOKENS } from '@config/hud.tokens';
import type { GraphEntityNode, GraphReferenceEdge } from '../graph_traversal';
import { computeTarjanScc, type TarjanSccReport } from '../scc.tarjan';

export interface DsmCellReference {
	readonly sourceName: string;
	readonly targetName: string;
	readonly kind: string;
	readonly line: number;
}

export interface DsmCellDescriptor {
	readonly rowIdx: number;
	readonly colIdx: number;
	readonly sourceEntityId: number;
	readonly targetEntityId: number;
	readonly weight: number;
	readonly isUpperTriangleCycle: boolean;
	readonly isLayerViolation: boolean;
	readonly references: readonly DsmCellReference[];
}

export interface DsmSccBoundingBox {
	readonly clusterId: number;
	readonly startIdx: number;
	readonly endIdx: number;
}

export interface LayeredDsmProjection {
	readonly orderedEntities: readonly GraphEntityNode[];
	readonly layerLabelsByEntityId: Readonly<Record<number, string>>;
	readonly cells: ReadonlyArray<ReadonlyArray<DsmCellDescriptor>>;
	readonly sccDiagonalBoxes: readonly DsmSccBoundingBox[];
	readonly upperTriangleCycleCount: number;
	readonly layerViolationCount: number;
}

function selectTopLayeredNodes(nodes: readonly GraphEntityNode[], maxEntities: number, scc: TarjanSccReport) {
	if (maxEntities <= 0) return [];
	const layerCache = new Map<string, VirtualArchitectureLayer>();
	const selected: Array<{ node: GraphEntityNode; layer: VirtualArchitectureLayer; sccRank: number }> = [];
	const ranks = scc.entityLayerRank;
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]!;
		const sep = node.qualifiedName.indexOf('::');
		const prefix = sep >= 0 ? node.qualifiedName.slice(0, sep) : node.qualifiedName;
		let layer = layerCache.get(prefix);
		if (!layer) { layer = resolveVirtualLayerForEntity(prefix); layerCache.set(prefix, layer); }
		const sccRank = ranks[node.id] ?? 0;
		const len = selected.length;
		if (len === maxEntities) {
			const tail = selected[len - 1]!;
			if (layer.ringOrder < tail.layer.ringOrder || (layer.ringOrder === tail.layer.ringOrder && sccRank >= tail.sccRank)) continue;
		}
		let pos = len < maxEntities ? len : len - 1;
		while (pos > 0) {
			const prev = selected[pos - 1]!;
			if (prev.layer.ringOrder > layer.ringOrder || (prev.layer.ringOrder === layer.ringOrder && prev.sccRank <= sccRank)) break;
			selected[pos] = prev;
			pos--;
		}
		selected[pos] = { node, layer, sccRank };
	}
	return selected;
}

function buildSccDiagonalBoxes(ordered: readonly GraphEntityNode[], scc: TarjanSccReport): readonly DsmSccBoundingBox[] {
	const boxes: DsmSccBoundingBox[] = [];
	let start = -1, activeCluster = -1;
	for (let i = 0; i < ordered.length; i++) {
		const id = ordered[i]!.id;
		const cid = scc.cyclicEntityIds.has(id) ? (scc.entityToClusterId[id] ?? -1) : -1;
		if (cid === activeCluster && cid !== -1) continue;
		if (activeCluster !== -1 && i - 1 > start) boxes.push({ clusterId: activeCluster, startIdx: start, endIdx: i - 1 });
		activeCluster = cid;
		start = i;
	}
	if (activeCluster !== -1 && ordered.length - 1 > start) boxes.push({ clusterId: activeCluster, startIdx: start, endIdx: ordered.length - 1 });
	return boxes;
}

export function buildLayeredDsmProjection(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	maxEntities: number = DSM_TOKENS.MAX_MATRIX_ENTITIES,
	precomputedScc?: TarjanSccReport
): LayeredDsmProjection {
	const scc = precomputedScc ?? computeTarjanScc(nodes, edges);
	const topDecorated = selectTopLayeredNodes(nodes, maxEntities, scc);
	const sorted = topDecorated.map((d) => d.node);
	const indexById = new Map<number, number>();
	const layerLabelsByEntityId: Record<number, string> = {};
	for (let i = 0; i < topDecorated.length; i++) {
		indexById.set(topDecorated[i]!.node.id, i);
		layerLabelsByEntityId[topDecorated[i]!.node.id] = topDecorated[i]!.layer.label;
	}

	const refGrid: DsmCellReference[][][] = Array.from({ length: sorted.length }, () => Array.from({ length: sorted.length }, () => []));
	for (const e of edges) {
		const r = indexById.get(e.sourceEntityId), c = indexById.get(e.targetEntityId);
		if (r !== undefined && c !== undefined && r !== c) {
			refGrid[r]![c]!.push({ sourceName: sorted[r]!.name, targetName: sorted[c]!.name, kind: e.kind, line: e.line });
		}
	}

	let upperTriangleCycleCount = 0, layerViolationCount = 0;
	const cells: DsmCellDescriptor[][] = topDecorated.map((rowItem, r) => topDecorated.map((colItem, c) => {
		const references = refGrid[r]?.[c] ?? [];
		const weight = references.length;
		const isUpperTriangleCycle = weight > 0 && r < c;
		const isLayerViolation = weight > 0 && !rowItem.layer.allowedOutboundLayerIds.includes(colItem.layer.id);
		if (isUpperTriangleCycle) upperTriangleCycleCount++;
		if (isLayerViolation) layerViolationCount++;
		return { rowIdx: r, colIdx: c, sourceEntityId: rowItem.node.id, targetEntityId: colItem.node.id, weight, isUpperTriangleCycle, isLayerViolation, references };
	}));

	return {
		orderedEntities: sorted, layerLabelsByEntityId, cells,
		sccDiagonalBoxes: buildSccDiagonalBoxes(sorted, scc),
		upperTriangleCycleCount, layerViolationCount,
	};
}
