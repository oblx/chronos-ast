/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos Reactive Security & Sync Wire: Remember Me persistence, 3-Path Boot Decision Tree, Chronos u32 RBAC & Vault.
 */
import { API_ROUTES } from '@config/constants';
import { CAPABILITY_BITS, PRINCIPAL_KINDS, ROLE_IDS, ROLE_MASKS, SEEDED_OPERATOR_CONFIG, SYNC_POSTURES } from '@config/security.constants';
import { getQueuedSyncOps, type HlcTimestamp } from '@core/sync/delta.sync';
import { clearPersistedHudSession, restoreVerifiedSession, hasSavedSessionIndicator, type GuestDeviceIdentity } from '@core/sync/session.restorer';
import { hudWire } from './hud.wire.svelte';
import { enqueueSignedAnnotationDelta, fetchVaultSecretList, mintScopedPatToken, pushGuestWorkspacePromotion, pushQueuedSyncOps, resolveOfflineDemoUser, saveSignedHudIdentity } from './security.sync';

export interface MaskedVaultSecretItem { readonly secretId: string; readonly providerKind: string; readonly label: string; readonly lastFourChars: string; readonly keyVersion: number; readonly rotatedAt: number; }
export interface ActiveSessionDescriptor { readonly sid: string; readonly familyId: string; readonly scopedMask: number; readonly generation: number; readonly expiresAt: number; }

class ChronosSecurityWire {
	userId = $state<string>('guest'); uid = $state<number>(0); username = $state<string>('guest');
	principalKind = $state<string>(PRINCIPAL_KINDS.GUEST); roleId = $state<string>(ROLE_IDS.GUEST);
	effectiveMask = $state<number>(ROLE_MASKS.ROLE_GUEST); syncPosture = $state<string>(SYNC_POSTURES.OFFLINE_VERIFIED);
	lockdownActive = $state<boolean>(false); devMode = $state<boolean>(false); rememberMe = $state<boolean>(true);
	accessToken = $state<string>(''); csrfToken = $state<string>(''); lastMintedPat = $state<string>('');
	sessions = $state<readonly ActiveSessionDescriptor[]>([]); vaultSecrets = $state<readonly MaskedVaultSecretItem[]>([]);
	queuedOpsCount = $state<number>(0); conflictEntities = $state<readonly string[]>([]);
	auditChainValid = $state<boolean>(true); auditRowCount = $state<number>(0);
	lastError = $state<string>(''); requiredNodePrompt = $state<string>('');
	hlc = $state<HlcTimestamp>({ physicalMs: Date.now(), logicalCounter: 0 });
	private guestIdentity: GuestDeviceIdentity | null = null;

	can(bit: number): boolean { return ((this.effectiveMask >>> 0) & (bit >>> 0)) === (bit >>> 0); }
	requireCapabilityOrPrompt(bit: number, nodeKey = 'chronos.studio.access'): boolean { if (this.can(bit)) return true; this.requiredNodePrompt = nodeKey; return false; }
	maskHex(): string { return `0x${(this.effectiveMask >>> 0).toString(16).toUpperCase().padStart(8, '0')}`; }
	buildHeaders(extra?: Record<string, string>): Record<string, string> {
		const h: Record<string, string> = { 'content-type': 'application/json', ...(extra ?? {}) };
		if (this.accessToken) h.authorization = `Bearer ${this.accessToken}`;
		if (this.csrfToken) h['x-chronos-csrf'] = this.csrfToken;
		return h;
	}

	private applyGuestState(guestName?: string): void {
		const fallbackId = guestName ?? (this.guestIdentity?.guestId ?? 'guest');
		this.userId = fallbackId; this.uid = 0; this.username = fallbackId;
		this.principalKind = PRINCIPAL_KINDS.GUEST; this.roleId = ROLE_IDS.GUEST;
		this.effectiveMask = ROLE_MASKS.ROLE_GUEST; this.accessToken = ''; this.csrfToken = ''; this.lastMintedPat = '';
		this.sessions = []; this.vaultSecrets = []; this.requiredNodePrompt = '';
	}

	async bootstrapIdentity(): Promise<void> {
		try {
			const restored = await restoreVerifiedSession();
			this.queuedOpsCount = (await getQueuedSyncOps()).length;
			if (restored.principalKind !== PRINCIPAL_KINDS.GUEST) {
				this.userId = restored.userId; this.uid = restored.uid; this.username = restored.username;
				this.principalKind = restored.principalKind; this.roleId = restored.roleId;
				this.effectiveMask = restored.effectiveMask >>> 0; this.rememberMe = restored.rememberMe;
				this.accessToken = restored.accessToken; this.csrfToken = restored.csrfToken;
				this.syncPosture = SYNC_POSTURES.VERIFIED; hudWire.unfoldAllZonesForPrincipal(false);
				await this.refreshSecurityStatus(); return;
			}
			if (hasSavedSessionIndicator() && (await this.refreshSession(true))) { /* refreshed */ }
			else { this.applyGuestState(restored.userId); this.syncPosture = restored.posture; }
			await this.refreshSecurityStatus();
		} catch { this.syncPosture = SYNC_POSTURES.OFFLINE_VERIFIED; }
	}

