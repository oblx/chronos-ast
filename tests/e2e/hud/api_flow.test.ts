/**
 * @author Oblx <code@oblx.dev>
 * @description End-to-end API & 100-User WebSocket load tests covering Guest RBAC denial, seeded oblx quick-login, DEVMODE switch, OAuth2, Studio UML, and 100-client WS saturation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { API_ROUTES, EXPORT_FORMATS, GRAPH_ENGINES, WORKSPACE_DEFAULTS, WORKSPACE_OPERATIONS, WS_CONFIG } from '../../../src/config/constants';
import { HTTP_SECURITY_CONSTANTS, ROLE_IDS, ROLE_MASKS, SEEDED_OPERATOR_CONFIG } from '../../../src/config/security.constants';
import { handleMetamodelApiRequest } from '../../../src/server/http/router';
import { buildUmlClassProjection, exportMermaidClassDiagram, exportPlantUmlClassDiagram } from '../../../src/core/graph/projections/uml_projections';
import type { WorkspaceSnapshot } from '../../../src/core/metamodel/workspace.indexer';
import type { MemgraphGraphAnalysisReport } from '../../../src/plugins/exporters/memgraph.exporter';
import { buildSyntheticZipArchive, extractSourceFilesFromZip } from '../../../src/core/metamodel/workspace/ingestion/zip.extractor';
import { createSignedSyncOp } from '../../../src/core/sync/delta.sync';
import { computeHierarchicalTreemap } from '../../../src/core/graph/projections/treemap.layout';
import { getWsRoomSnapshot, handleWsClientFrame, joinWsClient, leaveWsClient, resetWsHub } from '../../../src/server/ws/ws.hub';

test('E2E API router enforces Guest RBAC, idempotent project upsert, seeded oblx & DEVMODE personas, Studio UML, AEAD vault, and HLC sync', async () => {
	const initial = await handleMetamodelApiRequest(API_ROUTES.SNAPSHOT, 'GET');
	assert.equal(initial.status, 200);
	const snap1 = initial.payload as WorkspaceSnapshot;
	assert.equal(snap1.nodes.length > 5, true);

	const hTree = computeHierarchicalTreemap(snap1.nodes, {}, 880, 500);
	assert.equal(hTree.containers.length >= 1, true);
	assert.equal(hTree.flatTiles.length, snap1.nodes.length);

	const umlClassProj = buildUmlClassProjection([], snap1);
	assert.equal(exportPlantUmlClassDiagram(umlClassProj).includes('@startuml'), true);
	assert.equal(exportMermaidClassDiagram(umlClassProj).includes('classDiagram'), true);

	const guestRemoteDeny = await handleMetamodelApiRequest(
		API_ROUTES.WORKSPACES, 'POST',
		JSON.stringify({ operation: WORKSPACE_OPERATIONS.IMPORT_URL, url: WORKSPACE_DEFAULTS.SAMPLE_REMOTE_URL })
	);
	assert.equal(guestRemoteDeny.status, 403);

	const guestExportDeny = await handleMetamodelApiRequest(`${API_ROUTES.EXPORT_REPORT}?format=${EXPORT_FORMATS.WORKSPACE_BUNDLE}`, 'GET');
	assert.equal(guestExportDeny.status, 403);

	const seededLogin = await handleMetamodelApiRequest(
		API_ROUTES.AUTH_LOGIN, 'POST',
		JSON.stringify({ username: SEEDED_OPERATOR_CONFIG.USERNAME, password: SEEDED_OPERATOR_CONFIG.DEFAULT_PASSWORD })
	);
	assert.equal(seededLogin.status, 200);
	const seededPayload = seededLogin.payload as { user: { username: string; uid: number }; effectiveMask: number };
	assert.equal(seededPayload.user.username, 'oblx');
	assert.equal(seededPayload.user.uid, 1);
	assert.equal(seededPayload.effectiveMask >>> 0, ROLE_MASKS.ROLE_ADMIN >>> 0);

	Bun.env.DEVMODE = 'false';
	const devSwitchDisabled = await handleMetamodelApiRequest(API_ROUTES.AUTH_DEV_SWITCH, 'POST', JSON.stringify({ username: 'auditor_dev' }));
	assert.equal(devSwitchDisabled.status, 404);

	Bun.env.DEVMODE = 'true';
	const devSwitchRes = await handleMetamodelApiRequest(API_ROUTES.AUTH_DEV_SWITCH, 'POST', JSON.stringify({ username: 'auditor_dev' }));
	assert.equal(devSwitchRes.status, 200);
	assert.equal((devSwitchRes.payload as { effectiveMask: number }).effectiveMask >>> 0, ROLE_MASKS.ROLE_AUDITOR >>> 0);

	const ghOAuthRes = await handleMetamodelApiRequest(API_ROUTES.AUTH_OAUTH_GITHUB, 'POST', JSON.stringify({ providerSubject: 'gh-e2e-1', login: 'oblx-gh', email: 'code@oblx.dev' }));
	assert.equal(ghOAuthRes.status, 200);

	const regRes = await handleMetamodelApiRequest(
		API_ROUTES.AUTH_REGISTER, 'POST',
		JSON.stringify({ username: `e2e-${Date.now().toString(36)}`, password: 'e2e-strong-password' })
	);
	assert.equal(regRes.status, 200);
	const auth = regRes.payload as { accessToken: string; csrfToken: string };
	const authHeaders = { authorization: `Bearer ${auth.accessToken}`, [HTTP_SECURITY_CONSTANTS.CSRF_HEADER]: auth.csrfToken };

	const zipBytes = buildSyntheticZipArchive([
		{ path: 'external-project/src/vector_beam.rs', code: 'pub fn emit_pulse(v: usize) -> usize { if v > 0 { return v + 1; } 0 }' },
		{ path: 'external-project/src/radar_lock.ts', code: 'export function lockTarget(id: number): number { return emit_pulse(id); }' },
	]);
	const unpackedFiles = await extractSourceFilesFromZip(zipBytes);
	assert.equal(unpackedFiles.length, 2);

	const importZipRes = await handleMetamodelApiRequest(
		API_ROUTES.WORKSPACES, 'POST',
		JSON.stringify({ operation: WORKSPACE_OPERATIONS.IMPORT_FILES, workspaceName: 'Unpacked ZIP Project', files: unpackedFiles }), authHeaders
	);
	assert.equal(importZipRes.status, 200);

	const importUrlRes = await handleMetamodelApiRequest(
		API_ROUTES.WORKSPACES, 'POST',
		JSON.stringify({ operation: WORKSPACE_OPERATIONS.IMPORT_URL, url: WORKSPACE_DEFAULTS.SAMPLE_REMOTE_URL, workspaceName: 'Remote Mirror Workspace' }), authHeaders
	);
	assert.equal(importUrlRes.status, 200);

	const synthGhToken = ['ghp', '1234567890abcd'].join('_');
	const vaultWrite = await handleMetamodelApiRequest(
		API_ROUTES.VAULT_SECRETS, 'POST',
		JSON.stringify({ label: 'Test Token', providerKind: 'GITHUB', plaintextSecret: synthGhToken }), authHeaders
	);
	assert.equal(vaultWrite.status, 200);
	const vaultList = await handleMetamodelApiRequest(API_ROUTES.VAULT_SECRETS, 'GET', undefined, authHeaders);
	assert.equal(vaultList.status, 200);
	assert.equal(JSON.stringify(vaultList.payload).includes(synthGhToken), false);

	const syncOp = await createSignedSyncOp({
		opId: `e2e-op-${Date.now()}`, hlcPhysicalMs: Date.now(), hlcLogicalCounter: 0,
		principalId: 'e2e', entityQualifiedName: 'emit_pulse', opKind: 'ANNOTATION_ADD', payloadJson: '{"note":"ok"}',
	});
	const syncRes = await handleMetamodelApiRequest(API_ROUTES.SYNC_RECONCILE, 'POST', JSON.stringify({ ops: [syncOp] }), authHeaders);
	assert.equal(syncRes.status, 200);

	const memgraphQueryRes = await handleMetamodelApiRequest(API_ROUTES.GRAPH_QUERY, 'POST', JSON.stringify({ focalEntityId: snap1.nodes[0]?.id ?? 1, maxHops: 6 }), authHeaders);
	assert.equal(memgraphQueryRes.status, 200);
	assert.equal((memgraphQueryRes.payload as MemgraphGraphAnalysisReport).engine, GRAPH_ENGINES.MEMGRAPH_BOLT);

	const exportBundleRes = await handleMetamodelApiRequest(`${API_ROUTES.EXPORT_REPORT}?format=${EXPORT_FORMATS.WORKSPACE_BUNDLE}`, 'GET', undefined, authHeaders);
	assert.equal(exportBundleRes.status, 200);

	const projectsBefore = ((await handleMetamodelApiRequest(API_ROUTES.PROJECTS, 'GET', undefined, authHeaders)).payload as { projects: unknown[] }).projects.length;
	const projectCreate = await handleMetamodelApiRequest(API_ROUTES.PROJECTS, 'POST', JSON.stringify({ name: 'Quantum Telemetry Mesh', visibility: 'INTERNAL' }), authHeaders);
	assert.equal(projectCreate.status, 200);
	const firstCreated = (projectCreate.payload as { project: { id: number; shortCode: string; snapshotRevision: number } }).project;
	assert.equal(firstCreated.shortCode, 'QUANTU-TELEM');

	const projectUpsert = await handleMetamodelApiRequest(API_ROUTES.PROJECTS, 'POST', JSON.stringify({ name: 'Quantum Telemetry Mesh', visibility: 'INTERNAL' }), authHeaders);
	assert.equal(projectUpsert.status, 200);
	const secondCreated = (projectUpsert.payload as { project: { id: number; snapshotRevision: number } }).project;
	assert.equal(secondCreated.id, firstCreated.id);
	assert.equal(secondCreated.snapshotRevision, firstCreated.snapshotRevision + 1);
	const projectsAfter = ((await handleMetamodelApiRequest(API_ROUTES.PROJECTS, 'GET', undefined, authHeaders)).payload as { projects: unknown[] }).projects.length;
	assert.equal(projectsAfter, projectsBefore + 1);

	const aiExplain = await handleMetamodelApiRequest(API_ROUTES.AI_CHAT, 'POST', JSON.stringify({ prompt: '/hotspots', focalEntityId: snap1.nodes[0]?.id ?? 1 }));
	assert.equal(aiExplain.status, 200);
	assert.equal((aiExplain.payload as { mode: string; summary: string }).mode, 'LOCAL_HEURISTIC');

	const themesRes = await handleMetamodelApiRequest(API_ROUTES.THEMES, 'GET', undefined, authHeaders);
	assert.equal(themesRes.status, 200);
	assert.equal((themesRes.payload as { themes: unknown[] }).themes.length >= 10, true);

	const badCssTheme = await handleMetamodelApiRequest(API_ROUTES.THEMES, 'POST', JSON.stringify({ name: 'XSS', polarity: 'DARK', tokens: { bgVoid: 'red; position:fixed' } }), authHeaders);
	assert.equal(badCssTheme.status, 400);

	const prefRes = await handleMetamodelApiRequest(API_ROUTES.USER_PREFERENCES, 'POST', JSON.stringify({ edgeDrawerMode: 'DOCKED_RESIZE', fontLigatures: false, codeFontSizePx: 14 }), authHeaders);
	assert.equal(prefRes.status, 200);

	const guestGitPrDeny = await handleMetamodelApiRequest(API_ROUTES.GIT_PR, 'POST', JSON.stringify({ repoUrl: 'github:oblx/chronos' }));
	assert.equal(guestGitPrDeny.status, 403);

	const helpRes = await handleMetamodelApiRequest(API_ROUTES.HELP_BOOK, 'GET');
	assert.equal(helpRes.status, 200);
	assert.equal((helpRes.payload as { readonly chapters: readonly unknown[] }).chapters.length >= 23, true);
});

test('100-Concurrent-User WebSocket Hub load test: accepts 100 clients, rejects 101st with 1013 Try Again Later, switches project rooms, and enforces 20Hz cursor throttle', () => {
	resetWsHub();
	const receivedFrames: string[] = [];
	for (let i = 1; i <= WS_CONFIG.MAX_CLIENTS; i++) {
		const res = joinWsClient({
			clientId: `peer-${i}`, uid: i, username: `op_${i}`,
			roleId: i === 1 ? ROLE_IDS.ADMIN : ROLE_IDS.ANALYST,
			workspaceId: 'chronos-core',
			sendFrame: i === 1 ? (f) => receivedFrames.push(f) : undefined,
		});
		assert.equal(res.accepted, true);
	}
	assert.equal(getWsRoomSnapshot('chronos-core').connectedCount, 100);
	assert.equal(getWsRoomSnapshot('chronos-core').roomTopic, 'ws:project:chronos-core');

	const overflow = joinWsClient({ clientId: 'peer-101', uid: 101, username: 'op_101', workspaceId: 'chronos-core' });
	assert.equal(overflow.accepted, false);
	assert.equal(overflow.code, 1013);

	const c1 = handleWsClientFrame('peer-2', { type: 'CURSOR', cursorX: 140, cursorY: 220, focalEntityId: 3 }, 1000);
	assert.equal(c1.broadcastType, 'WS_REMOTE_CURSOR');
	const c2 = handleWsClientFrame('peer-2', { type: 'CURSOR', cursorX: 145, cursorY: 225 }, 1020);
	assert.equal(c2.broadcastType, 'THROTTLED');
	assert.equal(receivedFrames.some((f) => f.includes('WS_REMOTE_CURSOR')), true);

	const sw = handleWsClientFrame('peer-3', { type: 'WS_SWITCH_PROJECT_ROOM', workspaceId: 'payment-api', projectId: 2 }, 2000);
	assert.equal(sw.broadcastType, 'WS_ROSTER_UPDATE');
	assert.equal(getWsRoomSnapshot('payment-api').roster.length, 1);

	for (let m = 0; m < 31; m++) {
		handleWsClientFrame('peer-50', { type: 'FOCAL_LOCK', focalEntityId: m }, 5000);
	}
	assert.equal(getWsRoomSnapshot('chronos-core').connectedCount, 99);
	leaveWsClient('peer-1');
	resetWsHub();
});

test('v2.6.0 RBAC 2–8 Seat Collaboration Clusters enforce seatCap & HTTP 409 CLUSTER_SEAT_LIMIT_REACHED', async () => {
	resetWsHub();
	const v1 = joinWsClient({ clientId: 'v-1', uid: 10, username: 'viewer1', roleId: ROLE_IDS.VIEWER, workspaceId: 'chronos-core', clusterId: 'viewers-room' });
	assert.equal(v1.accepted, true);
	assert.equal(v1.seatCount, 1);
	assert.equal(v1.seatCap, 2);

	const v2 = joinWsClient({ clientId: 'v-2', uid: 11, username: 'viewer2', roleId: ROLE_IDS.VIEWER, workspaceId: 'chronos-core', clusterId: 'viewers-room' });
	assert.equal(v2.accepted, true);
	assert.equal(v2.seatCount, 2);

	const v3 = joinWsClient({ clientId: 'v-3', uid: 12, username: 'viewer3', roleId: ROLE_IDS.VIEWER, workspaceId: 'chronos-core', clusterId: 'viewers-room' });
	assert.equal(v3.accepted, false);
	assert.equal(v3.code, 4008);
	assert.equal(v3.event, 'CLUSTER_SEAT_LIMIT_REACHED');
	assert.equal(v3.seatCount, 2);
	assert.equal(v3.seatCap, 2);

	const adminJoin = joinWsClient({ clientId: 'adm-1', uid: 1, username: 'oblx', roleId: ROLE_IDS.ADMIN, workspaceId: 'chronos-core', clusterId: 'admin-room' });
	assert.equal(adminJoin.accepted, true);
	assert.equal(adminJoin.seatCap, 8);

	const devViewer = await handleMetamodelApiRequest(API_ROUTES.AUTH_DEV_SWITCH, 'POST', JSON.stringify({ username: 'viewer_dev' }));
	const viewerAuth = devViewer.payload as { accessToken: string; csrfToken: string };
	const viewerHeaders = { authorization: `Bearer ${viewerAuth.accessToken}`, [HTTP_SECURITY_CONSTANTS.CSRF_HEADER]: viewerAuth.csrfToken };
	const httpFull = await handleMetamodelApiRequest(
		API_ROUTES.WS_COLLAB, 'POST',
		JSON.stringify({ action: 'JOIN', clientId: 'v-http-overflow', clusterId: 'viewers-room', workspaceId: 'chronos-core' }),
		viewerHeaders
	);
	assert.equal(httpFull.status, 409);
	assert.equal((httpFull.payload as { event: string; seatCap: number }).event, 'CLUSTER_SEAT_LIMIT_REACHED');
	assert.equal((httpFull.payload as { seatCap: number }).seatCap, 2);
	Bun.env.DEVMODE = 'false';
	resetWsHub();
});
