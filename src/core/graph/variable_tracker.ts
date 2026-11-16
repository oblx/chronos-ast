/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos Variable Tracker & Data-Flow Graph (DFG) slicer with source snippets and CHR-016 uninitialized-read hazard detection.
 */
import { MEMGRAPH_CONSTANTS } from '@config/constants';
import { REFERENCE_KINDS, resolveEntitySourceSlice, type ReferenceKind } from '@config/metamodel.constants';
import type { GraphEntityNode, GraphReferenceEdge } from './graph_traversal';

export type DataFlowStage = 'BIRTH_DEFINES' | 'INITIAL_SETS' | 'MUTATION_MODIFIES' | 'READ_USES' | 'PROPAGATION_CALLS';

export interface VariableFlowStep {
	readonly stepIndex: number;
	readonly hopDistance: number;
	readonly stage: DataFlowStage;
	readonly referenceKind: ReferenceKind;
	readonly sourceEntity: GraphEntityNode;
	readonly targetEntity: GraphEntityNode;
	readonly line: number;
	readonly column: number;
	readonly snippet: string;
	readonly hasUninitializedHazard: boolean;
}

export interface VariableLineageReport {
	readonly focalEntity: GraphEntityNode;
	readonly steps: readonly VariableFlowStep[];
	readonly birthLocations: readonly VariableFlowStep[];
	readonly mutationSites: readonly VariableFlowStep[];
	readonly readSites: readonly VariableFlowStep[];
	readonly uninitializedHazardCount: number;
	readonly cypherTaintQuery: string;
}

const DATA_FLOW_REF_KINDS = new Set<ReferenceKind>([
	REFERENCE_KINDS.DEFINES, REFERENCE_KINDS.SETS, REFERENCE_KINDS.MODIFIES, REFERENCE_KINDS.USES, REFERENCE_KINDS.CALLS,
]);

function mapKindToStage(kind: ReferenceKind): DataFlowStage {
	if (kind === REFERENCE_KINDS.DEFINES) return 'BIRTH_DEFINES';
	if (kind === REFERENCE_KINDS.SETS) return 'INITIAL_SETS';
	if (kind === REFERENCE_KINDS.MODIFIES) return 'MUTATION_MODIFIES';
	if (kind === REFERENCE_KINDS.USES) return 'READ_USES';
	return 'PROPAGATION_CALLS';
}

function extractLineSnippet(sourceMap: Readonly<Record<string, string>>, qName: string, line: number): string {
	const raw = resolveEntitySourceSlice(qName, sourceMap, '');
	if (!raw) return '';
	const lines = raw.split(/\r?\n/);
	return (lines[Math.max(0, line - 1)] ?? lines[0] ?? '').trim().slice(0, 64);
}

export function traceVariableDataFlow(
	focalEntityId: number,
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	maxHops: number = MEMGRAPH_CONSTANTS.DEFAULT_TRANSITIVE_HOPS,
	sourceMap: Readonly<Record<string, string>> = {}
): VariableLineageReport | null {
	const nodeById = new Map(nodes.map((n) => [n.id, n]));
	const focalEntity = nodeById.get(focalEntityId) ?? nodes[0];
	if (!focalEntity) return null;

	const visitedEdgeIds = new Set<number>();
	const queue: Array<{ readonly entityId: number; readonly depth: number }> = [{ entityId: focalEntity.id, depth: 0 }];
	const visitedEntities = new Set<number>([focalEntity.id]);
	const rawSteps: Array<Omit<VariableFlowStep, 'hasUninitializedHazard'>> = [];

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (current.depth >= maxHops) continue;
		for (const edge of edges) {
			if (!DATA_FLOW_REF_KINDS.has(edge.kind) || visitedEdgeIds.has(edge.id)) continue;
			if (edge.sourceEntityId !== current.entityId && edge.targetEntityId !== current.entityId) continue;
			const src = nodeById.get(edge.sourceEntityId), dst = nodeById.get(edge.targetEntityId);
			if (!src || !dst) continue;
			visitedEdgeIds.add(edge.id);
			rawSteps.push({
				stepIndex: rawSteps.length + 1, hopDistance: current.depth + 1, stage: mapKindToStage(edge.kind),
				referenceKind: edge.kind, sourceEntity: src, targetEntity: dst, line: edge.line, column: edge.column,
				snippet: extractLineSnippet(sourceMap, src.qualifiedName, edge.line),
			});
			const nextId = edge.sourceEntityId === current.entityId ? edge.targetEntityId : edge.sourceEntityId;
			if (!visitedEntities.has(nextId)) { visitedEntities.add(nextId); queue.push({ entityId: nextId, depth: current.depth + 1 }); }
		}
	}

	const earliestInitLine = rawSteps
		.filter((s) => s.stage === 'BIRTH_DEFINES' || s.stage === 'INITIAL_SETS')
		.reduce((minL, s) => Math.min(minL, s.line || 1), Number.POSITIVE_INFINITY);
	const steps: VariableFlowStep[] = rawSteps.map((s) => ({
		...s,
		hasUninitializedHazard: s.stage === 'READ_USES' && (earliestInitLine === Number.POSITIVE_INFINITY || s.line < earliestInitLine),
	}));

	const cypherTaintQuery = `MATCH p=(origin:Entity)-[r:RELATES*1..${maxHops}]-(target:Entity {id: ${focalEntity.id}}) WHERE ALL(rel IN relationships(p) WHERE rel.kind IN ['DEFINES','SETS','MODIFIES','USES','CALLS']) RETURN p;`;
	return {
		focalEntity, steps,
		birthLocations: steps.filter((s) => s.stage === 'BIRTH_DEFINES' || s.stage === 'INITIAL_SETS'),
		mutationSites: steps.filter((s) => s.stage === 'MUTATION_MODIFIES' || s.stage === 'INITIAL_SETS'),
		readSites: steps.filter((s) => s.stage === 'READ_USES'),
		uninitializedHazardCount: steps.filter((s) => s.hasUninitializedHazard).length,
		cypherTaintQuery,
	};
}
