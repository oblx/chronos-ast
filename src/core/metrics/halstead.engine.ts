/**
 * @author Oblx <code@oblx.dev>
 * @description Pure functional Halstead Software Science metric reduction engine using AST visitor.
 */
import { HALSTEAD_CONSTANTS } from '@config/metamodel.constants';
import { traverseAstPreOrder } from '@core/graph/visitor';
import type { ComplexityNode } from './complexity.engine';

export interface HalsteadMetricsResult {
	readonly distinctOperators: number;
	readonly distinctOperands: number;
	readonly totalOperators: number;
	readonly totalOperands: number;
	readonly vocabulary: number;
	readonly length: number;
	readonly volume: number;
	readonly difficulty: number;
	readonly effort: number;
	readonly estimatedBugs: number;
}

interface TokenAccumulator {
	readonly operators: string[];
	readonly operands: string[];
}

const OPERATOR_KEYWORDS: ReadonlySet<string> = new Set([
	'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'try', 'catch',
	'return', 'const', 'let', 'var', 'function', 'class', 'interface',
	'import', 'export', 'from', 'async', 'await', 'new', 'fn', 'pub',
	'impl', 'struct', 'enum', 'match', '=>', '===', '!==', '&&', '||',
	'=', '+', '-', '*', '/', '%', '::', '->',
]);

function classifyToken(token: string, acc: TokenAccumulator): void {
	if (OPERATOR_KEYWORDS.has(token) || /^[+\-*/%=<>!&|:]+$/.test(token)) {
		acc.operators.push(token);
	} else {
		acc.operands.push(token);
	}
}

export function calculateHalsteadFromSource(
	sourceCode: string,
	astRoot?: ComplexityNode
): HalsteadMetricsResult {
	const acc: TokenAccumulator = { operators: [], operands: [] };
	if (astRoot) {
		traverseAstPreOrder(
			astRoot,
			(node, _depth, state) => {
				const token = node.token?.trim();
				if (token) classifyToken(token, state);
				return state;
			},
			acc
		);
	}
	const lexicalTokens =
		sourceCode.match(/===|!==|=>|&&|\|\||::|->|[A-Za-z_]\w*|[+\-*/%=<>!&|]+/g) ?? [];
	for (const tok of lexicalTokens) classifyToken(tok, acc);

	const n1 = Math.max(HALSTEAD_CONSTANTS.MIN_CYCLOMATIC_BASE, new Set(acc.operators).size);
	const n2 = Math.max(HALSTEAD_CONSTANTS.MIN_CYCLOMATIC_BASE, new Set(acc.operands).size);
	const N1 = Math.max(HALSTEAD_CONSTANTS.MIN_CYCLOMATIC_BASE, acc.operators.length);
	const N2 = Math.max(HALSTEAD_CONSTANTS.MIN_CYCLOMATIC_BASE, acc.operands.length);
	const vocabulary = n1 + n2;
	const length = N1 + N2;
	const volume = Math.round(
		length * Math.log2(Math.max(HALSTEAD_CONSTANTS.MIN_LOG_VOCABULARY, vocabulary))
	);
	const difficulty = Number(
		((n1 / HALSTEAD_CONSTANTS.DIFFICULTY_DIVISOR) * (N2 / n2)).toFixed(
			HALSTEAD_CONSTANTS.DIFFICULTY_DECIMALS
		)
	);
	const effort = Math.round(difficulty * volume);
	const estimatedBugs = Number(
		(volume / HALSTEAD_CONSTANTS.BUGS_DIVISOR).toFixed(HALSTEAD_CONSTANTS.BUGS_DECIMALS)
	);
	return {
		distinctOperators: n1,
		distinctOperands: n2,
		totalOperators: N1,
		totalOperands: N2,
		vocabulary,
		length,
		volume,
		difficulty,
		effort,
		estimatedBugs,
	};
}
