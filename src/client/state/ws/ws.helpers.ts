/**
 * @author Oblx <code@oblx.dev>
 * @description Pure WebSocket frame builders, cursor normalization & inbound event routing including Twin MCP loopback.
 */
import type { HudViewMode } from '@config/constants';
import { HUD_EVENTS, type HudModalId } from '@config/hud.events';
import type { HudThemeId } from '@config/hud.tokens';
import type { CollabFeedEvent, RemoteAnnotation, RemoteCollaborator } from './ws.types';

export const WS_BACKOFF_STEPS_MS = [500, 1000, 2000, 5000, 15000] as const;

export interface WsFrameTarget {
	connectedCount: number; maxClients: number; clusterId: string; seatCount: number; seatCap: number;
	clusterFullError: string; activeScope: 'WORKSPACE' | 'FULL_APP'; followingClientId: string | null;
	roster: RemoteCollaborator[]; annotations: RemoteAnnotation[]; pendingInvites: Array<Record<string, unknown>>;
	pushCollabEvent: (kind: CollabFeedEvent['kind'], text: string, actor?: string) => void;
}

export interface WsUiBridge {
	selectView: (v: HudViewMode) => void; openModal: (m: HudModalId) => void;
	setTheme: (t: HudThemeId) => void; pushTicker: (tag: string, text: string) => void; setLockdown: (locked: boolean) => void;
	onTwinIntent?: (msg: Record<string, unknown>) => void;
}

