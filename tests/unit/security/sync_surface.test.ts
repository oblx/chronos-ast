/**
 * @author Oblx <code@oblx.dev>
 * @description Adversarial tests for Session replay detection, Guest P-256 promotion, HLC sync conflicts, SSRF, Zip-Slip/Bombs, and JSON pollution.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PKZIP_CONSTANTS } from '../../../src/config/constants';
import { createChronosDb, closeChronosDb } from '../../../src/lib/db/sqlite/client/connection';
import { workspaces } from '../../../src/lib/db/sqlite/schema/tables';
import { eq } from 'drizzle-orm';
import { registerLocalUser } from '../../../src/plugins/auth/local.auth';
import { issueSessionPair, rotateRefreshSession, verifyCsrfHeader } from '../../../src/core/security/session.engine';
import { validateOutboundUrl } from '../../../src/core/security/guards/net.guard';
import { extractSourceFilesFromZip } from '../../../src/core/metamodel/workspace/ingestion/zip.extractor';
import { parseSafeJson, sanitizeTelemetryPayload } from '../../../src/lib/utils/log.sanitizer';
import { createSignedSyncOp, mergeHlc, reconcileHlcDeltas, tickHlc } from '../../../src/core/sync/delta.sync';
import { ensureGuestDeviceIdentity, promoteGuestWorkspaces, signGuestManifest } from '../../../src/core/sync/session.restorer';

test('Rotating refresh token replay revokes whole session family and CSRF validates bound sid', async () => {
	const handle = createChronosDb();
	try {
		const user = await registerLocalUser(handle, { username: 'eve', password: 'strong-password-9' });
		const pair1 = await issueSessionPair(handle, { id: user.userId, principalKind: user.principalKind, roleId: user.roleId, grantMask: 0, denyMask: 0 });
		assert.equal(await verifyCsrfHeader(pair1.sid, pair1.csrfToken), true);
		assert.equal(await verifyCsrfHeader(pair1.sid, 'tampered'), false);

		const rot1 = await rotateRefreshSession(handle, pair1.refreshToken);
		assert.equal(rot1?.replayed, false);
		assert.equal(rot1?.issued?.generation, 2);

		const replay = await rotateRefreshSession(handle, pair1.refreshToken);
		assert.equal(replay?.replayed, true);

		const afterRevoke = await rotateRefreshSession(handle, rot1!.issued!.refreshToken);
		assert.equal(afterRevoke?.replayed, true);
	} finally {
		closeChronosDb(handle);
	}
});

test('Guest ECDSA P-256 lossless workspace promotion & HLC causal conflict reconciler', async () => {
	const handle = createChronosDb();
	try {
		const guestIdObj = await ensureGuestDeviceIdentity();
		handle.db.insert(workspaces).values({
			id: 'ws-guest-1', ownerId: guestIdObj.guestId, name: 'Sandbox', updatedAt: Date.now(), indexedFilesCount: 1, sourceMapJson: '{}',
		}).run();
		const targetUser = await registerLocalUser(handle, { username: 'promoted-dev', password: 'password-9999' });
		const sig = await signGuestManifest(guestIdObj.privateKey, { guestId: guestIdObj.guestId, workspaceIds: ['ws-guest-1'] });
		const promoted = await promoteGuestWorkspaces(handle, {
			guestId: guestIdObj.guestId, userId: targetUser.userId, workspaceIds: ['ws-guest-1'],
			guestPublicKeyJwk: guestIdObj.publicKeyJwk, signatureB64: sig,
		});
		assert.equal(promoted.promotedCount, 1);
		assert.equal(handle.db.select().from(workspaces).where(eq(workspaces.id, 'ws-guest-1')).get()?.ownerId, targetUser.userId);

		const t1 = tickHlc({ physicalMs: 1000, logicalCounter: 0 }, 1000);
		const t2 = mergeHlc(t1, { physicalMs: 1005, logicalCounter: 3 }, 1002);
		assert.equal(t2.physicalMs >= 1005, true);

		const opA = await createSignedSyncOp({ opId: 'op-1', hlcPhysicalMs: 2000, hlcLogicalCounter: 0, principalId: 'u1', entityQualifiedName: 'foo::bar', opKind: 'ANNOTATION_ADD', payloadJson: '{"note":"waiver-A"}' });
		const opB = await createSignedSyncOp({ opId: 'op-2', hlcPhysicalMs: 2001, hlcLogicalCounter: 0, principalId: 'u2', entityQualifiedName: 'foo::bar', opKind: 'ANNOTATION_ADD', payloadJson: '{"note":"waiver-B"}' });
		const r1 = await reconcileHlcDeltas(handle, [opA, opB]);
		assert.equal(r1.appliedCount, 2);
		assert.deepEqual(r1.conflictOps, ['foo::bar']);

		const r2 = await reconcileHlcDeltas(handle, [opA]);
		assert.equal(r2.skippedCount, 1);
	} finally {
		closeChronosDb(handle);
	}
});

test('Attack surface guards: SSRF CIDRs, Zip-Slip/Bomb caps, JSON prototype pollution, and secret redaction', async () => {
	await assert.rejects(() => validateOutboundUrl('http://example.com/bundle.json'), /disallowed scheme/);
	await assert.rejects(() => validateOutboundUrl('https://169.254.169.254/latest/meta-data'), /private\/reserved/);
	await assert.rejects(() => validateOutboundUrl('https://127.0.0.1/secret'), /private\/reserved/);
	await assert.rejects(() => validateOutboundUrl('https://[::1]/local'), /private\/reserved/);
	await assert.rejects(() => validateOutboundUrl('https://10.0.0.5/internal'), /private\/reserved/);

	const makeMaliciousZip = (entryName: string, uncompSize: number, payloadLen: number): Uint8Array => {
		const nameBytes = new TextEncoder().encode(entryName);
		const buf = new Uint8Array(PKZIP_CONSTANTS.HEADER_FIXED_SIZE + nameBytes.byteLength + payloadLen);
		const v = new DataView(buf.buffer);
		v.setUint32(0, PKZIP_CONSTANTS.LOCAL_FILE_HEADER_SIG, true);
		v.setUint16(PKZIP_CONSTANTS.OFFSET_METHOD, PKZIP_CONSTANTS.METHOD_STORE, true);
		v.setUint32(PKZIP_CONSTANTS.OFFSET_COMPRESSED_SIZE, payloadLen, true);
		v.setUint32(PKZIP_CONSTANTS.OFFSET_UNCOMPRESSED_SIZE, uncompSize, true);
		v.setUint16(PKZIP_CONSTANTS.OFFSET_NAME_LEN, nameBytes.byteLength, true);
		buf.set(nameBytes, PKZIP_CONSTANTS.HEADER_FIXED_SIZE);
		return buf;
	};
	await assert.rejects(() => extractSourceFilesFromZip(makeMaliciousZip('../evil.ts', 5, 5)), /Zip-Slip|traversal/);
	await assert.rejects(() => extractSourceFilesFromZip(makeMaliciousZip('src/bomb.ts', 999999, 10)), /ratio exceeded/);

	const clean = parseSafeJson<Record<string, unknown>>('{"__proto__":{"polluted":true},"ok":42}');
	assert.equal(Object.prototype.hasOwnProperty.call(clean, '__proto__'), false);
	assert.equal(({} as { polluted?: boolean }).polluted, undefined);
	assert.equal(clean.ok, 42);

	const synthPat = ['chr', 'live', 'abcd1234'].join('_');
	const redacted = sanitizeTelemetryPayload(`Authorization: Bearer secretJwt123 token=${synthPat} https://user:pass@host/repo`);
	assert.equal(redacted.includes('secretJwt123'), false);
	assert.equal(redacted.includes(synthPat), false);
	assert.equal(redacted.includes('pass@'), false);
});

test('SQLite PRAGMA tuning on open/close and WS backpressure guard drops volatile cursors only', async () => {
	const { WS_CONFIG } = await import('../../../src/config/constants');
	const { ROLE_IDS, ROLE_MASKS } = await import('../../../src/config/security.constants');
	const { joinWsClient, handleWsClientFrame, resetWsHub } = await import('../../../src/server/ws/ws.hub');
	const handle = createChronosDb();
	try {
		const busy = handle.sqlite.query('PRAGMA busy_timeout;').get() as { timeout?: number; busy_timeout?: number };
		const tempStore = handle.sqlite.query('PRAGMA temp_store;').get() as { temp_store?: number };
		assert.equal(busy.timeout ?? busy.busy_timeout, 3000);
		assert.equal(tempStore.temp_store, 2);
	} finally {
		closeChronosDb(handle);
	}

	resetWsHub();
	const fastFrames: string[] = [];
	const slowFrames: string[] = [];
	joinWsClient({ clientId: 'fast-c', uid: 1, username: 'oblx', roleId: ROLE_IDS.ADMIN, effectiveMask: ROLE_MASKS.ROLE_ADMIN, workspaceId: 'ws-bp', sendFrame: (p) => fastFrames.push(p), getBufferedAmount: () => 0 });
	joinWsClient({ clientId: 'slow-c', uid: 2, username: 'slow', roleId: ROLE_IDS.ADMIN, effectiveMask: ROLE_MASKS.ROLE_ADMIN, workspaceId: 'ws-bp', sendFrame: (p) => slowFrames.push(p), getBufferedAmount: () => WS_CONFIG.MAX_BUFFERED_BYTES + 1024 });
	fastFrames.length = 0; slowFrames.length = 0;

	handleWsClientFrame('fast-c', { type: 'CURSOR', cursorX: 120, cursorY: 80, focalEntityId: 1 });
	assert.equal(slowFrames.some((f) => f.includes('WS_REMOTE_CURSOR')), false);

	handleWsClientFrame('fast-c', { type: 'ANNOTATION', entityId: 1, note: 'Critical audit marker' });
	assert.equal(slowFrames.some((f) => f.includes('WS_REMOTE_ANNOTATION')), true);
	resetWsHub();
});

