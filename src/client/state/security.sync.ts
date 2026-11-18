/**
 * @author Oblx <code@oblx.dev>
 * @description Pure offline sync queue, guest P-256 promotion, and signed HUD state helpers for securityWire (v1.6.1).
 */
import { API_ROUTES } from '@config/constants';
import { clearQueuedSyncOps, createSignedSyncOp, getQueuedSyncOps, queueOfflineSyncOp, tickHlc, type HlcTimestamp } from '@core/sync/delta.sync';
import { ensureGuestDeviceIdentity, persistSignedHudState, signGuestManifest, type GuestDeviceIdentity } from '@core/sync/session.restorer';

export interface HudIdentitySnapshot {
	readonly userId: string;
	readonly uid?: number;
	readonly username: string;
	readonly principalKind: string;
	readonly roleId: string;
	readonly effectiveMask: number;
	readonly rememberMe?: boolean;
	readonly accessToken?: string;
	readonly csrfToken?: string;
}

export async function saveSignedHudIdentity(identity: GuestDeviceIdentity | null, state: HudIdentitySnapshot): Promise<GuestDeviceIdentity> {
	const id = identity ?? (await ensureGuestDeviceIdentity());
	await persistSignedHudState(id, state);
	return id;
}

export async function pushGuestWorkspacePromotion(
	identity: GuestDeviceIdentity | null,
	headers: Record<string, string>,
	workspaceIds: readonly string[]
): Promise<{ identity: GuestDeviceIdentity; promotedCount: number; error?: string }> {
	const id = identity ?? (await ensureGuestDeviceIdentity());
	const manifest = { guestId: id.guestId, workspaceIds };
	const signatureB64 = await signGuestManifest(id.privateKey, manifest);
	const res = await fetch(API_ROUTES.AUTH_PROMOTE, {
		method: 'POST',
		headers,
		body: JSON.stringify({ ...manifest, guestPublicKeyJwk: id.publicKeyJwk, signatureB64 }),
	});
	const data = await res.json();
	if (!res.ok) return { identity: id, promotedCount: 0, error: data.error ?? 'Promotion failed' };
	return { identity: id, promotedCount: Number(data.promotedCount ?? 0) };
}

export async function enqueueSignedAnnotationDelta(
	hlc: HlcTimestamp,
	principalId: string,
	entityQualifiedName: string,
	payload: Record<string, unknown>
): Promise<{ nextHlc: HlcTimestamp; queuedOpsCount: number }> {
	const nextHlc = tickHlc(hlc);
	const op = await createSignedSyncOp({
		opId: `op-${crypto.randomUUID().slice(0, 12)}`,
		hlcPhysicalMs: nextHlc.physicalMs,
		hlcLogicalCounter: nextHlc.logicalCounter,
		principalId,
		entityQualifiedName,
		opKind: 'ANNOTATION_ADD',
		payloadJson: JSON.stringify(payload),
	});
	await queueOfflineSyncOp(op);
	return { nextHlc, queuedOpsCount: (await getQueuedSyncOps()).length };
}

export async function pushQueuedSyncOps(headers: Record<string, string>): Promise<{
	appliedCount: number;
	conflictEntities: readonly string[];
	queuedOpsCount: number;
	error?: string;
}> {
	const ops = await getQueuedSyncOps();
	if (ops.length === 0) return { appliedCount: 0, conflictEntities: [], queuedOpsCount: 0 };
	const res = await fetch(API_ROUTES.SYNC_RECONCILE, { method: 'POST', headers, body: JSON.stringify({ ops }) });
	const data = await res.json();
	if (!res.ok) return { appliedCount: 0, conflictEntities: [], queuedOpsCount: ops.length, error: data.error ?? 'Sync reconcile failed' };
	await clearQueuedSyncOps(ops.map((o) => o.opId));
	return {
		appliedCount: Number(data.appliedCount ?? 0),
		conflictEntities: Array.isArray(data.conflictOps) ? data.conflictOps : [],
		queuedOpsCount: 0,
	};
}

export function resolveOfflineDemoUser(body: Record<string, unknown>, config: { readonly USERNAME: string; readonly LEGACY_USERNAME: string; readonly USER_ID: string; readonly UID: number; readonly OFFLINE_ROLE_ID: string; readonly OFFLINE_MASK: number }) {
	const uName = String(body.username ?? '').trim().toLowerCase();
	if (uName !== config.USERNAME && uName !== config.LEGACY_USERNAME) return null;
	return { userId: config.USER_ID, uid: config.UID, username: config.USERNAME, roleId: config.OFFLINE_ROLE_ID, effectiveMask: config.OFFLINE_MASK };
}

export async function mintScopedPatToken(headers: Record<string, string>, label: string, scopedBitmask: number): Promise<{ rawToken: string; error?: string }> {
	const res = await fetch(API_ROUTES.AUTH_PAT, { method: 'POST', headers, body: JSON.stringify({ label: label.trim() || 'CI Token', scopedBitmask: scopedBitmask >>> 0, expiresInDays: 30 }) });
	const data = (await res.json()) as Record<string, unknown>;
	if (!res.ok) return { rawToken: '', error: String(data.error ?? 'PAT mint failed') };
	return { rawToken: String(data.rawToken ?? '') };
}

export async function fetchVaultSecretList<T>(headers: Record<string, string>): Promise<readonly T[] | null> {
	const res = await fetch(API_ROUTES.VAULT_SECRETS, { headers });
	if (!res.ok) return null;
	const data = (await res.json()) as { secrets?: readonly T[] };
	return Array.isArray(data.secrets) ? data.secrets : null;
}
