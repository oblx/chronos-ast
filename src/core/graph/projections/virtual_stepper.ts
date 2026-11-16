/**
 * @author Oblx <code@oblx.dev>
 * @description Static Virtual Debugger (Logic Path Stepper) state machine walking CFG basic blocks and CALLS edges with live variable state.
 */
import { LEXICAL_CONSTANTS, REFERENCE_KINDS, resolveEntitySourceSlice } from '@config/metamodel.constants';
import { buildControlFlowGraph } from '@core/ast/cfg.builder';
import type { CfgBasicBlock } from '../dominators';
import { buildIndexedGraphAdjacency, type GraphEntityNode, type GraphReferenceEdge } from '../graph_traversal';

export interface VirtualCallStackFrame {
	readonly entityId: number;
	readonly qualifiedName: string;
	readonly currentBlockId: number;
	readonly line: number;
}

export interface VirtualStepperState {
	readonly activeEntityId: number;
	readonly activeQualifiedName: string;
	readonly currentBlockId: number;
	readonly currentLine: number;
	readonly callStack: readonly VirtualCallStackFrame[];
	readonly visitedBlockPath: ReadonlyArray<{ readonly entityId: number; readonly blockId: number; readonly line: number }>;
	readonly variableBindings: Readonly<Record<string, string>>;
}

function extractBlockVariableMutations(block: CfgBasicBlock | undefined, existing: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
	if (!block) return existing;
	const next: Record<string, string> = { ...existing };
	const stmt = block.statements[0] ?? '';
	for (const m of stmt.matchAll(/\b(?:(?:this|self)\.)?([A-Za-z_]\w*)\s*([+\-*/]?=(?!=)|\+\+|--)\s*([^;]*)/g)) {
		const [varName, op, rhs] = [m[1], m[2] ?? '=', (m[3] ?? '').trim()];
		if (varName) next[varName] = op === '++' || op === '--' ? `${op}@L${block.lineStart}` : `${op} ${rhs || 'expr'} @L${block.lineStart}`;
	}
	return next;
}

function enterCallableCfgFrame(
	entity: GraphEntityNode,
	sourceMap: Readonly<Record<string, string>>,
	priorCallStack: readonly VirtualCallStackFrame[],
	priorVisitedPath: VirtualStepperState['visitedBlockPath'],
	priorBindings: Readonly<Record<string, string>>
): VirtualStepperState {
	const cfg = buildControlFlowGraph(entity.qualifiedName, resolveEntitySourceSlice(entity.qualifiedName, sourceMap), LEXICAL_CONSTANTS.FIRST_LINE);
	const entry = cfg.blocks[0];
	const blockId = entry?.id ?? LEXICAL_CONSTANTS.FIRST_LINE;
	const line = entry?.lineStart ?? LEXICAL_CONSTANTS.FIRST_LINE;
	return {
		activeEntityId: entity.id,
		activeQualifiedName: entity.qualifiedName,
		currentBlockId: blockId,
		currentLine: line,
		callStack: [...priorCallStack, { entityId: entity.id, qualifiedName: entity.qualifiedName, currentBlockId: blockId, line }],
		visitedBlockPath: [...priorVisitedPath, { entityId: entity.id, blockId, line }],
		variableBindings: extractBlockVariableMutations(entry, priorBindings),
	};
}

export function createVirtualStepperSession(
	entity: GraphEntityNode,
	sourceMap: Readonly<Record<string, string>>
): VirtualStepperState {
	return enterCallableCfgFrame(entity, sourceMap, [], [], {});
}

export function stepOverCfgBlock(
	state: VirtualStepperState,
	sourceMap: Readonly<Record<string, string>>,
	preferredEdgeIndex = 0
): VirtualStepperState {
	const cfg = buildControlFlowGraph(state.activeQualifiedName, resolveEntitySourceSlice(state.activeQualifiedName, sourceMap), LEXICAL_CONSTANTS.FIRST_LINE);
	const outEdges = cfg.edges.filter((e) => e.fromBlockId === state.currentBlockId);
	const chosenEdge = outEdges[Math.min(preferredEdgeIndex, Math.max(0, outEdges.length - 1))];
	const nextBlock = cfg.blocks.find((b) => b.id === chosenEdge?.toBlockId) ?? cfg.blocks.find((b) => b.id === state.currentBlockId + 1);
	if (!nextBlock) return state;
	return {
		...state,
		currentBlockId: nextBlock.id,
		currentLine: nextBlock.lineStart,
		callStack: [...state.callStack.slice(0, -1), { entityId: state.activeEntityId, qualifiedName: state.activeQualifiedName, currentBlockId: nextBlock.id, line: nextBlock.lineStart }],
		visitedBlockPath: [...state.visitedBlockPath, { entityId: state.activeEntityId, blockId: nextBlock.id, line: nextBlock.lineStart }],
		variableBindings: extractBlockVariableMutations(nextBlock, state.variableBindings),
	};
}

export function chooseBranch(
	state: VirtualStepperState,
	sourceMap: Readonly<Record<string, string>>,
	branchIndex: number
): VirtualStepperState {
	return stepOverCfgBlock(state, sourceMap, branchIndex);
}

export function stepIntoCall(
	state: VirtualStepperState,
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	sourceMap: Readonly<Record<string, string>>
): VirtualStepperState {
	const { nodeById, outboundBySourceId } = buildIndexedGraphAdjacency(nodes, edges);
	const outCalls = (outboundBySourceId.get(state.activeEntityId) ?? []).filter((e) => e.kind === REFERENCE_KINDS.CALLS);
	const callEdge = outCalls.find((e) => e.line === state.currentLine) ?? outCalls[0];
	const targetNode = callEdge ? nodeById.get(callEdge.targetEntityId) : undefined;
	if (!targetNode) return stepOverCfgBlock(state, sourceMap, 0);
	return enterCallableCfgFrame(targetNode, sourceMap, state.callStack, state.visitedBlockPath, state.variableBindings);
}

export function stepReturnFromCall(state: VirtualStepperState): VirtualStepperState {
	if (state.callStack.length <= 1) return state;
	const nextStack = state.callStack.slice(0, -1);
	const caller = nextStack[nextStack.length - 1]!;
	return {
		...state,
		activeEntityId: caller.entityId,
		activeQualifiedName: caller.qualifiedName,
		currentBlockId: caller.currentBlockId,
		currentLine: caller.line,
		callStack: nextStack,
		visitedBlockPath: [...state.visitedBlockPath, { entityId: caller.entityId, blockId: caller.currentBlockId, line: caller.line }],
	};
}

export function backtrackStepper(state: VirtualStepperState, nodes: readonly GraphEntityNode[]): VirtualStepperState {
	if (state.visitedBlockPath.length <= 1) return state;
	const nextPath = state.visitedBlockPath.slice(0, -1);
	const prev = nextPath[nextPath.length - 1]!;
	const prevNode = nodes.find((n) => n.id === prev.entityId);
	return {
		...state,
		activeEntityId: prev.entityId,
		activeQualifiedName: prevNode?.qualifiedName ?? state.activeQualifiedName,
		currentBlockId: prev.blockId,
		currentLine: prev.line,
		visitedBlockPath: nextPath,
	};
}

export { stepIntoCall as stepInto, stepOverCfgBlock as stepOver, stepReturnFromCall as stepReturn, backtrackStepper as backtrack };
