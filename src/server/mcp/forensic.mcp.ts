/**
 * @author Oblx <code@oblx.dev>
 * @description Forensic Metamodel MCP JSON-RPC 2.0 dispatcher and Streamable HTTP POST (/api/mcp) handler.
 */
import { APP_METADATA, HTTP_STATUS } from '@config/constants';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import type { ApiResponseEnvelope, RequestPrincipal } from '../http/middleware';
import { checkForensicResourceRead, checkForensicToolCapability, listPermittedForensicTools } from './mcp.auth';
import { listForensicResources, readForensicResource } from './forensic.resources';
import { executeForensicTool } from './forensic.tools';
import type { JsonRpcRequest, JsonRpcResponse, McpRuntimeContext } from './mcp.types';

export async function handleForensicJsonRpc(
	req: JsonRpcRequest,
	ctx: McpRuntimeContext,
	principal: RequestPrincipal
): Promise<{ readonly httpStatus: number; readonly body: JsonRpcResponse }> {
	const id = req.id ?? null;
	if (req.method === 'initialize') {
		return {
			httpStatus: HTTP_STATUS.OK,
			body: {
				jsonrpc: '2.0', id,
				result: { protocolVersion: '2024-11-05', serverInfo: { name: `${APP_METADATA.NAME}-Forensic-MCP`, version: APP_METADATA.VERSION }, capabilities: { tools: {}, resources: {} } },
			},
		};
	}
	if (req.method === 'tools/list') {
		return { httpStatus: HTTP_STATUS.OK, body: { jsonrpc: '2.0', id, result: { tools: listPermittedForensicTools(principal) } } };
	}
	if (req.method === 'tools/call') {
		const toolName = String(req.params?.name ?? '');
		const capErr = checkForensicToolCapability(principal, toolName);
		if (capErr) return { httpStatus: capErr.code === -32003 ? HTTP_STATUS.FORBIDDEN : HTTP_STATUS.BAD_REQUEST, body: { jsonrpc: '2.0', id, error: capErr } };
		try {
			const args = (req.params?.arguments as Readonly<Record<string, unknown>>) ?? {};
			const payload = await executeForensicTool(ctx, toolName, args);
			return { httpStatus: HTTP_STATUS.OK, body: { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload } } };
		} catch (err) {
			return { httpStatus: HTTP_STATUS.BAD_REQUEST, body: { jsonrpc: '2.0', id, error: { code: -32602, message: err instanceof Error ? err.message : 'Forensic tool error' } } };
		}
	}
	if (req.method === 'resources/list') {
		const rErr = checkForensicResourceRead(principal);
		if (rErr) return { httpStatus: HTTP_STATUS.FORBIDDEN, body: { jsonrpc: '2.0', id, error: rErr } };
		return { httpStatus: HTTP_STATUS.OK, body: { jsonrpc: '2.0', id, result: { resources: listForensicResources(ctx) } } };
	}
	if (req.method === 'resources/read') {
		const rErr = checkForensicResourceRead(principal);
		if (rErr) return { httpStatus: HTTP_STATUS.FORBIDDEN, body: { jsonrpc: '2.0', id, error: rErr } };
		try {
			const uri = String(req.params?.uri ?? '');
			return { httpStatus: HTTP_STATUS.OK, body: { jsonrpc: '2.0', id, result: readForensicResource(ctx, uri) } };
		} catch (err) {
			return { httpStatus: HTTP_STATUS.BAD_REQUEST, body: { jsonrpc: '2.0', id, error: { code: -32602, message: err instanceof Error ? err.message : 'Resource read error' } } };
		}
	}
	return { httpStatus: HTTP_STATUS.BAD_REQUEST, body: { jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported JSON-RPC method: ${req.method}` } } };
}

export async function handleForensicMcpHttp(
	ctx: McpRuntimeContext,
	bodyText: string | undefined,
	principal: RequestPrincipal
): Promise<ApiResponseEnvelope> {
	if (!bodyText || !bodyText.trim()) {
		return { status: HTTP_STATUS.BAD_REQUEST, payload: { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Empty JSON-RPC body.' } } };
	}
	const req = parseSafeJson<JsonRpcRequest>(bodyText);
	if (!req || typeof req.method !== 'string') {
		return { status: HTTP_STATUS.BAD_REQUEST, payload: { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid JSON-RPC request.' } } };
	}
	const { httpStatus, body } = await handleForensicJsonRpc(req, ctx, principal);
	return { status: httpStatus, payload: body };
}
