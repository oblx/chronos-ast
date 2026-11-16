/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.8.0 Automated Visual & Geometry QA Oracle across 8 projections, 3 viewports, and 4 modal systems.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'bun:test';
import { API_ROUTES, APP_METADATA, HUD_VIEWS } from '@config/constants';
import { ACHIEVEMENT_CARDS } from '@config/gamification/gamification.registry';
import { CLUSTER_SEAT_CAPS } from '@config/security.constants';
import { compileLatexToMathml } from '@core/math/latex.mathml';
import { redactOutboundPayload } from '@core/security/guards/payload.redactor';
import { allowlistCollaboratorRosterItem, pseudonymizeClientIp } from '@core/security/privacy.guard';
import { handleMetamodelApiRequest } from '@server/http/router';

describe('Chronos v1.9.5 Automated Visual, Geometry & Observable Wire DAG Oracle', () => {
	test('1. enforces v1.9.5 SemVer lock, Interactive Codemap Stage, Edge Clamping, Lobby CTA alignment, and Wire Observatory', () => {
		expect(APP_METADATA.VERSION).toBe('1.9.5');
		expect(HUD_VIEWS.CODEMAP).toBe('CODEMAP');
		expect(Object.keys(HUD_VIEWS).length).toBeGreaterThanOrEqual(9);
		expect(CLUSTER_SEAT_CAPS.ROLE_GUEST).toBe(2);

		const codemapSrc = readFileSync('src/client/components/organisms/projections/CodemapCanvas.svelte', 'utf8');
		expect(codemapSrc).toContain('HudInteractiveCanvasStage');
		expect(codemapSrc).toContain('HudContextMenu');
		expect(codemapSrc).toContain('data-testid="codemap-travel-layer"');
		expect(codemapSrc).toContain('stageCamRef?.resetView()');

		const leftEdgeSrc = readFileSync('src/client/components/zones/HudLeftEdgeZone.svelte', 'utf8');
		const rightEdgeSrc = readFileSync('src/client/components/zones/HudRightEdgeZone.svelte', 'utf8');
		expect(leftEdgeSrc).toContain('max-h-[calc(100vh-320px)]');
		expect(rightEdgeSrc).toContain('max-h-[calc(100vh-320px)]');
		expect(leftEdgeSrc).not.toContain('Collapse left dock');
		expect(rightEdgeSrc).not.toContain('Collapse right dock');

		const lobbyDeckSrc = readFileSync('src/client/components/modals/lobby/AuthBentoMissionDeck.svelte', 'utf8');
		const signInCardSrc = readFileSync('src/client/components/modals/lobby/AuthSignInBentoCard.svelte', 'utf8');
		expect(lobbyDeckSrc).toContain('mt-auto pt-3');
		expect(signInCardSrc).toContain('mt-auto pt-3');

		const aiDeckSrc = readFileSync('src/client/components/zones/HudAiCommandDeck.svelte', 'utf8');
		expect(aiDeckSrc).toContain('flex-1 min-w-0');
		expect(aiDeckSrc).toContain('READY · @');

		const bottomDockSrc = readFileSync('src/client/components/zones/HudBottomDockZones.svelte', 'utf8');
		expect(bottomDockSrc).toContain('data-testid="wire-tap-toggle-btn"');
		expect(bottomDockSrc).toContain('CAPABILITY_BITS.ADMIN_WIRE_OBSERVE');
	});

	test('2. enforces zero lock icons across all 27 achievement cards and compiles XP(n)=n^3 to native MathML', () => {
		expect(ACHIEVEMENT_CARDS).toHaveLength(27);
		for (const card of ACHIEVEMENT_CARDS) {
			expect(card.glyph.includes('🔒')).toBe(false);
		}
		const mathml = compileLatexToMathml('XP(n)=n^3', false);
		expect(mathml).toContain('<math');
		expect(mathml).toContain('<msup>');
		expect(mathml).not.toContain('$');
	});

	test('3. verifies Outbound Payload Redactor masks PEM keys, API tokens, DSNs, emails, and .env secrets', () => {
		const pemHead = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
		const pemTail = ['-----END', 'PRIVATE KEY-----'].join(' ');
		const synthApiKey = ['sk', 'proj1234567890abcdef'].join('-');
		const sample = [
			`${pemHead}\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC\n${pemTail}`,
			'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
			`OPENAI_API_KEY=${synthApiKey}`,
			'DATABASE_URL=postgres://user:secret@localhost:5432/chronos',
			'Contact security@oblx.dev',
		].join('\n');
		const res = redactOutboundPayload(sample);
		expect(res.shieldActive).toBe(true);
		expect(res.redactionCount).toBeGreaterThanOrEqual(5);
		expect(res.redactedText).not.toContain('PRIVATE KEY');
		expect(res.redactedText).not.toContain(synthApiKey);
		expect(res.redactedText).not.toContain('postgres://user:secret');
		expect(res.redactedText).not.toContain('security@oblx.dev');
	});

	test('4. verifies Ephemeral Network Anonymization and WS Collaborator Roster Allowlisting', async () => {
		const hashA = await pseudonymizeClientIp('198.51.100.77', 1710000000000);
		expect(hashA.startsWith('anon-')).toBe(true);
		expect(hashA.length).toBe(21);
		const allowlisted = allowlistCollaboratorRosterItem({
			clientId: 'ws-1', uid: 1, username: 'oblx', roleId: 'ROLE_ADMIN',
			email: 'code@oblx.dev', grantMask: 0xffffffff, denyMask: 0, refreshDigest: 'secret-digest',
			cursorX: 300, cursorY: 400,
		});
		expect(allowlisted.username).toBe('oblx');
		expect('email' in allowlisted).toBe(false);
		expect('grantMask' in allowlisted).toBe(false);
		expect('refreshDigest' in allowlisted).toBe(false);
	});

	test('5. verifies Sovereign Data Portability (export-me), Right to Erasure (erase-me), and Admin Wire Observe', async () => {
		const reg = await handleMetamodelApiRequest(API_ROUTES.AUTH_REGISTER, 'POST', JSON.stringify({
			username: 'oracle_erasable',
			password: 'ValidPassword!99',
		}));
		expect(reg.status).toBe(200);
		const regData = reg.payload as Record<string, unknown>;
		const accessToken = String(regData.accessToken ?? '');
		const csrfToken = String(regData.csrfToken ?? '');

		const exportRes = await handleMetamodelApiRequest(API_ROUTES.PRIVACY_EXPORT, 'GET', undefined, {
			authorization: `Bearer ${accessToken}`,
		});
		expect(exportRes.status).toBe(200);
		const archive = exportRes.payload as Record<string, unknown>;
		expect(archive.schemaVersion).toBe('1.9.5');
		const identities = archive.authIdentities as Array<Record<string, unknown>>;
		for (const idRow of identities) {
			expect('credentialHash' in idRow).toBe(false);
			expect('salt' in idRow).toBe(false);
		}

		const adminLogin = await handleMetamodelApiRequest(API_ROUTES.AUTH_LOGIN, 'POST', JSON.stringify({
			username: 'oblx',
			password: 'nopenope',
		}));
		expect(adminLogin.status).toBe(200);
		const adminToken = String((adminLogin.payload as Record<string, unknown>).accessToken ?? '');
		const wireRes = await handleMetamodelApiRequest(API_ROUTES.SECURITY_WIRE_OBSERVE, 'GET', undefined, {
			authorization: `Bearer ${adminToken}`,
		});
		expect(wireRes.status).toBe(200);
		const wirePayload = wireRes.payload as Record<string, unknown>;
		expect(Array.isArray(wirePayload.traces)).toBe(true);

		const eraseRes = await handleMetamodelApiRequest(API_ROUTES.PRIVACY_ERASE, 'DELETE', undefined, {
			authorization: `Bearer ${accessToken}`,
			'x-chronos-csrf': csrfToken,
		});
		expect(eraseRes.status).toBe(200);
		const eraseData = eraseRes.payload as Record<string, unknown>;
		expect(eraseData.erased).toBe(true);
		expect(eraseData.auditChainValid).toBe(true);
	});
});
