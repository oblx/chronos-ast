/**
 * @author Oblx <code@oblx.dev>
 * @description Ephemeral isolated SQLite WAL DB + Bun.serve(port: 0) QA runtime with strict try/finally & .trash cleanup.
 */
import { existsSync, mkdirSync, mkdtempSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { API_ROUTES, HTTP_STATUS, WORKSPACE_DEFAULTS, WS_CONFIG } from '@config/constants';
import { bootstrapDefaultWorkspace, type WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { saveWorkspaceRecord } from '@core/metamodel/workspace/manager/workspace.manager';
import { ensureSeededOperatorAccount } from '@lib/db/seed.operator';
import { closeChronosDb, createChronosDb, type ChronosDatabaseHandle } from '@lib/db/client';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { sanitizeInboundPayload, sanitizeOutboundForPrincipal } from '@plugins/sanitizers/form.sanitizer';
import { buildSecurityResponseHeaders, normalizeHeaders, okResponse, resolveRequestPrincipal, type ApiResponseEnvelope, type RequestPrincipal } from '@server/http/middleware';
import { serverDagKernel } from '@server/http/server.kernel';
import { handleForensicMcpHttp, handleMcpManifestRoute, handleTwinMcpHttp, type McpRuntimeContext } from '@server/mcp';
import { handleAuthSubRoutes } from '@server/routes/auth.routes';
import { handleCollabRoutes } from '@server/routes/collab.routes';
import { handleGamificationRoutes } from '@server/routes/gamification.routes';
import { handlePrivacyRoutes } from '@server/routes/privacy.routes';
import { ensureDefaultProjectsSeeded, handleProjectAndAiRoutes } from '@server/routes/project.routes';
import { handleSecurityRoutes } from '@server/routes/security.routes';
import { ensureCommunityThemesSeeded, handleThemeAndPreferenceRoutes } from '@server/routes/theme.routes';
import { handleVaultAndSyncRoutes } from '@server/http/vault_sync.routes';
import { loadLiveDocsMarkdownMap, handleWorkspaceRoute } from '@server/http/workspace.routes';
import { compileHelpBookFromDocs } from '@core/metamodel/help.engine';
import { setTwinBridgeDbHandle } from '@server/ws/twin.bridge';
import { handleWsClientFrame, joinWsClient, leaveWsClient, resetWsHub, type WsInboundFrame } from '@server/ws/ws.hub';

export interface EphemeralQaRuntime {
	readonly port: number;
	readonly baseUrl: string;
	readonly dbHandle: ChronosDatabaseHandle;
	readonly tempDir: string;
	readonly stop: () => void;
}

interface WsData { clientId: string; uid: number; username: string; roleId: string; effectiveMask: number; workspaceId: string; token?: string; }

async function dispatchEphemeralApi(
	urlPath: string, method: string, bodyText: string | undefined, rawHeaders: Record<string, string>,
	handle: ChronosDatabaseHandle, snaps: Map<string, WorkspaceSnapshot>, mcpCtx: McpRuntimeContext
): Promise<ApiResponseEnvelope> {
	const headers = normalizeHeaders(rawHeaders);
	const principal: RequestPrincipal = await resolveRequestPrincipal(handle, headers);
	const safeBody = bodyText ? JSON.stringify(sanitizeInboundPayload(parseSafeJson<unknown>(bodyText))) : undefined;
	const coreSnap = snaps.get('chronos-core')!;
	return serverDagKernel.execute(urlPath, method, principal, safeBody ?? '', async () => {
		const authParsed = safeBody ? parseSafeJson<Record<string, unknown>>(safeBody) : {};
		const reqProj = urlPath.startsWith(API_ROUTES.SNAPSHOT) ? new URL(`http://chronos${urlPath}`).searchParams.get('project') : null;
		const res: ApiResponseEnvelope =
			(await serverDagKernel.handleWireObserveRoute(urlPath, method, headers, principal))
			?? (urlPath.startsWith(API_ROUTES.MCP_MANIFEST) && method === 'GET' ? handleMcpManifestRoute() : null)
			?? (urlPath.startsWith(API_ROUTES.MCP_TWIN) && method === 'POST' ? await handleTwinMcpHttp(mcpCtx, safeBody, principal) : null)
			?? (urlPath.startsWith(API_ROUTES.MCP_FORENSIC) && method === 'POST' ? await handleForensicMcpHttp(mcpCtx, safeBody, principal) : null)
			?? (urlPath.startsWith('/api/auth/') ? await handleAuthSubRoutes(handle, urlPath, method, authParsed, headers, principal) : null)
			?? (await handleSecurityRoutes(handle, urlPath, method, safeBody, headers, principal))
			?? (await handlePrivacyRoutes(handle, urlPath, method, principal))
			?? (await handleVaultAndSyncRoutes(handle, urlPath, method, safeBody, headers, principal))
			?? (await handleCollabRoutes(handle, urlPath, method, safeBody, principal))
			?? (await handleThemeAndPreferenceRoutes(handle, urlPath, method, safeBody, headers, principal))
			?? (await handleProjectAndAiRoutes(handle, coreSnap, urlPath, method, safeBody, headers, principal))
			?? (await handleGamificationRoutes(handle, urlPath, method, safeBody, headers, principal))
			?? (urlPath.startsWith(API_ROUTES.HELP_BOOK) && method === 'GET' ? okResponse({ chapters: compileHelpBookFromDocs(loadLiveDocsMarkdownMap()) }) : null)
			?? (urlPath.startsWith(API_ROUTES.SNAPSHOT) && method === 'GET' ? okResponse((reqProj ? snaps.get(reqProj) : undefined) ?? coreSnap) : null)
			?? (urlPath.startsWith(API_ROUTES.WORKSPACES) && method === 'POST' ? await handleWorkspaceRoute(handle, coreSnap, safeBody, method, headers, principal) : null)
			?? { status: HTTP_STATUS.NOT_FOUND, payload: { error: 'Unknown QA API route' } };
		return { ...res, payload: sanitizeOutboundForPrincipal(res.payload, principal.effectiveMask, principal.roleId) };
	});
}

function wrapHeaders(res: Response, cookies?: readonly string[]): Response {
	const headers = new Headers(res.headers);
	for (const [k, v] of Object.entries(buildSecurityResponseHeaders())) headers.set(k, v);
	for (const c of cookies ?? []) headers.append('Set-Cookie', c);
	return new Response(res.body, { status: res.status, headers });
}

export async function startEphemeralQaServer(): Promise<EphemeralQaRuntime> {
	resetWsHub();
	const tempDir = mkdtempSync(join(tmpdir(), 'chronos-qa-'));
	const dbHandle = createChronosDb(`file:${join(tempDir, 'qa.sqlite')}`);
	setTwinBridgeDbHandle(dbHandle);
	await ensureSeededOperatorAccount(dbHandle);
	const coreSnap = (await bootstrapDefaultWorkspace(dbHandle)).snapshot;
	const snaps = new Map<string, WorkspaceSnapshot>([['chronos-core', coreSnap]]);
	ensureDefaultProjectsSeeded(dbHandle, coreSnap);
	ensureCommunityThemesSeeded(dbHandle);
	saveWorkspaceRecord(dbHandle, WORKSPACE_DEFAULTS.CORE_ID, WORKSPACE_DEFAULTS.CORE_NAME, coreSnap);
	const mcpCtx: McpRuntimeContext = {
		handle: dbHandle,
		getSnapshot: (key) => (key ? snaps.get(key) : undefined) ?? snaps.get('chronos-self') ?? coreSnap,
		setSnapshot: (key, s) => { snaps.set(key, s); },
	};
	const server = Bun.serve<WsData>({
		port: 0, hostname: '127.0.0.1',
		fetch: async function handleEphemeralHttp(req, srv) {
			const url = new URL(req.url);
			if (url.pathname === WS_CONFIG.PATH) {
				const clientId = url.searchParams.get('clientId') ?? crypto.randomUUID();
				const workspaceId = url.searchParams.get('workspaceId') ?? 'chronos-core';
				const username = url.searchParams.get('username') ?? 'guest';
				const token = url.searchParams.get('token') ?? undefined;
				if (srv.upgrade(req, { data: { clientId, uid: 0, username, roleId: 'ROLE_GUEST', effectiveMask: 0x000001c1, workspaceId, token } })) return undefined;
				return new Response('WS upgrade failed', { status: 400 });
			}
			if (url.pathname.startsWith('/api/')) {
				const hasBody = req.method === 'POST' || req.method === 'DELETE' || req.method === 'PUT';
				const bodyText = hasBody ? await req.text() : undefined;
				const hdrs: Record<string, string> = {}; req.headers.forEach((v, k) => { hdrs[k] = v; });
				const out = await dispatchEphemeralApi(url.pathname + url.search, req.method, bodyText, hdrs, dbHandle, snaps, mcpCtx);
				return wrapHeaders(Response.json(out.payload, { status: out.status }), out.setCookies);
			}
			const assetPath = url.pathname === '/' ? './dist/index.html' : `./dist${url.pathname}`;
			const f = Bun.file(assetPath);
			return wrapHeaders((await f.exists()) ? new Response(f) : new Response(Bun.file('./dist/index.html')));
		},
		websocket: {
			async open(ws) {
				if (ws.data.token) {
					const principal = await resolveRequestPrincipal(dbHandle, { authorization: `Bearer ${ws.data.token}` });
					ws.data.uid = principal.uid; ws.data.roleId = principal.roleId; ws.data.effectiveMask = principal.effectiveMask;
					if (principal.uid > 0) ws.data.username = principal.username;
				}
				const r = joinWsClient({ ...ws.data, sendFrame: (p) => ws.send(p), getBufferedAmount: () => ws.getBufferedAmount() });
				if (!r.accepted) ws.close(r.code, r.reason);
			},
			message(ws, msg) { try { handleWsClientFrame(ws.data.clientId, JSON.parse(typeof msg === 'string' ? msg : new TextDecoder().decode(msg)) as WsInboundFrame); } catch {} },
			close(ws) { leaveWsClient(ws.data.clientId); },
		},
	});
	const stop = () => {
		try { server.stop(true); } catch {}
		setTwinBridgeDbHandle(null);
		resetWsHub();
		try { closeChronosDb(dbHandle); } catch {}
		try { if (existsSync(tempDir)) { mkdirSync('.trash', { recursive: true }); renameSync(tempDir, join('.trash', `qa-${Date.now()}`)); } } catch {}
	};
	return { port: server.port ?? 0, baseUrl: `http://127.0.0.1:${server.port}`, dbHandle, tempDir, stop };
}
