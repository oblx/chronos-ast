/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos Dual-Plane WebSocket Collaboration Hub: AWARENESS_STATE_FRAME, CAUSAL_OP_FRAME, Twin Intent Loopback & RBAC Override.
 */
import { WS_CONFIG } from '@config/constants';
import { HUD_EVENTS } from '@config/hud.events';
import { CAPABILITY_BITS, ROLE_IDS, ROLE_MASKS } from '@config/security.constants';
import { allowlistCollaboratorRosterItem, resolveCollaboratorColor, type AllowlistedCollaboratorRosterItem } from '@core/security/privacy.guard';
import { hasCapability } from '@core/security/rbac.bitmask';
import { sanitizeOutboundForPrincipal } from '@plugins/sanitizers/form.sanitizer';
import { getClusterSnapshot, joinOrCreateCluster, leaveClusterMember, resetWsClusters, type WsClusterJoinResult } from './cluster.guard';
import { buildWsSessionList, clearTwinTraceBuffer, dispatchTwinIntentMap, queryTwinWireTraces, recordTwinAckFrame } from './twin.bridge';
import type { WsAnnotationRecord, WsCollaboratorState, WsInboundFrame } from './awareness.bus';
import type { TwinIntentPayload } from '../mcp/mcp.types';

export type { WsAnnotationRecord, WsCollaboratorState, WsInboundFrame };
const activeClients = new Map<string, WsCollaboratorState>(), roomMembers = new Map<string, Set<string>>(), roomAnnotations = new Map<string, WsAnnotationRecord[]>();
function roomTopic(workspaceId: string): string { return `ws:project:${workspaceId || 'chronos-core'}`; }

