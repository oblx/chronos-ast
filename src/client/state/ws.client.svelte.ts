/**
 * @author Oblx <code@oblx.dev>
 * @description Singleton client WebSocket engine with Dual-Plane Awareness/Causal frames, Scoped Cursors & Twin MCP Loopback.
 */
import { API_ROUTES, WS_CONFIG } from '@config/constants';
import { HUD_EVENTS } from '@config/hud.events';
import { resolveHudBreakpoint } from '@config/hud.tokens';
import { resolveClusterSeatCap } from '@config/security.constants';
import { clientDagKernel } from './dag/client.kernel.svelte';
import { hudWire } from './hud.wire.svelte';
import { securityWire } from './security.wire.svelte';
import { WS_BACKOFF_STEPS_MS, applyWsSnapshot, buildCursorAwareness, formatCollabTime, formatPingSummary, routeInboundWsFrame, type WsUiBridge } from './ws/ws.helpers';
import type { CollabFeedEvent, RemoteAnnotation, RemoteCollaborator } from './ws/ws.types';

export type { CollabFeedEvent, RemoteAnnotation, RemoteCollaborator };
export type TwinIntentExecutor = (intent: Record<string, unknown>) => Promise<void> | void;
let feedSeq = 1;

class ChronosWsClient {
	status = $state<'CONNECTED' | 'RECONNECTING' | 'OFFLINE'>('OFFLINE');
	connectedCount = $state<number>(1);
	maxClients = $state<number>(WS_CONFIG.MAX_CLIENTS);
	clusterId = $state<string>('cluster-1');
	seatCount = $state<number>(1);
	seatCap = $state<number>(resolveClusterSeatCap('ROLE_GUEST'));
	clusterFullError = $state<string>('');
	activeScope = $state<'WORKSPACE' | 'FULL_APP'>('WORKSPACE');
	followingClientId = $state<string | null>(null);
	roster = $state.raw<RemoteCollaborator[]>([]);
	annotations = $state.raw<RemoteAnnotation[]>([]);
	pendingInvites = $state.raw<Array<Record<string, unknown>>>([]);
	collabFeed = $state.raw<readonly CollabFeedEvent[]>([{ id: 0, kind: 'SESSION', actor: 'system', text: 'Cluster telemetry channel armed.', timeLabel: '00:00' }]);
	clientId = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('chronos.ws.clientId') || (() => { const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ws-client-1'; sessionStorage.setItem('chronos.ws.clientId', id); return id; })()) : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ws-client-1');
	private socket: WebSocket | null = null;
	private activeWorkspaceId = 'chronos-core';
	private retryStep = 0;
	private retryTimer: ReturnType<typeof setTimeout> | null = null;
	private lastCursorSentMs = 0;
	private offlineQueue: Array<Record<string, unknown>> = [];
	private unloadBound = false;
	private twinExecutor: TwinIntentExecutor | null = null;
	private readonly uiBridge: WsUiBridge = {
		selectView: (v) => hudWire.selectView(v), openModal: (m) => hudWire.openModal(m),
		setTheme: (t) => hudWire.setTheme(t), pushTicker: (tag, text) => hudWire.pushTicker(tag, text),
		setLockdown: (locked) => { securityWire.lockdownActive = locked; },
		onTwinIntent: (msg) => { void this.handleTwinDispatch(msg); },
	};

	registerTwinExecutor(fn: TwinIntentExecutor | null): void { this.twinExecutor = fn; }
	pushCollabEvent(kind: CollabFeedEvent['kind'], text: string, actor = securityWire.username): void {
		this.collabFeed = [{ id: feedSeq++, kind, actor, text, timeLabel: formatCollabTime() }, ...this.collabFeed].slice(0, 24);
	}
	private async handleTwinDispatch(msg: Record<string, unknown>): Promise<void> {
		const corr = String(msg.correlationId ?? ''), intent = (msg.intent ?? {}) as Record<string, unknown>, t0 = performance.now();
		let status = 'OK';
		try { if (this.twinExecutor) await this.twinExecutor(intent); } catch { status = 'ERROR'; }
		const trace = clientDagKernel.dispatch({ intentKind: `${HUD_EVENTS.TWIN_DISPATCH_INTENT}:${String(intent.kind ?? 'INTENT')}`, sourceZone: 'WS_TWIN', channel: 'WS_COLLAB', payload: { correlationId: corr, ...intent } });
		const durationUs = Math.max(1, Math.round((performance.now() - t0) * 1000));
		this.sendFrame({
			type: HUD_EVENTS.TWIN_CLIENT_ACK, correlationId: corr, clientTraceId: trace.traceId, opKind: String(intent.kind ?? 'INTENT'),
			activeProjection: hudWire.activeView, workspaceId: this.activeWorkspaceId, cameraZoom: hudWire.radarZoom, status, durationUs,
		});
		hudWire.pushTicker('TWIN', `${String(intent.kind ?? 'INTENT')} [${corr}]`);
	}
	connectWorkspace(workspaceId = 'chronos-core', focalEntityId: number | null = null, projectId = 1, clusterId?: string): void {
		this.activeWorkspaceId = workspaceId || 'chronos-core';
		if (clusterId !== undefined) this.clusterId = clusterId || 'cluster-1';
		this.seatCap = resolveClusterSeatCap(securityWire.roleId);
		if (typeof window !== 'undefined' && !this.unloadBound) {
			this.unloadBound = true;
			window.addEventListener('pagehide', () => { void fetch(API_ROUTES.WS_COLLAB, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'LEAVE', clientId: this.clientId, workspaceId: this.activeWorkspaceId }), keepalive: true }).catch(() => {}); });
		}
		void this.syncHttpRoom({ action: 'JOIN', workspaceId: this.activeWorkspaceId, projectId, ...(clusterId ? { clusterId: this.clusterId } : {}), scopeKind: this.activeScope, focalEntityId, username: securityWire.username });
		if (typeof window === 'undefined' || typeof WebSocket === 'undefined' || (import.meta as { env?: { DEV?: boolean } }).env?.DEV) return;
		if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
			this.sendFrame({ type: 'WS_SWITCH_PROJECT_ROOM', workspaceId: this.activeWorkspaceId, projectId, focalEntityId });
			return;
		}
		this.openNativeSocket(focalEntityId);
	}
	joinCluster(clusterId: string, scopeKind?: 'WORKSPACE' | 'FULL_APP'): void {
		const next = clusterId.trim() || 'cluster-1';
		this.clusterId = next; if (scopeKind) this.activeScope = scopeKind; this.clusterFullError = '';
		this.sendFrame({ type: 'JOIN_CLUSTER', clusterId: next, workspaceId: this.activeWorkspaceId, scopeKind: this.activeScope });
		this.pushCollabEvent('SESSION', `Joined squad cluster ${next} (${this.activeScope})`);
	}
	setScope(scopeKind: 'WORKSPACE' | 'FULL_APP'): void {
		this.activeScope = scopeKind; this.sendAwareness({ scopeKind, activeProjection: hudWire.activeView }); this.pushCollabEvent('SESSION', `Scope switched → ${scopeKind}`);
	}
	followPeer(targetClientId: string | null): void {
		this.followingClientId = targetClientId; this.sendFrame({ type: HUD_EVENTS.FOLLOW_PEER_SESSION, followingClientId: targetClientId });
		this.pushCollabEvent('SESSION', targetClientId ? `Following cursor ${targetClientId.slice(0, 8)}` : 'Cleared cursor follow');
	}
	dismissInvite(inviteId: number): void { this.pendingInvites = this.pendingInvites.filter((inv) => Number(inv.id) !== inviteId); }
	sendTacticalPing(kind: 'PING_FOCAL' | 'GATHER_SQUAD' | 'SHARE_SNAPSHOT', entityName = 'dispatch_ast_job'): void {
		const { eventKind, summary } = formatPingSummary(kind, hudWire.activeView, entityName);
		this.sendCausalOp(kind, entityName, { view: hudWire.activeView, entityName, scopeKind: this.activeScope });
		this.pushCollabEvent(eventKind, summary); hudWire.pushTicker('COLLAB', summary);
	}
	private openNativeSocket(focalEntityId: number | null): void {
		try {
			const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const tok = securityWire.accessToken ? `&token=${encodeURIComponent(securityWire.accessToken)}` : '';
			const ws = new WebSocket(`${proto}//${window.location.host}${WS_CONFIG.PATH}?clientId=${encodeURIComponent(this.clientId)}&username=${encodeURIComponent(securityWire.username)}&workspaceId=${encodeURIComponent(this.activeWorkspaceId)}${tok}`);
			this.socket = ws;
			ws.onopen = () => {
				this.status = 'CONNECTED'; this.retryStep = 0; this.flushOfflineQueue();
				if (this.clusterId) this.sendFrame({ type: 'JOIN_CLUSTER', clusterId: this.clusterId, scopeKind: this.activeScope });
				if (focalEntityId !== null) this.sendFocalLock(focalEntityId);
				this.sendAwareness({ activeProjection: hudWire.activeView, focalEntityId, viewportTier: resolveHudBreakpoint(window.innerWidth).id });
			};
			ws.onmessage = (ev) => routeInboundWsFrame(this, String(ev.data ?? ''), this.uiBridge);
			ws.onclose = () => this.scheduleReconnect();
			ws.onerror = () => { if (this.status !== 'CONNECTED') this.status = 'RECONNECTING'; };
		} catch { this.scheduleReconnect(); }
	}
	private scheduleReconnect(): void {
		if (this.retryTimer) clearTimeout(this.retryTimer);
		const delay = WS_BACKOFF_STEPS_MS[Math.min(this.retryStep, WS_BACKOFF_STEPS_MS.length - 1)]!; this.retryStep += 1;
		this.retryTimer = setTimeout(() => { void this.syncHttpRoom({ action: 'JOIN', workspaceId: this.activeWorkspaceId, scopeKind: this.activeScope, username: securityWire.username }); }, delay);
	}
	private async syncHttpRoom(payload: Record<string, unknown>): Promise<void> {
		try {
			const res = await fetch(API_ROUTES.WS_COLLAB, { method: 'POST', headers: securityWire.buildHeaders(), body: JSON.stringify({ ...payload, clientId: this.clientId, sessionId: this.clientId, workspaceId: this.activeWorkspaceId }) });
			const json = (await res.json()) as Record<string, unknown>;
			if (res.ok) { this.status = 'CONNECTED'; applyWsSnapshot(this, json); } else if (res.status === 409) { this.clusterFullError = String(json.error ?? 'Cluster Seat Limit Reached'); }
		} catch { this.status = 'OFFLINE'; }
	}
	sendFrame(frame: Record<string, unknown>): void {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) { this.socket.send(JSON.stringify(frame)); return; }
		if (frame.type !== 'CURSOR' && frame.type !== HUD_EVENTS.AWARENESS_STATE_FRAME) this.offlineQueue = [...this.offlineQueue.slice(-24), frame];
		void this.syncHttpRoom(frame);
	}
	private flushOfflineQueue(): void { const queued = [...this.offlineQueue]; this.offlineQueue = []; for (const item of queued) this.sendFrame(item); }
	sendAwareness(patch: Record<string, unknown>): void {
		const now = Date.now(); if (now - this.lastCursorSentMs < WS_CONFIG.CURSOR_THROTTLE_MS) return;
		this.lastCursorSentMs = now; this.sendFrame({ type: HUD_EVENTS.AWARENESS_STATE_FRAME, scopeKind: this.activeScope, activeProjection: hudWire.activeView, ...patch });
	}
	sendCursor(cursorX: number, cursorY: number, focalEntityId: number | null = null, worldX?: number, worldY?: number): void {
		this.sendAwareness(buildCursorAwareness(cursorX, cursorY, focalEntityId, worldX, worldY));
	}
	sendCausalOp(opKind: string, targetId: string | number, payload?: Record<string, unknown>): void { this.sendFrame({ type: HUD_EVENTS.CAUSAL_OP_FRAME, opKind, targetId, payload }); }
	sendFocalLock(focalEntityId: number | null): void { this.sendFrame({ type: 'FOCAL_LOCK', focalEntityId }); }
	sendAnnotation(entityId: number, note: string): void { this.sendFrame({ type: 'ANNOTATION', entityId, note }); }
	disconnect(): void { if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; } if (this.socket) { this.socket.onclose = null; this.socket.close(); this.socket = null; } this.status = 'OFFLINE'; }
}

export const wsClient = new ChronosWsClient();
