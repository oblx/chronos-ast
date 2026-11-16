/**
 * @author Oblx <code@oblx.dev>
 * @description O(V + E) Chidamber-Kemerer (CK) OO Metrics Suite (WMC, DIT, NOC, CBO, RFC, LCOM4) and Martin Main Sequence Distance (D).
 */
import { HUD_CONFIG } from '@config/constants';
import { ENTITY_KINDS, REFERENCE_KINDS, extractFileScopePrefix } from '@config/metamodel.constants';
import type { GraphEntityNode, GraphReferenceEdge } from '@core/graph/graph_traversal';
import { buildSnapshotAdjacency, collectScopedChildMethods } from '@core/metamodel/snapshot.helpers';
import { computeEntityLcom4FromGraph } from './stability.engine';

export interface EntityCkMetrics {
	readonly entityId: number; readonly wmc: number; readonly dit: number; readonly noc: number;
	readonly cbo: number; readonly rfc: number; readonly lcom4: number; readonly abstractness: number;
	readonly instability: number; readonly mainSequenceDistance: number;
}

function computeDepthOfInheritance(
	entityId: number,
	outboundBySourceId: ReadonlyMap<number, readonly GraphReferenceEdge[]>,
	memo: Map<number, number>,
	visited: Set<number> = new Set()
): number {
	if (memo.has(entityId)) return memo.get(entityId)!;
	if (visited.has(entityId)) return 0;
	visited.add(entityId);
	let maxParentDepth = 0;
	for (const e of outboundBySourceId.get(entityId) ?? []) {
		if (e.kind === REFERENCE_KINDS.INHERITS || e.kind === REFERENCE_KINDS.IMPLEMENTS) {
			maxParentDepth = Math.max(maxParentDepth, 1 + computeDepthOfInheritance(e.targetEntityId, outboundBySourceId, memo, visited));
		}
	}
	memo.set(entityId, maxParentDepth);
	return maxParentDepth;
}

function buildCkIndices(nodes: readonly GraphEntityNode[]) {
	const filePrefixMap = new Map<string, GraphEntityNode[]>();
	const childMethodsByParent = new Map<string, GraphEntityNode[]>();
	for (const n of nodes) {
		const pfx = extractFileScopePrefix(n.qualifiedName);
		let pfxList = filePrefixMap.get(pfx);
		if (!pfxList) { pfxList = []; filePrefixMap.set(pfx, pfxList); }
		pfxList.push(n);

		if (n.kind === ENTITY_KINDS.METHOD || n.kind === ENTITY_KINDS.FUNCTION) {
			const idx = n.qualifiedName.lastIndexOf('::');
			const parentQ = idx >= 0 ? n.qualifiedName.slice(0, idx) : '';
			if (parentQ) {
				let mList = childMethodsByParent.get(parentQ);
				if (!mList) { mList = []; childMethodsByParent.set(parentQ, mList); }
				mList.push(n);
			}
		}
	}
	return { filePrefixMap, childMethodsByParent };
}

function computeNodeCoupling(
	memberIds: ReadonlySet<number>,
	outbound: ReadonlyMap<number, readonly GraphReferenceEdge[]>,
	inbound: ReadonlyMap<number, readonly GraphReferenceEdge[]>,
	initialRfcCount: number
): { readonly cbo: number; readonly rfc: number } {
	const coupledPeers = new Set<number>(), responseSet = new Set<number>();
	for (const mId of memberIds) {
		for (const e of outbound.get(mId) ?? []) {
			if (!memberIds.has(e.targetEntityId)) {
				coupledPeers.add(e.targetEntityId);
				if (e.kind === REFERENCE_KINDS.CALLS) responseSet.add(e.targetEntityId);
			}
		}
		for (const e of inbound.get(mId) ?? []) {
			if (!memberIds.has(e.sourceEntityId)) coupledPeers.add(e.sourceEntityId);
		}
	}
	return { cbo: coupledPeers.size, rfc: initialRfcCount + responseSet.size };
}

export function computeChidamberKemererSuite(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[]
): Readonly<Record<number, EntityCkMetrics>> {
	const { outboundBySourceId, inboundByTargetId, nodeById } = buildSnapshotAdjacency(nodes, edges);
	const { filePrefixMap, childMethodsByParent } = buildCkIndices(nodes);
	const ditMemo = new Map<number, number>(), scale = HUD_CONFIG.PRECISION_SCALE;
	const totalAbstract = nodes.filter((n) => n.kind === ENTITY_KINDS.INTERFACE).length;
	const wsAbstractness = nodes.length > 0 ? totalAbstract / nodes.length : 0;
	const adjRef = { nodeById, outboundBySourceId }, result: Record<number, EntityCkMetrics> = {};

	for (const node of nodes) {
		const isContainer = node.kind === ENTITY_KINDS.CLASS || node.kind === ENTITY_KINDS.INTERFACE || node.kind === ENTITY_KINDS.FILE;
		const childMethods = isContainer ? (childMethodsByParent.get(node.qualifiedName) ?? [node]) : [node];
		const wmc = childMethods.reduce((sum, m) => sum + m.cyclomatic, 0) || node.cyclomatic;
		const dit = computeDepthOfInheritance(node.id, outboundBySourceId, ditMemo);
		const noc = (inboundByTargetId.get(node.id) ?? []).filter((e) => e.kind === REFERENCE_KINDS.INHERITS || e.kind === REFERENCE_KINDS.IMPLEMENTS).length;
		const memberIds = new Set<number>([node.id, ...childMethods.map((m) => m.id)]);
		const { cbo, rfc } = computeNodeCoupling(memberIds, outboundBySourceId, inboundByTargetId, childMethods.length);
		const lcom4 = computeEntityLcom4FromGraph(node, nodes, edges, adjRef, filePrefixMap);
		const abstractness = node.kind === ENTITY_KINDS.INTERFACE ? 1 : wsAbstractness;
		const instability = node.instability / scale;
		const mainSequenceDistance = Math.round(Math.abs(abstractness + instability - 1) * scale) / scale;
		result[node.id] = { entityId: node.id, wmc, dit, noc, cbo, rfc, lcom4, abstractness: Math.round(abstractness * scale) / scale, instability, mainSequenceDistance };
	}
	return result;
}
