/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.5 Closed-Loop Self-Analysis E2E Spec: PAT Auth, Forensic MCP self-indexing, Twin MCP WS event-driving, and live Chromium verification.
 */
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { API_ROUTES } from '@config/constants';
import { ROLE_MASKS } from '@config/security.constants';
import { FORENSIC_TOOL_NAMES, TWIN_TOOL_NAMES, runForensicStdioLine } from '@server/mcp';
import { detectChromiumExecutable, loadPlaywrightCore, startEphemeralQaServer, type EphemeralQaRuntime } from '@workers/qa';

async function postJson(baseUrl: string, path: string, body: unknown, token?: string) {
	const headers: Record<string, string> = { 'content-type': 'application/json' };
	if (token) headers.authorization = `Bearer ${token}`;
	const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
	return { status: res.status, json: (await res.json()) as Record<string, any> };
}

async function mintOperatorPatAndVerifyTwinRbac(baseUrl: string): Promise<string> {
	const unauthTwin = await postJson(baseUrl, API_ROUTES.MCP_TWIN, {
		jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: TWIN_TOOL_NAMES.LIST_SESSIONS, arguments: {} },
	});
	expect(unauthTwin.status).toBe(403);
	expect(unauthTwin.json.error?.code).toBe(-32003);

	const reg = await postJson(baseUrl, API_ROUTES.AUTH_REGISTER, { username: 'analyst_nonadmin', password: 'StrongPassword!99' });
	expect(reg.status).toBe(200);
	const userToken = String(reg.json.accessToken ?? '');
	const lowPrivTwin = await postJson(baseUrl, API_ROUTES.MCP_TWIN, {
		jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: TWIN_TOOL_NAMES.LIST_SESSIONS, arguments: {} },
	}, userToken);
	expect(lowPrivTwin.status).toBe(403);
	expect(lowPrivTwin.json.error?.code).toBe(-32003);

	const login = await postJson(baseUrl, API_ROUTES.AUTH_LOGIN, { username: 'oblx', password: 'nopenope' });
	expect(login.status).toBe(200);
	const adminJwt = String(login.json.accessToken ?? '');
	const csrf = String(login.json.csrfToken ?? '');
	const patRes = await fetch(`${baseUrl}${API_ROUTES.AUTH_PAT}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${adminJwt}`, 'x-chronos-csrf': csrf },
		body: JSON.stringify({ name: 'mcp-self-analysis-e2e', scopeMask: ROLE_MASKS.ROLE_ADMIN, expiresInDays: 7 }),
	});
	expect(patRes.status).toBe(200);
	const patJson = (await patRes.json()) as Record<string, unknown>;
	const rawPat = String(patJson.rawToken ?? '');
	expect(rawPat.startsWith('chr_live_')).toBe(true);
	return rawPat;
}

async function verifyForensicSelfAnalysisAndResources(runtime: EphemeralQaRuntime, pat: string): Promise<void> {
	const initRes = await postJson(runtime.baseUrl, API_ROUTES.MCP_FORENSIC, { jsonrpc: '2.0', id: 10, method: 'initialize' }, pat);
	expect(initRes.status).toBe(200);
	expect(initRes.json.result?.serverInfo?.version).toBe('1.9.5');

	const selfRes = await postJson(runtime.baseUrl, API_ROUTES.MCP_FORENSIC, {
		jsonrpc: '2.0', id: 11, method: 'tools/call',
		params: { name: FORENSIC_TOOL_NAMES.ANALYZE_SELF, arguments: { rootDir: 'src' } },
	}, pat);
	expect(selfRes.status).toBe(200);
	const structured = selfRes.json.result?.structuredContent as Record<string, any>;
	expect(structured.projectId).toBe('chronos-self');
	expect(structured.indexedFilesCount).toBeGreaterThan(100);
	expect(structured.entityCount).toBeGreaterThan(500);
	expect(structured.crossRingCycleCount).toBe(0);
	expect(structured.hasCycles).toBe(false);

	const ccRes = await postJson(runtime.baseUrl, API_ROUTES.MCP_FORENSIC, {
		jsonrpc: '2.0', id: 12, method: 'tools/call',
		params: { name: FORENSIC_TOOL_NAMES.RUN_CODECHECK, arguments: { projectId: 'chronos-self' } },
	}, pat);
	expect(ccRes.status).toBe(200);
	expect(ccRes.json.result?.structuredContent?.complianceScore).toBeGreaterThanOrEqual(0);

	const traceRes = await postJson(runtime.baseUrl, API_ROUTES.MCP_FORENSIC, {
		jsonrpc: '2.0', id: 13, method: 'tools/call',
		params: { name: FORENSIC_TOOL_NAMES.TRACE_CODEMAP_ENTRY, arguments: { projectId: 'chronos-self' } },
	}, pat);
	expect(traceRes.status).toBe(200);
	expect(traceRes.json.result?.structuredContent?.totalFileContainers).toBeGreaterThan(100);

	const manifestRes = await postJson(runtime.baseUrl, API_ROUTES.MCP_FORENSIC, {
		jsonrpc: '2.0', id: 14, method: 'resources/read',
		params: { uri: 'chronos://project/chronos-self/manifest' },
	}, pat);
	expect(manifestRes.status).toBe(200);
	const manifestJson = JSON.parse(String(manifestRes.json.result?.contents?.[0]?.text ?? '{}'));
	expect(manifestJson.entityCount).toBeGreaterThan(500);

	const stdioOut = await runForensicStdioLine(JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'tools/list' }), {
		handle: runtime.dbHandle, getSnapshot: () => ({ nodes: [], edges: [], sourceMap: {}, indexedFilesCount: 0, workerDurationMicros: 0, hasCycles: false }),
		setSnapshot: () => {},
	});
	expect(stdioOut).toContain(FORENSIC_TOOL_NAMES.ANALYZE_SELF);
}

