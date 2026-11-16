/**
 * @author Oblx <code@oblx.dev>
 * @description Browser non-extractable ECDSA P-256 Guest Sovereign device keypair, Remember-Me cold-boot session restorer, and Guest-to-User promotion (v1.6.1).
 */
import { and, eq, inArray } from 'drizzle-orm';
import { INDEXEDDB_CONFIG } from '@config/env.schema';
import { PRINCIPAL_KINDS, ROLE_IDS, ROLE_MASKS, SYNC_POSTURES } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { workspaces } from '@lib/db/sqlite/schema/tables';
import { openChronosIndexedDb } from '@lib/db/indexeddb/mirror/idb.mirror';
import { fromBase64Url, toBase64Url, toHex } from '@lib/utils/log.sanitizer';
import { appendAuditEntry } from '@core/security/audit.chain';

const encoder = new TextEncoder();
const PERSISTENT_STORAGE_KEY = 'chronos_hud_session_v2';
const EPHEMERAL_STORAGE_KEY = 'chronos_ephemeral_session_v1';

export interface GuestDeviceIdentity { readonly guestId: string; readonly publicKeyJwk: JsonWebKey; readonly privateKey: CryptoKey; }
export interface SignedHudStateSnapshot {
	readonly id: 'hud_state'; readonly userId: string; readonly uid?: number; readonly username: string;
	readonly principalKind: string; readonly roleId: string; readonly effectiveMask: number;
	readonly rememberMe?: boolean; readonly accessToken?: string; readonly csrfToken?: string;
	readonly guestPublicKeyJwk: JsonWebKey; readonly issuedAt: number; readonly signatureB64: string;
}

let memoryIdentity: GuestDeviceIdentity | null = null;
let memoryHudState: SignedHudStateSnapshot | null = null;

async function idbGet<T>(key: string): Promise<T | null> {
	const db = await openChronosIndexedDb();
	if (!db) return null;
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(INDEXEDDB_CONFIG.STORES.SECURITY_IDENTITY, 'readonly');
			const req = tx.objectStore(INDEXEDDB_CONFIG.STORES.SECURITY_IDENTITY).get(key);
			req.onsuccess = () => { db.close(); resolve((req.result as T | undefined) ?? null); };
			req.onerror = () => { db.close(); resolve(null); };
		} catch { db.close(); resolve(null); }
	});
}

async function idbPut(value: Record<string, unknown>): Promise<void> {
	const db = await openChronosIndexedDb();
	if (!db) return;
	await new Promise<void>((resolve) => {
		try {
			const tx = db.transaction(INDEXEDDB_CONFIG.STORES.SECURITY_IDENTITY, 'readwrite');
			tx.objectStore(INDEXEDDB_CONFIG.STORES.SECURITY_IDENTITY).put(value);
			tx.oncomplete = () => { db.close(); resolve(); };
			tx.onerror = () => { db.close(); resolve(); };
		} catch { db.close(); resolve(); }
	});
}

export async function ensureGuestDeviceIdentity(): Promise<GuestDeviceIdentity> {
	if (memoryIdentity) return memoryIdentity;
	const stored = await idbGet<GuestDeviceIdentity & { id: string }>('guest_keypair');
	if (stored?.privateKey && stored.publicKeyJwk && stored.guestId) {
		memoryIdentity = { guestId: stored.guestId, publicKeyJwk: stored.publicKeyJwk, privateKey: stored.privateKey };
		return memoryIdentity;
	}
	const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
	const publicKeyJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
	const thumbDigest = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(publicKeyJwk)));
	const guestId = `guest-${toHex(new Uint8Array(thumbDigest)).slice(0, 12)}`;
	memoryIdentity = { guestId, publicKeyJwk, privateKey: pair.privateKey };
	await idbPut({ id: 'guest_keypair', ...memoryIdentity });
	return memoryIdentity;
}

export async function signGuestManifest(privateKey: CryptoKey, manifest: Record<string, unknown>): Promise<string> {
	const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoder.encode(JSON.stringify(manifest)));
	return toBase64Url(new Uint8Array(sig));
}

export async function verifyGuestManifestSignature(publicKeyJwk: JsonWebKey, manifest: Record<string, unknown>, signatureB64: string): Promise<boolean> {
	const key = await crypto.subtle.importKey('jwk', publicKeyJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
	return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, new Uint8Array(fromBase64Url(signatureB64)), encoder.encode(JSON.stringify(manifest)));
}