	private async postAuth(route: string, body: Record<string, unknown>, fallbackMsg: string, silent = false): Promise<boolean> {
		this.lastError = '';
		try {
			const res = await fetch(route, { method: 'POST', headers: this.buildHeaders(), credentials: 'same-origin', body: JSON.stringify(body) });
			const data = await res.json();
			if (!res.ok) {
				if (data.securityEvent === 'SECURITY_SESSION_REVOKED') { this.syncPosture = SYNC_POSTURES.REPLAY_ALERT; this.applyGuestState(); }
				if (!silent) this.lastError = data.error ?? fallbackMsg; return false;
			}
			await this.applyAuthPayload(data); return true;
		} catch {
			const demo = resolveOfflineDemoUser(body, SEEDED_OPERATOR_CONFIG);
			if (demo) {
				this.userId = demo.userId; this.uid = demo.uid; this.username = demo.username;
				this.principalKind = PRINCIPAL_KINDS.USER; this.roleId = demo.roleId;
				this.effectiveMask = demo.effectiveMask >>> 0; this.syncPosture = SYNC_POSTURES.OFFLINE_VERIFIED;
				this.guestIdentity = await saveSignedHudIdentity(this.guestIdentity, { userId: this.userId, uid: this.uid, username: this.username, principalKind: this.principalKind, roleId: this.roleId, effectiveMask: this.effectiveMask, rememberMe: this.rememberMe });
				hudWire.unfoldAllZonesForPrincipal(false); return true;
			}
			if (!silent) this.lastError = `Network error during ${fallbackMsg.toLowerCase()}`; return false;
		}
	}

	async register(username: string, password: string): Promise<boolean> { return this.postAuth(API_ROUTES.AUTH_REGISTER, { username, password }, 'Registration failed'); }
	async login(username: string, password: string, rememberMe = this.rememberMe): Promise<boolean> { this.rememberMe = rememberMe; return this.postAuth(API_ROUTES.AUTH_LOGIN, { username, password, rememberMe }, 'Sign-in failed'); }
	async refreshSession(silent = false): Promise<boolean> { return this.postAuth(API_ROUTES.AUTH_REFRESH, {}, silent ? '' : 'Session refresh failed', silent); }

	async devSwitchPersona(targetUsername: string): Promise<boolean> {
		if (!this.devMode) { this.lastError = 'DEVMODE is disabled.'; return false; }
		if (targetUsername === 'guest') { await this.logout(); return true; }
		if (await this.postAuth(API_ROUTES.AUTH_DEV_SWITCH, { username: targetUsername }, 'DEVMODE switch failed')) return true;
		const preset = SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.find((a) => a.username === targetUsername);
		if (!preset) return false;
		this.userId = `usr-dev-${preset.username}`; this.uid = preset.uid; this.username = preset.username;
		this.principalKind = PRINCIPAL_KINDS.USER; this.roleId = preset.roleId; this.effectiveMask = preset.mask >>> 0;
		this.syncPosture = SYNC_POSTURES.VERIFIED; this.lastError = '';
		this.guestIdentity = await saveSignedHudIdentity(this.guestIdentity, { userId: this.userId, uid: this.uid, username: this.username, principalKind: this.principalKind, roleId: this.roleId, effectiveMask: this.effectiveMask, rememberMe: this.rememberMe });
		hudWire.unfoldAllZonesForPrincipal(false); return true;
	}

	async loginWithOAuthProvider(provider: 'GITHUB' | 'GOOGLE', loginHint = 'oblx'): Promise<boolean> {
		const route = provider === 'GITHUB' ? API_ROUTES.AUTH_OAUTH_GITHUB : API_ROUTES.AUTH_OAUTH_GOOGLE;
		return this.postAuth(route, { providerSubject: `${provider.toLowerCase()}-${loginHint}`, login: loginHint, email: `${loginHint}@oblx.dev`, displayName: `${loginHint} (${provider})` }, `${provider} OAuth failed`);
	}

	async logout(): Promise<void> {
		try { await fetch(API_ROUTES.AUTH_LOGOUT, { method: 'POST', headers: this.buildHeaders(), credentials: 'same-origin', body: '{}' }); } catch {}
		await clearPersistedHudSession(); this.applyGuestState(); this.syncPosture = SYNC_POSTURES.OFFLINE_VERIFIED;
		this.guestIdentity = await saveSignedHudIdentity(this.guestIdentity, { userId: this.userId, uid: 0, username: this.username, principalKind: this.principalKind, roleId: this.roleId, effectiveMask: this.effectiveMask, rememberMe: false });
		hudWire.skipTourAndUnfoldHud();
	}

