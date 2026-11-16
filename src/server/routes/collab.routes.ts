/**
 * @author Oblx <code@oblx.dev>
 * @description Social Graph (Friendships & Scoped Collab Invites) and Privileged RBAC Override (`chronos.collab.override`) API routes.
 */
import { and, eq, or } from 'drizzle-orm';
import { API_ROUTES, HTTP_STATUS, WORKSPACE_DEFAULTS } from '@config/constants';
import { HUD_EVENTS } from '@config/hud.events';
import { CAPABILITY_BITS, CHRONOS_RBAC_GROUPS, SEEDED_OPERATOR_CONFIG } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { collabInvites, rbacGroups, rbacUserGroups, userFriendships, users } from '@lib/db/sqlite/schema/tables';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { appendAuditEntry } from '@core/security/audit.chain';
import { hasCapability } from '@core/security/rbac.bitmask';
import { emitDirectToUser, forceSummonUserSessions, getWsRoomSnapshot } from '@server/ws/ws.hub';
import { badRequestResponse, okResponse, type ApiResponseEnvelope, type RequestPrincipal } from '../http/middleware';

function estimateOperatorLevel(weight: number, timeLoggedSec = 0): number {
	const fromWeight = weight >= 100 ? 18 : weight >= 75 ? 12 : weight >= 50 ? 9 : weight >= 10 ? 5 : 1;
	return Math.min(100, fromWeight + Math.floor(timeLoggedSec / 600));
}

export function resolveUserMaxGroupWeight(handle: ChronosDatabaseHandle, uid: number, fallbackRoleId?: string): number {
	if (uid === SEEDED_OPERATOR_CONFIG.UID) return 1000;
	const userRow = handle.db.select().from(users).where(eq(users.uid, uid)).get();
	const seedRow = SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.find((a) => a.uid === uid);
	const roleId = userRow?.roleId ?? seedRow?.roleId ?? fallbackRoleId ?? 'ROLE_GUEST';
	const allGroups = handle.db.select().from(rbacGroups).all();
	const userGroups = handle.db.select().from(rbacUserGroups).where(eq(rbacUserGroups.userId, uid)).all();
	const groupIds = new Set<number>([userRow?.primaryGroupId ?? seedRow?.groupId ?? 1, ...userGroups.map((ug) => ug.groupId)]);
	let maxWeight: number = CHRONOS_RBAC_GROUPS.find((g) => g.roleId === roleId)?.weight ?? 0;
	for (const grp of allGroups) if (groupIds.has(grp.id) && grp.weight > maxWeight) maxWeight = grp.weight;
	return maxWeight;
}

function handleCollabDirectoryGet(handle: ChronosDatabaseHandle, principal: RequestPrincipal): ApiResponseEnvelope {
	const actorUid = Number(principal.userId) || 0, actorWeight = resolveUserMaxGroupWeight(handle, actorUid, principal.roleId);
	const canOverride = hasCapability(principal.effectiveMask, CAPABILITY_BITS.COLLAB_OVERRIDE);
	const allUsers = handle.db.select().from(users).all(), roomRoster = getWsRoomSnapshot(WORKSPACE_DEFAULTS.CORE_ID).roster;
	const friendRows = actorUid > 0 ? handle.db.select().from(userFriendships).where(or(eq(userFriendships.userLowId, actorUid), eq(userFriendships.userHighId, actorUid))).all() : [];
	const inviteRows = actorUid > 0 ? handle.db.select().from(collabInvites).where(or(eq(collabInvites.toUserId, actorUid), eq(collabInvites.fromUserId, actorUid))).all() : [];
	const seenUids = new Set<number>();
	const mergedProfiles = [
		...allUsers.map((u) => ({ uid: u.uid, username: u.username, displayName: u.displayName, roleId: u.roleId, timeLoggedSec: u.timeLoggedSec })),
		...SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.map((a) => ({ uid: a.uid, username: a.username, displayName: a.displayName, roleId: a.roleId, timeLoggedSec: 0 })),
	].filter((u) => u.uid !== actorUid && !seenUids.has(u.uid) && seenUids.add(u.uid));
	const operators = mergedProfiles.map((u) => {
		const live = roomRoster.find((r) => r.uid === u.uid || r.username === u.username);
		const weight = resolveUserMaxGroupWeight(handle, u.uid, u.roleId);
		return { uid: u.uid, username: u.username, displayName: u.displayName, roleId: u.roleId, weight, level: estimateOperatorLevel(weight, u.timeLoggedSec), online: Boolean(live), activityStatus: live?.activityStatus ?? 'STANDBY', activeProjection: live?.activeProjection ?? 'BUTTERFLY', scopeKind: live?.scopeKind ?? 'WORKSPACE' };
	});
	return okResponse({ actorUid, actorWeight, canOverride, operators, friends: friendRows.filter((f) => f.status === 'ACCEPTED'), pendingRequests: friendRows.filter((f) => f.status === 'PENDING'), invites: inviteRows });
}