export async function persistSignedHudState(
	identity: GuestDeviceIdentity,
	state: { readonly userId: string; readonly uid?: number; readonly username: string; readonly principalKind: string; readonly roleId: string; readonly effectiveMask: number; readonly rememberMe?: boolean; readonly accessToken?: string; readonly csrfToken?: string }
): Promise<SignedHudStateSnapshot> {
	const issuedAt = Date.now(), manifest = { userId: state.userId, username: state.username, principalKind: state.principalKind, roleId: state.roleId, effectiveMask: state.effectiveMask, issuedAt };
	const signatureB64 = await signGuestManifest(identity.privateKey, manifest);
	const record: SignedHudStateSnapshot = { id: 'hud_state', ...state, issuedAt, guestPublicKeyJwk: identity.publicKeyJwk, signatureB64 };
	memoryHudState = record;
	try {
		if (state.rememberMe === false && state.principalKind !== PRINCIPAL_KINDS.GUEST) {
			if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(EPHEMERAL_STORAGE_KEY, JSON.stringify(record));
			if (typeof localStorage !== 'undefined') localStorage.removeItem(PERSISTENT_STORAGE_KEY);
		} else {
			if (typeof localStorage !== 'undefined') localStorage.setItem(PERSISTENT_STORAGE_KEY, JSON.stringify(record));
			if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(EPHEMERAL_STORAGE_KEY);
			await idbPut(record as unknown as Record<string, unknown>);
		}
	} catch {}
	return record;
}

export async function clearPersistedHudSession(): Promise<void> {
	memoryHudState = null;
	try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(EPHEMERAL_STORAGE_KEY); if (typeof localStorage !== 'undefined') localStorage.removeItem(PERSISTENT_STORAGE_KEY); } catch {}
}

export function hasSavedSessionIndicator(): boolean {
	try {
		if (typeof document !== 'undefined' && document.cookie.includes('chronos')) return true;
		if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(EPHEMERAL_STORAGE_KEY)) return true;
		if (typeof localStorage !== 'undefined' && localStorage.getItem(PERSISTENT_STORAGE_KEY)) return true;
	} catch {}
	return false;
}

export async function restoreVerifiedSession(): Promise<{
	readonly userId: string; readonly uid: number; readonly username: string; readonly principalKind: string;
	readonly roleId: string; readonly effectiveMask: number; readonly rememberMe: boolean;
	readonly accessToken: string; readonly csrfToken: string; readonly posture: string;
}> {
	const identity = await ensureGuestDeviceIdentity();
	let saved: SignedHudStateSnapshot | null = memoryHudState;
	try {
		const raw = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(EPHEMERAL_STORAGE_KEY)) || (typeof localStorage !== 'undefined' && localStorage.getItem(PERSISTENT_STORAGE_KEY));
		if (!saved && raw) saved = JSON.parse(raw) as SignedHudStateSnapshot;
	} catch {}
	if (!saved) saved = await idbGet<SignedHudStateSnapshot>('hud_state');
	if (saved?.signatureB64) {
		const valid = await verifyGuestManifestSignature(saved.guestPublicKeyJwk, { userId: saved.userId, username: saved.username, principalKind: saved.principalKind, roleId: saved.roleId, effectiveMask: saved.effectiveMask, issuedAt: saved.issuedAt }, saved.signatureB64);
		if (valid) return { userId: saved.userId, uid: saved.uid ?? (saved.principalKind === PRINCIPAL_KINDS.GUEST ? 0 : 1), username: saved.username, principalKind: saved.principalKind, roleId: saved.roleId, effectiveMask: saved.effectiveMask, rememberMe: Boolean(saved.rememberMe), accessToken: saved.accessToken ?? '', csrfToken: saved.csrfToken ?? '', posture: SYNC_POSTURES.OFFLINE_VERIFIED };
	}
	return { userId: identity.guestId, uid: 0, username: identity.guestId, principalKind: PRINCIPAL_KINDS.GUEST, roleId: ROLE_IDS.GUEST, effectiveMask: ROLE_MASKS.ROLE_GUEST, rememberMe: false, accessToken: '', csrfToken: '', posture: SYNC_POSTURES.OFFLINE_VERIFIED };
}

export async function promoteGuestWorkspaces(
	handle: ChronosDatabaseHandle,
	input: { readonly guestId: string; readonly userId: string; readonly workspaceIds: readonly string[]; readonly guestPublicKeyJwk: JsonWebKey; readonly signatureB64: string }
): Promise<{ readonly promotedCount: number }> {
	const ok = await verifyGuestManifestSignature(input.guestPublicKeyJwk, { guestId: input.guestId, workspaceIds: input.workspaceIds }, input.signatureB64);
	if (!ok) throw new Error('Invalid guest workspace promotion ECDSA proof.');
	const updated = input.workspaceIds.length > 0 ? handle.db.update(workspaces).set({ ownerId: input.userId }).where(and(inArray(workspaces.id, [...input.workspaceIds]), eq(workspaces.ownerId, input.guestId))).returning({ id: workspaces.id }).all() : [];
	await appendAuditEntry(handle, input.userId, 'GUEST_WORKSPACES_PROMOTED', 'INFO', `Promoted ${updated.length} workspace(s) from ${input.guestId}`);
	return { promotedCount: updated.length };
}