	async promoteGuest(workspaceIds: readonly string[]): Promise<number> { try { const res = await pushGuestWorkspacePromotion(this.guestIdentity, this.buildHeaders(), workspaceIds); this.guestIdentity = res.identity; if (res.error) this.lastError = res.error; return res.promotedCount; } catch { return 0; } }
	async mintPat(label: string, scopedBitmask: number): Promise<boolean> { this.lastError = ''; try { const r = await mintScopedPatToken(this.buildHeaders(), label, scopedBitmask); if (r.error || !r.rawToken) { this.lastError = r.error ?? 'PAT mint failed'; return false; } this.lastMintedPat = r.rawToken; return true; } catch { this.lastError = 'PAT mint failed'; return false; } }
	async storeVaultSecret(label: string, providerKind: string, plaintextSecret: string): Promise<boolean> {
		this.lastError = '';
		try { const res = await fetch(API_ROUTES.VAULT_SECRETS, { method: 'POST', headers: this.buildHeaders(), body: JSON.stringify({ label, providerKind, plaintextSecret }) }); const data = await res.json(); if (!res.ok) { this.lastError = data.error ?? 'Vault store failed'; return false; } await this.refreshSecurityStatus(); return true; } catch { this.lastError = 'Vault store failed'; return false; }
	}
	async deleteVaultSecret(secretId: string): Promise<boolean> { try { const res = await fetch(`${API_ROUTES.VAULT_SECRETS}?id=${encodeURIComponent(secretId)}`, { method: 'DELETE', headers: this.buildHeaders() }); if (!res.ok) return false; await this.refreshSecurityStatus(); return true; } catch { return false; } }
	async enqueueAnnotationOp(entityQualifiedName: string, payload: Record<string, unknown>): Promise<void> { const res = await enqueueSignedAnnotationDelta(this.hlc, this.userId, entityQualifiedName, payload); this.hlc = res.nextHlc; this.queuedOpsCount = res.queuedOpsCount; }
	async reconcileOfflineSync(): Promise<number> { try { const res = await pushQueuedSyncOps(this.buildHeaders()); if (res.error) { this.lastError = res.error; return 0; } this.conflictEntities = res.conflictEntities; this.queuedOpsCount = res.queuedOpsCount; this.syncPosture = this.conflictEntities.length > 0 ? SYNC_POSTURES.OFFLINE_QUEUED : SYNC_POSTURES.VERIFIED; return res.appliedCount; } catch { return 0; } }
	async toggleSystemLockdown(enabled: boolean): Promise<boolean> { try { const res = await fetch(API_ROUTES.SECURITY_LOCKDOWN, { method: 'POST', headers: this.buildHeaders(), body: JSON.stringify({ enabled }) }); if (!res.ok) return false; this.lockdownActive = enabled; if (enabled) this.syncPosture = SYNC_POSTURES.LOCKDOWN; return true; } catch { return false; } }
	async refreshSecurityStatus(): Promise<void> {
		try {
			const res = await fetch(API_ROUTES.SECURITY_STATUS, { headers: this.buildHeaders() }); if (!res.ok) return;
			const data = await res.json(); this.lockdownActive = Boolean(data.lockdownActive);
			if (data.devMode !== undefined) this.devMode = Boolean(data.devMode);
			if (Array.isArray(data.sessions)) this.sessions = data.sessions;
			if (data.auditChain) { this.auditChainValid = Boolean(data.auditChain.valid); this.auditRowCount = Number(data.auditChain.checkedRows ?? 0); }
			if (this.can(CAPABILITY_BITS.VAULT_SECRET_USE)) { const list = await fetchVaultSecretList<MaskedVaultSecretItem>(this.buildHeaders()); if (list) this.vaultSecrets = list; }
		} catch {}
	}
	private async applyAuthPayload(data: Record<string, unknown>): Promise<void> {
		const user = (data.user ?? {}) as Record<string, unknown>;
		this.userId = String(user.id ?? 'guest'); this.uid = Number(user.uid ?? 1);
		this.username = String(user.username ?? 'guest'); this.principalKind = String(user.principalKind ?? PRINCIPAL_KINDS.USER);
		this.roleId = String(user.roleId ?? ROLE_IDS.VIEWER); this.effectiveMask = Number(data.effectiveMask ?? ROLE_MASKS.ROLE_VIEWER) >>> 0;
		this.accessToken = String(data.accessToken ?? ''); this.csrfToken = String(data.csrfToken ?? '');
		this.syncPosture = SYNC_POSTURES.VERIFIED; this.requiredNodePrompt = '';
		this.guestIdentity = await saveSignedHudIdentity(this.guestIdentity, { userId: this.userId, uid: this.uid, username: this.username, principalKind: this.principalKind, roleId: this.roleId, effectiveMask: this.effectiveMask, rememberMe: this.rememberMe, accessToken: this.accessToken, csrfToken: this.csrfToken });
		hudWire.unfoldAllZonesForPrincipal(false);
		await this.refreshSecurityStatus();
	}
}

export const securityWire = new ChronosSecurityWire();
