/**
 * @author Oblx <code@oblx.dev>
 * @description Local Argon2id + Pepper authentication adapter with normalized u32 user_auth_identities, Chronos RBAC groups, and brute-force limiter.
 */
import { and, desc, eq } from 'drizzle-orm';
import { AUTH_SOURCES, CHRONOS_RBAC_GROUPS, PRINCIPAL_KINDS, ROLE_IDS, SEEDED_OPERATOR_CONFIG, type RoleId } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { credentials, rbacUserGroups, userAuthIdentities, users } from '@lib/db/sqlite/schema/tables';
import { checkAndConsumeRateLimit, clearRateLimitBucket, recordAuthFailure, resetAuthRateLimiter } from '@server/http/middleware';
import { appendAuditEntry } from '@core/security/audit.chain';
import { seedDefaultRbacGroups } from '@core/security/chronos.rbac';
import { hashPasswordWithSaltAndPepper, needsPepperRotation, verifyPasswordWithConstantTimeDummy } from '@core/security/password.crypto';
import type { AuthSourcePort, VerifiedIdentityClaim } from './auth.types';

export { checkAndConsumeRateLimit, resetAuthRateLimiter };

function allocateNextUid(handle: ChronosDatabaseHandle): number {
	const top = handle.db.select({ uid: users.uid }).from(users).orderBy(desc(users.uid)).limit(1).get();
	return (Math.max(4, top?.uid ?? 4) + 1) >>> 0;
}

export async function registerLocalUser(
	handle: ChronosDatabaseHandle,
	input: { readonly username: string; readonly password: string; readonly email?: string; readonly roleId?: RoleId; readonly primaryGroupId?: number; readonly userId?: string }
): Promise<VerifiedIdentityClaim & { readonly uid: number }> {
	seedDefaultRbacGroups(handle);
	const cleanName = input.username.trim().toLowerCase();
	if (cleanName.length < 3 || input.password.length < 6) {
		throw new Error('Username (>=3 chars) and password (>=6 chars) are required.');
	}
	const existing = handle.db.select().from(users).where(eq(users.username, cleanName)).get();
	if (existing) throw new Error('Account identifier already exists.');

	const seededNames = new Set(SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.map((a) => a.username));
	const nonSeedUsers = handle.db.select().from(users).all().filter((u) => !seededNames.has(u.username as typeof SEEDED_OPERATOR_CONFIG.USERNAME));
	const uid = allocateNextUid(handle);
	const userId = input.userId ?? String(uid);
	const roleId = input.roleId ?? (nonSeedUsers.length === 0 ? ROLE_IDS.ADMIN : ROLE_IDS.ANALYST);
	const groupMeta = (input.primaryGroupId ? CHRONOS_RBAC_GROUPS.find((g) => g.id === input.primaryGroupId) : undefined)
		?? CHRONOS_RBAC_GROUPS.find((g) => g.roleId === roleId)
		?? CHRONOS_RBAC_GROUPS[2]!;
	const now = Date.now();
	const hashed = await hashPasswordWithSaltAndPepper(input.password, 1);

	handle.db.insert(users).values({
		id: userId, uid, username: cleanName, slug: cleanName.replace(/[^a-z0-9_-]/g, '-'),
		email: input.email ?? null, displayName: cleanName, primaryGroupId: groupMeta.id,
		timeLoggedSec: 0, lastLoginAt: now, principalKind: PRINCIPAL_KINDS.USER, roleId, grantMask: 0, denyMask: 0, createdAt: now,
	}).run();
	handle.db.insert(rbacUserGroups).values({ userId: uid, groupId: groupMeta.id, expiresAt: null }).run();
	handle.db.insert(userAuthIdentities).values({
		userId: uid, userKey: userId, authFlow: AUTH_SOURCES.LOCAL_PASSWORD, providerSubject: cleanName,
		credentialHash: hashed.passwordHash, salt: hashed.saltHex, pepperVersion: hashed.pepperVersion, scopedMask: 0xffffffff, lastUsedAt: now,
	}).run();
	handle.db.insert(credentials).values({
		userId, authSource: AUTH_SOURCES.LOCAL_PASSWORD, identifier: cleanName,
		saltHex: hashed.saltHex, passwordHash: hashed.passwordHash, pepperVersion: hashed.pepperVersion, createdAt: now,
	}).run();

	await appendAuditEntry(handle, userId, 'USER_REGISTERED', 'INFO', `Registered local account ${cleanName} (uid=${uid}, ${roleId})`);
	return { userId, uid, username: cleanName, principalKind: PRINCIPAL_KINDS.USER, authSource: AUTH_SOURCES.LOCAL_PASSWORD, roleId, grantMask: 0, denyMask: 0 };
}

export const localPasswordAuthAdapter: AuthSourcePort<void, { readonly username: string; readonly password: string; readonly clientIp?: string }> = {
	sourceKind: AUTH_SOURCES.LOCAL_PASSWORD,
	async verifyCredential(handle, input): Promise<VerifiedIdentityClaim | null> {
		const cleanName = input.username.trim().toLowerCase();
		const bucketKey = `${input.clientIp ?? 'local'}:${cleanName}`;
		const gate = checkAndConsumeRateLimit(bucketKey);
		if (!gate.allowed) throw new Error(`Rate limited. Retry after ${Math.ceil(gate.retryAfterMs / 1000)}s.`);

		const cred = handle.db.select().from(credentials)
			.where(and(eq(credentials.authSource, AUTH_SOURCES.LOCAL_PASSWORD), eq(credentials.identifier, cleanName))).get();
		const valid = await verifyPasswordWithConstantTimeDummy(input.password, cred);
		if (!valid || !cred) {
			recordAuthFailure(bucketKey);
			return null;
		}
		clearRateLimitBucket(bucketKey);

		if (needsPepperRotation(cred.pepperVersion)) {
			const rotated = await hashPasswordWithSaltAndPepper(input.password, 2);
			handle.db.update(credentials).set({
				saltHex: rotated.saltHex, passwordHash: rotated.passwordHash, pepperVersion: rotated.pepperVersion,
			}).where(eq(credentials.id, cred.id)).run();
			await appendAuditEntry(handle, cred.userId, 'PEPPER_UPGRADED', 'INFO', `Upgraded password pepper v${cred.pepperVersion} -> v2`);
		}

		const user = handle.db.select().from(users).where(eq(users.id, cred.userId)).get();
		if (!user) return null;
		handle.db.update(users).set({ lastLoginAt: Date.now(), timeLoggedSec: (user.timeLoggedSec ?? 0) + 60 }).where(eq(users.id, user.id)).run();
		return {
			userId: user.id, uid: user.uid, username: user.username, principalKind: user.principalKind as typeof PRINCIPAL_KINDS.USER,
			authSource: AUTH_SOURCES.LOCAL_PASSWORD, roleId: user.roleId, grantMask: user.grantMask, denyMask: user.denyMask,
		};
	},
};
