/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-SDK OIDC OAuth2 PKCE (S256) flow and RS256/ES256 JWKS ID-token signature verifier using native Web Crypto.
 */
import { AUTH_SOURCES, PRINCIPAL_KINDS, ROLE_IDS } from '@config/security.constants';
import { validateOutboundUrl } from '@core/security/guards/net.guard';
import { base64UrlToBytes, bytesToBase64Url, csprngBytes, decodeUtf8, encodeUtf8 } from '@core/security/crypto.primitives';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import type { VerifiedIdentityClaim } from './auth.types';

interface PendingOidcTx {
	readonly codeVerifier: string; readonly nonce: string; readonly createdAt: number;
}

const pendingOidcTxMap = new Map<string, PendingOidcTx>();

export async function generatePkcePair(): Promise<{ readonly codeVerifier: string; readonly codeChallenge: string }> {
	const codeVerifier = bytesToBase64Url(csprngBytes(64));
	const hash = await crypto.subtle.digest('SHA-256', encodeUtf8(codeVerifier));
	return { codeVerifier, codeChallenge: bytesToBase64Url(new Uint8Array(hash)) };
}

export async function buildOidcAuthorizeUrl(input: {
	readonly authorizeEndpoint: string; readonly clientId: string; readonly redirectUri: string; readonly scope?: string;
}): Promise<{ readonly authorizeUrl: string; readonly state: string; readonly nonce: string; readonly codeVerifier: string }> {
	await validateOutboundUrl(input.authorizeEndpoint);
	const state = bytesToBase64Url(csprngBytes(24));
	const nonce = bytesToBase64Url(csprngBytes(24));
	const pkce = await generatePkcePair();
	pendingOidcTxMap.set(state, { codeVerifier: pkce.codeVerifier, nonce, createdAt: Date.now() });

	const url = new URL(input.authorizeEndpoint);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', input.clientId);
	url.searchParams.set('redirect_uri', input.redirectUri);
	url.searchParams.set('scope', input.scope ?? 'openid profile email');
	url.searchParams.set('state', state);
	url.searchParams.set('nonce', nonce);
	url.searchParams.set('code_challenge', pkce.codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	return { authorizeUrl: url.toString(), state, nonce, codeVerifier: pkce.codeVerifier };
}

export function consumeOidcState(state: string): PendingOidcTx | null {
	const tx = pendingOidcTxMap.get(state);
	pendingOidcTxMap.delete(state);
	return tx && Date.now() - tx.createdAt <= 300_000 ? tx : null;
}

async function importJwkForAlg(jwk: JsonWebKey, alg: string): Promise<{ readonly key: CryptoKey; readonly verifyAlg: AlgorithmIdentifier | RsaPssParams | EcdsaParams }> {
	if (alg === 'ES256') {
		const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
		return { key, verifyAlg: { name: 'ECDSA', hash: 'SHA-256' } };
	}
	const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
	return { key, verifyAlg: 'RSASSA-PKCS1-v1_5' };
}

export async function verifyOidcIdTokenAndClaim(input: {
	readonly idToken: string; readonly jwks: ReadonlyArray<JsonWebKey & { readonly kid?: string }>; readonly expectedNonce: string;
}): Promise<VerifiedIdentityClaim | null> {
	const parts = input.idToken.trim().split('.');
	if (parts.length !== 3) return null;
	const header = parseSafeJson<{ alg?: string; kid?: string }>(decodeUtf8(base64UrlToBytes(parts[0]!)));
	const claims = parseSafeJson<{ sub?: string; preferred_username?: string; email?: string; nonce?: string; exp?: number }>(decodeUtf8(base64UrlToBytes(parts[1]!)));
	if (!header.alg || claims.nonce !== input.expectedNonce) return null;
	if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) return null;

	const jwk = input.jwks.find((k) => !header.kid || k.kid === header.kid) ?? input.jwks[0];
	if (!jwk) return null;
	const { key, verifyAlg } = await importJwkForAlg(jwk, header.alg);
	const ok = await crypto.subtle.verify(verifyAlg, key, new Uint8Array(base64UrlToBytes(parts[2]!)), encodeUtf8(`${parts[0]}.${parts[1]}`));
	if (!ok || !claims.sub) return null;

	const username = String(claims.preferred_username ?? claims.email ?? claims.sub).toLowerCase();
	return {
		userId: `oidc-${claims.sub}`, username, principalKind: PRINCIPAL_KINDS.USER,
		authSource: AUTH_SOURCES.OIDC_OAUTH2_PKCE, roleId: ROLE_IDS.ANALYST, grantMask: 0, denyMask: 0,
	};
}
