/**
 * @author Oblx <code@oblx.dev>
 * @description HMAC-SHA256 stateless access tokens, X-Chronos-Csrf verification, and rotating refresh session family replay detector.
 */
import { eq } from 'drizzle-orm';
import { resolveRuntimeEnv } from '@config/env.schema';
import { CRYPTO_CONSTANTS, type RoleId } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { sessions, users } from '@lib/db/sqlite/schema/tables';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { appendAuditEntry, sha256Hex } from './audit.chain';
import {
	base64UrlToBytes,
	bytesToBase64Url,
	csprngBytes,
	decodeUtf8,
	encodeUtf8,
	hmacSha256Bytes,
	timingSafeEqualBytes,
} from './crypto.primitives';
import { compileEffectiveUserMask } from './chronos.rbac';
import { computeEffectiveMask, isSystemLockdownActive } from './rbac.bitmask';

export interface AccessTokenClaims {
	readonly sid: string; readonly sub: string; readonly kind: string; readonly roleId: RoleId | string;
	readonly mask: number; readonly scope: number; readonly fam: string; readonly gen: number; readonly iat: number; readonly exp: number;
}

export interface IssuedSessionBundle {
	readonly accessToken: string; readonly refreshToken: string; readonly csrfToken: string; readonly sid: string;
	readonly familyId: string; readonly generation: number; readonly effectiveMask: number; readonly expiresAt: number;
}

function getSessionSecret(envRecord?: Record<string, string | undefined>): Uint8Array {
	const env = resolveRuntimeEnv(envRecord);
	if (!env.sessionSecret && env.strictSecurity) throw new Error('Missing CHRONOS_SESSION_SECRET under strict security mode.');
	return encodeUtf8(env.sessionSecret || CRYPTO_CONSTANTS.SESSION_DEV_FALLBACK);
}

async function signHmac(message: string, domain: string, envRecord?: Record<string, string | undefined>): Promise<Uint8Array> {
	const secret = getSessionSecret(envRecord);
	try {
		return await hmacSha256Bytes(secret, encodeUtf8(`${domain}:${message}`));
	} finally {
		secret.fill(0);
	}
}

export async function deriveCsrfToken(sid: string, envRecord?: Record<string, string | undefined>): Promise<string> {
	return bytesToBase64Url(await signHmac(sid, 'csrf', envRecord));
}

export async function verifyCsrfHeader(sid: string, headerToken: string | null | undefined, envRecord?: Record<string, string | undefined>): Promise<boolean> {
	if (!headerToken) return false;
	const expected = await deriveCsrfToken(sid, envRecord);
	return timingSafeEqualBytes(encodeUtf8(expected), encodeUtf8(headerToken.trim()));
}

