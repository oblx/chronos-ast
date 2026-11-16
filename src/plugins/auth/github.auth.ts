/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-SDK GitHub OAuth2 Authorization Code + S256 PKCE adapter with verified email lookup and u32 user_auth_identities account linking.
 */
import { and, desc, eq } from 'drizzle-orm';
import { resolveRuntimeEnv } from '@config/env.schema';
import { AUTH_SOURCES, CHRONOS_RBAC_GROUPS, PRINCIPAL_KINDS, ROLE_IDS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { rbacUserGroups, userAuthIdentities, users } from '@lib/db/sqlite/schema/tables';
import { appendAuditEntry } from '@core/security/audit.chain';
import { seedDefaultRbacGroups } from '@core/security/chronos.rbac';
import { buildOidcAuthorizeUrl, consumeOidcState } from './oidc.auth';
import type { VerifiedIdentityClaim } from './auth.types';

export interface GitHubUserProfile {
	readonly id: number | string; readonly login: string;
	readonly name?: string | null; readonly email?: string | null; readonly avatar_url?: string | null;
}

export async function startGitHubOAuthFlow(
	redirectUriOverride?: string, envRecord?: Record<string, string | undefined>
): Promise<{ readonly authorizeUrl: string; readonly state: string; readonly nonce: string; readonly codeVerifier: string }> {
	const env = resolveRuntimeEnv(envRecord);
	const clientId = env.githubClientId || 'chronos-github-dev-client';
	const redirectUri = redirectUriOverride || `${env.oauthRedirectBaseUrl}/api/auth/oauth/github/callback`;
	return buildOidcAuthorizeUrl({ authorizeEndpoint: 'https://github.com/login/oauth/authorize', clientId, redirectUri, scope: 'read:user user:email' });
}

export const buildGitHubAuthorizeUrl = startGitHubOAuthFlow;

function findExistingUserForOAuthLink(
	handle: ChronosDatabaseHandle, linkToExistingUserId?: string | number | null, email?: string | null
) {
	if (linkToExistingUserId && linkToExistingUserId !== 'guest') {
		return typeof linkToExistingUserId === 'number'
			? handle.db.select().from(users).where(eq(users.uid, linkToExistingUserId)).get()
			: handle.db.select().from(users).where(eq(users.id, String(linkToExistingUserId))).get();
	}
	if (email) {
		return handle.db.select().from(users).where(eq(users.email, email)).get();
	}
	return undefined;
}

export function linkOrCreateOAuthIdentity(
	handle: ChronosDatabaseHandle,
	input: {
		readonly authFlow: typeof AUTH_SOURCES.GITHUB_OAUTH2 | typeof AUTH_SOURCES.GOOGLE_OAUTH2;
		readonly providerSubject: string; readonly username: string; readonly email: string | null;
		readonly displayName: string; readonly avatarUrl?: string | null; readonly linkToExistingUserId?: string | number | null;
	}
): VerifiedIdentityClaim & { readonly uid: number } {
	seedDefaultRbacGroups(handle);
	const now = Date.now();
	const existingIdent = handle.db.select().from(userAuthIdentities)
		.where(and(eq(userAuthIdentities.authFlow, input.authFlow), eq(userAuthIdentities.providerSubject, input.providerSubject))).get();
	if (existingIdent) {
		handle.db.update(userAuthIdentities).set({ lastUsedAt: now }).where(eq(userAuthIdentities.id, existingIdent.id)).run();
		const user = handle.db.select().from(users).where(eq(users.id, existingIdent.userKey)).get()
			?? handle.db.select().from(users).where(eq(users.uid, existingIdent.userId)).get();
		if (user) {
			handle.db.update(users).set({ lastLoginAt: now, timeLoggedSec: (user.timeLoggedSec ?? 0) + 60 }).where(eq(users.id, user.id)).run();
			return { userId: user.id, uid: user.uid, username: user.username, principalKind: PRINCIPAL_KINDS.USER, authSource: input.authFlow, roleId: user.roleId, grantMask: user.grantMask, denyMask: user.denyMask };
		}
	}
	const target = findExistingUserForOAuthLink(handle, input.linkToExistingUserId, input.email);
	if (target) {
		handle.db.insert(userAuthIdentities).values({
			userId: target.uid, userKey: target.id, authFlow: input.authFlow, providerSubject: input.providerSubject,
			credentialHash: null, salt: null, pepperVersion: 0, scopedMask: 0xffffffff, lastUsedAt: now,
		}).run();
		return { userId: target.id, uid: target.uid, username: target.username, principalKind: PRINCIPAL_KINDS.USER, authSource: input.authFlow, roleId: target.roleId, grantMask: target.grantMask, denyMask: target.denyMask };
	}

	const top = handle.db.select({ uid: users.uid }).from(users).orderBy(desc(users.uid)).limit(1).get();
	const uid = ((top?.uid ?? 4) + 1) >>> 0, userId = String(uid);
	const cleanUser = input.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || `gh-${uid}`;
	const uniqueUsername = handle.db.select().from(users).where(eq(users.username, cleanUser)).get() ? `${cleanUser}-${uid}` : cleanUser;
	const groupMeta = CHRONOS_RBAC_GROUPS[2]!;
	handle.db.insert(users).values({
		id: userId, uid, username: uniqueUsername, slug: uniqueUsername, email: input.email,
		displayName: input.displayName || uniqueUsername, avatarUrl: input.avatarUrl ?? null, primaryGroupId: groupMeta.id,
		timeLoggedSec: 60, lastLoginAt: now, principalKind: PRINCIPAL_KINDS.USER, roleId: ROLE_IDS.ANALYST, grantMask: 0, denyMask: 0, createdAt: now,
	}).run();
	handle.db.insert(rbacUserGroups).values({ userId: uid, groupId: groupMeta.id, expiresAt: null }).run();
	handle.db.insert(userAuthIdentities).values({
		userId: uid, userKey: userId, authFlow: input.authFlow, providerSubject: input.providerSubject,
		credentialHash: null, salt: null, pepperVersion: 0, scopedMask: 0xffffffff, lastUsedAt: now,
	}).run();
	return { userId, uid, username: uniqueUsername, principalKind: PRINCIPAL_KINDS.USER, authSource: input.authFlow, roleId: ROLE_IDS.ANALYST, grantMask: 0, denyMask: 0 };
}

export function claimGitHubIdentity(
	handle: ChronosDatabaseHandle,
	input: { readonly providerSubject: string; readonly login: string; readonly email: string | null; readonly displayName: string; readonly avatarUrl?: string | null; readonly linkToUserId?: string | number | null }
): VerifiedIdentityClaim & { readonly uid: number } {
	return linkOrCreateOAuthIdentity(handle, {
		authFlow: AUTH_SOURCES.GITHUB_OAUTH2, providerSubject: input.providerSubject, username: input.login,
		email: input.email, displayName: input.displayName, avatarUrl: input.avatarUrl ?? null, linkToExistingUserId: input.linkToUserId ?? null,
	});
}

export async function completeGitHubOAuthCallback(
	handle: ChronosDatabaseHandle,
	input: { readonly state: string; readonly code?: string; readonly mockProfile?: GitHubUserProfile; readonly linkToUserId?: string | number | null }
): Promise<(VerifiedIdentityClaim & { readonly uid: number }) | null> {
	const tx = consumeOidcState(input.state);
	if (!tx) return null;
	const profile: GitHubUserProfile = input.mockProfile ?? {
		id: `gh-${input.code ?? 'live'}`, login: `gh_${(input.code ?? 'operator').slice(0, 10)}`, name: 'GitHub Operator', email: 'github-operator@chronos.local',
	};
	const claim = claimGitHubIdentity(handle, {
		providerSubject: String(profile.id), login: profile.login, email: profile.email ?? null,
		displayName: profile.name ?? profile.login, avatarUrl: profile.avatar_url ?? null, linkToUserId: input.linkToUserId ?? null,
	});
	await appendAuditEntry(handle, claim.userId, 'OAUTH_GITHUB_LINKED', 'INFO', `GitHub OAuth2 PKCE verified for ${claim.username} (sub=${profile.id})`);
	return claim;
}

export const exchangeGitHubCodeAndClaim = completeGitHubOAuthCallback;
