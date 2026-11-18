/**
 * @author Oblx <code@oblx.dev>
 * @description 3-Client WebSocket, Social Graph (Friendships & Scoped Invites), Dual-Plane Awareness/Causal Frames & Privileged RBAC Override QA Suite (v1.9.7).
 */
import { describe, expect, test } from 'bun:test';
import { API_ROUTES } from '@config/constants';
import { HUD_EVENTS } from '@config/hud.events';
import { CAPABILITY_BITS, ROLE_IDS, ROLE_MASKS, SEEDED_OPERATOR_CONFIG } from '@config/security.constants';
import { handleMetamodelApiRequest } from '@server/http/router';
import { createChronosDb } from '@lib/db/client';
import { ensureSeededOperatorAccount } from '@lib/db/seed.operator';

describe('Chronos v1.9.7 Multi-Scope Collaboration, Social Graph & Privileged RBAC Override QA Suite', () => {
	test('1. verifies 3-client social graph (PENDING -> ACCEPTED), WORKSPACE/FULL_APP invites, Dual-Plane WS frames, and RBAC weight hierarchy overrides', async () => {
		const loginAdmin = await handleMetamodelApiRequest(API_ROUTES.AUTH_LOGIN, 'POST', JSON.stringify({ username: 'oblx', password: 'nopenope' }));
		expect(loginAdmin.status).toBe(200);
		const adminHeaders = { authorization: `Bearer ${String((loginAdmin.payload as Record<string, unknown>).accessToken ?? '')}` };

		const regAnalyst = await handleMetamodelApiRequest(API_ROUTES.AUTH_REGISTER, 'POST', JSON.stringify({ username: 'analyst_collab', password: 'AnalystPassword!123' }));
		expect(regAnalyst.status).toBe(200);
		const analystPayload = regAnalyst.payload as Record<string, unknown>;
		const analystUid = Number((analystPayload.user as Record<string, unknown>).uid);
		const analystHeaders = { authorization: `Bearer ${String(analystPayload.accessToken ?? '')}` };

		const regViewer = await handleMetamodelApiRequest(API_ROUTES.AUTH_REGISTER, 'POST', JSON.stringify({ username: 'viewer_collab', password: 'ViewerPassword!123' }));
		expect(regViewer.status).toBe(200);
		const viewerPayload = regViewer.payload as Record<string, unknown>;
		const viewerUid = Number((viewerPayload.user as Record<string, unknown>).uid);
		const viewerHeaders = { authorization: `Bearer ${String(viewerPayload.accessToken ?? '')}` };

		for (const [id, scope, hdrs] of [['sess-admin', 'FULL_APP', adminHeaders], ['sess-analyst', 'WORKSPACE', analystHeaders], ['sess-viewer', 'WORKSPACE', viewerHeaders]] as const) {
			const j = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({ action: 'JOIN', clientId: id, sessionId: id, scopeKind: scope, clusterId: 'cluster-1' }), hdrs);
			expect(j.status).toBe(200);
		}

		const awareRes = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({
			clientId: 'sess-analyst', type: HUD_EVENTS.AWARENESS_STATE_FRAME, cursorX: 420, cursorY: 310, worldX: 600, worldY: 450, normalizedX: 0.328, normalizedY: 0.43,
			scopeKind: 'FULL_APP', activeZone: 'WORLD_CANVAS', activeProjection: 'CONTROL_FLOW', activityStatus: 'STEPPING_CFG', caretLine: 42, caretCol: 8,
		}), analystHeaders);
		expect(awareRes.status).toBe(200);

		const causalRes = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({
			clientId: 'sess-analyst', type: HUD_EVENTS.CAUSAL_OP_FRAME, opKind: 'ENTITY_ANNOTATION_ADD', targetId: 1, payload: { note: 'Verified CFG dominance' },
		}), analystHeaders);
		expect(causalRes.status).toBe(200);

		const followRes = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({
			clientId: 'sess-viewer', type: HUD_EVENTS.FOLLOW_PEER_SESSION, followingClientId: 'sess-admin',
		}), viewerHeaders);
		expect(followRes.status).toBe(200);

		const reqFriend = await handleMetamodelApiRequest(API_ROUTES.COLLAB_FRIENDS, 'POST', JSON.stringify({ action: 'REQUEST', targetUserId: viewerUid }), analystHeaders);
		expect(reqFriend.status).toBe(200);
		expect(((reqFriend.payload as Record<string, unknown>).friendship as Record<string, unknown>).status).toBe('PENDING');

		const accFriend = await handleMetamodelApiRequest(API_ROUTES.COLLAB_FRIENDS, 'POST', JSON.stringify({ action: 'ACCEPT', targetUserId: analystUid }), viewerHeaders);
		expect(accFriend.status).toBe(200);
		expect(((accFriend.payload as Record<string, unknown>).friendship as Record<string, unknown>).status).toBe('ACCEPTED');

		const wsInvite = await handleMetamodelApiRequest(API_ROUTES.COLLAB_INVITES, 'POST', JSON.stringify({ action: 'SEND', toUserId: viewerUid, scopeKind: 'WORKSPACE', projectId: 1, clusterId: 'cluster-1' }), analystHeaders);
		expect(wsInvite.status).toBe(200);
		const fullInvite = await handleMetamodelApiRequest(API_ROUTES.COLLAB_INVITES, 'POST', JSON.stringify({ action: 'SEND', toUserId: viewerUid, scopeKind: 'FULL_APP', projectId: 1, clusterId: 'cluster-1' }), adminHeaders);
		expect(fullInvite.status).toBe(200);

		const overrideFriend = await handleMetamodelApiRequest(API_ROUTES.COLLAB_OVERRIDE, 'POST', JSON.stringify({ overrideAction: 'OVERRIDE_FRIEND_REQUEST', targetUserId: viewerUid }), adminHeaders);
		expect(overrideFriend.status).toBe(200);
		const overrideSummon = await handleMetamodelApiRequest(API_ROUTES.COLLAB_OVERRIDE, 'POST', JSON.stringify({ overrideAction: 'OVERRIDE_COLLAB_INVITE', targetUserId: viewerUid, scopeKind: 'FULL_APP', clusterId: 'cluster-1' }), adminHeaders);
		expect(overrideSummon.status).toBe(200);
		const overrideIntent = await handleMetamodelApiRequest(API_ROUTES.COLLAB_OVERRIDE, 'POST', JSON.stringify({ overrideAction: 'OVERRIDE_REMOTE_INTENT', targetUserId: analystUid, intent: { kind: 'SWITCH_PROJECTION', view: 'MERMAID' } }), adminHeaders);
		expect(overrideIntent.status).toBe(200);

		const upwardAttempt = await handleMetamodelApiRequest(API_ROUTES.COLLAB_OVERRIDE, 'POST', JSON.stringify({ overrideAction: 'OVERRIDE_COLLAB_INVITE', targetUserId: 1, scopeKind: 'FULL_APP' }), viewerHeaders);
		expect(upwardAttempt.status).toBe(403);
		expect((ROLE_MASKS[ROLE_IDS.AUDITOR] & CAPABILITY_BITS.COLLAB_OVERRIDE) !== 0).toBe(true);
		expect((ROLE_MASKS[ROLE_IDS.ADMIN] & CAPABILITY_BITS.COLLAB_OVERRIDE) !== 0).toBe(true);
		expect((ROLE_MASKS[ROLE_IDS.VIEWER] & CAPABILITY_BITS.COLLAB_OVERRIDE) !== 0).toBe(false);
	});

	test('2. verifies DEV_ACCOUNTS seeding, group weight resolution, and always-populated collab operator directory', async () => {
		const handle = createChronosDb();
		await ensureSeededOperatorAccount(handle, { DEVMODE: 'true' });
		expect(SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.length).toBe(4);
		const guestDir = await handleMetamodelApiRequest(API_ROUTES.COLLAB_FRIENDS, 'GET');
		expect(guestDir.status).toBe(200);
		expect(((guestDir.payload as Record<string, unknown>).operators as Array<Record<string, unknown>>).length).toBeGreaterThanOrEqual(4);
	});
});
