/**
 * @author Oblx <code@oblx.dev>
 * @description Iterative Tarjan O(V + E) Strongly Connected Components (SCC) reducer using flat Int32Array buffers.
 */
import type { GraphEntityNode, GraphReferenceEdge } from './graph_traversal';

export interface SccCluster {
	readonly clusterId: number;
	readonly memberEntityIds: readonly number[];
	readonly isCyclic: boolean;
	readonly layerRank: number;
}

export interface TarjanSccReport {
	readonly clusters: readonly SccCluster[];
	readonly cyclicClusters: readonly SccCluster[];
	readonly cyclicEntityIds: ReadonlySet<number>;
	readonly entityToClusterId: Readonly<Record<number, number>>;
	readonly entityLayerRank: Readonly<Record<number, number>>;
}

export function computeTarjanScc(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[]
): TarjanSccReport {
	const nCount = nodes.length;
	const idToDense = new Map<number, number>();
	const adj: number[][] = new Array(nCount);
	const selfLoopDense = new Uint8Array(nCount);
	for (let i = 0; i < nCount; i++) {
		idToDense.set(nodes[i]!.id, i);
		adj[i] = [];
	}
	for (let i = 0; i < edges.length; i++) {
		const e = edges[i]!;
		const u = idToDense.get(e.sourceEntityId);
		const v = idToDense.get(e.targetEntityId);
		if (u === undefined || v === undefined) continue;
		if (u === v) selfLoopDense[u] = 1;
		else adj[u]!.push(v);
	}

	let indexCounter = 1;
	const indices = new Int32Array(nCount);
	const lowlink = new Int32Array(nCount);
	const onStack = new Uint8Array(nCount);
	const tarjanStack = new Int32Array(nCount);
	let tarjanTop = 0;
	const callNodeStack = new Int32Array(nCount);
	const callEdgeIdxStack = new Int32Array(nCount);
	const rawComponents: number[][] = [];

	for (let root = 0; root < nCount; root++) {
		if (indices[root] !== 0) continue;
		let callDepth = 0;
		callNodeStack[0] = root;
		callEdgeIdxStack[0] = 0;
		indices[root] = lowlink[root] = indexCounter++;
		tarjanStack[tarjanTop++] = root;
		onStack[root] = 1;

		while (callDepth >= 0) {
			const v = callNodeStack[callDepth]!;
			const neighbors = adj[v]!;
			const edgeIdx = callEdgeIdxStack[callDepth]!;
			if (edgeIdx < neighbors.length) {
				callEdgeIdxStack[callDepth] = edgeIdx + 1;
				const w = neighbors[edgeIdx]!;
				if (indices[w] === 0) {
					callDepth++;
					callNodeStack[callDepth] = w;
					callEdgeIdxStack[callDepth] = 0;
					indices[w] = lowlink[w] = indexCounter++;
					tarjanStack[tarjanTop++] = w;
					onStack[w] = 1;
				} else if (onStack[w] === 1 && indices[w]! < lowlink[v]!) {
					lowlink[v] = indices[w]!;
				}
			} else {
				if (lowlink[v] === indices[v]) {
					const comp: number[] = [];
					while (tarjanTop > 0) {
						const w = tarjanStack[--tarjanTop]!;
						onStack[w] = 0;
						comp.push(nodes[w]!.id);
						if (w === v) break;
					}
					rawComponents.push(comp);
				}
				callDepth--;
				if (callDepth >= 0) {
					const parent = callNodeStack[callDepth]!;
					if (lowlink[v]! < lowlink[parent]!) lowlink[parent] = lowlink[v]!;
				}
			}
		}
	}

	const cyclicEntityIds = new Set<number>();
	const entityToClusterId: Record<number, number> = {};
	const entityLayerRank: Record<number, number> = {};
	const cyclicClusters: SccCluster[] = [];
	const totalComps = rawComponents.length;
	const clusters: SccCluster[] = new Array(totalComps);

	for (let idx = 0; idx < totalComps; idx++) {
		const members = rawComponents[idx]!;
		const clusterId = idx + 1;
		const firstDense = idToDense.get(members[0]!);
		const isCyclic = members.length > 1 || (members.length === 1 && firstDense !== undefined && selfLoopDense[firstDense] === 1);
		const layerRank = totalComps - idx;
		for (let m = 0; m < members.length; m++) {
			const id = members[m]!;
			entityToClusterId[id] = clusterId;
			entityLayerRank[id] = layerRank;
			if (isCyclic) cyclicEntityIds.add(id);
		}
		const cluster: SccCluster = { clusterId, memberEntityIds: members, isCyclic, layerRank };
		clusters[idx] = cluster;
		if (isCyclic) cyclicClusters.push(cluster);
	}
	return { clusters, cyclicClusters, cyclicEntityIds, entityToClusterId, entityLayerRank };
}
