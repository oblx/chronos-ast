/**
 * @author Oblx <code@oblx.dev>
 * @description O(V + E) indexed adjacency, Butterfly Call Graph, and Dependency Structure Matrix (DSM) projection engine.
 */
import { HUD_CONFIG } from '@config/constants';
import type { EntityKind, ReferenceKind } from '@lib/db/schema';

export interface GraphEntityNode {
	readonly id: number;
	readonly uuid: string;
	readonly kind: EntityKind;
	readonly name: string;
	readonly qualifiedName: string;
	readonly loc: number;
	readonly cyclomatic: number;
	readonly halsteadVolume: number;
	readonly afferentCoupling: number;
	readonly efferentCoupling: number;
	readonly instability: number;
}

export interface GraphReferenceEdge {
	readonly id: number;
	readonly kind: ReferenceKind;
	readonly sourceEntityId: number;
	readonly targetEntityId: number;
	readonly line: number;
	readonly column: number;
}

export interface IndexedGraphAdjacency {
	readonly nodeById: ReadonlyMap<number, GraphEntityNode>;
	readonly outboundBySourceId: ReadonlyMap<number, readonly GraphReferenceEdge[]>;
	readonly inboundByTargetId: ReadonlyMap<number, readonly GraphReferenceEdge[]>;
}

export interface ButterflyWingEntry {
	readonly node: GraphEntityNode;
	readonly edgeKind: ReferenceKind;
	readonly line: number;
}

export interface ButterflyProjection {
	readonly focalEntity: GraphEntityNode;
	readonly afferentCallers: readonly ButterflyWingEntry[];
	readonly efferentTargets: readonly ButterflyWingEntry[];
}

export interface DsmMatrixProjection {
	readonly entities: readonly GraphEntityNode[];
	readonly cells: ReadonlyArray<ReadonlyArray<number>>;
}

export function buildIndexedGraphAdjacency(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[]
): IndexedGraphAdjacency {
	const nodeById = new Map<number, GraphEntityNode>(nodes.map((n) => [n.id, n]));
	const outboundBySourceId = new Map<number, GraphReferenceEdge[]>();
	const inboundByTargetId = new Map<number, GraphReferenceEdge[]>();
	for (const edge of edges) {
		const outList = outboundBySourceId.get(edge.sourceEntityId);
		if (outList) outList.push(edge);
		else outboundBySourceId.set(edge.sourceEntityId, [edge]);
		const inList = inboundByTargetId.get(edge.targetEntityId);
		if (inList) inList.push(edge);
		else inboundByTargetId.set(edge.targetEntityId, [edge]);
	}
	return { nodeById, outboundBySourceId, inboundByTargetId };
}

function collectDirectionalWing(
	focalId: number,
	incidentEdges: readonly GraphReferenceEdge[],
	nodeById: ReadonlyMap<number, GraphEntityNode>,
	direction: 'AFFERENT' | 'EFFERENT'
): readonly ButterflyWingEntry[] {
	const seen = new Set<number>();
	const entries: ButterflyWingEntry[] = [];
	for (const edge of incidentEdges) {
		const peerId = direction === 'AFFERENT' ? edge.sourceEntityId : edge.targetEntityId;
		if (peerId === focalId || seen.has(peerId)) continue;
		const peerNode = nodeById.get(peerId);
		if (peerNode) {
			seen.add(peerId);
			entries.push({ node: peerNode, edgeKind: edge.kind, line: edge.line });
		}
	}
	return entries;
}

export function buildButterflyProjection(
	focalId: number,
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[]
): ButterflyProjection | null {
	let focalEntity = nodes[0];
	for (let i = 0; i < nodes.length; i++) {
		if (nodes[i]!.id === focalId) { focalEntity = nodes[i]!; break; }
	}
	if (!focalEntity) return null;
	const fid = focalEntity.id, inbound: GraphReferenceEdge[] = [], outbound: GraphReferenceEdge[] = [];
	const peerIds = new Set<number>();
	for (let i = 0; i < edges.length; i++) {
		const e = edges[i]!;
		if (e.targetEntityId === fid && e.sourceEntityId !== fid) { inbound.push(e); peerIds.add(e.sourceEntityId); }
		if (e.sourceEntityId === fid && e.targetEntityId !== fid) { outbound.push(e); peerIds.add(e.targetEntityId); }
	}
	const peerById = new Map<number, GraphEntityNode>();
	if (peerIds.size > 0) {
		for (let i = 0; i < nodes.length; i++) {
			const n = nodes[i]!;
			if (peerIds.has(n.id)) peerById.set(n.id, n);
		}
	}
	return {
		focalEntity,
		afferentCallers: collectDirectionalWing(fid, inbound, peerById, 'AFFERENT'),
		efferentTargets: collectDirectionalWing(fid, outbound, peerById, 'EFFERENT'),
	};
}

export function buildDsmMatrix(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	maxDimension: number = HUD_CONFIG.DSM_MAX_DIMENSION
): DsmMatrixProjection {
	const subset = nodes.slice(0, maxDimension);
	const indexMap = new Map(subset.map((n, idx) => [n.id, idx]));
	const grid = Array.from({ length: subset.length }, () => Array.from({ length: subset.length }, () => 0));
	for (const edge of edges) {
		const row = indexMap.get(edge.sourceEntityId);
		const col = indexMap.get(edge.targetEntityId);
		if (row !== undefined && col !== undefined) grid[row]![col]! += 1;
	}
	return { entities: subset, cells: grid };
}
