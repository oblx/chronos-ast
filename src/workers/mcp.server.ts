/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-Dependency JSON-RPC 2.0 Model Context Protocol (MCP) Metamodel Server exposing 5 forensic tools.
 */
import { APP_METADATA } from '@config/constants';
import { computeTarjanScc } from '@core/graph/scc.tarjan';
import { traceVariableDataFlow } from '@core/graph/variable_tracker';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { evaluateWorkspaceCodeCheck, type AuditAnnotationRecord } from '@core/metrics/codecheck.engine';
import { computeChidamberKemererSuite } from '@core/metrics/oo_metrics.engine';

export const MCP_TOOL_NAMES = {
	LOOKUP_ENTITY: 'chronos_lookup_entity',
	TRACE_REFERENCES: 'chronos_trace_references',
	VARIABLE_LINEAGE: 'chronos_variable_lineage',
	IMPACT_BLAST_RADIUS: 'chronos_impact_blast_radius',
	CODECHECK_VIOLATIONS: 'chronos_codecheck_violations',
} as const;

export interface JsonRpcRequest {
	readonly jsonrpc: '2.0';
	readonly id: number | string | null;
	readonly method: string;
	readonly params?: Readonly<Record<string, unknown>>;
}

export interface JsonRpcResponse {
	readonly jsonrpc: '2.0';
	readonly id: number | string | null;
	readonly result?: unknown;
	readonly error?: { readonly code: number; readonly message: string };
}

export const MCP_TOOLS_MANIFEST = [
	{ name: MCP_TOOL_NAMES.LOOKUP_ENTITY, description: 'Lookup entity metrics, CK OO suite, source slice, and audit annotations.' },
	{ name: MCP_TOOL_NAMES.TRACE_REFERENCES, description: 'Trace incoming and outgoing references across all 10 reference kinds.' },
	{ name: MCP_TOOL_NAMES.VARIABLE_LINEAGE, description: 'Compute use-def Data-Flow Graph (DFG) lineage across DEFINES/SETS/MODIFIES/USES/CALLS.' },
	{ name: MCP_TOOL_NAMES.IMPACT_BLAST_RADIUS, description: 'Compute transitive upstream callers and Tarjan SCC cycle membership.' },
	{ name: MCP_TOOL_NAMES.CODECHECK_VIOLATIONS, description: 'List active unsuppressed CHR-001..CHR-016 CodeCheck violations.' },
] as const;

function resolveTargetEntity(snapshot: WorkspaceSnapshot, args: Readonly<Record<string, unknown>>) {
	const idArg = typeof args.entityId === 'number' ? args.entityId : undefined;
	const qNameArg = typeof args.qualifiedName === 'string' ? args.qualifiedName : undefined;
	const nameArg = typeof args.name === 'string' ? args.name : undefined;
	return (
		snapshot.nodes.find((n) => (idArg !== undefined && n.id === idArg) || (qNameArg && n.qualifiedName === qNameArg) || (nameArg && n.name === nameArg)) ??
		snapshot.nodes[0]
	);
}

function executeMcpToolCall(
	toolName: string,
	args: Readonly<Record<string, unknown>>,
	snapshot: WorkspaceSnapshot,
	annotations: readonly AuditAnnotationRecord[]
): unknown {
	const target = resolveTargetEntity(snapshot, args);
	if (!target) return { error: 'Workspace has no indexed entities' };

	if (toolName === MCP_TOOL_NAMES.LOOKUP_ENTITY) {
		const ckMap = computeChidamberKemererSuite(snapshot.nodes, snapshot.edges);
		return {
			entity: target,
			ckMetrics: ckMap[target.id] ?? null,
			sourceSlice: snapshot.sourceMap[target.qualifiedName] ?? '',
			annotations: annotations.filter((a) => a.qualifiedName === target.qualifiedName),
		};
	}
	if (toolName === MCP_TOOL_NAMES.TRACE_REFERENCES) {
		return {
			focalEntity: target.qualifiedName,
			outbound: snapshot.edges.filter((e) => e.sourceEntityId === target.id),
			inbound: snapshot.edges.filter((e) => e.targetEntityId === target.id),
		};
	}
	if (toolName === MCP_TOOL_NAMES.VARIABLE_LINEAGE) {
		return traceVariableDataFlow(target.id, snapshot.nodes, snapshot.edges);
	}
	if (toolName === MCP_TOOL_NAMES.IMPACT_BLAST_RADIUS) {
		const scc = computeTarjanScc(snapshot.nodes, snapshot.edges);
		const visited = new Set<number>([target.id]);
		const queue: number[] = [target.id];
		while (queue.length > 0) {
			const curr = queue.shift()!;
			for (const e of snapshot.edges) {
				if (e.targetEntityId === curr && !visited.has(e.sourceEntityId)) {
					visited.add(e.sourceEntityId);
					queue.push(e.sourceEntityId);
				}
			}
		}
		return {
			focalEntity: target.qualifiedName,
			upstreamCallerIds: [...visited].filter((id) => id !== target.id),
			inCyclicScc: scc.cyclicEntityIds.has(target.id),
			clusterId: scc.entityToClusterId[target.id] ?? null,
		};
	}
	if (toolName === MCP_TOOL_NAMES.CODECHECK_VIOLATIONS) {
		return evaluateWorkspaceCodeCheck(snapshot.nodes, snapshot.edges, snapshot.sourceMap, annotations);
	}
	throw new Error(`Unknown MCP tool: ${toolName}`);
}

export function handleMcpJsonRpcRequest(
	request: JsonRpcRequest,
	snapshot: WorkspaceSnapshot,
	annotations: readonly AuditAnnotationRecord[] = []
): JsonRpcResponse {
	if (request.method === 'initialize') {
		return { jsonrpc: '2.0', id: request.id, result: { protocolVersion: '2024-11-05', serverInfo: { name: APP_METADATA.NAME, version: APP_METADATA.VERSION }, capabilities: { tools: {} } } };
	}
	if (request.method === 'tools/list') {
		return { jsonrpc: '2.0', id: request.id, result: { tools: MCP_TOOLS_MANIFEST } };
	}
	if (request.method === 'tools/call') {
		try {
			const toolName = String(request.params?.name ?? '');
			const toolArgs = (request.params?.arguments as Readonly<Record<string, unknown>>) ?? {};
			const payload = executeMcpToolCall(toolName, toolArgs, snapshot, annotations);
			return { jsonrpc: '2.0', id: request.id, result: { content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload } };
		} catch (err) {
			return { jsonrpc: '2.0', id: request.id, error: { code: -32602, message: err instanceof Error ? err.message : 'Tool execution error' } };
		}
	}
	return { jsonrpc: '2.0', id: request.id, error: { code: -32601, message: `Unsupported JSON-RPC method: ${request.method}` } };
}
