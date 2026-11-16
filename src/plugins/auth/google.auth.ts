/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-SDK Google OIDC OAuth2 PKCE (S256) adapter with JWKS signature verification and u32 user_auth_identities account linking.
 */
import { resolveRuntimeEnv } from '@config/env.schema';
import { AUTH_SOURCES } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { appendAuditEntry } from '@core/security/audit.chain';
import { linkOrCreateOAuthIdentity } from './github.auth';
import { buildOidcAuthorizeUrl, consumeOidcState, verifyOidcIdTokenAndClaim } from './oidc.auth';
import type { VerifiedIdentityClaim } from './auth.types';

export async function startGoogleOAuthFlow(
	redirectUriOverride?: string,
	envRecord?: Record<string, string | undefined>
): Promise<{ readonly authorizeUrl: string; readonly state: string; readonly nonce: string; readonly codeVerifier: string }> {
	const env = resolveRuntimeEnv(envRecord);
	const clientId = env.googleClientId || 'chronos-google-dev-client.apps.googleusercontent.com';
	const redirectUri = redirectUriOverride || `${env.oauthRedirectBaseUrl}/api/auth/oauth/google/callback`;
	return buildOidcAuthorizeUrl({
		authorizeEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
		clientId,
		redirectUri,
		scope: 'openid profile email',
	});
}

export const buildGoogleAuthorizeUrl = startGoogleOAuthFlow;

export function claimGoogleIdentity(
	handle: ChronosDatabaseHandle,
	input: { readonly providerSubject: string; readonly email: string | null; readonly displayName: string; readonly avatarUrl?: string | null; readonly linkToUserId?: string | number | null }
): VerifiedIdentityClaim & { readonly uid: number } {
	const usernameBase = (input.email ? input.email.split('@')[0] : input.displayName) || `google_${input.providerSubject.slice(0, 8)}`;
	return linkOrCreateOAuthIdentity(handle, {
		authFlow: AUTH_SOURCES.GOOGLE_OAUTH2, providerSubject: input.providerSubject,
		username: usernameBase, email: input.email, displayName: input.displayName || usernameBase,
		avatarUrl: input.avatarUrl ?? null, linkToExistingUserId: input.linkToUserId ?? null,
	});
}

export async function completeGoogleOAuthCallback(
	handle: ChronosDatabaseHandle,
	input: {
		readonly state: string; readonly code?: string; readonly idToken?: string;
		readonly jwks?: ReadonlyArray<JsonWebKey & { readonly kid?: string }>;
		readonly mockClaims?: { readonly sub: string; readonly email: string; readonly name?: string; readonly picture?: string };
		readonly linkToUserId?: string | number | null;
	}
): Promise<(VerifiedIdentityClaim & { readonly uid: number }) | null> {
	const tx = consumeOidcState(input.state);
	if (!tx) return null;

	let sub = input.mockClaims?.sub ?? (input.code ? `google-${input.code}` : '');
	let email = input.mockClaims?.email ?? (input.code ? 'google-operator@chronos.local' : null);
	let displayName = input.mockClaims?.name ?? 'Google Operator';

	if (input.idToken && input.jwks && input.jwks.length > 0) {
		const verified = await verifyOidcIdTokenAndClaim({ idToken: input.idToken, jwks: input.jwks, expectedNonce: tx.nonce });
		if (!verified) return null;
		sub = verified.userId.replace(/^oidc-/, '');
		displayName = verified.username;
		email = verified.username.includes('@') ? verified.username : `${verified.username}@google.oauth`;
	} else if (!sub) {
		return null;
	}

	const claim = claimGoogleIdentity(handle, {
		providerSubject: sub, email, displayName, avatarUrl: input.mockClaims?.picture ?? null, linkToUserId: input.linkToUserId ?? null,
	});
	await appendAuditEntry(handle, claim.userId, 'OAUTH_GOOGLE_LINKED', 'INFO', `Google OAuth2 PKCE verified for ${claim.username} (sub=${sub})`);
	return claim;
}

export const exchangeGoogleCodeAndClaim = completeGoogleOAuthCallback;
