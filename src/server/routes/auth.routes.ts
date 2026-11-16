/**
 * @author Oblx <code@oblx.dev>
 * @description Auth routes for Argon2id registration/login, rotating refresh tokens, Guest P-256 promotion, WebAuthn, OIDC, and PAT minting.
 */
import { eq } from 'drizzle-orm';
import { API_ROUTES, HTTP_STATUS } from '@config/constants';
import { resolveRuntimeEnv } from '@config/env.schema';
import { CRYPTO_CONSTANTS, ROLE_IDS, SEEDED_OPERATOR_CONFIG } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { users } from '@lib/db/sqlite/schema/tables';
import { upsertSeededAccount } from '@lib/db/seed.operator';
import { appendAuditEntry } from '@core/security/audit.chain';
import { issueSessionPair, revokeSessionFamily, rotateRefreshSession } from '@core/security/session.engine';
import { promoteGuestWorkspaces } from '@core/sync/session.restorer';
import { buildGitHubAuthorizeUrl, claimGitHubIdentity, exchangeGitHubCodeAndClaim } from '@plugins/auth/github.auth';
import { buildGoogleAuthorizeUrl, claimGoogleIdentity, exchangeGoogleCodeAndClaim } from '@plugins/auth/google.auth';
import { localPasswordAuthAdapter, registerLocalUser } from '@plugins/auth/local.auth';
import { buildOidcAuthorizeUrl, consumeOidcState, verifyOidcIdTokenAndClaim } from '@plugins/auth/oidc.auth';
import { mintPersonalAccessToken } from '@plugins/auth/pat.auth';
import { createPasskeyChallenge, enrollPasskeyCredential, webAuthnPasskeyAdapter } from '@plugins/auth/webauthn.auth';
import { buildRefreshCookieHeader, extractRefreshCookie, notFoundResponse, okResponse, unauthorizedResponse, type ApiResponseEnvelope, type RequestPrincipal } from '../http/middleware';

export async function issueForUserId(handle: ChronosDatabaseHandle, userId: string, scopeMask = 0xffffffff): Promise<ApiResponseEnvelope> {
	const user = handle.db.select().from(users).where(eq(users.id, userId)).get();
	if (!user) return unauthorizedResponse('User account not found.');
	const issued = await issueSessionPair(handle, user, { scopeMask });
	return okResponse(
		{
			user: {
				id: user.id, uid: user.uid, username: user.username, slug: user.slug,
				email: user.email, displayName: user.displayName, principalKind: user.principalKind,
				roleId: user.roleId, primaryGroupId: user.primaryGroupId,
			},
			accessToken: issued.accessToken, csrfToken: issued.csrfToken, sid: issued.sid,
			familyId: issued.familyId, effectiveMask: issued.effectiveMask, expiresAt: issued.expiresAt,
		},
		[buildRefreshCookieHeader(issued.refreshToken, CRYPTO_CONSTANTS.REFRESH_TOKEN_TTL_SEC)]
	);
}

async function handleRefreshRoute(handle: ChronosDatabaseHandle, body: Record<string, unknown>, headers: Record<string, string>): Promise<ApiResponseEnvelope> {
	const rawRt = extractRefreshCookie(headers.cookie) ?? (body.refreshToken ? String(body.refreshToken) : '');
	if (!rawRt) return unauthorizedResponse('Refresh token cookie missing.');
	const rotated = await rotateRefreshSession(handle, rawRt);
	if (!rotated) return unauthorizedResponse('Expired or unknown refresh session.');
	if (rotated.replayed || !rotated.issued) {
		return { status: HTTP_STATUS.UNAUTHORIZED, payload: { error: 'Session replay detected; family revoked.', securityEvent: 'SECURITY_SESSION_REVOKED', familyId: rotated.familyId }, setCookies: [buildRefreshCookieHeader('', 0)] };
	}
	return okResponse(
		{ user: rotated.user, accessToken: rotated.issued.accessToken, csrfToken: rotated.issued.csrfToken, sid: rotated.issued.sid, familyId: rotated.issued.familyId, effectiveMask: rotated.issued.effectiveMask, expiresAt: rotated.issued.expiresAt },
		[buildRefreshCookieHeader(rotated.issued.refreshToken, CRYPTO_CONSTANTS.REFRESH_TOKEN_TTL_SEC)]
	);
}

