/**
 * @author Oblx <code@oblx.dev>
 * @description Scoped Personal Access Token (chr_live_*) minter and HMAC-SHA256 digest verifier without plaintext persistence.
 */
import { and, eq } from 'drizzle-orm';
import { AUTH_SOURCES, CRYPTO_CONSTANTS, PRINCIPAL_KINDS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { credentials, users } from '@lib/db/sqlite/schema/tables';
import { appendAuditEntry } from '@core/security/audit.chain';
import { bytesToBase64Url, csprngBytes, encodeUtf8, timingSafeEqualBytes } from '@core/security/crypto.primitives';
import { getPepperBytes, hmacPepperDigest } from '@core/security/password.crypto';
import type { VerifiedIdentityClaim } from './auth.types';

export async function mintPersonalAccessToken(
	handle: ChronosDatabaseHandle,
	input: { readonly userId: string; readonly label: string; readonly scopedBitmask: number; readonly expiresInDays?: number }
): Promise<{ readonly rawToken: string; readonly tokenPrefix: string; readonly scopedBitmask: number; readonly expiresAt: number | null }> {
	const rawSecret = bytesToBase64Url(csprngBytes(32));
	const rawToken = `${CRYPTO_CONSTANTS.PAT_PREFIX}${rawSecret}`;
	const tokenPrefix = rawToken.slice(0, CRYPTO_CONSTANTS.PAT_PREFIX_LEN);
	const pepper = getPepperBytes(1);
	const digest = await hmacPepperDigest(rawToken, encodeUtf8('pat-salt-v2'), pepper);
	pepper.fill(0);

	const now = Date.now();
	const expiresAt = input.expiresInDays ? now + input.expiresInDays * 86_400_000 : null;
	handle.db.insert(credentials).values({
		userId: input.userId, authSource: AUTH_SOURCES.PAT_API_TOKEN, identifier: input.label.trim() || 'CI Token',
		passwordHash: digest, tokenPrefix, scopedBitmask: input.scopedBitmask >>> 0, expiresAt, createdAt: now,
	}).run();

	await appendAuditEntry(handle, input.userId, 'PAT_MINTED', 'INFO', `Minted PAT ${tokenPrefix}... (${input.label})`);
	return { rawToken, tokenPrefix, scopedBitmask: input.scopedBitmask >>> 0, expiresAt };
}

export async function verifyPersonalAccessToken(
	handle: ChronosDatabaseHandle,
	rawToken: string
): Promise<VerifiedIdentityClaim | null> {
	const token = rawToken.trim();
	if (!token.startsWith(CRYPTO_CONSTANTS.PAT_PREFIX)) return null;
	const tokenPrefix = token.slice(0, CRYPTO_CONSTANTS.PAT_PREFIX_LEN);
	const candidates = handle.db.select().from(credentials)
		.where(and(eq(credentials.authSource, AUTH_SOURCES.PAT_API_TOKEN), eq(credentials.tokenPrefix, tokenPrefix))).all();
	if (candidates.length === 0) return null;

	const pepper = getPepperBytes(1);
	const candidateDigest = await hmacPepperDigest(token, encodeUtf8('pat-salt-v2'), pepper);
	pepper.fill(0);
	const now = Date.now();

	for (const cred of candidates) {
		if (!cred.passwordHash || (cred.expiresAt && cred.expiresAt <= now)) continue;
		if (timingSafeEqualBytes(encodeUtf8(candidateDigest), encodeUtf8(cred.passwordHash))) {
			const user = handle.db.select().from(users).where(eq(users.id, cred.userId)).get();
			if (!user) return null;
			return {
				userId: user.id, username: user.username, principalKind: PRINCIPAL_KINDS.SERVICE_PAT,
				authSource: AUTH_SOURCES.PAT_API_TOKEN, roleId: user.roleId, grantMask: user.grantMask,
				denyMask: user.denyMask, scopedBitmask: cred.scopedBitmask >>> 0,
			};
		}
	}
	return null;
}
