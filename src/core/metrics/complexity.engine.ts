/**
 * @author Oblx <code@oblx.dev>
 * @description Pure functional McCabe Cyclomatic Complexity and Nesting Depth reductions via AST visitor.
 */
import { AST_NODE_TYPES, HALSTEAD_CONSTANTS } from '@config/metamodel.constants';
import { traverseAstPreOrder } from '@core/graph/visitor';

export interface ComplexityNode {
	readonly type: string;
	readonly token?: string;
	readonly line?: number;
	readonly column?: number;
	readonly children: readonly ComplexityNode[];
}

export interface MetricReductionResult {
	readonly cyclomaticComplexity: number;
	readonly nestingDepthMax: number;
}

const BRANCHING_NODES: ReadonlySet<string> = new Set([
	AST_NODE_TYPES.IF_STATEMENT,
	AST_NODE_TYPES.FOR_STATEMENT,
	AST_NODE_TYPES.WHILE_STATEMENT,
	AST_NODE_TYPES.DO_WHILE_STATEMENT,
	AST_NODE_TYPES.CASE_CLAUSE,
	AST_NODE_TYPES.CATCH_CLAUSE,
	AST_NODE_TYPES.CONDITIONAL_EXPRESSION,
	AST_NODE_TYPES.LOGICAL_AND,
	AST_NODE_TYPES.LOGICAL_OR,
]);

export function calculateCyclomaticMetrics(
	root: ComplexityNode,
	currentDepth = 0
): MetricReductionResult {
	return traverseAstPreOrder<MetricReductionResult>(
		root,
		(node, blockDepth, state) => ({
			cyclomaticComplexity:
				state.cyclomaticComplexity + (BRANCHING_NODES.has(node.type) ? 1 : 0),
			nestingDepthMax: Math.max(state.nestingDepthMax, blockDepth),
		}),
		{
			cyclomaticComplexity: 0,
			nestingDepthMax: currentDepth,
		},
		currentDepth,
		(node) => (node.type === AST_NODE_TYPES.BLOCK ? 1 : 0)
	);
}

export function evaluateTotalCyclomaticComplexity(
	root: ComplexityNode
): MetricReductionResult {
	const raw = calculateCyclomaticMetrics(root, 0);
	return {
		cyclomaticComplexity:
			HALSTEAD_CONSTANTS.MIN_CYCLOMATIC_BASE + raw.cyclomaticComplexity,
		nestingDepthMax: raw.nestingDepthMax,
	};
}
