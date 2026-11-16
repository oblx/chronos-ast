/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.7.1 Ephemeral Network Anonymization (HMAC-SHA256 IP pseudonymization) & Dual-Plane WS Collaborator Roster Allowlisting.
 */
import { COLLAB_CURSOR_PALETTE } from '@config/hud.tokens';
import { toHex } from '@lib/utils/log.sanitizer';

const encoder = new TextEncoder();
const INSTANCE_EPHEMERAL_SEED = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'chronos-ephemeral-seed';

export function getDailyPrivacySalt(nowMs = Date.now()): string {
	const utcDay = new Date(nowMs).toISOString().slice(0, 10);
	return `chronos-privacy-v171:${utcDay}:${INSTANCE_EPHEMERAL_SEED}`;
}

export async function pseudonymizeClientIp(rawIp: string, nowMs = Date.now()): Promise<string> {
	const normalizedIp = (rawIp || '127.0.0.1').trim();
	const keyMaterial = encoder.encode(getDailyPrivacySalt(nowMs));
	const cryptoKey = await crypto.subtle.importKey('raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(normalizedIp));
	return `anon-${toHex(new Uint8Array(sig)).slice(0, 16)}`;
}

export type CollabActivityStatus = 'IDLE' | 'NAVIGATING' | 'EDITING_SOURCE' | 'STEPPING_CFG' | 'TYPING_AI';

export interface AllowlistedCollaboratorRosterItem {
	readonly clientId: string;
	readonly sessionId: string;
	readonly userId: string;
	readonly uid: number;
	readonly username: string;
	readonly displayName: string;
	readonly roleId: string;
	readonly roleBadge: string;
	readonly cursorColor: string;
	readonly scopeKind: 'WORKSPACE' | 'FULL_APP';
	readonly workspaceId: string;
	readonly clusterId?: string;
	readonly activeProjectCode: string;
	readonly activeProjection: string;
	readonly activeZone: string;
	readonly activityStatus: CollabActivityStatus;
	readonly focalEntityId: number | null;
	readonly cursorX: number;
	readonly cursorY: number;
	readonly worldX: number;
	readonly worldY: number;
	readonly normalizedX: number;
	readonly normalizedY: number;
	readonly caretLine: number | null;
	readonly caretCol: number | null;
	readonly followingClientId: string | null;
	readonly lastActiveMs: number;
}

export function resolveCollaboratorColor(uid: number, sessionId: string): string {
	let hash = uid >>> 0;
	for (let i = 0; i < sessionId.length; i++) hash = ((hash << 5) - hash + sessionId.charCodeAt(i)) >>> 0;
	return COLLAB_CURSOR_PALETTE[hash % COLLAB_CURSOR_PALETTE.length]!;
}

export function allowlistCollaboratorRosterItem(raw: Record<string, unknown>): AllowlistedCollaboratorRosterItem {
	const username = String(raw.username ?? 'guest');
	const roleId = String(raw.roleId ?? 'ROLE_GUEST');
	const workspaceId = String(raw.workspaceId ?? 'chronos-core');
	const uid = Number(raw.uid ?? 0) >>> 0;
	const clientId = String(raw.clientId ?? '');
	const sessionId = String(raw.sessionId ?? clientId);
	return {
		clientId,
		sessionId,
		userId: String(raw.userId ?? raw.uid ?? username),
		uid,
		username,
		displayName: String(raw.displayName ?? username),
		roleId,
		roleBadge: roleId.replace(/^ROLE_/, ''),
		cursorColor: String(raw.cursorColor ?? resolveCollaboratorColor(uid, sessionId)),
		scopeKind: raw.scopeKind === 'FULL_APP' ? 'FULL_APP' : 'WORKSPACE',
		workspaceId,
		clusterId: typeof raw.clusterId === 'string' && raw.clusterId ? raw.clusterId : undefined,
		activeProjectCode: String(raw.activeProjectCode ?? workspaceId.toUpperCase()),
		activeProjection: String(raw.activeProjection ?? 'BUTTERFLY'),
		activeZone: String(raw.activeZone ?? 'WORLD_CANVAS'),
		activityStatus: (raw.activityStatus as CollabActivityStatus) ?? 'NAVIGATING',
		focalEntityId: raw.focalEntityId !== undefined && raw.focalEntityId !== null ? Number(raw.focalEntityId) : null,
		cursorX: Number(raw.cursorX ?? 0),
		cursorY: Number(raw.cursorY ?? 0),
		worldX: Number(raw.worldX ?? raw.cursorX ?? 0),
		worldY: Number(raw.worldY ?? raw.cursorY ?? 0),
		normalizedX: Number(raw.normalizedX ?? 0.5),
		normalizedY: Number(raw.normalizedY ?? 0.5),
		caretLine: raw.caretLine !== undefined && raw.caretLine !== null ? Number(raw.caretLine) : null,
		caretCol: raw.caretCol !== undefined && raw.caretCol !== null ? Number(raw.caretCol) : null,
		followingClientId: typeof raw.followingClientId === 'string' ? raw.followingClientId : null,
		lastActiveMs: Number(raw.lastActiveMs ?? Date.now()),
	};
}
