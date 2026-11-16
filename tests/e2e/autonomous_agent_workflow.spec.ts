/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.5 Autonomous Agent Workflow E2E Suite: MCP Manifest, CLI PAT Mint, HMAC-SHA256 Webhook Bridge, SSRF Guard, and Twin Browser Loop.
 */
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { API_ROUTES, APP_METADATA, WORKFLOW_WEBHOOK_EVENTS } from '@config/constants';
import { ROLE_MASKS } from '@config/security.constants';
import { eq } from 'drizzle-orm';
import { encryptVaultSecret } from '@core/security/vault.crypto';
import { validateOutboundUrl } from '@core/security/guards/net.guard';
import { secretsVault, users } from '@lib/db/sqlite/schema/tables';
import { signWebhookBody, upsertWorkflowWebhookConfig } from '@plugins/exporters/webhook.bridge';
import { FORENSIC_TOOL_NAMES, TWIN_TOOL_NAMES } from '@server/mcp';
import { mintScopableCliPat } from '@workers/cli/mint_mcp_token';
import { detectChromiumExecutable, loadPlaywrightCore, startEphemeralQaServer, type EphemeralQaRuntime } from '@workers/qa';

interface CapturedHook { readonly event: string; readonly deliveryId: string; readonly signature: string; readonly body: string; }

async function postJson(baseUrl: string, path: string, body: unknown, token?: string) {
	const headers: Record<string, string> = { 'content-type': 'application/json' };
	if (token) headers.authorization = `Bearer ${token}`;
	const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
	return { status: res.status, json: (await res.json()) as Record<string, any> };
}

async function waitForWebhookEvent(hooks: CapturedHook[], kind: string, timeoutMs = 4000): Promise<CapturedHook> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const hit = hooks.find((h) => h.event === kind);
		if (hit) return hit;
		await Bun.sleep(40);
	}
	throw new Error(`Timed out waiting for webhook event: ${kind}`);
}

