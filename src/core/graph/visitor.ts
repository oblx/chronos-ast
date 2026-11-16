/**
 * @author Oblx <code@oblx.dev>
 * @description Pure functional AST & Entity Graph visitor traversal engine.
 */
import type { ComplexityNode } from '@core/metrics/complexity.engine';

export type NodeVisitorFn<TState> = (
	node: ComplexityNode,
	depth: number,
	state: TState
) => TState;

export type DepthStepResolver = (node: ComplexityNode) => number;

export function traverseAstPreOrder<TState>(
	root: ComplexityNode,
	visitor: NodeVisitorFn<TState>,
	initialState: TState,
	depth = 0,
	resolveDepthStep: DepthStepResolver = () => 1
): TState {
	let nextState = visitor(root, depth, initialState);
	const childDepth = depth + resolveDepthStep(root);
	for (const child of root.children) {
		nextState = traverseAstPreOrder(
			child,
			visitor,
			nextState,
			childDepth,
			resolveDepthStep
		);
	}
	return nextState;
}

export function countNodesByType(
	root: ComplexityNode
): Readonly<Record<string, number>> {
	return traverseAstPreOrder<Record<string, number>>(
		root,
		(node, _depth, counts) => {
			counts[node.type] = (counts[node.type] ?? 0) + 1;
			return counts;
		},
		{}
	);
}
