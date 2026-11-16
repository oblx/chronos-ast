/**
 * @author Oblx <code@oblx.dev>
 * @description Cooper-Harvey-Kennedy iterative dominator tree reduction and unreachable dead-block detector.
 */
import { CFG_BLOCK_KINDS, type CfgBlockKind, type CfgEdgeKind } from '@config/metamodel.constants';

export interface CfgBasicBlock {
	readonly id: number;
	readonly kind: CfgBlockKind;
	readonly label: string;
	readonly lineStart: number;
	readonly lineEnd: number;
	readonly statements: readonly string[];
	readonly immediateDominatorId: number | null;
	readonly isReachable: boolean;
}

export interface CfgDirectedEdge {
	readonly fromBlockId: number;
	readonly toBlockId: number;
	readonly kind: CfgEdgeKind;
}

export function computeDominatorTreeAndUnreachable(
	entryBlockId: number,
	blocks: ReadonlyArray<Omit<CfgBasicBlock, 'immediateDominatorId' | 'isReachable'>>,
	edges: readonly CfgDirectedEdge[]
): {
	readonly blocks: readonly CfgBasicBlock[];
	readonly unreachableBlockIds: readonly number[];
	readonly dominatorMap: Readonly<Record<number, number | null>>;
} {
	const reachable = new Set<number>([entryBlockId]);
	const queue: number[] = [entryBlockId];
	while (queue.length > 0) {
		const curr = queue.shift()!;
		for (const edge of edges) {
			if (edge.fromBlockId === curr && !reachable.has(edge.toBlockId)) {
				reachable.add(edge.toBlockId);
				queue.push(edge.toBlockId);
			}
		}
	}

	const preds = new Map<number, number[]>();
	for (const b of blocks) preds.set(b.id, []);
	for (const e of edges) {
		if (reachable.has(e.fromBlockId) && reachable.has(e.toBlockId)) {
			preds.get(e.toBlockId)?.push(e.fromBlockId);
		}
	}

	const doms = new Map<number, number>();
	doms.set(entryBlockId, entryBlockId);
	let changed = true;
	while (changed) {
		changed = false;
		for (const b of blocks) {
			if (b.id === entryBlockId || !reachable.has(b.id)) continue;
			const predList = (preds.get(b.id) ?? []).filter((p) => doms.has(p));
			if (predList.length === 0) continue;
			const newIdom = Math.min(...predList);
			if (doms.get(b.id) !== newIdom) {
				doms.set(b.id, newIdom);
				changed = true;
			}
		}
	}

	const unreachableBlockIds: number[] = [];
	const dominatorMap: Record<number, number | null> = {};
	const enrichedBlocks: CfgBasicBlock[] = blocks.map((b) => {
		const isReach = reachable.has(b.id) && b.kind !== CFG_BLOCK_KINDS.UNREACHABLE;
		if (!isReach) unreachableBlockIds.push(b.id);
		const idom = b.id === entryBlockId ? null : (doms.get(b.id) ?? null);
		dominatorMap[b.id] = isReach ? idom : null;
		return {
			...b,
			kind: isReach ? b.kind : CFG_BLOCK_KINDS.UNREACHABLE,
			immediateDominatorId: isReach ? idom : null,
			isReachable: isReach,
		};
	});

	return { blocks: enrichedBlocks, unreachableBlockIds, dominatorMap };
}
