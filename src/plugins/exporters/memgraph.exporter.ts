/**
 * @author Oblx <code@oblx.dev>
 * @description Memgraph Cypher / Bolt 5.x adapter with O(V * (V + E)) Brandes betweenness centrality and O(V + E) transitive hops.
 */
import { GRAPH_ENGINES, MEMGRAPH_CONSTANTS, type GraphEngineMode } from '@config/constants';
import { extractFileScopePrefix } from '@config/metamodel.constants';
import { buildIndexedGraphAdjacency, type GraphEntityNode, type GraphReferenceEdge } from '@core/graph/graph_traversal';
import { computeTarjanScc } from '@core/graph/scc.tarjan';

export interface MemgraphCypherBatch {
	readonly engine: GraphEngineMode;
	readonly boltEndpoint: string | null;
	readonly statements: readonly string[];
	readonly nodeCount: number;
	readonly edgeCount: number;
}

export interface MemgraphGraphAnalysisReport {
	readonly engine: GraphEngineMode;
	readonly boltConnected: boolean;
	readonly focalEntityId: number;
	readonly maxHops: number;
	readonly transitiveImpactIds: readonly number[];
	readonly betweennessCentrality: Readonly<Record<number, number>>;
	readonly complexityHotspotIds: readonly number[];
	readonly cyclicClusterCount: number;
	readonly cypherStatements: readonly string[];
}

function escapeCypherString(val: string): string {
	return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function exportMemgraphCypherBatch(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	boltEndpoint: string | null = null
): MemgraphCypherBatch {
	const statements: string[] = ['CREATE INDEX ON :ChronosEntity(id);', 'CREATE INDEX ON :ChronosEntity(qualifiedName);'];
	for (const n of nodes) {
		const filePath = extractFileScopePrefix(n.qualifiedName);
		statements.push(
			`MERGE (e:ChronosEntity:${n.kind} {id: ${n.id}}) SET e.uuid="${escapeCypherString(n.uuid)}", e.name="${escapeCypherString(n.name)}", e.qualifiedName="${escapeCypherString(n.qualifiedName)}", e.file="${escapeCypherString(filePath)}", e.loc=${n.loc}, e.cyclomatic=${n.cyclomatic}, e.halstead=${n.halsteadVolume}, e.instability=${n.instability};`
		);
	}
	for (const edge of edges) {
		statements.push(`MATCH (src:ChronosEntity {id: ${edge.sourceEntityId}}), (dst:ChronosEntity {id: ${edge.targetEntityId}}) MERGE (src)-[:${edge.kind} {line: ${edge.line}, col: ${edge.column}}]->(dst);`);
	}
	return { engine: GRAPH_ENGINES.MEMGRAPH_BOLT, boltEndpoint, statements, nodeCount: nodes.length, edgeCount: edges.length };
}

function walkTransitiveHops(focalId: number, edges: readonly GraphReferenceEdge[], maxHops: number): readonly number[] {
	const { outboundBySourceId, inboundByTargetId } = buildIndexedGraphAdjacency([], edges);
	const visited = new Set<number>([focalId]);
	const queue: Array<{ readonly id: number; readonly depth: number }> = [{ id: focalId, depth: 0 }];
	while (queue.length > 0) {
		const curr = queue.shift()!;
		if (curr.depth >= maxHops) continue;
		const neighbors = [
			...(outboundBySourceId.get(curr.id) ?? []).map((e) => e.targetEntityId),
			...(inboundByTargetId.get(curr.id) ?? []).map((e) => e.sourceEntityId),
		];
		for (const nextId of neighbors) {
			if (!visited.has(nextId)) { visited.add(nextId); queue.push({ id: nextId, depth: curr.depth + 1 }); }
		}
	}
	visited.delete(focalId);
	return Array.from(visited);
}

export function computeBetweennessCentrality(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[]
): Readonly<Record<number, number>> {
	const { outboundBySourceId } = buildIndexedGraphAdjacency(nodes, edges);
	const centrality: Record<number, number> = {};
	for (const n of nodes) centrality[n.id] = 0;

	for (const s of nodes) {
		const [stack, preds, sigma, dist] = [[] as number[], new Map<number, number[]>(), new Map<number, number>(), new Map<number, number>()];
		for (const v of nodes) { preds.set(v.id, []); sigma.set(v.id, 0); dist.set(v.id, -1); }
		sigma.set(s.id, 1); dist.set(s.id, 0);
		const queue: number[] = [s.id];

		while (queue.length > 0) {
			const v = queue.shift()!;
			stack.push(v);
			const dV = dist.get(v)!;
			for (const e of outboundBySourceId.get(v) ?? []) {
				const w = e.targetEntityId;
				if ((dist.get(w) ?? -1) < 0) { queue.push(w); dist.set(w, dV + 1); }
				if (dist.get(w) === dV + 1) { sigma.set(w, (sigma.get(w) ?? 0) + (sigma.get(v) ?? 0)); preds.get(w)?.push(v); }
			}
		}

		const delta = new Map<number, number>(nodes.map((v) => [v.id, 0]));
		while (stack.length > 0) {
			const w = stack.pop()!;
			for (const v of preds.get(w) ?? []) {
				delta.set(v, (delta.get(v) ?? 0) + ((sigma.get(v) ?? 1) / Math.max(1, sigma.get(w) ?? 1)) * (1 + (delta.get(w) ?? 0)));
			}
			if (w !== s.id) centrality[w] = (centrality[w] ?? 0) + (delta.get(w) ?? 0);
		}
	}
	return centrality;
}

export async function syncAndAnalyzeMemgraph(
	focalEntityId: number,
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	maxHops: number = MEMGRAPH_CONSTANTS.DEFAULT_TRANSITIVE_HOPS
): Promise<MemgraphGraphAnalysisReport> {
	const clampedHops = Math.min(MEMGRAPH_CONSTANTS.MAX_TRANSITIVE_HOPS, Math.max(1, maxHops));
	const boltUrl = typeof process !== 'undefined' ? (process.env.MEMGRAPH_HTTP_URL ?? null) : null;
	const batch = exportMemgraphCypherBatch(nodes, edges, boltUrl);
	let boltConnected = false;
	if (boltUrl) {
		try {
			const res = await fetch(boltUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ statements: batch.statements.slice(0, 50) }) });
			boltConnected = res.ok;
		} catch { boltConnected = false; }
	}
	const scc = computeTarjanScc(nodes, edges);
	return {
		engine: GRAPH_ENGINES.MEMGRAPH_BOLT, boltConnected, focalEntityId, maxHops: clampedHops,
		transitiveImpactIds: walkTransitiveHops(focalEntityId, edges, clampedHops),
		betweennessCentrality: computeBetweennessCentrality(nodes, edges),
		complexityHotspotIds: nodes.filter((n) => n.cyclomatic >= MEMGRAPH_CONSTANTS.COMPLEXITY_HOTSPOT_FLOOR).map((n) => n.id),
		cyclicClusterCount: scc.cyclicClusters.length, cypherStatements: batch.statements,
	};
}
