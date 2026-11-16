/**
 * @author Oblx <code@oblx.dev>
 * @description 3-Client WebSocket, Social Graph (Friendships & Scoped Invites), Dual-Plane Awareness/Causal Frames & Privileged RBAC Override QA Suite (v1.7.2).
 */
import { describe, expect, test } from 'bun:test';
import { API_ROUTES } from '@config/constants';
import { HUD_EVENTS } from '@config/hud.events';
import { CAPABILITY_BITS, ROLE_IDS, ROLE_MASKS } from '@config/security.constants';
import { handleMetamodelApiRequest } from '@server/http/router';
import { createChronosDb } from '@lib/db/client';
import { ensureSeededOperatorAccount } from '@lib/db/seed.operator';
import { SEEDED_OPERATOR_CONFIG } from '@config/security.constants';

describe('Chronos v1.7.3 Multi-Scope Collaboration, Social Graph & Privileged RBAC Override QA Suite', () => {
	test('1. verifies 3-client social graph (PENDING -> ACCEPTED), WORKSPACE/FULL_APP invites, Dual-Plane WS frames, and RBAC weight hierarchy overrides', async () => {
		// Ensure all dev accounts exist in the router's active DB by logging in or registering
		const loginAdmin = await handleMetamodelApiRequest(API_ROUTES.AUTH_LOGIN, 'POST', JSON.stringify({
			username: 'oblx', password: 'nopenope',
		}));
		expect(loginAdmin.status).toBe(200);
		const adminPayload = loginAdmin.payload as Record<string, unknown>;
		const adminToken = String(adminPayload.accessToken ?? '');
		const adminHeaders = { authorization: `Bearer ${adminToken}` };

		// Register or login analyst_collab (weight 50 via registration + role) and viewer_collab (weight 10)
		const regAnalyst = await handleMetamodelApiRequest(API_ROUTES.AUTH_REGISTER, 'POST', JSON.stringify({
			username: 'analyst_collab', password: 'AnalystPassword!123',
		}));
		expect(regAnalyst.status).toBe(200);
		const analystPayload = regAnalyst.payload as Record<string, unknown>;
		const analystToken = String(analystPayload.accessToken ?? '');
		const analystUser = analystPayload.user as Record<string, unknown>;
		const analystUid = Number(analystUser.uid);
		const analystHeaders = { authorization: `Bearer ${analystToken}` };

		const regViewer = await handleMetamodelApiRequest(API_ROUTES.AUTH_REGISTER, 'POST', JSON.stringify({
			username: 'viewer_collab', password: 'ViewerPassword!123',
		}));
		expect(regViewer.status).toBe(200);
		const viewerPayload = regViewer.payload as Record<string, unknown>;
		const viewerToken = String(viewerPayload.accessToken ?? '');
		const viewerUser = viewerPayload.user as Record<string, unknown>;
		const viewerUid = Number(viewerUser.uid);
		const viewerHeaders = { authorization: `Bearer ${viewerToken}` };

		// 1. Join all 3 clients into the WebSocket collaboration hub
		const joinAdmin = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({
			action: 'JOIN', clientId: 'sess-admin', sessionId: 'sess-admin', scopeKind: 'FULL_APP', clusterId: 'cluster-1',
		}), adminHeaders);
		expect(joinAdmin.status).toBe(200);

		const joinAnalyst = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({
			action: 'JOIN', clientId: 'sess-analyst', sessionId: 'sess-analyst', scopeKind: 'WORKSPACE', clusterId: 'cluster-1',
		}), analystHeaders);
		expect(joinAnalyst.status).toBe(200);

		const joinViewer = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({
			action: 'JOIN', clientId: 'sess-viewer', sessionId: 'sess-viewer', scopeKind: 'WORKSPACE', clusterId: 'cluster-1',
		}), viewerHeaders);
		expect(joinViewer.status).toBe(200);

		// 2. Broadcast AWARENESS_STATE_FRAME, CAUSAL_OP_FRAME, and FOLLOW_PEER_SESSION
		const awareRes = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({
			clientId: 'sess-analyst', type: HUD_EVENTS.AWARENESS_STATE_FRAME,
			cursorX: 420, cursorY: 310, worldX: 600, worldY: 450, normalizedX: 0.328, normalizedY: 0.43,
			scopeKind: 'FULL_APP', activeZone: 'WORLD_CANVAS', activeProjection: 'CONTROL_FLOW',
			activityStatus: 'STEPPING_CFG', caretLine: 42, caretCol: 8,
		}), analystHeaders);
		expect(awareRes.status).toBe(200);

		const causalRes = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({
			clientId: 'sess-analyst', type: HUD_EVENTS.CAUSAL_OP_FRAME,
			opKind: 'ENTITY_ANNOTATION_ADD', targetId: 1, payload: { note: 'Verified CFG dominance' },
		}), analystHeaders);
		expect(causalRes.status).toBe(200);

		const followRes = await handleMetamodelApiRequest(API_ROUTES.WS_COLLAB, 'POST', JSON.stringify({
			clientId: 'sess-viewer', type: HUD_EVENTS.FOLLOW_PEER_SESSION, followingClientId: 'sess-admin',
		}), viewerHeaders);
		expect(followRes.status).toBe(200);

		// 3. Friend Request lifecycle (PENDING -> ACCEPTED) between analyst and viewer
		const reqFriend = await handleMetamodelApiRequest(API_ROUTES.COLLAB_FRIENDS, 'POST', JSON.stringify({
			action: 'REQUEST', targetUserId: viewerUid,
		}), analystHeaders);
		expect(reqFriend.status).toBe(200);
		const fship1 = (reqFriend.payload as Record<string, unknown>).friendship as Record<string, unknown>;
		expect(fship1.status).toBe('PENDING');
		expect(Number(fship1.userLowId)).toBeLessThan(Number(fship1.userHighId));

		const accFriend = await handleMetamodelApiRequest(API_ROUTES.COLLAB_FRIENDS, 'POST', JSON.stringify({
			action: 'ACCEPT', targetUserId: analystUid,
		}), viewerHeaders);
		expect(accFriend.status).toBe(200);
		const fship2 = (accFriend.payload as Record<string, unknown>).friendship as Record<string, unknown>;
		expect(fship2.status).toBe('ACCEPTED');

		// 4. Scoped Collaboration Invites (WORKSPACE and FULL_APP)
		const wsInvite = await handleMetamodelApiRequest(API_ROUTES.COLLAB_INVITES, 'POST', JSON.stringify({
			action: 'SEND', toUserId: viewerUid, scopeKind: 'WORKSPACE', projectId: 1, clusterId: 'cluster-1',
		}), analystHeaders);
		expect(wsInvite.status).toBe(200);
		expect(((wsInvite.payload as Record<string, unknown>).invite as Record<string, unknown>).scopeKind).toBe('WORKSPACE');

		const fullInvite = await handleMetamodelApiRequest(API_ROUTES.COLLAB_INVITES, 'POST', JSON.stringify({
			action: 'SEND', toUserId: viewerUid, scopeKind: 'FULL_APP', projectId: 1, clusterId: 'cluster-1',
		}), adminHeaders);
		expect(fullInvite.status).toBe(200);
		expect(((fullInvite.payload as Record<string, unknown>).invite as Record<string, unknown>).scopeKind).toBe('FULL_APP');

		// 5. Privileged RBAC Overrides by Sovereign Admin 'oblx' (uid=1, weight=1000) -> 200 OK
		const overrideFriend = await handleMetamodelApiRequest(API_ROUTES.COLLAB_OVERRIDE, 'POST', JSON.stringify({
			overrideAction: 'OVERRIDE_FRIEND_REQUEST', targetUserId: viewerUid,
		}), adminHeaders);
		expect(overrideFriend.status).toBe(200);
		expect((overrideFriend.payload as Record<string, unknown>).overridden).toBe(true);

		const overrideSummon = await handleMetamodelApiRequest(API_ROUTES.COLLAB_OVERRIDE, 'POST', JSON.stringify({
			overrideAction: 'OVERRIDE_COLLAB_INVITE', targetUserId: viewerUid, scopeKind: 'FULL_APP', clusterId: 'cluster-1',
		}), adminHeaders);
		expect(overrideSummon.status).toBe(200);
		expect((overrideSummon.payload as Record<string, unknown>).overridden).toBe(true);

		const overrideIntent = await handleMetamodelApiRequest(API_ROUTES.COLLAB_OVERRIDE, 'POST', JSON.stringify({
			overrideAction: 'OVERRIDE_REMOTE_INTENT', targetUserId: analystUid,
			intent: { kind: 'SWITCH_PROJECTION', view: 'MERMAID' },
		}), adminHeaders);
		expect(overrideIntent.status).toBe(200);
		expect((overrideIntent.payload as Record<string, unknown>).overridden).toBe(true);

		// 6. Upward Override Attempt by viewer_collab (weight=10) against oblx (uid=1, weight=1000) -> 403 Forbidden
		const upwardAttempt = await handleMetamodelApiRequest(API_ROUTES.COLLAB_OVERRIDE, 'POST', JSON.stringify({
			overrideAction: 'OVERRIDE_COLLAB_INVITE', targetUserId: 1, scopeKind: 'FULL_APP',
		}), viewerHeaders);
		expect(upwardAttempt.status).toBe(403);
		expect(String((upwardAttempt.payload as Record<string, unknown>).error)).toContain('Privileged RBAC override denied');

		// 7. Verify COLLAB_OVERRIDE capability bit 25 is granted to AUDITOR and ADMIN
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
		const ops = (guestDir.payload as Record<string, unknown>).operators as Array<Record<string, unknown>>;
		expect(ops.length).toBeGreaterThanOrEqual(4);
	});
});
