/**
 * @author Oblx <code@oblx.dev>
 * @description HTTP endpoints for RBAC Roles, Global Lockdown, Tamper-Evident Audit Chain, and Session Revocation.
 */
import { and, desc, eq } from 'drizzle-orm';
import { API_ROUTES, HTTP_STATUS } from '@config/constants';
import { resolveRuntimeEnv } from '@config/env.schema';
import { CAPABILITY_BITS, ROLE_IDS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { rbacGroups, rbacPermissionNodes, sessions, users } from '@lib/db/sqlite/schema/tables';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { appendAuditEntry, listAuditEntries, verifyAuditChain } from '@core/security/audit.chain';
import { assignUserToGroup, compileEffectiveUserMask, seedDefaultRbacGroups, setChronosRbacNode } from '@core/security/chronos.rbac';
import { isSystemLockdownActive, setSystemLockdownActive } from '@core/security/rbac.bitmask';
import { revokeSessionFamily } from '@core/security/session.engine';
import { okResponse, requireCapability, sanitizedErrorResponse, type ApiResponseEnvelope, type RequestPrincipal } from '../http/middleware';
import { handleAuthSubRoutes } from './auth.routes';

async function handleRbacNodesRoute(
	handle: ChronosDatabaseHandle, method: string, body: Record<string, unknown>, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope> {
	const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.USER_ROLE_ASSIGN, true);
	if (denied) return denied;
	const action = String(body.action ?? 'SET_NODE');
	if (action === 'ASSIGN_GROUP') {
		const userUid = Number(body.userUid ?? 1) >>> 0, groupId = Number(body.groupId ?? 3) >>> 0;
		const expiresAt = body.expiresAt ? Number(body.expiresAt) : null;
		assignUserToGroup(handle, userUid, groupId, expiresAt);
		const compiledMask = compileEffectiveUserMask(handle, userUid);
		await appendAuditEntry(handle, principal.userId, 'RBAC_GROUP_ASSIGNED', 'INFO', `Assigned uid=${userUid} to group=${groupId}`);
		return okResponse({ updated: true, userUid, groupId, effectiveMask: compiledMask });
	}
	const holderKind = body.holderKind === 'GROUP' ? 'GROUP' : 'USER';
	const holderId = Number(body.holderId ?? 1) >>> 0, bitIndex = Number(body.bitIndex ?? 0) & 31;
	const value = Boolean(body.value ?? true);
	const workspaceContextId = body.workspaceContextId !== undefined && body.workspaceContextId !== null ? Number(body.workspaceContextId) : null;
	const expiresAt = body.expiresAt !== undefined && body.expiresAt !== null ? Number(body.expiresAt) : null;
	setChronosRbacNode(handle, { holderKind, holderId, bitIndex, value, workspaceContextId, expiresAt });
	const compiledMask = holderKind === 'USER' ? compileEffectiveUserMask(handle, holderId, { workspaceContextId }) : 0;
	await appendAuditEntry(handle, principal.userId, 'RBAC_NODE_SET', 'WARN', `Set node b${bitIndex}=${value} on ${holderKind}:${holderId}`);
	return okResponse({ updated: true, holderKind, holderId, bitIndex, value, effectiveMask: compiledMask });
}

async function handleGovernanceRoutes(
	handle: ChronosDatabaseHandle, urlPath: string, method: string, body: Record<string, unknown>, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	if (urlPath.startsWith(API_ROUTES.SECURITY_STATUS) && method === 'GET') {
		seedDefaultRbacGroups(handle);
		const chain = await verifyAuditChain(handle);
		const activeSessions = principal.userId === 'guest' ? [] : handle.db.select({ sid: sessions.sid, familyId: sessions.familyId, generation: sessions.generation, revoked: sessions.revoked, expiresAt: sessions.expiresAt })
			.from(sessions).where(and(eq(sessions.userId, principal.userId), eq(sessions.revoked, 0))).orderBy(desc(sessions.createdAt)).limit(10).all();
		const groups = handle.db.select().from(rbacGroups).all();
		const permissionNodes = handle.db.select().from(rbacPermissionNodes).limit(32).all();
		return okResponse({ principal, devMode: resolveRuntimeEnv().devMode, lockdownActive: isSystemLockdownActive(), auditChain: chain, sessions: activeSessions, groups, permissionNodes });
	}
	if (urlPath.startsWith(API_ROUTES.SECURITY_RBAC_NODES) && method === 'POST') return handleRbacNodesRoute(handle, method, body, headers, principal);
	if (urlPath.startsWith(API_ROUTES.SECURITY_AUDIT) && method === 'GET') {
		const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.AUDIT_LOG_READ);
		return denied ?? okResponse({ chain: await verifyAuditChain(handle), entries: listAuditEntries(handle, 40) });
	}
	if (urlPath.startsWith(API_ROUTES.SECURITY_ROLES) && method === 'POST') {
		const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.USER_ROLE_ASSIGN, true);
		if (denied) return denied;
		const targetId = String(body.userId ?? ''), roleId = String(body.roleId ?? ROLE_IDS.ANALYST);
		const grantMask = Number(body.grantMask ?? 0) >>> 0, denyMask = Number(body.denyMask ?? 0) >>> 0;
		handle.db.update(users).set({ roleId, grantMask, denyMask }).where(eq(users.id, targetId)).run();
		await appendAuditEntry(handle, principal.userId, 'RBAC_ROLE_UPDATED', 'WARN', `Updated ${targetId} -> ${roleId} (grant=0x${grantMask.toString(16)}, deny=0x${denyMask.toString(16)})`);
		return okResponse({ updated: true, userId: targetId, roleId, grantMask, denyMask });
	}
	if (urlPath.startsWith(API_ROUTES.SECURITY_LOCKDOWN) && method === 'POST') {
		const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.SYSTEM_LOCKDOWN, true);
		if (denied) return denied;
		const enabled = setSystemLockdownActive(Boolean(body.enabled));
		await appendAuditEntry(handle, principal.userId, 'SYSTEM_LOCKDOWN_TOGGLED', 'CRITICAL', `Global lockdown ${enabled ? 'ENGAGED' : 'CLEARED'}`);
		return okResponse({ lockdownActive: enabled });
	}
	if (urlPath.startsWith(API_ROUTES.SECURITY_REVOKE) && method === 'POST') {
		const targetFam = String(body.familyId ?? principal.familyId);
		const reqBit = targetFam === principal.familyId ? CAPABILITY_BITS.SESSION_REVOKE_OWN : CAPABILITY_BITS.SESSION_REVOKE_ANY;
		const denied = await requireCapability(principal, method, headers, reqBit, true);
		if (denied) return denied;
		revokeSessionFamily(handle, targetFam);
		await appendAuditEntry(handle, principal.userId, 'SESSION_FAMILY_REVOKED', 'WARN', `Revoked session family ${targetFam}`);
		return okResponse({ revokedFamilyId: targetFam });
	}
	return null;
}

export async function handleSecurityRoutes(
	handle: ChronosDatabaseHandle, urlPath: string, method: string, bodyText: string | undefined, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	try {
		const body = bodyText ? parseSafeJson<Record<string, unknown>>(bodyText) : {};
		return (await handleAuthSubRoutes(handle, urlPath, method, body, headers, principal))
			?? (await handleGovernanceRoutes(handle, urlPath, method, body, headers, principal));
	} catch (err) {
		const msg = err instanceof Error ? err.message : '';
		const status = msg.startsWith('Rate limited') ? HTTP_STATUS.TOO_MANY_REQUESTS : HTTP_STATUS.BAD_REQUEST;
		return sanitizedErrorResponse(status, err);
	}
}
