/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.7.0 Sovereign Data Portability (GET /api/privacy/export-me) & Cryptographic Right to Erasure (DELETE /api/privacy/erase-me).
 */
import { asc, eq } from 'drizzle-orm';
import { API_ROUTES, APP_METADATA } from '@config/constants';
import { CRYPTO_CONSTANTS, PRINCIPAL_KINDS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import {
	annotations, auditLog, credentials, projectMembers, rbacUserGroups, secretsVault, sessions,
	userAchievementCards, userAuthIdentities, userGamificationProfiles, userPreferences, users, userThemeFavorites,
} from '@lib/db/sqlite/schema/tables';
import { appendAuditEntry, sha256Hex, verifyAuditChain } from '@core/security/audit.chain';
import { calculateLevelFromXp } from '@core/gamification/xp.curve';
import { defaultGamificationInterceptor } from '@plugins/gamification/gamification.interceptor';
import { buildRefreshCookieHeader, okResponse, type ApiResponseEnvelope, type RequestPrincipal } from '../http/middleware';

async function anonymizeAndRehashAuditChain(handle: ChronosDatabaseHandle, targetActors: readonly string[], anonymizedActor: string): Promise<number> {
	const actorSet = new Set(targetActors.filter(Boolean));
	const rows = handle.db.select().from(auditLog).orderBy(asc(auditLog.seq)).all();
	let prevHash: string = CRYPTO_CONSTANTS.AUDIT_GENESIS_HASH;
	let anonymizedCount = 0;
	for (const row of rows) {
		const nextActor = actorSet.has(row.actorId) ? anonymizedActor : row.actorId;
		if (nextActor !== row.actorId) anonymizedCount += 1;
		const material = `${prevHash}|${nextActor}|${row.eventKind}|${row.severity}|${row.detail}|${row.createdAt}`;
		const nextRowHash = await sha256Hex(material);
		if (nextActor !== row.actorId || row.prevHash !== prevHash || row.rowHash !== nextRowHash) {
			handle.db.update(auditLog).set({ actorId: nextActor, prevHash, rowHash: nextRowHash }).where(eq(auditLog.seq, row.seq)).run();
		}
		prevHash = nextRowHash;
	}
	return anonymizedCount;
}

function handleExportMe(handle: ChronosDatabaseHandle, principal: RequestPrincipal): ApiResponseEnvelope {
	const usr = handle.db.select().from(users).where(eq(users.id, principal.userId)).get();
	const identities = handle.db.select().from(userAuthIdentities).where(eq(userAuthIdentities.userKey, principal.userId)).all().map((i) => ({
		id: i.id, authFlow: i.authFlow, providerSubject: i.providerSubject, pepperVersion: i.pepperVersion, scopedMask: i.scopedMask, lastUsedAt: i.lastUsedAt,
	}));
	const prefs = handle.db.select().from(userPreferences).where(eq(userPreferences.userId, principal.uid)).get() ?? null;
	const favs = handle.db.select().from(userThemeFavorites).where(eq(userThemeFavorites.userId, principal.uid)).all();
	const userNotes = handle.db.select().from(annotations).where(eq(annotations.author, principal.username)).all();
	const xpProfile = handle.db.select().from(userGamificationProfiles).where(eq(userGamificationProfiles.userId, principal.userId)).get()
		?? { userId: principal.userId, totalXp: defaultGamificationInterceptor.getUserTotalXp(), levelMeta: calculateLevelFromXp(defaultGamificationInterceptor.getUserTotalXp()) };
	const cards = handle.db.select().from(userAchievementCards).where(eq(userAchievementCards.userId, principal.userId)).all();
	return okResponse({
		schemaVersion: APP_METADATA.VERSION,
		exportedAt: Date.now(),
		sovereigntyGuarantee: 'ZERO_RAW_HASH_OR_SALT_EXPOSURE',
		principal: { userId: principal.userId, uid: principal.uid, username: principal.username, roleId: principal.roleId, principalKind: principal.principalKind },
		profile: usr ? { id: usr.id, uid: usr.uid, username: usr.username, slug: usr.slug, displayName: usr.displayName, roleId: usr.roleId, createdAt: usr.createdAt } : null,
		authIdentities: identities,
		preferences: prefs,
		themeFavorites: favs,
		annotations: userNotes,
		gamification: { profile: xpProfile, achievementCards: cards },
	});
}

async function handleEraseMe(handle: ChronosDatabaseHandle, principal: RequestPrincipal): Promise<ApiResponseEnvelope> {
	const digest = await sha256Hex(`${principal.userId}:${principal.username}`);
	const erasedActorId = `erased-principal-${digest.slice(0, 12)}`;
	if (principal.principalKind !== PRINCIPAL_KINDS.GUEST && principal.userId !== 'guest') {
		handle.db.delete(credentials).where(eq(credentials.userId, principal.userId)).run();
		handle.db.delete(userAuthIdentities).where(eq(userAuthIdentities.userKey, principal.userId)).run();
		handle.db.delete(sessions).where(eq(sessions.userId, principal.userId)).run();
		handle.db.delete(secretsVault).where(eq(secretsVault.ownerId, principal.userId)).run();
		handle.db.delete(userPreferences).where(eq(userPreferences.userId, principal.uid)).run();
		handle.db.delete(userThemeFavorites).where(eq(userThemeFavorites.userId, principal.uid)).run();
		handle.db.delete(userGamificationProfiles).where(eq(userGamificationProfiles.userId, principal.userId)).run();
		handle.db.delete(userAchievementCards).where(eq(userAchievementCards.userId, principal.userId)).run();
		handle.db.delete(projectMembers).where(eq(projectMembers.userId, principal.uid)).run();
		handle.db.delete(rbacUserGroups).where(eq(rbacUserGroups.userId, principal.uid)).run();
		handle.db.delete(users).where(eq(users.id, principal.userId)).run();
	}
	const anonymizedAuditRows = await anonymizeAndRehashAuditChain(handle, [principal.userId, principal.username], erasedActorId);
	await appendAuditEntry(handle, erasedActorId, 'SOVEREIGN_RIGHT_TO_ERASURE', 'INFO', `Cryptographic erasure completed (${anonymizedAuditRows} audit rows anonymized)`);
	const auditCheck = await verifyAuditChain(handle);
	return okResponse(
		{ erased: true, erasedPrincipal: erasedActorId, anonymizedAuditRows, auditChainValid: auditCheck.valid, revertedTo: PRINCIPAL_KINDS.GUEST },
		[buildRefreshCookieHeader('', 0)]
	);
}

export async function handlePrivacyRoutes(
	handle: ChronosDatabaseHandle, urlPath: string, method: string, principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	if (urlPath.startsWith(API_ROUTES.PRIVACY_EXPORT) && method === 'GET') {
		return handleExportMe(handle, principal);
	}
	if (urlPath.startsWith(API_ROUTES.PRIVACY_ERASE) && (method === 'DELETE' || method === 'POST')) {
		return handleEraseMe(handle, principal);
	}
	return null;
}
