/**
 * @author Oblx <code@oblx.dev>
 * @description Intra-procedural Control Flow Graph (CFG) basic-block builder with dead-block after return/throw detection.
 */
import { CFG_BLOCK_KINDS, CFG_EDGE_KINDS, LEXICAL_CONSTANTS, type CfgBlockKind } from '@config/metamodel.constants';
import { computeDominatorTreeAndUnreachable, type CfgBasicBlock, type CfgDirectedEdge } from '@core/graph/dominators';
import { isCommentOrEmptyLine } from './scanner/lexical_scanner';

export interface ControlFlowGraphProjection {
	readonly entityQualifiedName: string;
	readonly blocks: readonly CfgBasicBlock[];
	readonly edges: readonly CfgDirectedEdge[];
	readonly unreachableCount: number;
	readonly cyclomaticFormulaV: number;
}

function classifyStatementBlockKind(trimmed: string): CfgBlockKind {
	if (/^(?:if|elif|else\s+if|switch|match|case)\b/.test(trimmed)) return CFG_BLOCK_KINDS.BRANCH_DECISION;
	if (/^(?:for|while|loop)\b/.test(trimmed)) return CFG_BLOCK_KINDS.LOOP_HEADER;
	if (/^(?:try|catch|except)\b/.test(trimmed)) return CFG_BLOCK_KINDS.TRY_CATCH;
	if (/^(?:throw|raise|panic!)\b/.test(trimmed)) return CFG_BLOCK_KINDS.THROW_EXIT;
	if (/^return\b/.test(trimmed)) return CFG_BLOCK_KINDS.RETURN_EXIT;
	return CFG_BLOCK_KINDS.SEQUENTIAL;
}

function isUnconditionalTerminator(kind: CfgBlockKind): boolean {
	return kind === CFG_BLOCK_KINDS.RETURN_EXIT || kind === CFG_BLOCK_KINDS.THROW_EXIT;
}

export function buildControlFlowGraph(
	entityQualifiedName: string,
	sourceSlice: string,
	baseLineStart: number = LEXICAL_CONSTANTS.FIRST_LINE
): ControlFlowGraphProjection {
	const rawLines = sourceSlice.split(/\r?\n/);
	const rawBlocks: Array<Omit<CfgBasicBlock, 'immediateDominatorId' | 'isReachable'>> = [
		{ id: 1, kind: CFG_BLOCK_KINDS.ENTRY, label: `ENTRY // ${entityQualifiedName.split('::').pop() ?? entityQualifiedName}`, lineStart: baseLineStart, lineEnd: baseLineStart, statements: ['entry'] },
	];
	const edges: CfgDirectedEdge[] = [];
	const decisionStack: Array<{ readonly blockId: number; readonly depth: number }> = [];
	let prevBlockId: number | null = 1;
	let prevKind: CfgBlockKind = CFG_BLOCK_KINDS.ENTRY;
	let terminatedInCurrentScope = false;
	let braceDepth = 0;
	let terminatedAtDepth = -1;

	rawLines.forEach((rawLine, idx) => {
		const trimmed = rawLine.trim();
		const lineNum = baseLineStart + idx;
		if (isCommentOrEmptyLine(trimmed)) return;
		const opens = (trimmed.match(/\{/g) ?? []).length;
		const closes = (trimmed.match(/\}/g) ?? []).length;

		if (closes > 0 && terminatedInCurrentScope && braceDepth - closes < terminatedAtDepth) {
			terminatedInCurrentScope = false;
			terminatedAtDepth = -1;
			const openDecision = decisionStack.pop();
			if (openDecision) {
				prevBlockId = openDecision.blockId;
				prevKind = CFG_BLOCK_KINDS.BRANCH_DECISION;
			}
		}
		if (idx === 0 && (/^(?:export\s+)?(?:async\s+)?(?:public\s+|private\s+|protected\s+|override\s+)*(?:function|class|pub\s+fn|fn|def)\b/.test(trimmed) || trimmed.includes('=>') || /\([^)]*\)\s*(?::\s*[^{]+)?\{$/.test(trimmed))) {
			braceDepth += opens - closes;
			return;
		}
		if (trimmed === '{' || trimmed === '}' || trimmed === '};') {
			braceDepth += opens - closes;
			return;
		}

		const stmtKind = terminatedInCurrentScope ? CFG_BLOCK_KINDS.UNREACHABLE : classifyStatementBlockKind(trimmed);
		const blockId = rawBlocks.length + 1;
		rawBlocks.push({
			id: blockId,
			kind: stmtKind,
			label: trimmed.slice(0, 42),
			lineStart: lineNum,
			lineEnd: lineNum,
			statements: [trimmed],
		});

		if (stmtKind === CFG_BLOCK_KINDS.BRANCH_DECISION || stmtKind === CFG_BLOCK_KINDS.LOOP_HEADER) {
			decisionStack.push({ blockId, depth: braceDepth });
		}
		if (prevBlockId !== null && !terminatedInCurrentScope) {
			const edgeKind = prevKind === CFG_BLOCK_KINDS.BRANCH_DECISION ? CFG_EDGE_KINDS.TRUE_BRANCH : CFG_EDGE_KINDS.FALLTHROUGH;
			edges.push({ fromBlockId: prevBlockId, toBlockId: blockId, kind: edgeKind });
			if (stmtKind === CFG_BLOCK_KINDS.LOOP_HEADER) {
				edges.push({ fromBlockId: blockId, toBlockId: blockId, kind: CFG_EDGE_KINDS.LOOP_BACK });
			}
		}

		if (isUnconditionalTerminator(stmtKind)) {
			terminatedInCurrentScope = true;
			terminatedAtDepth = braceDepth;
			prevBlockId = null;
		} else if (stmtKind !== CFG_BLOCK_KINDS.UNREACHABLE) {
			prevBlockId = blockId;
			prevKind = stmtKind;
		}
		braceDepth += opens - closes;
	});

	const domResult = computeDominatorTreeAndUnreachable(1, rawBlocks, edges);
	const decisionCount = domResult.blocks.filter((b) => b.isReachable && (b.kind === CFG_BLOCK_KINDS.BRANCH_DECISION || b.kind === CFG_BLOCK_KINDS.LOOP_HEADER || b.kind === CFG_BLOCK_KINDS.TRY_CATCH)).length;
	return {
		entityQualifiedName,
		blocks: domResult.blocks,
		edges,
		unreachableCount: domResult.unreachableBlockIds.length,
		cyclomaticFormulaV: 1 + decisionCount,
	};
}
