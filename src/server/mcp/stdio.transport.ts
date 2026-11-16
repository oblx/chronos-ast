/**
 * @author Oblx <code@oblx.dev>
 * @description Clean NDJSON stdio transport for Forensic MCP CLI invocations (never logs diagnostics to stdout).
 */
import { PRINCIPAL_KINDS, ROLE_IDS, ROLE_MASKS, SEEDED_OPERATOR_CONFIG } from '@config/security.constants';
import { bootstrapDefaultWorkspace, type WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { closeChronosDb, createChronosDb } from '@lib/db/client';
import { ensureSeededOperatorAccount } from '@lib/db/seed.operator';
import type { RequestPrincipal } from '../http/middleware';
import { handleForensicJsonRpc } from './forensic.mcp';
import type { JsonRpcRequest, McpRuntimeContext } from './mcp.types';

const STDIO_PRINCIPAL: RequestPrincipal = {
	userId: SEEDED_OPERATOR_CONFIG.USER_ID,
	uid: SEEDED_OPERATOR_CONFIG.UID,
	username: SEEDED_OPERATOR_CONFIG.USERNAME,
	sid: 'mcp-stdio',
	familyId: 'mcp-stdio',
	principalKind: PRINCIPAL_KINDS.USER,
	roleId: ROLE_IDS.ADMIN,
	effectiveMask: ROLE_MASKS.ROLE_ADMIN,
	isCookieOrJwtAuth: false,
	clientIp: '127.0.0.1',
};

export async function runForensicStdioLine(line: string, ctx: McpRuntimeContext): Promise<string | null> {
	const trimmed = line.trim();
	if (!trimmed) return null;
	try {
		const req = JSON.parse(trimmed) as JsonRpcRequest;
		const { body } = await handleForensicJsonRpc(req, ctx, STDIO_PRINCIPAL);
		return JSON.stringify(body);
	} catch {
		return JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid NDJSON frame' } });
	}
}

export async function startForensicMcpStdioLoop(ctx?: McpRuntimeContext): Promise<void> {
	const ownHandle = ctx ? null : createChronosDb(':memory:');
	const snapshots = new Map<string, WorkspaceSnapshot>();
	if (ownHandle) {
		await ensureSeededOperatorAccount(ownHandle);
		snapshots.set('chronos-core', (await bootstrapDefaultWorkspace(ownHandle)).snapshot);
	}
	const runtimeCtx: McpRuntimeContext = ctx ?? {
		handle: ownHandle!,
		getSnapshot: (key) => snapshots.get(key ?? 'chronos-core') ?? snapshots.get('chronos-core')!,
		setSnapshot: (key, snap) => { snapshots.set(key, snap); },
	};
	const reader = Bun.stdin.stream().getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			let nl = buffer.indexOf('\n');
			while (nl >= 0) {
				const line = buffer.slice(0, nl);
				buffer = buffer.slice(nl + 1);
				const out = await runForensicStdioLine(line, runtimeCtx);
				if (out) process.stdout.write(`${out}\n`);
				nl = buffer.indexOf('\n');
			}
		}
		if (buffer.trim()) {
			const out = await runForensicStdioLine(buffer, runtimeCtx);
			if (out) process.stdout.write(`${out}\n`);
		}
	} finally {
		if (ownHandle) closeChronosDb(ownHandle);
	}
}

if (import.meta.main) void startForensicMcpStdioLoop();