export async function signAccessToken(claims: AccessTokenClaims, envRecord?: Record<string, string | undefined>): Promise<string> {
	const headerB64 = bytesToBase64Url(encodeUtf8(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
	const payloadB64 = bytesToBase64Url(encodeUtf8(JSON.stringify(claims)));
	const sigB64 = bytesToBase64Url(await signHmac(`${headerB64}.${payloadB64}`, 'jwt', envRecord));
	return `${headerB64}.${payloadB64}.${sigB64}`;
}

export async function verifyAccessToken(token: string, envRecord?: Record<string, string | undefined>): Promise<AccessTokenClaims | null> {
	const parts = token.trim().split('.');
	if (parts.length !== 3) return null;
	const expectedSig = await signHmac(`${parts[0]}.${parts[1]}`, 'jwt', envRecord);
	try {
		const providedSig = base64UrlToBytes(parts[2]!);
		if (!timingSafeEqualBytes(expectedSig, providedSig)) return null;
		const claims = parseSafeJson<AccessTokenClaims>(decodeUtf8(base64UrlToBytes(parts[1]!)));
		return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now() ? claims : null;
	} catch {
		return null;
	}
}

export async function issueSessionPair(
	handle: ChronosDatabaseHandle,
	user: { readonly id: string; readonly principalKind: string; readonly roleId: string; readonly grantMask: number; readonly denyMask: number },
	opts?: { readonly familyId?: string; readonly generation?: number; readonly scopeMask?: number },
	envRecord?: Record<string, string | undefined>
): Promise<IssuedSessionBundle> {
	const nowMs = Date.now(), nowSec = Math.floor(nowMs / 1000);
	const sid = crypto.randomUUID(), familyId = opts?.familyId ?? crypto.randomUUID(), generation = opts?.generation ?? 1;
	const scopeMask = (opts?.scopeMask ?? 0xffffffff) >>> 0;
	const refreshToken = bytesToBase64Url(csprngBytes(32));
	const refreshDigest = await sha256Hex(refreshToken);
	const refreshExpMs = nowMs + CRYPTO_CONSTANTS.REFRESH_TOKEN_TTL_SEC * 1000;
	handle.db.insert(sessions).values({ sid, userId: user.id, familyId, generation, refreshDigest, revoked: 0, expiresAt: refreshExpMs, createdAt: nowMs }).run();

	const hasDbUser = Boolean(handle.db.select({ id: users.id }).from(users).where(eq(users.id, user.id)).get());
	const effectiveMask = hasDbUser
		? compileEffectiveUserMask(handle, user.id, { tokenScopedMask: scopeMask })
		: computeEffectiveMask(user.roleId, user.grantMask, user.denyMask, scopeMask, isSystemLockdownActive());
	const expSec = nowSec + CRYPTO_CONSTANTS.ACCESS_TOKEN_TTL_SEC;
	const accessToken = await signAccessToken({ sid, sub: user.id, kind: user.principalKind, roleId: user.roleId, mask: effectiveMask, scope: scopeMask, fam: familyId, gen: generation, iat: nowSec, exp: expSec }, envRecord);
	const csrfToken = await deriveCsrfToken(sid, envRecord);
	return { accessToken, refreshToken, csrfToken, sid, familyId, generation, effectiveMask, expiresAt: expSec * 1000 };
}

export async function rotateRefreshSession(
	handle: ChronosDatabaseHandle, rawRefreshToken: string, envRecord?: Record<string, string | undefined>, allowGraceWindow = false
): Promise<{ readonly replayed: boolean; readonly familyId?: string; readonly issued?: IssuedSessionBundle; readonly user?: { readonly id: string; readonly uid: number; readonly username: string; readonly email: string | null; readonly displayName: string; readonly principalKind: string; readonly roleId: string; readonly primaryGroupId: number } } | null> {
	const digest = await sha256Hex(rawRefreshToken.trim());
	const row = handle.db.select().from(sessions).where(eq(sessions.refreshDigest, digest)).get();
	if (!row) return null;
	const famRows = handle.db.select().from(sessions).where(eq(sessions.familyId, row.familyId)).all();
	const maxGen = famRows.reduce((max, r) => Math.max(max, r.generation), 0);
	if (row.revoked === 1 || row.generation < maxGen) {
		const maxGenRow = famRows.find((r) => r.generation === maxGen);
		const graceWindowActive = allowGraceWindow && row.generation === maxGen - 1 && maxGenRow && (Date.now() - maxGenRow.createdAt <= 3000);
		if (graceWindowActive && maxGenRow) {
			handle.db.update(sessions).set({ revoked: 1 }).where(eq(sessions.sid, maxGenRow.sid)).run();
			const user = handle.db.select().from(users).where(eq(users.id, row.userId)).get();
			if (!user) return null;
			const issued = await issueSessionPair(handle, user, { familyId: row.familyId, generation: maxGen + 1 }, envRecord);
			const userSummary = { id: user.id, uid: user.uid, username: user.username, email: user.email, displayName: user.displayName, principalKind: user.principalKind, roleId: user.roleId, primaryGroupId: user.primaryGroupId };
			return { replayed: false, familyId: row.familyId, issued, user: userSummary };
		}
		handle.db.update(sessions).set({ revoked: 1 }).where(eq(sessions.familyId, row.familyId)).run();
		await appendAuditEntry(handle, row.userId, 'SESSION_REPLAY_DETECTED', 'CRITICAL', `Revoked session family ${row.familyId} due to stale generation ${row.generation}/${maxGen}`);
		return { replayed: true, familyId: row.familyId };
	}
	if (row.expiresAt <= Date.now()) return null;
	handle.db.update(sessions).set({ revoked: 1 }).where(eq(sessions.sid, row.sid)).run();
	const user = handle.db.select().from(users).where(eq(users.id, row.userId)).get();
	if (!user) return null;
	const issued = await issueSessionPair(handle, user, { familyId: row.familyId, generation: row.generation + 1 }, envRecord);
	const userSummary = { id: user.id, uid: user.uid, username: user.username, email: user.email, displayName: user.displayName, principalKind: user.principalKind, roleId: user.roleId, primaryGroupId: user.primaryGroupId };
	return { replayed: false, familyId: row.familyId, issued, user: userSummary };
}

export function revokeSessionFamily(handle: ChronosDatabaseHandle, familyId: string): void {
	handle.db.update(sessions).set({ revoked: 1 }).where(eq(sessions.familyId, familyId)).run();
}
