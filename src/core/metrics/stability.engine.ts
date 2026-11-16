/**
 * @author Oblx <code@oblx.dev>
 * @description Coupling (Ca, Ce), Instability (I), and Cohesion (LCOM4) pure reductions.
 */
import { HUD_CONFIG } from '@config/constants';
import { extractFileScopePrefix, isChildScopeOf } from '@config/metamodel.constants';
import { buildIndexedGraphAdjacency, type GraphEntityNode, type GraphReferenceEdge } from '@core/graph/graph_traversal';

export interface CouplingResult {
	readonly afferentCoupling: number;
	readonly efferentCoupling: number;
	readonly instabilityScaled: number;
	readonly instabilityRatio: number;
}

export interface MethodFieldAccess {
	readonly methodName: string;
	readonly accessedFields: readonly string[];
	readonly calledMethods: readonly string[];
}

export function calculatePackageStability(
	afferentCoupling: number,
	efferentCoupling: number
): CouplingResult {
	const total = afferentCoupling + efferentCoupling;
	if (total <= 0) {
		return {
			afferentCoupling: HUD_CONFIG.METRIC_DEFAULTS.COUPLING,
			efferentCoupling: HUD_CONFIG.METRIC_DEFAULTS.COUPLING,
			instabilityScaled: HUD_CONFIG.METRIC_DEFAULTS.INSTABILITY,
			instabilityRatio: HUD_CONFIG.METRIC_DEFAULTS.INSTABILITY,
		};
	}
	const ratio = efferentCoupling / total;
	const scaled = Math.round(ratio * HUD_CONFIG.PRECISION_SCALE);
	return {
		afferentCoupling,
		efferentCoupling,
		instabilityScaled: scaled,
		instabilityRatio: Number(ratio.toFixed(3)),
	};
}

function methodsShareCohesionEdge(
	a: MethodFieldAccess,
	b: MethodFieldAccess
): boolean {
	if (a.calledMethods.includes(b.methodName)) return true;
	if (b.calledMethods.includes(a.methodName)) return true;
	const fieldsA = new Set(a.accessedFields);
	return b.accessedFields.some((f) => fieldsA.has(f));
}

export function calculateLcom4(methods: readonly MethodFieldAccess[]): number {
	if (methods.length <= 1) {
		return methods.length === 0 ? 0 : HUD_CONFIG.METRIC_DEFAULTS.LCOM_MIN;
	}
	const visited = new Set<number>();
	let components = 0;

	for (let i = 0; i < methods.length; i++) {
		if (visited.has(i)) continue;
		components++;
		const queue: number[] = [i];
		visited.add(i);
		while (queue.length > 0) {
			const current = queue.shift()!;
			for (let j = 0; j < methods.length; j++) {
				if (
					!visited.has(j) &&
					methodsShareCohesionEdge(methods[current], methods[j])
				) {
					visited.add(j);
					queue.push(j);
				}
			}
		}
	}
	return components;
}

export function computeEntityLcom4FromGraph(
	focalEntity: GraphEntityNode,
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	adj?: { readonly nodeById: ReadonlyMap<number, GraphEntityNode>; readonly outboundBySourceId: ReadonlyMap<number, readonly GraphReferenceEdge[]> },
	filePrefixMap?: ReadonlyMap<string, readonly GraphEntityNode[]>
): number {
	const filePrefix = extractFileScopePrefix(focalEntity.qualifiedName);
	const peerNodes = filePrefixMap
		? (filePrefixMap.get(filePrefix) ?? []).filter((n) => n.id !== focalEntity.id)
		: nodes.filter((n) => n.id !== focalEntity.id && isChildScopeOf(n.qualifiedName, filePrefix));
	const scopeMembers = [focalEntity, ...peerNodes];
	if (scopeMembers.length <= 1) return HUD_CONFIG.METRIC_DEFAULTS.LCOM_MIN;
	const nodeById = adj?.nodeById ?? buildIndexedGraphAdjacency(nodes, edges).nodeById;
	const outboundBySourceId = adj?.outboundBySourceId ?? buildIndexedGraphAdjacency(nodes, edges).outboundBySourceId;
	const descriptors: MethodFieldAccess[] = scopeMembers.map((member) => {
		const outgoing = (outboundBySourceId.get(member.id) ?? []).map(
			(e) => nodeById.get(e.targetEntityId)?.name ?? String(e.targetEntityId)
		);
		return { methodName: member.name, accessedFields: outgoing, calledMethods: outgoing };
	});
	return Math.max(HUD_CONFIG.METRIC_DEFAULTS.LCOM_MIN, calculateLcom4(descriptors));
}
