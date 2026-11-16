/**
 * @author Oblx <code@oblx.dev>
 * @description Tree-Sitter compatible incremental CST/AST bridge and node builder.
 */
import { AST_NODE_TYPES, LEXICAL_CONSTANTS } from '@config/metamodel.constants';
import type { ComplexityNode } from '@core/metrics/complexity.engine';
import { isCommentOrEmptyLine } from './scanner/lexical_scanner';

export interface ParsedLineToken {
	readonly lineNumber: number;
	readonly column: number;
	readonly rawLine: string;
	readonly trimmed: string;
}

const BRANCH_PATTERNS: ReadonlyArray<{
	readonly regex: RegExp;
	readonly nodeType: string;
	readonly token: string;
}> = [
	{ regex: /\bif\s*\(/, nodeType: AST_NODE_TYPES.IF_STATEMENT, token: 'if' },
	{ regex: /\bfor\s*\(/, nodeType: AST_NODE_TYPES.FOR_STATEMENT, token: 'for' },
	{ regex: /\bwhile\s*\(/, nodeType: AST_NODE_TYPES.WHILE_STATEMENT, token: 'while' },
	{ regex: /\bcase\s+[^:]+:/, nodeType: AST_NODE_TYPES.CASE_CLAUSE, token: 'case' },
	{ regex: /\bcatch\s*\(/, nodeType: AST_NODE_TYPES.CATCH_CLAUSE, token: 'catch' },
	{ regex: /\?.*:/, nodeType: AST_NODE_TYPES.CONDITIONAL_EXPRESSION, token: '?' },
];

const LOGICAL_OPERATORS: ReadonlyArray<{
	readonly regex: RegExp;
	readonly nodeType: string;
	readonly token: string;
}> = [
	{ regex: /&&/g, nodeType: AST_NODE_TYPES.LOGICAL_AND, token: '&&' },
	{ regex: /\|\|/g, nodeType: AST_NODE_TYPES.LOGICAL_OR, token: '||' },
];

export function tokenizeSourceLines(source: string): readonly ParsedLineToken[] {
	return source.split(/\r?\n/).map((rawLine, index) => {
		const firstCharIdx = rawLine.search(/\S/);
		return {
			lineNumber: index + LEXICAL_CONSTANTS.FIRST_LINE,
			column: firstCharIdx >= 0 ? firstCharIdx + 1 : LEXICAL_CONSTANTS.FIRST_COLUMN,
			rawLine,
			trimmed: rawLine.trim(),
		};
	});
}

function buildLineAstNodes(lineToken: ParsedLineToken): ComplexityNode[] {
	const { trimmed, lineNumber, column } = lineToken;
	if (isCommentOrEmptyLine(trimmed)) return [];
	const nodes: ComplexityNode[] = [];
	for (const pattern of BRANCH_PATTERNS) {
		if (pattern.regex.test(trimmed)) {
			nodes.push({ type: pattern.nodeType, token: pattern.token, line: lineNumber, column, children: [] });
		}
	}
	for (const op of LOGICAL_OPERATORS) {
		const matches = trimmed.match(op.regex);
		if (!matches) continue;
		for (const _ of matches) {
			nodes.push({ type: op.nodeType, token: op.token, line: lineNumber, column, children: [] });
		}
	}
	return nodes;
}

export function buildComplexityAstFromSource(source: string): ComplexityNode {
	const lineTokens = tokenizeSourceLines(source);
	const rootChildren: ComplexityNode[] = [];
	const blockStack: ComplexityNode[][] = [rootChildren];

	for (const lineToken of lineTokens) {
		const activeChildren = blockStack[blockStack.length - 1];
		activeChildren.push(...buildLineAstNodes(lineToken));
		const openBraces = (lineToken.trimmed.match(/\{/g) ?? []).length;
		const closeBraces = (lineToken.trimmed.match(/\}/g) ?? []).length;
		for (let i = 0; i < openBraces; i++) {
			const blockChildren: ComplexityNode[] = [];
			activeChildren.push({
				type: AST_NODE_TYPES.BLOCK,
				token: '{',
				line: lineToken.lineNumber,
				column: lineToken.column,
				children: blockChildren,
			});
			blockStack.push(blockChildren);
		}
		for (let i = 0; i < closeBraces && blockStack.length > 1; i++) {
			blockStack.pop();
		}
	}
	return {
		type: AST_NODE_TYPES.PROGRAM,
		token: 'root',
		line: LEXICAL_CONSTANTS.FIRST_LINE,
		column: LEXICAL_CONSTANTS.FIRST_COLUMN,
		children: rootChildren,
	};
}
