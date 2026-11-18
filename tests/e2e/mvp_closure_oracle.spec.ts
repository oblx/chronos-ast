/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.7 Automated Visual, Geometry, Spotlight Tour, Tome & Live Singleton Playwright E2E Oracle.
 */
import { existsSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { API_ROUTES, APP_METADATA, HUD_VIEWS } from '@config/constants';
import { ACHIEVEMENT_CARDS } from '@config/gamification/gamification.registry';
import { buildEntityCartridgePolygons } from '@config/hud.tokens';
import { CLUSTER_SEAT_CAPS } from '@config/security.constants';
import { compileLatexToMathml } from '@core/math/latex.mathml';
import { redactOutboundPayload } from '@core/security/guards/payload.redactor';
import { allowlistCollaboratorRosterItem, pseudonymizeClientIp } from '@core/security/privacy.guard';
import { UI_MANIFEST } from '@ui';
import { acquireSingletonQaRuntime, releaseSingletonQaRuntime, withSingletonQaPage, type EphemeralQaRuntime } from '@workers/qa';

describe('Chronos v1.9.7 Automated Visual, Geometry, @chronos-ui/svelte & Observable Wire DAG Oracle', () => {
	let runtime: EphemeralQaRuntime;

	beforeAll(async () => {
		if (!existsSync('dist/index.html')) expect(Bun.spawnSync(['bun', 'run', 'build']).exitCode).toBe(0);
		runtime = await acquireSingletonQaRuntime();
	}, 30_000);

	afterAll(() => { releaseSingletonQaRuntime(); });

	test('1. enforces v1.9.7 SemVer lock, @chronos-ui/svelte manifest, MathML, Redactor & Privacy Guards', async () => {
		expect(APP_METADATA.VERSION).toBe('1.9.7'); expect(UI_MANIFEST.name).toBe('@chronos-ui/svelte');
		expect(UI_MANIFEST.zeroDomainDependencies).toBe(true); expect(HUD_VIEWS.CODEMAP).toBe('CODEMAP');
		expect(CLUSTER_SEAT_CAPS.ROLE_GUEST).toBe(2);
		expect(readFileSync('src/client/components/molecules/tome/HelpTomeSpread.svelte', 'utf8')).toContain('data-testid="tome-summary-card"');
		expect(buildEntityCartridgePolygons(240, 68, 12, 'CHAMFER').reticleBlPts).toBe('-6,46 -6,58 10,74 22,74');
		expect(buildEntityCartridgePolygons(240, 68, 12, 'STRAIGHT').reticleBlPts).toBe('-6,58 -6,74 10,74');
		expect(ACHIEVEMENT_CARDS).toHaveLength(27);
		const mathml = compileLatexToMathml('XP(n)=n^3', false);
		expect(mathml).toContain('<math'); expect(mathml).toContain('<msup>');
		const pemHead = ['-----BEGIN', 'PRIVATE KEY-----'].join(' '), pemTail = ['-----END', 'PRIVATE KEY-----'].join(' ');
		const synthApiKey = ['sk', 'proj1234567890abcdef'].join('-');
		const red = redactOutboundPayload(`${pemHead}\nMIIEvQIBADANBg\n${pemTail}\nBearer eyJhbGciOiJIUzI1NiJ9\nOPENAI_API_KEY=${synthApiKey}\npostgres://user:secret@localhost:5432/db\nsecurity@oblx.dev`);
		expect(red.shieldActive).toBe(true); expect(red.redactionCount).toBeGreaterThanOrEqual(5);
		expect((await pseudonymizeClientIp('198.51.100.77', 1710000000000)).startsWith('anon-')).toBe(true);
		const roster = allowlistCollaboratorRosterItem({ clientId: 'ws-1', uid: 1, username: 'oblx', roleId: 'ROLE_ADMIN', email: 'code@oblx.dev', grantMask: 0xffffffff, denyMask: 0, refreshDigest: 'sec', cursorX: 300, cursorY: 400 });
		expect('email' in roster).toBe(false);
	});

	test('2. verifies Sovereign Data Portability (export-me), Right to Erasure (erase-me), and Admin Wire Observe', async () => {
		const call = async (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) => {
			const res = await fetch(`${runtime.baseUrl}${path}`, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
			return { status: res.status, payload: (await res.json()) as Record<string, unknown> };
		};
		const reg = await call(API_ROUTES.AUTH_REGISTER, 'POST', { username: 'oracle_erasable', password: 'ValidPassword!99' });
		expect(reg.status).toBe(200);
		const { accessToken, csrfToken } = reg.payload as { accessToken: string; csrfToken: string };
		const exportRes = await call(API_ROUTES.PRIVACY_EXPORT, 'GET', undefined, { authorization: `Bearer ${accessToken}` });
		expect(exportRes.status).toBe(200);
		expect(exportRes.payload.schemaVersion).toBe('1.9.7');
		const adminLogin = await call(API_ROUTES.AUTH_LOGIN, 'POST', { username: 'oblx', password: 'nopenope' });
		const wireRes = await call(API_ROUTES.SECURITY_WIRE_OBSERVE, 'GET', undefined, { authorization: `Bearer ${String(adminLogin.payload.accessToken ?? '')}` });
		expect(wireRes.status).toBe(200);
		const eraseRes = await call(API_ROUTES.PRIVACY_ERASE, 'DELETE', undefined, { authorization: `Bearer ${accessToken}`, 'x-chronos-csrf': csrfToken });
		expect(eraseRes.status).toBe(200);
		expect(eraseRes.payload.erased).toBe(true);
	});

	test('3. Live E2E: 5-Step Spotlight Tour Geometry, Single Brand Crest, Unclipped Tome, Drawer Tabs & STRAIGHT|CHAMFER', async () => {
		await withSingletonQaPage({ viewport: { width: 1440, height: 900 } }, async ({ page, consoleErrors, pageErrors }) => {
			await page.goto(runtime.baseUrl, { waitUntil: 'domcontentloaded' });
			const closeBox = await page.locator('[data-testid="modal-close-btn"]').boundingBox();
			expect(Math.round(closeBox?.width ?? 0)).toBe(36);
			expect(Math.round(closeBox?.height ?? 0)).toBe(36);

			await page.click('[data-testid="start-hud-tour-btn"]');
			await page.waitForSelector('[data-testid="spotlight-tour-card"]', { timeout: 5000 });
			expect(await page.locator('[data-testid="guest-tutorial-quest"], [data-testid="spotlight-tour-card"]').count()).toBe(1);
			expect(await page.getAttribute('[data-testid="spotlight-cutout-polygon"]', 'data-target-id')).toBe('hud-world-canvas');

			await page.click('[data-testid="quest-spotlight-btn"]');
			expect(await page.getAttribute('[data-testid="spotlight-cutout-polygon"]', 'data-target-id')).toBe('hud-top-center-crown');
			const step2Box = await page.locator('[data-testid="spotlight-cutout-polygon"]').boundingBox();
			expect((step2Box?.y ?? 999)).toBeLessThan(100);

			await page.click('[data-testid="quest-spotlight-btn"]');
			expect(await page.getAttribute('[data-testid="spotlight-cutout-polygon"]', 'data-target-id')).toBe('hud-project-tab-deck');
			const step3Box = await page.locator('[data-testid="spotlight-cutout-polygon"]').boundingBox();
			expect((step3Box?.y ?? 999)).toBeLessThan(100);

			await page.click('[data-testid="quest-spotlight-btn"]');
			expect(await page.locator('[data-testid="spotlight-cutout-polygon"]').count()).toBe(2);

			await page.click('[data-testid="quest-spotlight-btn"]');
			expect(await page.getAttribute('[data-testid="spotlight-cutout-polygon"]', 'data-target-id')).toBe('hud-bottom-center-deck');
			await page.click('[data-testid="quest-skip-tour-btn"]');
			expect(await page.locator('[data-testid="spotlight-tour-card"]').count()).toBe(0);

			expect((await page.locator('[data-testid="top-left-brand-title"]').textContent())?.trim()).toBe('Chronos');
			await page.click('[data-testid="hud-help-btn"]');
			await page.waitForSelector('[data-testid="tome-summary-card"]', { timeout: 5000 });
			const tomeMetrics = await page.evaluate(() => {
				const sum = document.querySelector('[data-testid="tome-summary-card"]') as HTMLElement | null;
				const nextBtn = document.querySelector('[data-testid="tome-next-folio"]') as HTMLElement | null;
				const spBtn = document.querySelector('[data-testid="help-spotlight-trigger"]')?.getBoundingClientRect();
				const cpBtn = document.querySelector('[data-testid="tome-complete-step-btn"]')?.getBoundingClientRect();
				const dlg = document.querySelector('[role="dialog"]')?.getBoundingClientRect();
				return {
					sumOverflow: sum ? sum.scrollHeight - sum.clientHeight : 99,
					nextText: nextBtn?.textContent?.trim() ?? '',
					drillUnclipped: Boolean(spBtn && cpBtn && dlg && spBtn.bottom <= dlg.bottom && cpBtn.bottom <= dlg.bottom),
				};
			});
			expect(tomeMetrics.sumOverflow).toBeLessThanOrEqual(2);
			expect(tomeMetrics.nextText).toBe('Next Folio [→]');
			expect(tomeMetrics.drillUnclipped).toBe(true);
			await page.click('[data-testid="modal-close-btn"]');

			await page.click('[data-testid="unlock-studio-cta"]');
			await page.fill('input[placeholder="operator"]', 'oblx');
			await page.fill('input[placeholder="••••••••"]', 'nopenope');
			await page.click('[data-testid="auth-signin-submit"]');
			await page.waitForSelector('[data-testid="project-tab-deck"]', { timeout: 10_000 });

			const readCanvasRect = () => page.evaluate(() => {
				const el = document.querySelector('main[data-hud-zone="WORLD_CANVAS"]') as HTMLElement | null;
				return el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null;
			});
			const baseRect1440 = await readCanvasRect();
			await page.click('[data-testid="left-rail-expand-btn"]');
			await page.waitForSelector('[data-testid="left-drawer-panel"]');
			await page.click('[data-testid="left-drawer-tab-files"]');
			expect(await page.getAttribute('[data-testid="left-drawer-tab-files"]', 'aria-selected')).toBe('true');
			await page.click('[data-testid="right-rail-expand-btn"]');
			await page.waitForSelector('[data-testid="right-drawer-panel"]');
			await page.click('[data-testid="right-rail-tier-2"]');
			expect(await page.getAttribute('[data-testid="right-drawer-tab-relations"]', 'aria-selected')).toBe('true');
			expect(await readCanvasRect()).toEqual(baseRect1440);

			await page.click('[data-testid="hud-settings-btn"]');
			await page.waitForSelector('[data-testid="corner-style-straight"]', { timeout: 5000 });
			await page.click('[data-testid="corner-style-straight"]');
			expect(await page.getAttribute('[data-hud-zone="TOP_LEFT"]', 'data-corner-style')).toBe('STRAIGHT');
			await page.click('[data-testid="corner-style-chamfer"]');
			expect(await page.getAttribute('[data-hud-zone="TOP_LEFT"]', 'data-corner-style')).toBe('CHAMFER');
			await page.click('[data-testid="modal-close-btn"]');
			expect(consoleErrors).toEqual([]);
			expect(pageErrors).toEqual([]);
		});
	}, 45_000);
});