function broadcastToRoom(workspaceId: string, message: Record<string, unknown>, excludeClientId?: string, isVolatile = false): void {
	for (const cid of roomMembers.get(roomTopic(workspaceId)) ?? []) {
		const c = cid !== excludeClientId ? activeClients.get(cid) : undefined;
		if (c && (!isVolatile || (c.getBufferedAmount?.() ?? 0) <= WS_CONFIG.MAX_BUFFERED_BYTES)) c.sendFrame?.(JSON.stringify(sanitizeOutboundForPrincipal(message, c.effectiveMask, c.roleId)));
	}
}
export function emitClusterServerCommit(workspaceId: string, senderSid: string, route: string, actor: string): void {
	const frame = { type: HUD_EVENTS.SERVER_EVENT_COMMITTED, workspaceId, route, actor, ts: Date.now() };
	for (const cid of roomMembers.get(roomTopic(workspaceId)) ?? []) {
		const c = activeClients.get(cid);
		if (c && (c.roleId !== ROLE_IDS.GUEST || cid === senderSid || c.clusterId)) c.sendFrame?.(JSON.stringify(sanitizeOutboundForPrincipal(frame, c.effectiveMask, c.roleId)));
	}
}
export function emitDirectToUser(targetUid: number, frame: Record<string, unknown>): number {
	let count = 0; for (const c of activeClients.values()) if (c.uid === (targetUid >>> 0)) { c.sendFrame?.(JSON.stringify(sanitizeOutboundForPrincipal(frame, c.effectiveMask, c.roleId))); count += 1; } return count;
}
export function forceSummonUserSessions(targetUid: number, workspaceId: string, clusterId: string, scopeKind: 'WORKSPACE' | 'FULL_APP', overridePayload: Record<string, unknown>): number {
	let moved = 0;
	for (const c of activeClients.values()) {
		if (c.uid !== (targetUid >>> 0)) continue;
		roomMembers.get(roomTopic(c.workspaceId))?.delete(c.clientId); c.workspaceId = workspaceId; c.scopeKind = scopeKind;
		const cRes = joinOrCreateCluster(clusterId, workspaceId, c.clientId, c.roleId); if (cRes.accepted) c.clusterId = clusterId;
		if (typeof overridePayload.activeProjection === 'string') c.activeProjection = overridePayload.activeProjection;
		if (typeof overridePayload.focalEntityId === 'number') c.focalEntityId = overridePayload.focalEntityId;
		const set = roomMembers.get(roomTopic(workspaceId)) ?? new Set<string>(); set.add(c.clientId); roomMembers.set(roomTopic(workspaceId), set);
		c.sendFrame?.(JSON.stringify({ type: HUD_EVENTS.WS_PRIVILEGED_OVERRIDE, ...overridePayload })); moved += 1;
	}
	broadcastToRoom(workspaceId, { type: HUD_EVENTS.WS_ROSTER_UPDATE, ...getWsRoomSnapshot(workspaceId) }); return moved;
}
export function getWsRoomSnapshot(workspaceId = 'chronos-core') {
	const topic = roomTopic(workspaceId), roster: AllowlistedCollaboratorRosterItem[] = [];
	for (const cid of roomMembers.get(topic) ?? []) { const c = activeClients.get(cid); if (c) roster.push(allowlistCollaboratorRosterItem({ ...c, lastActiveMs: c.lastPongMs } as unknown as Record<string, unknown>)); }
	return { connectedCount: activeClients.size, maxClients: WS_CONFIG.MAX_CLIENTS, roomTopic: topic, roster, annotations: roomAnnotations.get(topic) ?? [] };
}
export function joinWsCluster(clientId: string, clusterId: string, scopeKind?: 'WORKSPACE' | 'FULL_APP'): WsClusterJoinResult {
	const client = activeClients.get(clientId); if (!client) return { accepted: false, code: 1008, seatCount: 0, seatCap: 0, reason: 'Client not registered in WS hub.' };
	const res = joinOrCreateCluster(clusterId, client.workspaceId, clientId, client.roleId); if (!res.accepted) return res;
	client.clusterId = res.cluster?.clusterId; if (scopeKind) client.scopeKind = scopeKind;
	const snap = getClusterSnapshot(client.clusterId!); if (snap) broadcastToRoom(client.workspaceId, { type: HUD_EVENTS.WS_CLUSTER_UPDATE, ...snap }); return res;
}
export function joinWsClient(input: { readonly clientId?: string; readonly sessionId?: string; readonly uid?: number; readonly username?: string; readonly roleId?: string; readonly clusterId?: string; readonly scopeKind?: 'WORKSPACE' | 'FULL_APP'; readonly effectiveMask?: number; readonly workspaceId?: string; readonly projectId?: number; readonly focalEntityId?: number | null; readonly sendFrame?: (payload: string) => void; readonly getBufferedAmount?: () => number; }) {
	const cid = input.clientId ?? crypto.randomUUID(), sid = input.sessionId ?? cid, now = Date.now(), prev = activeClients.get(cid);
	sweepIdleWsClients(now);
	if (!prev && activeClients.size >= WS_CONFIG.MAX_CLIENTS) return { accepted: false, code: WS_CONFIG.CLOSE_TRY_AGAIN_LATER, reason: '1013 Try Again Later: WebSocket hub at 100-client capacity.' };
	const roleId = input.roleId ?? prev?.roleId ?? ROLE_IDS.GUEST, wsId = input.workspaceId ?? prev?.workspaceId ?? 'chronos-core';
	const uid = ((input.uid ?? prev?.uid ?? 0) >>> 0), username = input.username ?? prev?.username ?? 'guest';
	if (prev && prev.workspaceId !== wsId) roomMembers.get(roomTopic(prev.workspaceId))?.delete(cid);
	const state: WsCollaboratorState = {
		clientId: cid, sessionId: sid, uid, username, roleId,
		effectiveMask: (input.effectiveMask ?? prev?.effectiveMask ?? ROLE_MASKS[roleId as keyof typeof ROLE_MASKS] ?? ROLE_MASKS.ROLE_GUEST) >>> 0,
		cursorColor: resolveCollaboratorColor(uid, sid), scopeKind: input.scopeKind ?? prev?.scopeKind ?? 'WORKSPACE', workspaceId: wsId,
		projectId: (input.projectId ?? prev?.projectId ?? 1) >>> 0, activeProjection: prev?.activeProjection ?? 'BUTTERFLY',
		activeZone: prev?.activeZone ?? 'WORLD_CANVAS', activityStatus: prev?.activityStatus ?? 'NAVIGATING',
		focalEntityId: input.focalEntityId ?? prev?.focalEntityId ?? null, viewportTier: prev?.viewportTier ?? 'DESKTOP', cameraZoom: prev?.cameraZoom ?? 1,
		cursorX: prev?.cursorX ?? 0, cursorY: prev?.cursorY ?? 0, worldX: prev?.worldX ?? 0, worldY: prev?.worldY ?? 0,
		normalizedX: prev?.normalizedX ?? 0.5, normalizedY: prev?.normalizedY ?? 0.5, caretLine: prev?.caretLine ?? null, caretCol: prev?.caretCol ?? null,
		followingClientId: prev?.followingClientId ?? null, lastCursorMs: prev?.lastCursorMs ?? 0, lastPongMs: now, msgWindowStartMs: now, msgCountInWindow: 0,
		sendFrame: input.sendFrame ?? prev?.sendFrame, getBufferedAmount: input.getBufferedAmount ?? prev?.getBufferedAmount,
	};
	if (input.clusterId) {
		const cRes = joinOrCreateCluster(input.clusterId, wsId, cid, roleId);
		if (!cRes.accepted) return { accepted: false, code: cRes.code, event: cRes.event, seatCount: cRes.seatCount, seatCap: cRes.seatCap, reason: cRes.reason };
		state.clusterId = cRes.cluster?.clusterId;
	}
	activeClients.set(cid, state); const topic = roomTopic(state.workspaceId), set = roomMembers.get(topic) ?? new Set<string>(); set.add(cid); roomMembers.set(topic, set);
	const clusterSnap = state.clusterId ? getClusterSnapshot(state.clusterId) : undefined;
	broadcastToRoom(state.workspaceId, { type: HUD_EVENTS.WS_ROSTER_UPDATE, ...getWsRoomSnapshot(state.workspaceId), ...(clusterSnap ? { cluster: clusterSnap } : {}) });
	return { accepted: true, code: 1000, client: state, ...(clusterSnap ? { seatCount: clusterSnap.seatCount, seatCap: clusterSnap.seatCap } : {}) };
}
export function leaveWsClient(clientId: string): void {
	const existing = activeClients.get(clientId); if (!existing) return;
	activeClients.delete(clientId);
	for (const rec of leaveClusterMember(clientId)) broadcastToRoom(rec.workspaceId, { type: HUD_EVENTS.WS_CLUSTER_UPDATE, clusterId: rec.clusterId, seatCount: rec.memberIds.size, seatCap: rec.seatCap });
	const topic = roomTopic(existing.workspaceId), set = roomMembers.get(topic); if (set) { set.delete(clientId); if (set.size === 0) roomMembers.delete(topic); }
	broadcastToRoom(existing.workspaceId, { type: HUD_EVENTS.WS_PEER_LEFT, clientId, sessionId: existing.sessionId, uid: existing.uid });
	broadcastToRoom(existing.workspaceId, { type: HUD_EVENTS.WS_ROSTER_UPDATE, ...getWsRoomSnapshot(existing.workspaceId) });
}
function handleAwarenessFrame(client: WsCollaboratorState, frame: WsInboundFrame, nowMs: number) {
	if (frame.viewportTier) client.viewportTier = frame.viewportTier;
	if (typeof frame.cameraZoom === 'number') client.cameraZoom = frame.cameraZoom;
	if (frame.activeProjection) client.activeProjection = frame.activeProjection;
	if (frame.focalEntityId !== undefined) client.focalEntityId = frame.focalEntityId;
	if (nowMs - client.lastCursorMs < WS_CONFIG.CURSOR_THROTTLE_MS) return { ok: true, broadcastType: 'THROTTLED' };
	client.lastCursorMs = nowMs; client.cursorX = Number(frame.cursorX ?? client.cursorX); client.cursorY = Number(frame.cursorY ?? client.cursorY);
	client.worldX = Number(frame.worldX ?? client.cursorX); client.worldY = Number(frame.worldY ?? client.cursorY);
	if (frame.normalizedX !== undefined) client.normalizedX = Math.max(0, Math.min(1, Number(frame.normalizedX)));
	if (frame.normalizedY !== undefined) client.normalizedY = Math.max(0, Math.min(1, Number(frame.normalizedY)));
	if (frame.scopeKind) client.scopeKind = frame.scopeKind; if (frame.activeZone) client.activeZone = frame.activeZone;
	if (frame.activityStatus) client.activityStatus = frame.activityStatus;
	if (frame.caretLine !== undefined) client.caretLine = frame.caretLine; if (frame.caretCol !== undefined) client.caretCol = frame.caretCol;
	const peer = allowlistCollaboratorRosterItem({ ...client, lastActiveMs: nowMs } as unknown as Record<string, unknown>);
	broadcastToRoom(client.workspaceId, { type: HUD_EVENTS.WS_REMOTE_CURSOR, peer, clientId: client.clientId, uid: client.uid, username: client.username, roleId: client.roleId, cursorX: client.cursorX, cursorY: client.cursorY, worldX: client.worldX, worldY: client.worldY, focalEntityId: client.focalEntityId }, client.clientId, true);
	return { ok: true, broadcastType: HUD_EVENTS.WS_REMOTE_CURSOR };
}
export function handleWsClientFrame(clientId: string, frame: WsInboundFrame, nowMs = Date.now()): { readonly ok: boolean; readonly code?: number; readonly reason?: string; readonly broadcastType?: string } {
	const client = activeClients.get(clientId); if (!client) return { ok: false, code: 1008, reason: 'Client not registered in WS hub.' };
	if (nowMs - client.msgWindowStartMs >= 1000) { client.msgWindowStartMs = nowMs; client.msgCountInWindow = 0; }
	if (++client.msgCountInWindow > WS_CONFIG.RATE_LIMIT_MSGS_PER_SEC) { leaveWsClient(clientId); return { ok: false, code: WS_CONFIG.CLOSE_POLICY_VIOLATION, reason: '1008 Policy Violation: WS rate limit exceeded.' }; }
	client.lastPongMs = nowMs;
	if (frame.type === 'PING' || frame.type === 'PONG') { client.sendFrame?.(JSON.stringify({ type: 'PONG', ts: nowMs })); return { ok: true, broadcastType: 'PONG' }; }
	if (frame.type === HUD_EVENTS.TWIN_CLIENT_ACK) { recordTwinAckFrame(client, frame); return { ok: true, broadcastType: HUD_EVENTS.TWIN_CLIENT_ACK }; }
	if (frame.type === 'CREATE_CLUSTER' || frame.type === 'JOIN_CLUSTER') { const r = joinWsCluster(clientId, frame.clusterId ?? `cluster-${client.workspaceId}`, frame.scopeKind); return r.accepted ? { ok: true, broadcastType: HUD_EVENTS.WS_CLUSTER_UPDATE } : { ok: false, code: r.code, reason: r.reason }; }
	if (frame.type === 'WS_SWITCH_PROJECT_ROOM' || frame.type === 'JOIN') {
		const oldWs = client.workspaceId, nextWs = frame.workspaceId ?? (frame.projectId ? `proj-${frame.projectId}` : oldWs);
		roomMembers.get(roomTopic(oldWs))?.delete(clientId); client.workspaceId = nextWs; if (frame.projectId) client.projectId = frame.projectId >>> 0;
		const set = roomMembers.get(roomTopic(nextWs)) ?? new Set<string>(); set.add(clientId); roomMembers.set(roomTopic(nextWs), set);
		broadcastToRoom(oldWs, { type: HUD_EVENTS.WS_ROSTER_UPDATE, ...getWsRoomSnapshot(oldWs) }); broadcastToRoom(nextWs, { type: HUD_EVENTS.WS_ROSTER_UPDATE, ...getWsRoomSnapshot(nextWs) });
		return { ok: true, broadcastType: HUD_EVENTS.WS_ROSTER_UPDATE };
	}
	if (frame.type === 'CURSOR' || frame.type === 'AWARENESS_STATE_FRAME') return handleAwarenessFrame(client, frame, nowMs);
	if (frame.type === 'CAUSAL_OP_FRAME') { broadcastToRoom(client.workspaceId, { type: HUD_EVENTS.CAUSAL_OP_FRAME, clientId, uid: client.uid, username: client.username, opKind: String(frame.opKind ?? 'INTENT'), targetId: frame.targetId, payload: frame.payload ?? {}, hlcTimestamp: frame.hlcTimestamp ?? `${nowMs}:0`, ts: nowMs }, clientId, false); return { ok: true, broadcastType: HUD_EVENTS.CAUSAL_OP_FRAME }; }
	if (frame.type === 'FOLLOW_PEER_SESSION') { client.followingClientId = frame.followingClientId ?? null; broadcastToRoom(client.workspaceId, { type: HUD_EVENTS.FOLLOW_PEER_SESSION, followerClientId: clientId, leaderClientId: client.followingClientId }); return { ok: true, broadcastType: HUD_EVENTS.FOLLOW_PEER_SESSION }; }
	if (frame.type === 'FOCAL_LOCK') { client.focalEntityId = frame.focalEntityId ?? null; broadcastToRoom(client.workspaceId, { type: HUD_EVENTS.WS_ROSTER_UPDATE, ...getWsRoomSnapshot(client.workspaceId) }); return { ok: true, broadcastType: HUD_EVENTS.WS_ROSTER_UPDATE }; }
	if (frame.type === 'ANNOTATION') {
		if (!hasCapability(client.effectiveMask, CAPABILITY_BITS.ANNOTATION_WRITE)) return { ok: false, code: 403, reason: 'Missing chronos.annotation.write capability.' };
		const rec: WsAnnotationRecord = { id: crypto.randomUUID(), workspaceId: client.workspaceId, entityId: Number(frame.entityId ?? 0), author: client.username, note: String(frame.note ?? '').slice(0, 280), createdAt: nowMs };
		const topic = roomTopic(client.workspaceId), list = [...(roomAnnotations.get(topic) ?? []), rec].slice(-50); roomAnnotations.set(topic, list);
		broadcastToRoom(client.workspaceId, { type: HUD_EVENTS.WS_REMOTE_ANNOTATION, annotation: rec, annotations: list }); return { ok: true, broadcastType: HUD_EVENTS.WS_REMOTE_ANNOTATION };
	}
	if (frame.type === 'LOCKDOWN' && hasCapability(client.effectiveMask, CAPABILITY_BITS.SYSTEM_LOCKDOWN)) { broadcastToRoom(client.workspaceId, { type: HUD_EVENTS.WS_LOCKDOWN_BROADCAST, lockdownActive: Boolean(frame.lockdownActive) }); return { ok: true, broadcastType: HUD_EVENTS.WS_LOCKDOWN_BROADCAST }; }
	return { ok: true };
}
export function listWsSessions() { return buildWsSessionList(activeClients); }
export function dispatchTwinIntentToSessions(target: string, intent: TwinIntentPayload, actor: string) { return dispatchTwinIntentMap(activeClients, target, intent, actor); }
export function captureTwinWireTraces(limit = 32, correlationId?: string) { return queryTwinWireTraces(limit, correlationId); }
export function sweepIdleWsClients(nowMs = Date.now(), maxIdleMs = WS_CONFIG.HEARTBEAT_MS * 2): number { let swept = 0; for (const [cid, state] of activeClients.entries()) { if (nowMs - state.lastPongMs > maxIdleMs) { leaveWsClient(cid); swept += 1; } } return swept; }
export function resetWsHub(): void { activeClients.clear(); roomMembers.clear(); roomAnnotations.clear(); resetWsClusters(); clearTwinTraceBuffer(); }
export { getClusterSnapshot };