async function handleFriendsPost(handle: ChronosDatabaseHandle, body: Record<string, unknown>, principal: RequestPrincipal): Promise<ApiResponseEnvelope> {
	const actorUid = Number(principal.userId) || 0;
	if (actorUid <= 0) return { status: HTTP_STATUS.UNAUTHORIZED, payload: { error: 'Sign in required for social graph actions.' } };
	const action = String(body.action ?? 'REQUEST').toUpperCase(), targetUsername = typeof body.targetUsername === 'string' ? body.targetUsername.trim() : '';
	const targetRow = targetUsername ? handle.db.select().from(users).where(eq(users.username, targetUsername)).get() : handle.db.select().from(users).where(eq(users.uid, Number(body.targetUserId ?? 0))).get();
	const seedMatch = targetUsername ? SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.find((a) => a.username === targetUsername) : SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.find((a) => a.uid === Number(body.targetUserId ?? 0));
	const targetUid = targetRow?.uid ?? seedMatch?.uid ?? Number(body.targetUserId ?? 0);
	if (targetUid <= 0 || targetUid === actorUid) return badRequestResponse('Valid distinct targetUserId or targetUsername required.');
	const lowId = Math.min(actorUid, targetUid), highId = Math.max(actorUid, targetUid), now = Date.now();
	const existing = handle.db.select().from(userFriendships).where(and(eq(userFriendships.userLowId, lowId), eq(userFriendships.userHighId, highId))).get();
	const nextStatus = (action === 'ACCEPT' ? 'ACCEPTED' : action === 'DECLINE' ? 'DECLINED' : action === 'BLOCK' ? 'BLOCKED' : 'PENDING') as 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
	if (existing) handle.db.update(userFriendships).set({ status: nextStatus, updatedAt: now }).where(and(eq(userFriendships.userLowId, lowId), eq(userFriendships.userHighId, highId))).run();
	else handle.db.insert(userFriendships).values({ userLowId: lowId, userHighId: highId, initiatorUserId: actorUid, status: nextStatus, createdAt: now, updatedAt: now }).run();
	await appendAuditEntry(handle, principal.userId, `FRIEND_${nextStatus}`, 'INFO', `Friendship (${lowId},${highId}) -> ${nextStatus}`);
	const base = handleCollabDirectoryGet(handle, principal);
	return okResponse({ ...(base.payload as Record<string, unknown>), friendship: { userLowId: lowId, userHighId: highId, status: nextStatus, initiatorUserId: actorUid } });
}

async function handleInvitesPost(handle: ChronosDatabaseHandle, body: Record<string, unknown>, principal: RequestPrincipal): Promise<ApiResponseEnvelope> {
	const actorUid = Number(principal.userId) || 0;
	if (actorUid <= 0) return { status: HTTP_STATUS.UNAUTHORIZED, payload: { error: 'Sign in required for collaboration invites.' } };
	const action = String(body.action ?? 'SEND').toUpperCase(), now = Date.now();
	if (action === 'ACCEPT' || action === 'DECLINE') {
		const inviteId = Number(body.inviteId ?? 0), nextStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
		handle.db.update(collabInvites).set({ status: nextStatus }).where(eq(collabInvites.id, inviteId)).run();
		return okResponse({ invite: handle.db.select().from(collabInvites).where(eq(collabInvites.id, inviteId)).get() });
	}
	const toUserId = Number(body.toUserId ?? 0); if (toUserId <= 0) return badRequestResponse('Valid toUserId is required.');
	const scopeKind = body.scopeKind === 'FULL_APP' ? 'FULL_APP' : 'WORKSPACE', projectId = body.projectId !== undefined ? Number(body.projectId) : 1;
	const clusterId = typeof body.clusterId === 'string' && body.clusterId.trim() ? body.clusterId.trim() : `cluster-${projectId}`;
	const inserted = handle.db.insert(collabInvites).values({ fromUserId: actorUid, toUserId, projectId, clusterId, scopeKind, status: 'PENDING', overrideByUserId: null, createdAt: now, expiresAt: now + 3_600_000 }).returning().get();
	emitDirectToUser(toUserId, { type: HUD_EVENTS.WS_COLLAB_INVITE, invite: { ...inserted, fromUsername: principal.username } });
	await appendAuditEntry(handle, principal.userId, 'COLLAB_INVITE_SENT', 'INFO', `Sent ${scopeKind} invite #${inserted.id} to uid=${toUserId}`);
	return okResponse({ invite: inserted });
}

