/**
 * @author Oblx <code@oblx.dev>
 * @description Write-only AEAD Secrets Vault API routes and HLC Offline Sync reconciliation endpoint.
 */
import { and, eq } from 'drizzle-orm';
import { API_ROUTES, HTTP_STATUS } from '@config/constants';
import { CAPABILITY_BITS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { secretsVault } from '@lib/db/sqlite/schema/tables';
import { appendAuditEntry } from '@core/security/audit.chain';
import { encryptVaultSecret, toVaultSecretMetadata } from '@core/security/vault.crypto';
import { reconcileHlcDeltas, type SignedSyncOp } from '@core/sync/delta.sync';
import { getClusterSnapshot, getWsRoomSnapshot, handleWsClientFrame, joinWsClient, leaveWsClient, type WsInboundFrame } from '@server/ws/ws.hub';
import { badRequestResponse, okResponse, parseBodyObject, runCapabilityRoute, type ApiResponseEnvelope, type RequestPrincipal } from './middleware';

async function handleVaultPost(handle: ChronosDatabaseHandle, bodyText: string | undefined, headers: Record<string, string>, principal: RequestPrincipal): Promise<ApiResponseEnvelope> {
	return runCapabilityRoute(principal, 'POST', headers, CAPABILITY_BITS.VAULT_SECRET_WRITE, true, async () => {
	const body = parseBodyObject(bodyText);
	const label = String(body.label ?? '').trim(), plaintextSecret = String(body.plaintextSecret ?? '').trim(), providerKind = String(body.providerKind ?? 'CUSTOM_TOKEN').trim();
	if (!label || !plaintextSecret) return badRequestResponse('Both label and plaintextSecret are required.');
	const secretId = `sec-${crypto.randomUUID().slice(0, 12)}`;
	const encrypted = await encryptVaultSecret({ ownerId: principal.userId, secretId, plaintextSecret, keyVersion: 1 });
	const row = handle.db.insert(secretsVault).values({ id: secretId, ownerId: principal.userId, label, providerKind, ciphertextB64: encrypted.ciphertextB64, ivB64: encrypted.ivB64, lastFourChars: encrypted.lastFourChars, keyVersion: encrypted.keyVersion, rotatedAt: Date.now() }).returning().get();
	await appendAuditEntry(handle, principal.userId, 'VAULT_SECRET_STORED', 'INFO', `Stored AEAD vault secret ${label} (*${encrypted.lastFourChars})`);
	return okResponse({ secret: toVaultSecretMetadata(row) });
	});
}

async function handleVaultDelete(handle: ChronosDatabaseHandle, urlPath: string, bodyText: string | undefined, headers: Record<string, string>, principal: RequestPrincipal): Promise<ApiResponseEnvelope> {
	return runCapabilityRoute(principal, 'DELETE', headers, CAPABILITY_BITS.VAULT_SECRET_WRITE, true, async () => {
	const queryId = new URL(`http://chronos${urlPath}`).searchParams.get('id');
	const body = parseBodyObject(bodyText);
	const secretId = queryId ?? String(body.secretId ?? '');
	if (!secretId) return badRequestResponse('secretId is required.');
	handle.db.delete(secretsVault).where(and(eq(secretsVault.id, secretId), eq(secretsVault.ownerId, principal.userId))).run();
	await appendAuditEntry(handle, principal.userId, 'VAULT_SECRET_DELETED', 'WARN', `Deleted vault secret ${secretId}`);
	return okResponse({ deletedId: secretId });
	});
}

function handleWsCollabHttp(urlPath: string, method: string, bodyText: string | undefined, principal: RequestPrincipal): ApiResponseEnvelope {
	const params = new URL(`http://chronos${urlPath}`).searchParams;
	const wsQuery = params.get('workspaceId') ?? 'chronos-core';
	const clusterQuery = params.get('clusterId') ?? undefined;
	if (method === 'GET') return okResponse({ ...getWsRoomSnapshot(wsQuery), ...(clusterQuery ? { cluster: getClusterSnapshot(clusterQuery) } : {}) });
	const body = parseBodyObject(bodyText);
	const action = String(body.action ?? 'JOIN');
	const clientId = String(body.clientId ?? principal.sid ?? 'guest-client');
	const workspaceId = String(body.workspaceId ?? wsQuery);
	const clusterId = typeof body.clusterId === 'string' && body.clusterId.trim() ? body.clusterId.trim() : clusterQuery;
	if (action === 'LEAVE') {
		leaveWsClient(clientId);
		return okResponse(getWsRoomSnapshot(workspaceId));
	}
	if (action === 'JOIN') {
		const joined = joinWsClient({
			clientId, sessionId: typeof body.sessionId === 'string' ? body.sessionId : clientId,
			uid: principal.uid, username: String(body.username ?? principal.username ?? principal.userId),
			roleId: principal.roleId, effectiveMask: principal.effectiveMask, workspaceId, clusterId,
			scopeKind: body.scopeKind === 'FULL_APP' ? 'FULL_APP' : 'WORKSPACE',
			focalEntityId: body.focalEntityId !== undefined ? Number(body.focalEntityId) : null,
		});
		if (!joined.accepted) {
			const status = joined.code === 4008 ? 409 : 503;
			return { status, payload: { error: joined.reason, code: joined.code, event: joined.event, seatCount: joined.seatCount, seatCap: joined.seatCap } };
		}
		return okResponse({ ...getWsRoomSnapshot(workspaceId), clientId, ...(clusterId ? { cluster: getClusterSnapshot(clusterId) } : {}) });
	}
	const frameRes = handleWsClientFrame(clientId, body as unknown as WsInboundFrame);
	if (!frameRes.ok) return { status: frameRes.code === 403 ? HTTP_STATUS.FORBIDDEN : frameRes.code === 4008 ? 409 : HTTP_STATUS.BAD_REQUEST, payload: { error: frameRes.reason, code: frameRes.code } };
	return okResponse({ ...getWsRoomSnapshot(workspaceId), frameResult: frameRes, ...(clusterId ? { cluster: getClusterSnapshot(clusterId) } : {}) });
}

export async function handleVaultAndSyncRoutes(
	handle: ChronosDatabaseHandle, urlPath: string, method: string, bodyText: string | undefined, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	if (urlPath.startsWith(API_ROUTES.WS_COLLAB)) return handleWsCollabHttp(urlPath, method, bodyText, principal);
	if (urlPath.startsWith(API_ROUTES.VAULT_SECRETS) && method === 'GET') {
		return runCapabilityRoute(principal, method, headers, CAPABILITY_BITS.VAULT_SECRET_USE, false, () =>
			okResponse({ secrets: handle.db.select().from(secretsVault).where(eq(secretsVault.ownerId, principal.userId)).all().map(toVaultSecretMetadata) }));
	}
	if (urlPath.startsWith(API_ROUTES.VAULT_SECRETS) && method === 'POST') return handleVaultPost(handle, bodyText, headers, principal);
	if (urlPath.startsWith(API_ROUTES.VAULT_SECRETS) && method === 'DELETE') return handleVaultDelete(handle, urlPath, bodyText, headers, principal);
	if (urlPath.startsWith(API_ROUTES.SYNC_RECONCILE) && method === 'POST') {
		return runCapabilityRoute(principal, method, headers, CAPABILITY_BITS.SYNC_PUSH, true, async () => {
			const body = parseBodyObject<{ ops?: SignedSyncOp[] }>(bodyText);
			return okResponse(await reconcileHlcDeltas(handle, Array.isArray(body.ops) ? body.ops : []));
		});
	}
	return null;
}
