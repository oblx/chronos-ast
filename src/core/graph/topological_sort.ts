/**
 * @author Oblx <code@oblx.dev>
 * @description Deterministic Kahn DAG topological sorting and cycle detection engine.
 */

export interface DirectedEdge {
	readonly fromId: number;
	readonly toId: number;
}

export interface TopologicalSortResult {
	readonly sortedNodeIds: readonly number[];
	readonly hasCycles: boolean;
	readonly cycleParticipantIds: readonly number[];
}

export function computeTopologicalSort(
	nodeIds: readonly number[],
	edges: readonly DirectedEdge[]
): TopologicalSortResult {
	const inDegree = new Map<number, number>();
	const adjacency = new Map<number, number[]>();

	for (const id of nodeIds) {
		inDegree.set(id, 0);
		adjacency.set(id, []);
	}

	for (const edge of edges) {
		if (edge.fromId === edge.toId) continue;
		if (!inDegree.has(edge.fromId) || !inDegree.has(edge.toId)) continue;
		const targets = adjacency.get(edge.fromId)!;
		if (!targets.includes(edge.toId)) {
			targets.push(edge.toId);
			inDegree.set(edge.toId, (inDegree.get(edge.toId) ?? 0) + 1);
		}
	}

	const queue: number[] = [];
	for (const [id, deg] of inDegree.entries()) {
		if (deg === 0) queue.push(id);
	}
	queue.sort((a, b) => a - b);

	const sortedNodeIds: number[] = [];
	while (queue.length > 0) {
		const current = queue.shift()!;
		sortedNodeIds.push(current);
		for (const neighbor of adjacency.get(current) ?? []) {
			const nextDeg = (inDegree.get(neighbor) ?? 1) - 1;
			inDegree.set(neighbor, nextDeg);
			if (nextDeg === 0) {
				queue.push(neighbor);
				queue.sort((a, b) => a - b);
			}
		}
	}

	const sortedSet = new Set(sortedNodeIds);
	const cycleParticipantIds = nodeIds.filter((id) => !sortedSet.has(id));
	return {
		sortedNodeIds,
		hasCycles: cycleParticipantIds.length > 0,
		cycleParticipantIds,
	};
}
