/**
 * @author Oblx <code@oblx.dev>
 * @description Twin Event-Driving MCP Server (/api/mcp/twin) orchestrating live WebSocket browser intents & correlated wire traces.
 */
import { APP_METADATA, HTTP_STATUS } from '@config/constants';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { captureTwinWireTraces, dispatchTwinIntentToSessions, listWsSessions } from '@server/ws/ws.hub';
import type { ApiResponseEnvelope, RequestPrincipal } from '../http/middleware';
import { authorizeTwinMcpRequest, recordTwinMcpAudit } from './mcp.auth';
import { MCP_TWIN_TOOLS, TWIN_TOOL_NAMES, type JsonRpcRequest, type JsonRpcResponse, type McpRuntimeContext, type TwinIntentPayload, type WsSessionDescriptor } from './mcp.types';

function resolveTargetedSessions(all: readonly WsSessionDescriptor[], target: string): readonly WsSessionDescriptor[] {
	if (!target || target === 'ALL') return all;
	return all.filter((s) => s.clientId === target || s.username === target || String(s.uid) === target);
}

async function execTwinTool(
	req: JsonRpcRequest,
	ctx: McpRuntimeContext,
	principal: RequestPrincipal
): Promise<{ readonly httpStatus: number; readonly body: JsonRpcResponse }> {
	const id = req.id ?? null;
	const toolName = String(req.params?.name ?? '');
	const args = (req.params?.arguments as Readonly<Record<string, unknown>>) ?? {};
	const allSessions = listWsSessions();

	if (toolName === TWIN_TOOL_NAMES.LIST_SESSIONS) {
		const authErr = await authorizeTwinMcpRequest(ctx.handle, principal, allSessions);
		if (authErr) return { httpStatus: HTTP_STATUS.FORBIDDEN, body: { jsonrpc: '2.0', id, error: authErr } };
		const payload = { sessions: allSessions, count: allSessions.length };
		return { httpStatus: HTTP_STATUS.OK, body: { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload } } };
	}

	if (toolName === TWIN_TOOL_NAMES.DISPATCH_INTENT) {
		const target = typeof args.target === 'string' && args.target.trim() ? args.target.trim() : 'ALL';
		const intent = (args.intent ?? {}) as Partial<TwinIntentPayload>;
		if (!intent || typeof intent.kind !== 'string') {
			return { httpStatus: HTTP_STATUS.BAD_REQUEST, body: { jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing intent.kind in Twin dispatch payload.' } } };
		}
		const matched = resolveTargetedSessions(allSessions, target);
		const authErr = await authorizeTwinMcpRequest(ctx.handle, principal, matched);
		if (authErr) return { httpStatus: HTTP_STATUS.FORBIDDEN, body: { jsonrpc: '2.0', id, error: authErr } };
		const res = dispatchTwinIntentToSessions(target, intent as TwinIntentPayload, principal.username);
		await recordTwinMcpAudit(ctx.handle, principal, 'TWIN_MCP_DISPATCH', `${intent.kind} -> ${target} (corr=${res.correlationId}, n=${res.dispatchedCount})`);
		return { httpStatus: HTTP_STATUS.OK, body: { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(res) }], structuredContent: res } } };
	}

	if (toolName === TWIN_TOOL_NAMES.CAPTURE_WIRE_TRACE) {
		const authErr = await authorizeTwinMcpRequest(ctx.handle, principal, []);
		if (authErr) return { httpStatus: HTTP_STATUS.FORBIDDEN, body: { jsonrpc: '2.0', id, error: authErr } };
		const limit = Math.min(128, Math.max(1, Number(args.limit ?? 32) || 32));
		const corr = typeof args.correlationId === 'string' ? args.correlationId : undefined;
		const payload = captureTwinWireTraces(limit, corr);
		return { httpStatus: HTTP_STATUS.OK, body: { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload } } };
	}
	return { httpStatus: HTTP_STATUS.BAD_REQUEST, body: { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown Twin MCP tool: ${toolName}` } } };
}

export async function handleTwinJsonRpc(
	req: JsonRpcRequest,
	ctx: McpRuntimeContext,
	principal: RequestPrincipal
): Promise<{ readonly httpStatus: number; readonly body: JsonRpcResponse }> {
	const id = req.id ?? null;
	if (req.method === 'initialize') {
		const authErr = await authorizeTwinMcpRequest(ctx.handle, principal, []);
		if (authErr) return { httpStatus: HTTP_STATUS.FORBIDDEN, body: { jsonrpc: '2.0', id, error: authErr } };
		return { httpStatus: HTTP_STATUS.OK, body: { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', serverInfo: { name: `${APP_METADATA.NAME}-Twin-MCP`, version: APP_METADATA.VERSION }, capabilities: { tools: {} } } } };
	}
	if (req.method === 'tools/list') {
		const authErr = await authorizeTwinMcpRequest(ctx.handle, principal, []);
		if (authErr) return { httpStatus: HTTP_STATUS.FORBIDDEN, body: { jsonrpc: '2.0', id, error: authErr } };
		return { httpStatus: HTTP_STATUS.OK, body: { jsonrpc: '2.0', id, result: { tools: MCP_TWIN_TOOLS } } };
	}
	if (req.method === 'tools/call') return execTwinTool(req, ctx, principal);
	return { httpStatus: HTTP_STATUS.BAD_REQUEST, body: { jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported Twin JSON-RPC method: ${req.method}` } } };
}

export async function handleTwinMcpHttp(
	ctx: McpRuntimeContext,
	bodyText: string | undefined,
	principal: RequestPrincipal
): Promise<ApiResponseEnvelope> {
	if (!bodyText || !bodyText.trim()) {
		return { status: HTTP_STATUS.BAD_REQUEST, payload: { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Empty Twin JSON-RPC body.' } } };
	}
	const req = parseSafeJson<JsonRpcRequest>(bodyText);
	if (!req || typeof req.method !== 'string') {
		return { status: HTTP_STATUS.BAD_REQUEST, payload: { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Twin JSON-RPC request.' } } };
	}
	const { httpStatus, body } = await handleTwinJsonRpc(req, ctx, principal);
	return { status: httpStatus, payload: body };
}