async function handleOAuthAndDevSwitch(
	handle: ChronosDatabaseHandle, urlPath: string, body: Record<string, unknown>
): Promise<ApiResponseEnvelope | null> {
	if (urlPath.startsWith(API_ROUTES.AUTH_OAUTH_GITHUB)) {
		if (body.providerSubject) return issueForUserId(handle, claimGitHubIdentity(handle, { providerSubject: String(body.providerSubject), login: String(body.login ?? 'gh-user'), email: body.email ? String(body.email) : null, displayName: String(body.displayName ?? body.login ?? 'GitHub Operator'), avatarUrl: null }).userId);
		if (body.code && body.state) {
			const claim = await exchangeGitHubCodeAndClaim(handle, { code: String(body.code), state: String(body.state) });
			return claim ? issueForUserId(handle, claim.userId) : unauthorizedResponse('GitHub OAuth2 exchange failed.');
		}
		return okResponse(await buildGitHubAuthorizeUrl(String(body.redirectUri ?? '')));
	}
	if (urlPath.startsWith(API_ROUTES.AUTH_OAUTH_GOOGLE)) {
		if (body.providerSubject) return issueForUserId(handle, claimGoogleIdentity(handle, { providerSubject: String(body.providerSubject), email: body.email ? String(body.email) : null, displayName: String(body.displayName ?? 'Google Operator'), avatarUrl: null }).userId);
		if (body.code && body.state) {
			const claim = await exchangeGoogleCodeAndClaim(handle, { code: String(body.code), state: String(body.state) });
			return claim ? issueForUserId(handle, claim.userId) : unauthorizedResponse('Google OAuth2 exchange failed.');
		}
		return okResponse(await buildGoogleAuthorizeUrl(String(body.redirectUri ?? '')));
	}
	if (urlPath.startsWith(API_ROUTES.AUTH_DEV_SWITCH)) {
		if (!resolveRuntimeEnv().devMode) return notFoundResponse('DEVMODE quick-switch endpoint is disabled in production.');
		const target = String(body.username ?? 'oblx').trim();
		if (target === 'guest') return okResponse({ loggedOut: true, guestMode: true }, [buildRefreshCookieHeader('', 0)]);
		let row = handle.db.select().from(users).where(eq(users.username, target)).get();
		if (!row) {
			const acc = SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.find((a) => a.username === target);
			if (acc) { await upsertSeededAccount(handle, acc); row = handle.db.select().from(users).where(eq(users.username, target)).get(); }
		}
		if (!row) return notFoundResponse(`Unknown DEVMODE persona: ${target}`);
		const scopeMask = body.scopeMask !== undefined ? (Number(body.scopeMask) >>> 0) : 0xffffffff;
		await appendAuditEntry(handle, row.id, 'DEVMODE_PERSONA_SWITCH', 'INFO', `DEVMODE switch -> ${row.username} (scope=0x${scopeMask.toString(16)})`);
		return issueForUserId(handle, row.id, scopeMask);
	}
	return null;
}

