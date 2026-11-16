/**
 * @author Oblx <code@oblx.dev>
 * @description Container-safe single-browser headless Chromium verification runner with 20s watchdog & zero error gates.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { QaChromiumCheckResult } from './qa.types';

const require = createRequire(import.meta.url);

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
	const candidates = [
		'playwright-core',
		'/usr/local/share/bun-global/node_modules/playwright-core',
	];
	for (const mod of candidates) {
		try { return require(mod) as { chromium: { launch: (opts: Record<string, unknown>) => Promise<any> } }; } catch {}
	}
	throw new Error('playwright-core runtime not found.');
}

export async function runChromiumSmokeCheck(baseUrl: string, timeoutMs = 20_000): Promise<QaChromiumCheckResult> {
	const t0 = performance.now();
	const executablePath = detectChromiumExecutable();
	const { chromium } = loadPlaywrightCore();
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];
	const verifiedSteps: string[] = [];
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
	});
	const timer = setTimeout(() => { void browser.close().catch(() => {}); }, timeoutMs);
	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await context.newPage();
		page.setDefaultTimeout(Math.min(10_000, timeoutMs));
		page.on('console', (msg: { type: () => string; text: () => string }) => {
			if (msg.type() === 'error') consoleErrors.push(msg.text());
		});
		page.on('pageerror', (err: Error) => pageErrors.push(err.message));

		await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
		await page.waitForSelector('text=Chronos Lobby', { timeout: 10_000 });
		verifiedSteps.push('LOBBY_RENDERED');

		await page.click('button:has-text("Open Full Workspace")');
		await page.waitForSelector('[data-testid="project-tab-deck"]', { timeout: 8_000 });
		verifiedSteps.push('GUEST_HUD_UNFOLDED');

		const passed = consoleErrors.length === 0 && pageErrors.length === 0;
		return { passed, executablePath, consoleErrors, pageErrors, durationMs: Math.round(performance.now() - t0), verifiedSteps };
	} finally {
		clearTimeout(timer);
		await browser.close().catch(() => {});
	}
}