async function handlePrivilegedOverridePost(handle: ChronosDatabaseHandle, body: Record<string, unknown>, principal: RequestPrincipal): Promise<ApiResponseEnvelope> {
	const actorUid = Number(principal.userId) || 0, targetUid = Number(body.targetUserId ?? 0);
	if (targetUid <= 0) return badRequestResponse('Valid targetUserId is required for RBAC override.');
	const actorWeight = resolveUserMaxGroupWeight(handle, actorUid, principal.roleId), targetWeight = resolveUserMaxGroupWeight(handle, targetUid);
	if (!hasCapability(principal.effectiveMask, CAPABILITY_BITS.COLLAB_OVERRIDE) || (actorUid !== SEEDED_OPERATOR_CONFIG.UID && actorWeight <= targetWeight)) {
		await appendAuditEntry(handle, principal.userId, 'COLLAB_OVERRIDE_DENIED', 'WARN', `Denied override by uid=${actorUid}(w=${actorWeight}) on uid=${targetUid}(w=${targetWeight})`);
		return { status: HTTP_STATUS.FORBIDDEN, payload: { error: 'Privileged RBAC override denied: insufficient capability or group weight.', actorWeight, targetWeight } };
	}
	const overrideAction = String(body.overrideAction ?? 'OVERRIDE_COLLAB_INVITE'), now = Date.now(), lowId = Math.min(actorUid, targetUid), highId = Math.max(actorUid, targetUid);
	if (overrideAction === 'OVERRIDE_FRIEND_REQUEST') {
		const ex = handle.db.select().from(userFriendships).where(and(eq(userFriendships.userLowId, lowId), eq(userFriendships.userHighId, highId))).get();
		if (ex) handle.db.update(userFriendships).set({ status: 'ACCEPTED', updatedAt: now }).where(and(eq(userFriendships.userLowId, lowId), eq(userFriendships.userHighId, highId))).run();
		else handle.db.insert(userFriendships).values({ userLowId: lowId, userHighId: highId, initiatorUserId: actorUid, status: 'ACCEPTED', createdAt: now, updatedAt: now }).run();
	} else if (overrideAction === 'OVERRIDE_COLLAB_INVITE') {
		const scopeKind = body.scopeKind === 'FULL_APP' ? 'FULL_APP' : 'WORKSPACE', workspaceId = String(body.workspaceId ?? WORKSPACE_DEFAULTS.CORE_ID), clusterId = typeof body.clusterId === 'string' ? body.clusterId : 'cluster-1';
		const inv = handle.db.insert(collabInvites).values({ fromUserId: actorUid, toUserId: targetUid, projectId: Number(body.projectId ?? 1), clusterId, scopeKind, status: 'OVERRIDDEN', overrideByUserId: actorUid, createdAt: now, expiresAt: now + 3_600_000 }).returning().get();
		forceSummonUserSessions(targetUid, workspaceId, clusterId, scopeKind, { overrideAction, actor: principal.username, inviteId: inv.id, intent: body.intent });
	} else {
		emitDirectToUser(targetUid, { type: HUD_EVENTS.WS_PRIVILEGED_OVERRIDE, overrideAction, actor: principal.username, actorUid, intent: body.intent, focalEntityId: body.focalEntityId });
	}
	await appendAuditEntry(handle, principal.userId, overrideAction, 'WARN', `Executed ${overrideAction} by uid=${actorUid}(w=${actorWeight}) on uid=${targetUid}(w=${targetWeight})`);
	return okResponse({ overridden: true, overrideAction, actorUid, targetUid, actorWeight, targetWeight });
}

export async function handleCollabRoutes(handle: ChronosDatabaseHandle, urlPath: string, method: string, bodyText: string | undefined, principal: RequestPrincipal): Promise<ApiResponseEnvelope | null> {
	if (urlPath.startsWith(API_ROUTES.COLLAB_FRIENDS) && method === 'GET') return handleCollabDirectoryGet(handle, principal);
	const body = bodyText ? parseSafeJson<Record<string, unknown>>(bodyText) : {};
	if (urlPath.startsWith(API_ROUTES.COLLAB_FRIENDS) && method === 'POST') return handleFriendsPost(handle, body, principal);
	if (urlPath.startsWith(API_ROUTES.COLLAB_INVITES) && method === 'POST') return handleInvitesPost(handle, body, principal);
	if (urlPath.startsWith(API_ROUTES.COLLAB_OVERRIDE) && method === 'POST') return handlePrivilegedOverridePost(handle, body, principal);
	return null;
}
