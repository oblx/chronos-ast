/**
 * @author Oblx <code@oblx.dev>
 * @description Unified Metamodel Indexing, child-scope lookup, and NOMINAL/WARN/CRIT threshold band evaluators.
 */
import { ENTITY_KINDS, isChildScopeOf } from '@config/metamodel.constants';
import { buildIndexedGraphAdjacency, type GraphEntityNode, type GraphReferenceEdge, type IndexedGraphAdjacency } from '@core/graph/graph_traversal';

export type MetricBand = 'NOMINAL' | 'WARN' | 'CRIT';

export function buildEntityMap(nodes: readonly GraphEntityNode[]): ReadonlyMap<number, GraphEntityNode> {
	return new Map(nodes.map((n) => [n.id, n]));
}

export function buildSnapshotAdjacency(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[]
): IndexedGraphAdjacency {
	return buildIndexedGraphAdjacency(nodes, edges);
}

export function evaluateMetricBand(value: number, warnThreshold: number, critThreshold: number): MetricBand {
	if (value >= critThreshold) return 'CRIT';
	if (value >= warnThreshold) return 'WARN';
	return 'NOMINAL';
}

export function collectScopedChildMethods(
	parent: GraphEntityNode,
	nodes: readonly GraphEntityNode[]
): readonly GraphEntityNode[] {
	return nodes.filter(
		(m) => (m.kind === ENTITY_KINDS.METHOD || m.kind === ENTITY_KINDS.FUNCTION) && (isChildScopeOf(m.qualifiedName, parent.qualifiedName) || m.id === parent.id)
	);
}