async function handleFederatedAndTokenAuth(
	handle: ChronosDatabaseHandle, urlPath: string, body: Record<string, unknown>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	const oauthRes = await handleOAuthAndDevSwitch(handle, urlPath, body);
	if (oauthRes) return oauthRes;
	if (urlPath.startsWith(API_ROUTES.AUTH_PASSKEY_CHALLENGE)) {
		return okResponse(createPasskeyChallenge(String(body.userId ?? principal.userId), String(body.rpId ?? 'localhost'), String(body.origin ?? 'http://localhost:3000')));
	}
	if (urlPath.startsWith(API_ROUTES.AUTH_PASSKEY_VERIFY)) {
		if (body.enrollCredentialId && body.publicKeyJwk && principal.userId !== 'guest') {
			enrollPasskeyCredential(handle, principal.userId, String(body.enrollCredentialId), body.publicKeyJwk as JsonWebKey);
			return okResponse({ enrolled: true });
		}
		const claim = await webAuthnPasskeyAdapter.verifyCredential(handle, { credentialId: String(body.credentialId ?? ''), clientDataJSON: String(body.clientDataJSON ?? ''), authenticatorData: String(body.authenticatorData ?? ''), signature: String(body.signature ?? ''), expectedRpId: String(body.expectedRpId ?? 'localhost'), expectedOrigin: String(body.expectedOrigin ?? 'http://localhost:3000') });
		return claim ? issueForUserId(handle, claim.userId) : unauthorizedResponse('Passkey verification failed.');
	}
	if (urlPath.startsWith(API_ROUTES.AUTH_OIDC_START)) return okResponse(await buildOidcAuthorizeUrl({ authorizeEndpoint: String(body.authorizeEndpoint ?? ''), clientId: String(body.clientId ?? ''), redirectUri: String(body.redirectUri ?? '') }));
	if (urlPath.startsWith(API_ROUTES.AUTH_OIDC_CALLBACK)) {
		const tx = consumeOidcState(String(body.state ?? ''));
		if (!tx) return unauthorizedResponse('Invalid or expired OIDC state.');
		const claim = await verifyOidcIdTokenAndClaim({ idToken: String(body.idToken ?? ''), jwks: Array.isArray(body.jwks) ? (body.jwks as JsonWebKey[]) : [], expectedNonce: tx.nonce });
		if (!claim) return unauthorizedResponse('OIDC ID token verification failed.');
		if (!handle.db.select().from(users).where(eq(users.id, claim.userId)).get()) handle.db.insert(users).values({ id: claim.userId, username: claim.username, principalKind: claim.principalKind, roleId: claim.roleId, grantMask: 0, denyMask: 0, createdAt: Date.now() }).run();
		return issueForUserId(handle, claim.userId);
	}
	if (urlPath.startsWith(API_ROUTES.AUTH_PAT)) {
		if (principal.userId === 'guest') return unauthorizedResponse('Authenticated user required to mint PAT.');
		return okResponse(await mintPersonalAccessToken(handle, { userId: principal.userId, label: String(body.label ?? 'CI Token'), scopedBitmask: Number(body.scopedBitmask ?? principal.effectiveMask) >>> 0, expiresInDays: body.expiresInDays ? Number(body.expiresInDays) : 30 }));
	}
	return null;
}

export async function handleAuthSubRoutes(
	handle: ChronosDatabaseHandle, urlPath: string, method: string, body: Record<string, unknown>, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	if (method !== 'POST') return null;
	if (urlPath.startsWith(API_ROUTES.AUTH_REGISTER)) {
		const hasAdmin = Boolean(handle.db.select({ id: users.id }).from(users).where(eq(users.roleId, ROLE_IDS.ADMIN)).get());
		const created = await registerLocalUser(handle, { username: String(body.username ?? ''), password: String(body.password ?? ''), roleId: hasAdmin ? ROLE_IDS.ANALYST : ROLE_IDS.ADMIN });
		return issueForUserId(handle, created.userId);
	}
	if (urlPath.startsWith(API_ROUTES.AUTH_LOGIN)) {
		const claim = await localPasswordAuthAdapter.verifyCredential(handle, { username: String(body.username ?? ''), password: String(body.password ?? ''), clientIp: principal.clientIp });
		if (!claim) return unauthorizedResponse('Invalid credentials.');
		await appendAuditEntry(handle, claim.userId, 'AUTH_LOGIN_SUCCESS', 'INFO', `Local login by ${claim.username}`);
		return issueForUserId(handle, claim.userId);
	}
	if (urlPath.startsWith(API_ROUTES.AUTH_REFRESH)) return handleRefreshRoute(handle, body, headers);
	if (urlPath.startsWith(API_ROUTES.AUTH_LOGOUT)) {
		if (principal.familyId !== 'guest' && principal.familyId !== 'pat') revokeSessionFamily(handle, principal.familyId);
		return okResponse({ loggedOut: true }, [buildRefreshCookieHeader('', 0)]);
	}
	if (urlPath.startsWith(API_ROUTES.AUTH_PROMOTE)) {
		if (principal.userId === 'guest') return unauthorizedResponse('Sign in before promoting guest workspaces.');
		return okResponse(await promoteGuestWorkspaces(handle, { guestId: String(body.guestId ?? 'guest'), userId: principal.userId, workspaceIds: Array.isArray(body.workspaceIds) ? body.workspaceIds.map(String) : [], guestPublicKeyJwk: body.guestPublicKeyJwk as JsonWebKey, signatureB64: String(body.signatureB64 ?? '') }));
	}
	return handleFederatedAndTokenAuth(handle, urlPath, body, principal);
}