async function driveLiveBrowserViaTwinMcp(baseUrl: string, pat: string): Promise<void> {
	const executablePath = detectChromiumExecutable();
	const { chromium } = loadPlaywrightCore();
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];
	const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await context.newPage();
		page.on('console', (m: { type: () => string; text: () => string }) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
		page.on('pageerror', (e: Error) => pageErrors.push(e.message));
		await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
		await page.fill('input[placeholder="operator"]', 'oblx');
		await page.fill('input[placeholder="••••••••"]', 'nopenope');
		await page.click('[data-testid="auth-signin-submit"]');
		await page.waitForSelector('[data-testid="project-tab-deck"]', { timeout: 10_000 });
		await page.waitForTimeout(350);

		const listRes = await postJson(baseUrl, API_ROUTES.MCP_TWIN, {
			jsonrpc: '2.0', id: 20, method: 'tools/call', params: { name: TWIN_TOOL_NAMES.LIST_SESSIONS, arguments: {} },
		}, pat);
		expect(listRes.status).toBe(200);
		expect(listRes.json.result?.structuredContent?.count).toBeGreaterThanOrEqual(1);

		const dProj = await postJson(baseUrl, API_ROUTES.MCP_TWIN, {
			jsonrpc: '2.0', id: 21, method: 'tools/call',
			params: { name: TWIN_TOOL_NAMES.DISPATCH_INTENT, arguments: { target: 'ALL', intent: { kind: 'SWITCH_PROJECT', projectId: 'chronos-self' } } },
		}, pat);
		expect(dProj.status).toBe(200);
		await page.waitForSelector('[data-testid="project-tab-chronos-self"]', { state: 'attached', timeout: 25_000 });

		const dCodemap = await postJson(baseUrl, API_ROUTES.MCP_TWIN, {
			jsonrpc: '2.0', id: 22, method: 'tools/call',
			params: { name: TWIN_TOOL_NAMES.DISPATCH_INTENT, arguments: { target: 'ALL', intent: { kind: 'SWITCH_PROJECTION', viewId: 'CODEMAP' } } },
		}, pat);
		expect(dCodemap.status).toBe(200);
		await page.waitForSelector('[data-testid="codemap-projection-canvas"]', { timeout: 15_000 });

		const dBfly = await postJson(baseUrl, API_ROUTES.MCP_TWIN, {
			jsonrpc: '2.0', id: 23, method: 'tools/call',
			params: { name: TWIN_TOOL_NAMES.DISPATCH_INTENT, arguments: { target: 'ALL', intent: { kind: 'SWITCH_PROJECTION', viewId: 'BUTTERFLY' } } },
		}, pat);
		expect(dBfly.status).toBe(200);
		await page.waitForSelector('[data-testid="butterfly-graph-surface"]', { timeout: 15_000 });
		await page.waitForTimeout(250);

		const corrId = String(dBfly.json.result?.structuredContent?.correlationId ?? '');
		const traceRes = await postJson(baseUrl, API_ROUTES.MCP_TWIN, {
			jsonrpc: '2.0', id: 24, method: 'tools/call',
			params: { name: TWIN_TOOL_NAMES.CAPTURE_WIRE_TRACE, arguments: { limit: 32, correlationId: corrId } },
		}, pat);
		expect(traceRes.status).toBe(200);
		const traces = (traceRes.json.result?.structuredContent?.traces ?? []) as Array<Record<string, unknown>>;
		expect(traces.some((t) => t.kind === 'ACK' && String(t.clientTraceId ?? '').length > 0)).toBe(true);
		expect(consoleErrors).toEqual([]);
		expect(pageErrors).toEqual([]);
	} finally {
		await browser.close().catch(() => {});
	}
}

describe('Chronos v1.9.5 Closed-Loop Self-Analysis & Twin Event-Driving MCP E2E Suite', () => {
	let runtime: EphemeralQaRuntime;
	let pat: string;

	beforeAll(async () => {
		if (!existsSync('dist/index.html')) {
			const buildProc = Bun.spawnSync(['bun', 'run', 'build'], { cwd: process.cwd() });
			expect(buildProc.exitCode).toBe(0);
		}
		runtime = await startEphemeralQaServer();
		pat = await mintOperatorPatAndVerifyTwinRbac(runtime.baseUrl);
	});

	afterAll(() => {
		runtime?.stop();
	});

	test('self-indexes src/**/*.ts with 0 cross-ring cycles, runs CodeCheck, and traces Codemap entry', async () => {
		await verifyForensicSelfAnalysisAndResources(runtime, pat);
	}, 60_000);

	test('drives live Chromium HUD via Twin MCP, switches project/projections, and asserts ACK wire traces', async () => {
		await driveLiveBrowserViaTwinMcp(runtime.baseUrl, pat);
	}, 120_000);
});
