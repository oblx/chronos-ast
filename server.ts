/**
 * @author Oblx <code@oblx.dev>
 * @description Pure Bun HTTP + WebSocket production server serving static HUD assets, hardened security headers, and unified Chronos APIs.
 */
import { WS_CONFIG } from './src/config/constants';
import { resolveRuntimeEnv } from './src/config/env.schema';
import { buildSecurityResponseHeaders } from './src/server/http/middleware';
import { handleMetamodelApiRequest, resolveWsUpgradePrincipal } from './src/server/http/router';
import { handleWsClientFrame, joinWsClient, leaveWsClient, type WsInboundFrame } from './src/server/ws/ws.hub';

const envConfig = resolveRuntimeEnv();

interface WsSocketData {
	readonly clientId: string;
	uid: number;
	username: string;
	roleId: string;
	effectiveMask: number;
	readonly workspaceId: string;
	readonly token?: string;
}

function applyResponseHeaders(res: Response, extraCookies?: readonly string[]): Response {
	const headers = new Headers(res.headers);
	for (const [k, v] of Object.entries(buildSecurityResponseHeaders())) headers.set(k, v);
	for (const cookie of extraCookies ?? []) headers.append('Set-Cookie', cookie);
	return new Response(res.body, { status: res.status, headers });
}

Bun.serve<WsSocketData>({
	port: envConfig.serverPort,
	hostname: '0.0.0.0',
	async fetch(req: Request, server): Promise<Response | undefined> {
		const url = new URL(req.url);
		if (url.pathname === WS_CONFIG.PATH) {
			const clientId = url.searchParams.get('clientId') ?? crypto.randomUUID();
			const workspaceId = url.searchParams.get('workspaceId') ?? 'chronos-core';
			const username = url.searchParams.get('username') ?? 'guest';
			const token = url.searchParams.get('token') ?? undefined;
			if (server.upgrade(req, { data: { clientId, uid: 0, username, roleId: 'ROLE_GUEST', effectiveMask: 0x000001c1, workspaceId, token } })) return undefined;
			return new Response('WebSocket upgrade failed', { status: 400 });
		}
		if (url.pathname.startsWith('/api/')) {
			const hasBody = req.method === 'POST' || req.method === 'DELETE' || req.method === 'PUT';
			const bodyText = hasBody ? await req.text() : undefined;
			const reqHeaders: Record<string, string> = {};
			req.headers.forEach((v, k) => { reqHeaders[k] = v; });
			const result = await handleMetamodelApiRequest(url.pathname + url.search, req.method, bodyText, reqHeaders);
			return applyResponseHeaders(Response.json(result.payload, { status: result.status }), result.setCookies);
		}
		const assetPath = url.pathname === '/' ? './dist/index.html' : `./dist${url.pathname}`;
		const file = Bun.file(assetPath);
		const staticRes = (await file.exists()) ? new Response(file) : new Response(Bun.file('./dist/index.html'));
		return applyResponseHeaders(staticRes);
	},
	websocket: {
		async open(ws) {
			if (ws.data.token) {
				const principal = await resolveWsUpgradePrincipal(ws.data.token);
				ws.data.uid = principal.uid; ws.data.roleId = principal.roleId; ws.data.effectiveMask = principal.effectiveMask;
				if (principal.uid > 0) ws.data.username = principal.username;
			}
			const res = joinWsClient({
				clientId: ws.data.clientId, uid: ws.data.uid, username: ws.data.username,
				roleId: ws.data.roleId, effectiveMask: ws.data.effectiveMask, workspaceId: ws.data.workspaceId,
				sendFrame: (payload) => ws.send(payload), getBufferedAmount: () => ws.getBufferedAmount(),
			});
			if (!res.accepted) ws.close(res.code, res.reason);
		},
		message(ws, message) {
			try {
				const frame = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)) as WsInboundFrame;
				const res = handleWsClientFrame(ws.data.clientId, frame);
				if (!res.ok && res.code === WS_CONFIG.CLOSE_POLICY_VIOLATION) ws.close(res.code, res.reason);
			} catch {
				ws.close(1003, 'Malformed JSON frame');
			}
		},
		close(ws) {
			leaveWsClient(ws.data.clientId);
		},
	},
});
