/**
 * @author Oblx <code@oblx.dev>
 * @description Idempotent v2.1.0 bootstrap seeder for Sovereign Admin 'oblx' (u32 uid=1, 0xFFFFFFFF) and DEVMODE role test accounts.
 */
import { eq } from 'drizzle-orm';
import { resolveRuntimeEnv } from '@config/env.schema';
import { AUTH_SOURCES, PRINCIPAL_KINDS, SEEDED_OPERATOR_CONFIG } from '@config/security.constants';
import { appendAuditEntry } from '@core/security/audit.chain';
import { seedDefaultRbacGroups } from '@core/security/chronos.rbac';
import { hashPasswordWithSaltAndPepper } from '@core/security/password.crypto';
import type { ChronosDatabaseHandle } from './sqlite/client/connection';
import { credentials, rbacUserGroups, userAuthIdentities, users } from './sqlite/schema/tables';

export async function upsertSeededAccount(
	handle: ChronosDatabaseHandle,
	acc: (typeof SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS)[number],
	passwordOverride?: string,
	envRecord?: Record<string, string | undefined>
): Promise<void> {
	const existing = handle.db.select().from(users).where(eq(users.username, acc.username)).get();
	if (existing) return;

	const rawPass = passwordOverride ?? acc.password;
	const hashed = await hashPasswordWithSaltAndPepper(rawPass, 1, envRecord);
	const now = Date.now();
	const userIdStr = String(acc.uid);

	handle.db.insert(users).values({
		id: userIdStr, uid: acc.uid, username: acc.username, slug: acc.username,
		email: acc.email, displayName: acc.displayName, primaryGroupId: acc.groupId,
		timeLoggedSec: 0, lastLoginAt: now, principalKind: PRINCIPAL_KINDS.USER,
		roleId: acc.roleId, grantMask: 0, denyMask: 0, createdAt: now,
	}).run();

	handle.db.insert(rbacUserGroups).values({ userId: acc.uid, groupId: acc.groupId, expiresAt: null }).run();

	handle.db.insert(userAuthIdentities).values({
		userId: acc.uid, userKey: userIdStr, authFlow: AUTH_SOURCES.LOCAL_PASSWORD,
		providerSubject: acc.username, credentialHash: hashed.passwordHash,
		salt: hashed.saltHex, pepperVersion: hashed.pepperVersion, scopedMask: 0xffffffff, lastUsedAt: now,
	}).run();

	handle.db.insert(credentials).values({
		userId: userIdStr, authSource: AUTH_SOURCES.LOCAL_PASSWORD, identifier: acc.username,
		saltHex: hashed.saltHex, passwordHash: hashed.passwordHash, pepperVersion: hashed.pepperVersion, createdAt: now,
	}).run();
}

export async function ensureSeededOperatorAccount(
	handle: ChronosDatabaseHandle,
	envRecord?: Record<string, string | undefined>
): Promise<{ readonly seeded: boolean; readonly userId: string; readonly uid: number; readonly username: string }> {
	seedDefaultRbacGroups(handle);
	const env = resolveRuntimeEnv(envRecord);
	const existingOblx = handle.db.select().from(users).where(eq(users.username, SEEDED_OPERATOR_CONFIG.USERNAME)).get();
	if (existingOblx) {
		if (env.devMode) {
			for (const devAcc of SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.slice(1)) {
				await upsertSeededAccount(handle, devAcc, undefined, envRecord);
			}
		}
		return { seeded: false, userId: existingOblx.id, uid: existingOblx.uid, username: existingOblx.username };
	}

	const primary = SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS[0]!;
	const overridePass = envRecord?.CHRONOS_SEED_PASSWORD ?? (typeof process !== 'undefined' ? process.env?.CHRONOS_SEED_PASSWORD : undefined);
	await upsertSeededAccount(handle, primary, overridePass, envRecord);

	const legHash = await hashPasswordWithSaltAndPepper(SEEDED_OPERATOR_CONFIG.LEGACY_PASSWORD, 1, envRecord);
	handle.db.insert(credentials).values({
		userId: String(primary.uid), authSource: AUTH_SOURCES.LOCAL_PASSWORD, identifier: SEEDED_OPERATOR_CONFIG.LEGACY_USERNAME,
		saltHex: legHash.saltHex, passwordHash: legHash.passwordHash, pepperVersion: legHash.pepperVersion, createdAt: Date.now(),
	}).run();

	if (env.devMode) {
		for (const devAcc of SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.slice(1)) {
			await upsertSeededAccount(handle, devAcc, undefined, envRecord);
		}
	}

	await appendAuditEntry(handle, String(primary.uid), 'OPERATOR_SEEDED', 'INFO', `Seeded Sovereign Admin ${primary.username} (DEVMODE=${env.devMode})`);
	return { seeded: true, userId: String(primary.uid), uid: primary.uid, username: primary.username };
}
