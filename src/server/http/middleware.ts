/**
 * @author Oblx <code@oblx.dev>
 * @description Unified HTTP Route Guard, principal extractor (JWT / PAT / Guest Sovereign), CSRF/RBAC authorizer, response builders, and rate limiter.
 */
import { eq } from 'drizzle-orm';
import { HTTP_STATUS } from '@config/constants';
import { CAPABILITY_BITS, HTTP_SECURITY_CONSTANTS, PRINCIPAL_KINDS, ROLE_IDS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { sessions, users } from '@lib/db/sqlite/schema/tables';
import { sanitizeTelemetryPayload } from '@lib/utils/log.sanitizer';
import { pseudonymizeClientIp } from '@core/security/privacy.guard';
import { computeEffectiveMask, hasCapability, isSystemLockdownActive, missingCapabilities } from '@core/security/rbac.bitmask';
import { verifyAccessToken, verifyCsrfHeader } from '@core/security/session.engine';
import { verifyPersonalAccessToken } from '@plugins/auth/pat.auth';

export { CAPABILITY_BITS };

export interface RequestPrincipal {
	readonly userId: string; readonly uid: number; readonly username: string; readonly sid: string; readonly familyId: string;
	readonly principalKind: string; readonly roleId: string; readonly effectiveMask: number;
	readonly isCookieOrJwtAuth: boolean; readonly clientIp: string;
}

export interface ApiResponseEnvelope {
	readonly status: number; readonly payload: unknown; readonly setCookies?: readonly string[];
	readonly headers?: Readonly<Record<string, string>>;
}

export function normalizeHeaders(raw?: Record<string, string | string[] | undefined>): Record<string, string> {
	const out: Record<string, string> = {};
	if (!raw) return out;
	for (const [k, v] of Object.entries(raw)) {
		if (v !== undefined) out[k.toLowerCase()] = Array.isArray(v) ? v.join('; ') : v;
	}
	return out;
}

export function extractRefreshCookie(cookieHeader: string | undefined): string | null {
	if (!cookieHeader) return null;
	const prefix = `${HTTP_SECURITY_CONSTANTS.REFRESH_COOKIE_NAME}=`;
	for (const part of cookieHeader.split(';')) {
		const trimmed = part.trim();
		if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
	}
	return null;
}

export function buildRefreshCookieHeader(rawToken: string, maxAgeSec: number): string {
	return `${HTTP_SECURITY_CONSTANTS.REFRESH_COOKIE_NAME}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${maxAgeSec}`;
}

export function buildSecurityResponseHeaders(): Record<string, string> {
	return { ...HTTP_SECURITY_CONSTANTS.RESPONSE_HEADERS, 'Content-Security-Policy': HTTP_SECURITY_CONSTANTS.CSP_POLICY };
}

export async function resolveRequestPrincipal(handle: ChronosDatabaseHandle, headers: Record<string, string>): Promise<RequestPrincipal> {
	const rawIp = headers['x-forwarded-for']?.split(',')[0]?.trim() || '127.0.0.1';
	const clientIp = await pseudonymizeClientIp(rawIp);
	const authHeader = headers.authorization ?? '';
	if (authHeader.startsWith('Bearer ')) {
		const token = authHeader.slice(7).trim();
		if (token.startsWith('chr_live_')) {
			const pat = await verifyPersonalAccessToken(handle, token);
			if (pat) {
				const usr = handle.db.select({ uid: users.uid, username: users.username }).from(users).where(eq(users.id, pat.userId)).get();
				const effectiveMask = computeEffectiveMask(pat.roleId, pat.grantMask, pat.denyMask, pat.scopedBitmask, isSystemLockdownActive());
				return { userId: pat.userId, uid: usr?.uid ?? (Number(pat.userId) || 1), username: usr?.username ?? pat.userId, sid: 'pat', familyId: 'pat', principalKind: pat.principalKind, roleId: pat.roleId, effectiveMask, isCookieOrJwtAuth: false, clientIp };
			}
		} else {
			const claims = await verifyAccessToken(token);
			if (claims) {
				const sess = handle.db.select().from(sessions).where(eq(sessions.sid, claims.sid)).get();
				if (sess && sess.revoked === 0) {
					const usr = handle.db.select({ uid: users.uid, username: users.username, roleId: users.roleId, grantMask: users.grantMask, denyMask: users.denyMask }).from(users).where(eq(users.id, claims.sub)).get();
					const dbRoleId = usr?.roleId ?? claims.roleId;
					const effectiveMask = usr ? computeEffectiveMask(dbRoleId, usr.grantMask, usr.denyMask, claims.mask, isSystemLockdownActive()) : (claims.mask >>> 0);
					return { userId: claims.sub, uid: usr?.uid ?? (Number(claims.sub) || 1), username: usr?.username ?? claims.sub, sid: claims.sid, familyId: claims.fam, principalKind: claims.kind, roleId: dbRoleId, effectiveMask, isCookieOrJwtAuth: true, clientIp };
				}
			}
		}
	}
	return {
		userId: 'guest', uid: 0, username: 'guest', sid: 'guest', familyId: 'guest', principalKind: PRINCIPAL_KINDS.GUEST, roleId: ROLE_IDS.GUEST,
		effectiveMask: computeEffectiveMask(ROLE_IDS.GUEST, 0, 0, 0xffffffff, isSystemLockdownActive()), isCookieOrJwtAuth: false, clientIp,
	};
}

export async function authorizeRequest(
	principal: RequestPrincipal, method: string, headers: Record<string, string>, requiredMask: number, requireCsrfForUser = false
): Promise<ApiResponseEnvelope | null> {
	if (!hasCapability(principal.effectiveMask, requiredMask)) {
		const missing = missingCapabilities(principal.effectiveMask, requiredMask);
		return { status: HTTP_STATUS.FORBIDDEN, payload: { error: `Forbidden: missing capability (${missing.join(', ')})`, missingCapabilities: missing } };
	}
	if ((method === 'POST' || method === 'DELETE' || method === 'PUT') && principal.isCookieOrJwtAuth) {
		const csrfHeader = headers[HTTP_SECURITY_CONSTANTS.CSRF_HEADER];
		if ((requireCsrfForUser || csrfHeader !== undefined) && !(await verifyCsrfHeader(principal.sid, csrfHeader))) {
			return { status: HTTP_STATUS.FORBIDDEN, payload: { error: 'Forbidden: invalid or missing X-Chronos-Csrf header.' } };
		}
	}
	return null;
}

export const requireCapability = authorizeRequest;

export function okResponse(payload: unknown, setCookies?: readonly string[]): ApiResponseEnvelope {
	return setCookies ? { status: HTTP_STATUS.OK, payload, setCookies } : { status: HTTP_STATUS.OK, payload };
}
export function badRequestResponse(error: string): ApiResponseEnvelope { return { status: HTTP_STATUS.BAD_REQUEST, payload: { error } }; }
export function notFoundResponse(error: string): ApiResponseEnvelope { return { status: HTTP_STATUS.NOT_FOUND, payload: { error } }; }
export function unauthorizedResponse(error: string, setCookies?: readonly string[]): ApiResponseEnvelope {
	return setCookies ? { status: HTTP_STATUS.UNAUTHORIZED, payload: { error }, setCookies } : { status: HTTP_STATUS.UNAUTHORIZED, payload: { error } };
}
export function sanitizedErrorResponse(status: number, err: unknown): ApiResponseEnvelope {
	return { status, payload: { error: sanitizeTelemetryPayload(err instanceof Error ? err.message : String(err)) } };
}

interface RateBucket { failures: number; windowStartMs: number; blockedUntilMs: number; }
const rateBuckets = new Map<string, RateBucket>();
export function resetAuthRateLimiter(): void { rateBuckets.clear(); }
export function clearRateLimitBucket(key: string): void { rateBuckets.delete(key); }
export function checkAndConsumeRateLimit(key: string, nowMs = Date.now()): { readonly allowed: boolean; readonly retryAfterMs: number } {
	const existing = rateBuckets.get(key);
	if (existing && existing.blockedUntilMs > nowMs) return { allowed: false, retryAfterMs: existing.blockedUntilMs - nowMs };
	if (!existing || nowMs - existing.windowStartMs > HTTP_SECURITY_CONSTANTS.RATE_LIMIT_WINDOW_MS) {
		rateBuckets.set(key, { failures: 0, windowStartMs: nowMs, blockedUntilMs: 0 });
	}
	return { allowed: true, retryAfterMs: 0 };
}
export function recordAuthFailure(key: string, nowMs = Date.now()): void {
	const bucket = rateBuckets.get(key) ?? { failures: 0, windowStartMs: nowMs, blockedUntilMs: 0 };
	bucket.failures += 1;
	if (bucket.failures >= HTTP_SECURITY_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS) {
		bucket.blockedUntilMs = nowMs + HTTP_SECURITY_CONSTANTS.RATE_LIMIT_WINDOW_MS * Math.min(8, 2 ** (bucket.failures - HTTP_SECURITY_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS));
	}
	rateBuckets.set(key, bucket);
}
