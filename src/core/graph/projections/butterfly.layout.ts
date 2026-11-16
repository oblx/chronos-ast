/**
 * @author Oblx <code@oblx.dev>
 * @description Multi-hop (1..3) Butterfly call-graph expander with edge multiplicity aggregation and module/file swimlane grouping.
 */
import type { ReferenceKind } from '@config/metamodel.constants';
import { buildIndexedGraphAdjacency, type GraphEntityNode, type GraphReferenceEdge } from '../graph_traversal';

export interface MultiHopButterflyEntry {
	readonly node: GraphEntityNode;
	readonly hop: number;
	readonly edgeKind: ReferenceKind;
	readonly callCount: number;
	readonly line: number;
	readonly moduleLabel: string;
	readonly y: number;
}

export interface WingSwimlane {
	readonly moduleLabel: string;
	readonly yStart: number;
	readonly height: number;
}

export interface MultiHopButterflyProjection {
	readonly focalEntity: GraphEntityNode;
	readonly depth: number;
	readonly afferentEntries: readonly MultiHopButterflyEntry[];
	readonly efferentEntries: readonly MultiHopButterflyEntry[];
	readonly afferentLanes: readonly WingSwimlane[];
	readonly efferentLanes: readonly WingSwimlane[];
}

function resolveModuleLabel(qName: string): string {
	const head = qName.split('::')[0] ?? qName;
	return head.split('/').pop() ?? head;
}

function traverseWing(
	focalId: number,
	maxDepth: number,
	direction: 'AFFERENT' | 'EFFERENT',
	adj: ReturnType<typeof buildIndexedGraphAdjacency>
): readonly Omit<MultiHopButterflyEntry, 'y'>[] {
	const visited = new Set<number>([focalId]);
	const queue: Array<{ id: number; hop: number }> = [{ id: focalId, hop: 0 }];
	const out: Array<Omit<MultiHopButterflyEntry, 'y'>> = [];

	while (queue.length > 0 && out.length < 18) {
		const cur = queue.shift()!;
		if (cur.hop >= maxDepth) continue;
		const edges = (direction === 'AFFERENT' ? adj.inboundByTargetId.get(cur.id) : adj.outboundBySourceId.get(cur.id)) ?? [];
		const grouped = new Map<number, { count: number; line: number; kind: ReferenceKind }>();
		for (const e of edges) {
			const peerId = direction === 'AFFERENT' ? e.sourceEntityId : e.targetEntityId;
			if (peerId === focalId || visited.has(peerId)) continue;
			const prev = grouped.get(peerId);
			if (prev) prev.count += 1;
			else grouped.set(peerId, { count: 1, line: e.line, kind: e.kind });
		}
		for (const [peerId, meta] of grouped) {
			const node = adj.nodeById.get(peerId);
			if (!node) continue;
			visited.add(peerId);
			out.push({ node, hop: cur.hop + 1, edgeKind: meta.kind, callCount: meta.count, line: meta.line, moduleLabel: resolveModuleLabel(node.qualifiedName) });
			queue.push({ id: peerId, hop: cur.hop + 1 });
			if (out.length >= 18) break;
		}
	}
	return out.sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel) || a.hop - b.hop);
}

function layoutWingSwimlanes(raw: readonly Omit<MultiHopButterflyEntry, 'y'>[], centerY: number, gapY: number): { entries: readonly MultiHopButterflyEntry[]; lanes: readonly WingSwimlane[] } {
	const startY = centerY - ((Math.max(1, raw.length) - 1) * gapY) / 2;
	const entries = raw.map((item, idx) => ({ ...item, y: Math.round(startY + idx * gapY) }));
	const lanes: WingSwimlane[] = [];
	for (const entry of entries) {
		const last = lanes[lanes.length - 1];
		if (last && last.moduleLabel === entry.moduleLabel) {
			lanes[lanes.length - 1] = { ...last, height: entry.y + 34 - last.yStart };
		} else {
			lanes.push({ moduleLabel: entry.moduleLabel, yStart: entry.y - 34, height: 68 });
		}
	}
	return { entries, lanes };
}

export function buildMultiHopButterfly(
	focalId: number,
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	depth = 1,
	centerY = 250,
	gapY = 74
): MultiHopButterflyProjection | null {
	const adj = buildIndexedGraphAdjacency(nodes, edges);
	const focalEntity = adj.nodeById.get(focalId) ?? nodes[0];
	if (!focalEntity) return null;
	const clampedDepth = Math.max(1, Math.min(3, depth));
	const aff = layoutWingSwimlanes(traverseWing(focalEntity.id, clampedDepth, 'AFFERENT', adj), centerY, gapY);
	const eff = layoutWingSwimlanes(traverseWing(focalEntity.id, clampedDepth, 'EFFERENT', adj), centerY, gapY);
	return {
		focalEntity, depth: clampedDepth,
		afferentEntries: aff.entries, efferentEntries: eff.entries,
		afferentLanes: aff.lanes, efferentLanes: eff.lanes,
	};
}
