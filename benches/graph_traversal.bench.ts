/**
 * @author Oblx <code@oblx.dev>
 * @description Micro-benchmark for Butterfly Call Graph, Tarjan SCC, and Layered DSM over 5,000 entities (< 25ms target).
 */
import { ENTITY_KINDS, REFERENCE_KINDS } from '../src/lib/db/schema';
import {
	buildButterflyProjection,
	type GraphEntityNode,
	type GraphReferenceEdge,
} from '../src/core/graph/graph_traversal';
import { computeTarjanScc } from '../src/core/graph/scc.tarjan';
import { buildLayeredDsmProjection } from '../src/core/graph/projections/dsm.matrix';

const LARGE_ENTITY_COUNT = 5000;

const nodes: GraphEntityNode[] = Array.from({ length: LARGE_ENTITY_COUNT }, (_, idx) => ({
	id: idx + 1,
	uuid: `chr-fn-${idx + 1}`,
	kind: ENTITY_KINDS.FUNCTION,
	name: `kernel_op_${idx + 1}`,
	qualifiedName: `src/core/kernel_${idx % 20}.ts::kernel_op_${idx + 1}`,
	loc: 24,
	cyclomatic: 4,
	halsteadVolume: 180,
	afferentCoupling: 2,
	efferentCoupling: 2,
	instability: 500,
}));

const edges: GraphReferenceEdge[] = Array.from(
	{ length: LARGE_ENTITY_COUNT - 1 },
	(_, idx) => ({
		id: idx + 1,
		kind: REFERENCE_KINDS.CALLS,
		sourceEntityId: idx + 1,
		targetEntityId: idx + 2,
		line: idx + 10,
		column: 4,
	})
);

// Warmup JIT
const warmupScc = computeTarjanScc(nodes.slice(0, 128), edges.slice(0, 127));
buildLayeredDsmProjection(nodes.slice(0, 128), edges.slice(0, 127), 24, warmupScc);

const startNs = Bun.nanoseconds();
const sccReport = computeTarjanScc(nodes, edges);
const dsmReport = buildLayeredDsmProjection(nodes, edges, 24, sccReport);
buildButterflyProjection(12, nodes, edges);
const elapsedMs = (Bun.nanoseconds() - startNs) / 1_000_000;

console.log(
	`[CHRONOS BENCH] graph_traversal.bench.ts: 5,000-entity Tarjan SCC (${sccReport.clusters.length} clusters) + Layered DSM (${dsmReport.orderedEntities.length}x${dsmReport.orderedEntities.length}) in ${elapsedMs.toFixed(2)} ms (target < 25.00 ms)`
);
if (elapsedMs >= 25) {
	throw new Error(`Tarjan SCC + DSM benchmark exceeded 25ms threshold: ${elapsedMs.toFixed(2)}ms`);
}