export function formatCollabTime(): string {
	const now = new Date();
	return `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}
export function formatPingSummary(kind: 'PING_FOCAL' | 'GATHER_SQUAD' | 'SHARE_SNAPSHOT', view: string, entityName: string): { eventKind: CollabFeedEvent['kind']; summary: string } {
	if (kind === 'PING_FOCAL') return { eventKind: 'PING', summary: `Pinged focal entity ${entityName} (${view})` };
	if (kind === 'GATHER_SQUAD') return { eventKind: 'GATHER', summary: `Requested squad gather at ${view}` };
	return { eventKind: 'SNAPSHOT', summary: `Shared ${view} view snapshot (${entityName})` };
}
export function buildCursorAwareness(cursorX: number, cursorY: number, focalEntityId: number | null, worldX?: number, worldY?: number): Record<string, unknown> {
	const vw = typeof window !== 'undefined' ? Math.max(1, window.innerWidth) : 1280;
	const vh = typeof window !== 'undefined' ? Math.max(1, window.innerHeight) : 720;
	return {
		cursorX: Math.round(cursorX), cursorY: Math.round(cursorY), worldX: Math.round(worldX ?? cursorX), worldY: Math.round(worldY ?? cursorY),
		normalizedX: Number((cursorX / vw).toFixed(4)), normalizedY: Number((cursorY / vh).toFixed(4)), focalEntityId,
	};
}
export function applyWsSnapshot(target: WsFrameTarget, data: Record<string, unknown>): void {
	if (typeof data.connectedCount === 'number') target.connectedCount = Math.max(1, data.connectedCount);
	if (typeof data.maxClients === 'number') target.maxClients = data.maxClients;
	if (Array.isArray(data.roster)) target.roster = data.roster as RemoteCollaborator[];
	if (Array.isArray(data.annotations)) target.annotations = data.annotations as RemoteAnnotation[];
	const cl = data.cluster as Record<string, unknown> | undefined;
	if (cl && typeof cl.seatCount === 'number' && typeof cl.seatCap === 'number') {
		target.clusterId = String(cl.clusterId ?? target.clusterId); target.seatCount = cl.seatCount; target.seatCap = cl.seatCap; target.clusterFullError = '';
	}
}
export function applyPrivilegedOverrideFrame(target: WsFrameTarget, msg: Record<string, unknown>, ui: WsUiBridge): void {
	if (typeof msg.scopeKind === 'string') target.activeScope = msg.scopeKind === 'FULL_APP' ? 'FULL_APP' : 'WORKSPACE';
	if (typeof msg.clusterId === 'string') target.clusterId = msg.clusterId;
	const intent = msg.intent as Record<string, unknown> | undefined;
	if (intent?.kind === 'SWITCH_PROJECTION' && typeof intent.view === 'string') ui.selectView(intent.view as HudViewMode);
	if (intent?.kind === 'OPEN_MODAL' && typeof intent.modal === 'string') ui.openModal(intent.modal as HudModalId);
	if (intent?.kind === 'SET_THEME' && typeof intent.themeId === 'string') ui.setTheme(intent.themeId as HudThemeId);
	const summary = `RBAC override (${String(msg.overrideAction ?? 'SUMMON')}) by ${String(msg.actor ?? 'admin')}`;
	target.pushCollabEvent('OVERRIDE', summary, String(msg.actor ?? 'admin')); ui.pushTicker('OVERRIDE', summary);
}
export function routeInboundWsFrame(target: WsFrameTarget, raw: string, ui: WsUiBridge): void {
	try {
		const msg = JSON.parse(raw) as Record<string, unknown>;
		if (msg.type === HUD_EVENTS.TWIN_DISPATCH_INTENT) { ui.onTwinIntent?.(msg); return; }
		if (msg.type === HUD_EVENTS.WS_ROSTER_UPDATE) applyWsSnapshot(target, msg);
		if (msg.type === HUD_EVENTS.WS_PEER_LEFT) { const g = String(msg.clientId ?? msg.sessionId ?? ''); target.roster = target.roster.filter((r) => r.clientId !== g && r.sessionId !== g); }
		if (msg.type === HUD_EVENTS.WS_CLUSTER_UPDATE && typeof msg.seatCount === 'number' && typeof msg.seatCap === 'number') { target.seatCount = msg.seatCount; target.seatCap = msg.seatCap; target.clusterFullError = ''; }
		if (msg.type === HUD_EVENTS.CLUSTER_SEAT_LIMIT_REACHED) { target.clusterFullError = String(msg.reason ?? 'Cluster Seat Limit Reached'); ui.pushTicker('CLUSTER', target.clusterFullError); }
		if (msg.type === HUD_EVENTS.SERVER_EVENT_COMMITTED) ui.pushTicker('COMMIT', `${String(msg.actor ?? 'op')} → ${String(msg.route ?? '')}`);
		if (msg.type === HUD_EVENTS.CAUSAL_OP_FRAME) target.pushCollabEvent('PING', `${String(msg.opKind ?? 'OP')} · ${String(msg.targetId ?? '')}`, String(msg.username ?? 'peer'));
		if (msg.type === HUD_EVENTS.WS_REMOTE_CURSOR || msg.type === HUD_EVENTS.AWARENESS_STATE_FRAME) {
			const peerId = String(msg.clientId ?? '');
			target.roster = target.roster.map((r) => (r.clientId === peerId ? { ...r, ...(msg as Partial<RemoteCollaborator>), lastUpdatedMs: Date.now() } : r));
			if (target.followingClientId === peerId && typeof msg.activeProjection === 'string') ui.selectView(msg.activeProjection as HudViewMode);
		}
		if (msg.type === HUD_EVENTS.WS_COLLAB_INVITE && msg.invite) { const inv = msg.invite as Record<string, unknown>; target.pendingInvites = [...target.pendingInvites.filter((i) => i.id !== inv.id), inv]; target.pushCollabEvent('INVITE', `Invite from ${String(inv.fromUsername ?? 'peer')} (${String(inv.scopeKind ?? 'WORKSPACE')})`); }
		if (msg.type === HUD_EVENTS.WS_PRIVILEGED_OVERRIDE) applyPrivilegedOverrideFrame(target, msg, ui);
		if (msg.type === HUD_EVENTS.WS_REMOTE_ANNOTATION && Array.isArray(msg.annotations)) target.annotations = msg.annotations as RemoteAnnotation[];
		if (msg.type === HUD_EVENTS.WS_LOCKDOWN_BROADCAST) ui.setLockdown(Boolean(msg.lockdownActive));
	} catch { /* ignore */ }
}