describe('Chronos v1.9.5 Autonomous Agent Discovery, CLI PAT Mint & Signed Webhook Bridge E2E', () => {
	let runtime: EphemeralQaRuntime;
	let receiver: ReturnType<typeof Bun.serve>;
	let prevLocalHookEnv: string | undefined;
	const capturedHooks: CapturedHook[] = [];
	const hmacSecret = ['chronos', 'webhook', 'hmac', '2026'].join('-');

	beforeAll(async () => {
		prevLocalHookEnv = process.env.CHRONOS_ALLOW_LOCAL_WEBHOOK;
		process.env.CHRONOS_ALLOW_LOCAL_WEBHOOK = 'true';
		if (!existsSync('dist/index.html')) expect(Bun.spawnSync(['bun', 'run', 'build']).exitCode).toBe(0);
		receiver = Bun.serve({
			port: 0, hostname: '127.0.0.1',
			fetch: async (req) => {
				const body = await req.text();
				capturedHooks.push({
					event: req.headers.get('x-chronos-event') ?? '',
					deliveryId: req.headers.get('x-chronos-delivery-id') ?? '',
					signature: req.headers.get('x-chronos-signature') ?? '',
					body,
				});
				return Response.json({ ok: true });
			},
		});
		runtime = await startEphemeralQaServer();
		const oblxUser = runtime.dbHandle.db.select().from(users).where(eq(users.username, 'oblx')).get()!;
		const enc = await encryptVaultSecret({ ownerId: oblxUser.id, secretId: 'sec-webhook-ci', plaintextSecret: hmacSecret });
		runtime.dbHandle.db.insert(secretsVault).values({
			id: 'sec-webhook-ci', ownerId: oblxUser.id, label: 'CI Webhook HMAC', providerKind: 'WEBHOOK_HMAC',
			ciphertextB64: enc.ciphertextB64, ivB64: enc.ivB64, lastFourChars: enc.lastFourChars, keyVersion: enc.keyVersion, rotatedAt: Date.now(),
		}).run();
		upsertWorkflowWebhookConfig(runtime.dbHandle, {
			webhookUrl: `https://127.0.0.1:${receiver.port}/hook`.replace('https://', 'http://'),
			events: Object.values(WORKFLOW_WEBHOOK_EVENTS),
			secretId: 'sec-webhook-ci',
		});
	});

	afterAll(() => {
		if (prevLocalHookEnv === undefined) delete process.env.CHRONOS_ALLOW_LOCAL_WEBHOOK;
		else process.env.CHRONOS_ALLOW_LOCAL_WEBHOOK = prevLocalHookEnv;
		try { receiver?.stop(true); } catch {}
		runtime?.stop();
	});

	test('verifies GET /api/mcp/manifest, bun run mcp:token PAT minting, and SSRF CIDR enforcement', async () => {
		const res = await fetch(`${runtime.baseUrl}${API_ROUTES.MCP_MANIFEST}`);
		expect(res.status).toBe(200);
		const manifest = (await res.json()) as Record<string, any>;
		expect(manifest.version).toBe(APP_METADATA.VERSION);
		expect(manifest.license).toBe('MIT');
		expect(manifest.transports?.forensicHttp?.path).toBe(API_ROUTES.MCP_FORENSIC);
		expect(manifest.transports?.twinHttp?.path).toBe(API_ROUTES.MCP_TWIN);
		expect(Array.isArray(manifest.forensicTools)).toBe(true);
		expect(Array.isArray(manifest.twinTools)).toBe(true);
		expect(manifest.webhookEvents).toContain(WORKFLOW_WEBHOOK_EVENTS.PROJECT_INDEXED);

		const cliPat = await mintScopableCliPat({ dbPath: ':memory:', label: 'ci-agent', scopePreset: 'ADMIN' });
		expect(cliPat.rawToken.startsWith('chr_live_')).toBe(true);
		expect(cliPat.scopedBitmask >>> 0).toBe(ROLE_MASKS.ROLE_ADMIN >>> 0);
		const cliProc = Bun.spawnSync(['bun', 'run', 'mcp:token', '--', '--memory', '--label', 'ci-cli'], { cwd: process.cwd() });
		expect(cliProc.exitCode).toBe(0);
		const cliJson = JSON.parse(cliProc.stdout.toString()) as Record<string, unknown>;
		expect(String(cliJson.rawToken ?? '').startsWith('chr_live_')).toBe(true);

		await expect(validateOutboundUrl('https://169.254.169.254/latest', { allowLoopback: true })).rejects.toThrow(/private\/reserved/);
		await expect(validateOutboundUrl('https://10.0.0.5/internal', { allowLoopback: true })).rejects.toThrow(/private\/reserved/);
	});

	test('executes full autonomous loop (CLI PAT -> Forensic MCP -> Signed PROJECT_INDEXED + Twin Browser TWIN_INTENT_EXECUTED)', async () => {
		const pat = (await mintScopableCliPat({ dbPath: `file:${runtime.tempDir}/qa.sqlite`, label: 'agent-e2e' })).rawToken;
		const selfRes = await postJson(runtime.baseUrl, API_ROUTES.MCP_FORENSIC, {
			jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: FORENSIC_TOOL_NAMES.ANALYZE_SELF, arguments: { rootDir: 'src' } },
		}, pat);
		expect(selfRes.status).toBe(200);
		expect(selfRes.json.result?.structuredContent?.crossRingCycleCount).toBe(0);

		const hookIdx = await waitForWebhookEvent(capturedHooks, WORKFLOW_WEBHOOK_EVENTS.PROJECT_INDEXED);
		expect(hookIdx.signature).toBe(await signWebhookBody(hmacSecret, hookIdx.body));

		const hotspots = await postJson(runtime.baseUrl, API_ROUTES.MCP_FORENSIC, {
			jsonrpc: '2.0', id: 2, method: 'resources/read', params: { uri: 'chronos://project/chronos-self/hotspots' },
		}, pat);
		expect(hotspots.status).toBe(200);

		const browser = await loadPlaywrightCore().chromium.launch({
			executablePath: detectChromiumExecutable(), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
		});
		const consoleErrors: string[] = [], pageErrors: string[] = [];
		try {
			const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
			page.on('console', (m: { type: () => string; text: () => string }) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
			page.on('pageerror', (e: Error) => pageErrors.push(e.message));
			await page.goto(runtime.baseUrl, { waitUntil: 'domcontentloaded' });
			await page.fill('input[placeholder="operator"]', 'oblx');
			await page.fill('input[placeholder="••••••••"]', 'nopenope');
			await page.click('[data-testid="auth-signin-submit"]');
			await page.waitForSelector('[data-testid="project-tab-deck"]', { timeout: 10_000 });

			const sessRes = await postJson(runtime.baseUrl, API_ROUTES.MCP_TWIN, {
				jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: TWIN_TOOL_NAMES.LIST_SESSIONS, arguments: {} },
			}, pat);
			expect(sessRes.json.result?.structuredContent?.count).toBeGreaterThanOrEqual(1);
			await postJson(runtime.baseUrl, API_ROUTES.MCP_TWIN, {
				jsonrpc: '2.0', id: 4, method: 'tools/call',
				params: { name: TWIN_TOOL_NAMES.DISPATCH_INTENT, arguments: { target: 'ALL', intent: { kind: 'SWITCH_PROJECT', projectId: 'chronos-self' } } },
			}, pat);
			await page.waitForSelector('[data-testid="project-tab-chronos-self"]', { state: 'attached', timeout: 20_000 });
			const dCodemap = await postJson(runtime.baseUrl, API_ROUTES.MCP_TWIN, {
				jsonrpc: '2.0', id: 5, method: 'tools/call',
				params: { name: TWIN_TOOL_NAMES.DISPATCH_INTENT, arguments: { target: 'ALL', intent: { kind: 'SWITCH_PROJECTION', viewId: 'CODEMAP' } } },
			}, pat);
			await page.waitForSelector('[data-testid="codemap-projection-canvas"]', { timeout: 15_000 });
			const trace = await postJson(runtime.baseUrl, API_ROUTES.MCP_TWIN, {
				jsonrpc: '2.0', id: 6, method: 'tools/call',
				params: { name: TWIN_TOOL_NAMES.CAPTURE_WIRE_TRACE, arguments: { limit: 16, correlationId: dCodemap.json.result?.structuredContent?.correlationId } },
			}, pat);
			expect((trace.json.result?.structuredContent?.traces as any[]).some((t) => t.kind === 'ACK')).toBe(true);
			const hookTwin = await waitForWebhookEvent(capturedHooks, WORKFLOW_WEBHOOK_EVENTS.TWIN_INTENT_EXECUTED);
			expect(hookTwin.signature).toBe(await signWebhookBody(hmacSecret, hookTwin.body));
			expect(consoleErrors).toEqual([]);
			expect(pageErrors).toEqual([]);
		} finally {
			await browser.close().catch(() => {});
		}
	}, 120_000);
});
