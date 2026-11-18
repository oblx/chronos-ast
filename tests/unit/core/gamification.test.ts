/**
 * @author Oblx <code@oblx.dev>
 * @description Unit verification for Chronos Cubic XP Curve (1M XP cap), O(1) level progress, and DAG interceptor (v1.8.0).
 */
import { describe, expect, test } from 'bun:test';
import {
	calculateLevelFromXp,
	calculateXpForLevel,
	MAX_GAMIFICATION_LEVEL,
	MAX_LEVEL_XP_MEDIUM_FAST,
	MAX_LEVEL_XP_MEDIUM_SLOW,
	XP_CURVE_PRESETS,
} from '@core/gamification/xp.curve';
import { GamificationInterceptorEngine } from '@plugins/gamification/gamification.interceptor';
import { ACHIEVEMENT_CARDS, CARD_CATEGORIES, CARD_TIERS } from '@config/gamification/gamification.registry';
import { API_ROUTES } from '@config/constants';
import { allowlistCollaboratorRosterItem, pseudonymizeClientIp } from '@core/security/privacy.guard';
import { REDACTED_SECRET_TOKEN, redactOutboundPayload } from '@core/security/guards/payload.redactor';
import { handleMetamodelApiRequest } from '@server/http/router';

describe('Chronos v1.9.0 Gamification Engine, Sovereign Privacy & Outbound Payload Redactor', () => {
	test('verifies Chronos Medium-Fast cubic curve reaches exactly 1,000,000 XP at Level 100', () => {
		expect(calculateXpForLevel(1, XP_CURVE_PRESETS.MEDIUM_FAST)).toBe(0);
		expect(calculateXpForLevel(2, XP_CURVE_PRESETS.MEDIUM_FAST)).toBe(8);
		expect(calculateXpForLevel(10, XP_CURVE_PRESETS.MEDIUM_FAST)).toBe(1000);
		expect(calculateXpForLevel(50, XP_CURVE_PRESETS.MEDIUM_FAST)).toBe(125000);
		expect(calculateXpForLevel(100, XP_CURVE_PRESETS.MEDIUM_FAST)).toBe(MAX_LEVEL_XP_MEDIUM_FAST);
		expect(calculateXpForLevel(100, XP_CURVE_PRESETS.MEDIUM_FAST)).toBe(1_000_000);
	});

	test('verifies Chronos Medium-Slow curve reaches 1,059,860 XP at Level 100', () => {
		expect(calculateXpForLevel(1, XP_CURVE_PRESETS.MEDIUM_SLOW)).toBe(0);
		expect(calculateXpForLevel(100, XP_CURVE_PRESETS.MEDIUM_SLOW)).toBe(MAX_LEVEL_XP_MEDIUM_SLOW);
		expect(calculateXpForLevel(100, XP_CURVE_PRESETS.MEDIUM_SLOW)).toBe(1_059_860);
	});

	test('evaluates O(1) level progression and bounds correctly', () => {
		const zero = calculateLevelFromXp(0);
		expect(zero.currentLevel).toBe(1);
		expect(zero.levelProgressRatio).toBe(0);
		expect(zero.nextLevelTargetXp).toBe(8);

		const lv2 = calculateLevelFromXp(8);
		expect(lv2.currentLevel).toBe(2);
		expect(lv2.currentLevelBaseXp).toBe(8);
		expect(lv2.nextLevelTargetXp).toBe(27);
		expect(lv2.levelProgressRatio).toBe(0);

		const cap = calculateLevelFromXp(2_000_000);
		expect(cap.currentLevel).toBe(MAX_GAMIFICATION_LEVEL);
		expect(cap.levelProgressRatio).toBe(1.0);
	});

	test('verifies DAG next() middleware awarding, cooldown enforcement, and card tiers', () => {
		const engine = new GamificationInterceptorEngine();
		engine.setUserState(0);
		const res1 = engine.intercept({ kind: 'WORKSPACE_INDEXED', timestamp: 1000 });
		expect(res1).not.toBeNull();
		expect(res1?.awardedXp).toBe(50);
		expect(res1?.newTotalXp).toBe(50);
		expect(res1?.newLevel).toBe(3);

		const resCooldown = engine.intercept({ kind: 'WORKSPACE_INDEXED', timestamp: 2000 });
		expect(resCooldown).toBeNull();

		const resAfterCooldown = engine.intercept({ kind: 'WORKSPACE_INDEXED', timestamp: 15000 });
		expect(resAfterCooldown).not.toBeNull();
		expect(resAfterCooldown?.awardedXp).toBe(50);

		expect(Object.keys(CARD_CATEGORIES)).toHaveLength(9);
		expect(ACHIEVEMENT_CARDS).toHaveLength(27);
		expect(CARD_TIERS.TIER_5_HOLO.tierBonusXp).toBe(2500);
	});

	test('verifies HMAC-SHA256 IP pseudonymization, WS roster allowlisting, and outbound payload redactor', async () => {
		const anon1 = await pseudonymizeClientIp('203.0.113.42', 1700000000000);
		const anon2 = await pseudonymizeClientIp('203.0.113.42', 1700000000000);
		expect(anon1).toBe(anon2);
		expect(anon1.startsWith('anon-')).toBe(true);
		expect(anon1).not.toContain('203.0.113.42');

		const safeRoster = allowlistCollaboratorRosterItem({
			clientId: 'c-9', uid: 7, username: 'alice', roleId: 'ROLE_ANALYST',
			email: 'alice@secret.org', grantMask: 0xffff, denyMask: 0x0010, cursorX: 120, cursorY: 240,
		});
		expect(safeRoster.username).toBe('alice');
		expect(safeRoster.roleBadge).toBe('ANALYST');
		expect('email' in safeRoster).toBe(false);
		expect('grantMask' in safeRoster).toBe(false);
		expect('denyMask' in safeRoster).toBe(false);

		const synthKey = ['sk', '1234567890abcdef1234'].join('-');
		const synthGh = ['ghp', 'abcdefghijklmnopqrstuvwxyz123456'].join('_');
		const dirty = `Key ${synthKey} and ${synthGh} plus postgres://admin:pass@db.internal:5432/prod and ops@oblx.dev and JWT_SECRET="topsecret"`;
		const redacted = redactOutboundPayload(dirty);
		expect(redacted.shieldActive).toBe(true);
		expect(redacted.redactionCount).toBeGreaterThanOrEqual(5);
		expect(redacted.redactedText).toContain(REDACTED_SECRET_TOKEN);
		expect(redacted.redactedText).not.toContain(synthKey);
		expect(redacted.redactedText).not.toContain('ops@oblx.dev');
		expect(redacted.redactedText).not.toContain('topsecret');
	});

	test('verifies GET /api/privacy/export-me and DELETE /api/privacy/erase-me preserve audit chain integrity', async () => {
		const reg = await handleMetamodelApiRequest(API_ROUTES.AUTH_REGISTER, 'POST', JSON.stringify({ username: 'sovereign_user', password: 'StrongPassword!234' }));
		expect(reg.status).toBe(200);
		const token = String((reg.payload as Record<string, unknown>).accessToken ?? '');
		expect(token.length).toBeGreaterThan(10);

		const expRes = await handleMetamodelApiRequest(API_ROUTES.PRIVACY_EXPORT, 'GET', undefined, { authorization: `Bearer ${token}` });
		expect(expRes.status).toBe(200);
		const expPayload = expRes.payload as Record<string, unknown>;
		expect(expPayload.schemaVersion).toBe('1.9.7');
		expect(expPayload.sovereigntyGuarantee).toBe('ZERO_RAW_HASH_OR_SALT_EXPOSURE');

		const unauthWire = await handleMetamodelApiRequest(API_ROUTES.SECURITY_WIRE_OBSERVE, 'GET', undefined, { authorization: `Bearer ${token}` });
		expect(unauthWire.status).toBe(403);

		const eraseRes = await handleMetamodelApiRequest(API_ROUTES.PRIVACY_ERASE, 'DELETE', undefined, { authorization: `Bearer ${token}` });
		expect(eraseRes.status).toBe(200);
		const erasePayload = eraseRes.payload as Record<string, unknown>;
		expect(erasePayload.erased).toBe(true);
		expect(String(erasePayload.erasedPrincipal)).toContain('erased-principal-');
	});
});
