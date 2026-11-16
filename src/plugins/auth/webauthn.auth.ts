/**
 * @author Oblx <code@oblx.dev>
 * @description FIDO2 WebAuthn passkey challenge & assertion verifier via pure Web Crypto (ES256/EdDSA) with signCount rollback protection.
 */
import { and, eq } from 'drizzle-orm';
import { AUTH_SOURCES, CRYPTO_CONSTANTS, PRINCIPAL_KINDS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { credentials, users } from '@lib/db/sqlite/schema/tables';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { appendAuditEntry } from '@core/security/audit.chain';
import {
	base64UrlToBytes,
	bytesToBase64Url,
	csprngBytes,
	decodeUtf8,
	encodeUtf8,
	timingSafeEqualBytes,
} from '@core/security/crypto.primitives';
import type { AuthSourcePort, VerifiedIdentityClaim } from './auth.types';

interface PendingChallenge {
	readonly userId: string; readonly rpId: string; readonly origin: string; readonly expiresAt: number;
}

const challengeStore = new Map<string, PendingChallenge>();

export function createPasskeyChallenge(userId: string, rpId: string, origin: string): { readonly challenge: string; readonly expiresAt: number } {
	const challenge = bytesToBase64Url(csprngBytes(32));
	const expiresAt = Date.now() + CRYPTO_CONSTANTS.CHALLENGE_TTL_MS;
	challengeStore.set(challenge, { userId, rpId, origin, expiresAt });
	return { challenge, expiresAt };
}

export function enrollPasskeyCredential(handle: ChronosDatabaseHandle, userId: string, credentialId: string, publicKeyJwk: JsonWebKey): void {
	handle.db.insert(credentials).values({
		userId, authSource: AUTH_SOURCES.WEBAUTHN_PASSKEY, identifier: credentialId,
		publicKeyCose: JSON.stringify(publicKeyJwk), signCount: 0, createdAt: Date.now(),
	}).run();
}

async function importPasskeyCryptoKey(jwk: JsonWebKey): Promise<{ readonly key: CryptoKey; readonly alg: AlgorithmIdentifier | EcdsaParams }> {
	if (jwk.kty === 'OKP' || jwk.crv === 'Ed25519') {
		const key = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify']);
		return { key, alg: { name: 'Ed25519' } };
	}
	const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
	return { key, alg: { name: 'ECDSA', hash: 'SHA-256' } };
}

export interface WebAuthnVerifyInput {
	readonly credentialId: string; readonly clientDataJSON: string; readonly authenticatorData: string;
	readonly signature: string; readonly expectedRpId: string; readonly expectedOrigin: string;
}

export const webAuthnPasskeyAdapter: AuthSourcePort<{ readonly userId: string; readonly rpId: string; readonly origin: string }, WebAuthnVerifyInput> = {
	sourceKind: AUTH_SOURCES.WEBAUTHN_PASSKEY,
	async initiateChallenge(_handle, input) {
		return createPasskeyChallenge(input.userId, input.rpId, input.origin);
	},
	async verifyCredential(handle, input): Promise<VerifiedIdentityClaim | null> {
		const clientBytes = base64UrlToBytes(input.clientDataJSON);
		const clientData = parseSafeJson<{ challenge?: string; origin?: string; type?: string }>(decodeUtf8(clientBytes));
		const pending = clientData.challenge ? challengeStore.get(clientData.challenge) : undefined;
		if (clientData.challenge) challengeStore.delete(clientData.challenge);
		if (!pending || pending.expiresAt < Date.now() || clientData.origin !== input.expectedOrigin) return null;

		const authData = base64UrlToBytes(input.authenticatorData);
		if (authData.byteLength < 37 || (authData[32]! & 0x01) === 0) return null;
		const expectedRpHash = new Uint8Array(await crypto.subtle.digest('SHA-256', encodeUtf8(input.expectedRpId)));
		if (!timingSafeEqualBytes(authData.subarray(0, 32), expectedRpHash)) return null;

		const signCount = new DataView(authData.buffer, authData.byteOffset, authData.byteLength).getUint32(33, false);
		const cred = handle.db.select().from(credentials)
			.where(and(eq(credentials.authSource, AUTH_SOURCES.WEBAUTHN_PASSKEY), eq(credentials.identifier, input.credentialId))).get();
		if (!cred?.publicKeyCose) return null;

		if (signCount > 0 && signCount <= cred.signCount) {
			await appendAuditEntry(handle, cred.userId, 'PASSKEY_CLONE_ROLLBACK', 'CRITICAL', `Passkey ${input.credentialId} signCount rollback ${signCount} <= ${cred.signCount}`);
			throw new Error('Passkey counter rollback detected.');
		}

		const clientHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(clientBytes)));
		const signedPayload = new Uint8Array(authData.byteLength + clientHash.byteLength);
		signedPayload.set(authData, 0);
		signedPayload.set(clientHash, authData.byteLength);

		const jwk = parseSafeJson<JsonWebKey>(cred.publicKeyCose);
		const { key, alg } = await importPasskeyCryptoKey(jwk);
		const ok = await crypto.subtle.verify(alg, key, new Uint8Array(base64UrlToBytes(input.signature)), signedPayload);
		if (!ok) return null;

		if (signCount > cred.signCount) handle.db.update(credentials).set({ signCount }).where(eq(credentials.id, cred.id)).run();
		const user = handle.db.select().from(users).where(eq(users.id, cred.userId)).get();
		if (!user) return null;
		return {
			userId: user.id, username: user.username, principalKind: user.principalKind as typeof PRINCIPAL_KINDS.USER,
			authSource: AUTH_SOURCES.WEBAUTHN_PASSKEY, roleId: user.roleId, grantMask: user.grantMask, denyMask: user.denyMask,
		};
	},
};
