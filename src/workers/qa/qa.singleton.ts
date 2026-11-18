/**
 * @author Oblx <code@oblx.dev>
 * @description Singleton headless Chromium & Ephemeral QA Server harness with BrowserContext multiplexing and deterministic teardown.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { setTwinBridgeDbHandle } from '@server/ws/twin.bridge';
import { startEphemeralQaServer, type EphemeralQaRuntime } from './qa.ephemeral';

const require = createRequire(import.meta.url);
const CHROMIUM_ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--mute-audio', '--js-flags=--max-old-space-size=192'] as const;

let sharedRuntimePromise: Promise<EphemeralQaRuntime> | null = null;
let sharedRuntime: EphemeralQaRuntime | null = null;
let sharedBrowserPromise: Promise<any> | null = null;
let sharedBrowser: any = null;
let activeLeases = 0;
let totalReleased = 0;
let idleDisposeTimer: ReturnType<typeof setTimeout> | null = null;
let hooksInstalled = false;

export function detectChromiumExecutable(): string {
	const envPath = process.env.CHRONOS_CHROMIUM_PATH;
	if (envPath && existsSync(envPath)) return envPath;
	if (existsSync('/ms-playwright')) {
		const headless = Array.from(new Bun.Glob('**/chrome-headless-shell').scanSync({ cwd: '/ms-playwright' }));
		if (headless[0]) return `/ms-playwright/${headless[0]}`;
		const full = Array.from(new Bun.Glob('**/chrome').scanSync({ cwd: '/ms-playwright' }));
		if (full[0]) return `/ms-playwright/${full[0]}`;
	}
	for (const candidate of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
		if (existsSync(candidate)) return candidate;
	}
	throw new Error('Headless Chromium binary not found in container.');
}

export function loadPlaywrightCore() {
	for (const mod of ['playwright-core', '/usr/local/share/bun-global/node_modules/playwright-core']) {
		try { return require(mod) as { chromium: { launch: (opts: Record<string, unknown>) => Promise<any> } }; } catch {}
	}
	throw new Error('playwright-core runtime not found.');
}

function installExitHooks(): void {
	if (hooksInstalled) return;
	hooksInstalled = true;
	const cleanup = () => { void disposeSingletonQaHarness(); };
	process.once('beforeExit', cleanup);
	process.once('SIGINT', cleanup);
	process.once('SIGTERM', cleanup);
}

function cancelIdleDispose(): void {
	if (!idleDisposeTimer) return;
	clearTimeout(idleDisposeTimer);
	idleDisposeTimer = null;
}

export async function acquireSingletonQaRuntime(): Promise<EphemeralQaRuntime> {
	installExitHooks();
	cancelIdleDispose();
	activeLeases += 1;
	if (!sharedRuntimePromise) {
		sharedRuntimePromise = startEphemeralQaServer().then((rt) => { sharedRuntime = rt; return rt; });
	}
	const rt = await sharedRuntimePromise;
	setTwinBridgeDbHandle(rt.dbHandle);
	return rt;
}

export function releaseSingletonQaRuntime(idleMs?: number): void {
	activeLeases = Math.max(0, activeLeases - 1);
	totalReleased += 1;
	if (activeLeases > 0) return;
	cancelIdleDispose();
	const delay = idleMs ?? (totalReleased >= 3 ? 25 : 6000);
	idleDisposeTimer = setTimeout(() => { void disposeSingletonQaHarness(); }, delay);
	idleDisposeTimer.unref?.();
}

export async function getSingletonChromiumBrowser(): Promise<any> {
	installExitHooks();
	cancelIdleDispose();
	if (!sharedBrowserPromise) {
		const executablePath = detectChromiumExecutable();
		sharedBrowserPromise = loadPlaywrightCore().chromium.launch({
			executablePath, headless: true, args: [...CHROMIUM_ARGS],
		}).then((browser: any) => { sharedBrowser = browser; return browser; });
	}
	return sharedBrowserPromise;
}

export async function withSingletonQaPage<T>(
	opts: { readonly viewport?: { readonly width: number; readonly height: number }; readonly timeoutMs?: number },
	fn: (ctx: { readonly page: any; readonly consoleErrors: string[]; readonly pageErrors: string[] }) => Promise<T>,
): Promise<T> {
	cancelIdleDispose();
	const viewport = opts.viewport ?? { width: 1440, height: 900 };
	const browser = await getSingletonChromiumBrowser();
	const context = await browser.newContext({ viewport });
	const page = await context.newPage();
	page.setDefaultTimeout(opts.timeoutMs ?? 15_000);
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];
	const onConsole = (m: { type: () => string; text: () => string }) => { if (m.type() === 'error') consoleErrors.push(m.text()); };
	const onPageError = (e: Error) => pageErrors.push(e.message);
	page.on('console', onConsole);
	page.on('pageerror', onPageError);
	try {
		return await fn({ page, consoleErrors, pageErrors });
	} catch (err) {
		if (consoleErrors.length > 0 || pageErrors.length > 0) {
			console.error('[QA_PAGE_ERRORS]', { consoleErrors, pageErrors });
		}
		throw err;
	} finally {
		page.off?.('console', onConsole);
		page.off?.('pageerror', onPageError);
		await page.close().catch(() => {});
		await context.close().catch(() => {});
	}
}

export async function disposeSingletonQaHarness(): Promise<void> {
	cancelIdleDispose();
	const b = sharedBrowser;
	const bPromise = sharedBrowserPromise;
	sharedBrowser = null;
	sharedBrowserPromise = null;
	const rt = sharedRuntime;
	const rtPromise = sharedRuntimePromise;
	sharedRuntime = null;
	sharedRuntimePromise = null;
	const resolvedBrowser = b ?? (bPromise ? await bPromise.catch(() => null) : null);
	if (resolvedBrowser) await resolvedBrowser.close().catch(() => {});
	const resolvedRuntime = rt ?? (rtPromise ? await rtPromise.catch(() => null) : null);
	if (resolvedRuntime) try { resolvedRuntime.stop(); } catch {}
}
