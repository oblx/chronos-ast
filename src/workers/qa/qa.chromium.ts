/**
 * @author Oblx <code@oblx.dev>
 * @description Container-safe single-browser headless Chromium verification runner using singleton context multiplexing.
 */
import { APP_METADATA } from '@config/constants';
import { detectChromiumExecutable, withSingletonQaPage } from './qa.singleton';
import type { QaChromiumCheckResult } from './qa.types';

async function verifyTomeFolioUnclipped(page: any, verifiedSteps: string[], consoleErrors: string[]): Promise<void> {
	await page.click('[data-testid="hud-help-btn"]');
	await page.waitForSelector('[data-testid="help-tome-spread"]', { timeout: 5_000 });
	const tomeCheck = await page.evaluate((ver: string) => {
		const rp = document.querySelector('[data-testid="tome-right-page"]')?.getBoundingClientRect();
		const sp = document.querySelector('[data-testid="help-spotlight-trigger"]')?.getBoundingClientRect();
		const cp = document.querySelector('[data-testid="tome-complete-step-btn"]')?.getBoundingClientRect();
		const txt = document.querySelector('[data-testid="tome-right-page"]')?.textContent ?? '';
		return Boolean(rp && sp && cp && sp.bottom <= rp.bottom + 2 && cp.bottom <= rp.bottom + 2 && txt.includes(ver));
	}, APP_METADATA.VERSION);
	if (!tomeCheck) consoleErrors.push('Tome right-folio drill buttons clipped or active version text missing.');
	else verifiedSteps.push('TOME_RIGHT_FOLIO_UNCLIPPED');
	await page.keyboard.press('ArrowRight');
	await page.click('[data-testid="help-close-btn"]');
}

export async function runChromiumSmokeCheck(baseUrl: string, timeoutMs = 15_000): Promise<QaChromiumCheckResult> {
	const t0 = performance.now();
	const executablePath = detectChromiumExecutable();
	const verifiedSteps: string[] = [];
	return withSingletonQaPage({ viewport: { width: 1440, height: 900 }, timeoutMs: Math.min(10_000, timeoutMs) }, async ({ page, consoleErrors, pageErrors }) => {
		await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
		await page.waitForSelector('text=Chronos Lobby', { timeout: 10_000 });
		verifiedSteps.push('LOBBY_RENDERED');

		await page.click('button:has-text("Open Full Workspace")');
		await page.waitForSelector('[data-testid="project-tab-deck"]', { timeout: 8_000 });
		verifiedSteps.push('GUEST_HUD_UNFOLDED');
		await verifyTomeFolioUnclipped(page, verifiedSteps, consoleErrors);

		const passed = consoleErrors.length === 0 && pageErrors.length === 0;
		return { passed, executablePath, consoleErrors, pageErrors, durationMs: Math.round(performance.now() - t0), verifiedSteps };
	});
}
