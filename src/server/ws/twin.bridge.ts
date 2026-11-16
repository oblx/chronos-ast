/**
 * @author Oblx <code@oblx.dev>
 * @description Twin MCP WebSocket session registry, intent dispatch, and correlated TWIN_CLIENT_ACK trace buffer.
 */
import { WORKFLOW_WEBHOOK_EVENTS } from '@config/constants';
import { HUD_EVENTS } from '@config/hud.events';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { dispatchWorkflowWebhookAsync } from '@plugins/exporters/webhook.bridge';
import { sanitizeOutboundForPrincipal } from '@plugins/sanitizers/form.sanitizer';
import { serverDagKernel } from '../http/server.kernel';
import type { TwinIntentPayload, WsSessionDescriptor } from '../mcp/mcp.types';
import type { WsCollaboratorState, WsInboundFrame } from './awareness.bus';

export interface TwinWireTraceItem {
	readonly kind: 'DISPATCH' | 'ACK';
	readonly correlationId: string;
	readonly clientId: string;
	readonly username: string;
	readonly intentKind: string;
	readonly clientTraceId?: string;
	readonly activeProjection?: string;
	readonly workspaceId?: string;
	readonly status: string;
	readonly durationUs: number;
	readonly ts: number;
}

const MAX_TWIN_TRACES = 128 as const;
let twinTraceBuffer: TwinWireTraceItem[] = [];
let activeTwinHandle: ChronosDatabaseHandle | null = null;

export function setTwinBridgeDbHandle(handle: ChronosDatabaseHandle | null): void {
	activeTwinHandle = handle;
}

function pushTwinTrace(item: TwinWireTraceItem): void {
	twinTraceBuffer = [item, ...twinTraceBuffer].slice(0, MAX_TWIN_TRACES);
}

export function buildWsSessionList(activeClients: ReadonlyMap<string, WsCollaboratorState>): readonly WsSessionDescriptor[] {
	return Array.from(activeClients.values()).map((c) => ({
		clientId: c.clientId,
		uid: c.uid,
		username: c.username,
		roleId: c.roleId,
		roleBadge: c.roleId.replace(/^ROLE_/, ''),
		workspaceId: c.workspaceId,
		projectId: c.projectId,
		activeProjection: c.activeProjection,
		viewportTier: c.viewportTier,
		cameraZoom: c.cameraZoom,
		focalEntityId: c.focalEntityId,
		lastPongMs: c.lastPongMs,
	}));
}

export function dispatchTwinIntentMap(
	activeClients: ReadonlyMap<string, WsCollaboratorState>,
	target: string,
	intent: TwinIntentPayload,
	actor: string
): { readonly dispatched: boolean; readonly correlationId: string; readonly dispatchedCount: number; readonly targets: readonly string[] } {
	const correlationId = `twin-${crypto.randomUUID().slice(0, 12)}`;
	const targets: string[] = [];
	for (const client of activeClients.values()) {
		const isMatch = target === 'ALL' || client.clientId === target || client.username === target || String(client.uid) === target;
		if (!isMatch) continue;
		const frame = { type: HUD_EVENTS.TWIN_DISPATCH_INTENT, correlationId, actor, intent, ts: Date.now() };
		client.sendFrame?.(JSON.stringify(sanitizeOutboundForPrincipal(frame, client.effectiveMask, client.roleId)));
		targets.push(client.clientId);
		pushTwinTrace({
			kind: 'DISPATCH',
			correlationId,
			clientId: client.clientId,
			username: client.username,
			intentKind: intent.kind,
			activeProjection: client.activeProjection,
			workspaceId: client.workspaceId,
			status: 'DISPATCHED',
			durationUs: 1,
			ts: Date.now(),
		});
	}
	serverDagKernel.record({
		stage: 'STAGE_5_FANOUT_OBSERVE',
		channel: 'WS_COLLAB',
		intentKind: `${HUD_EVENTS.TWIN_DISPATCH_INTENT}:${intent.kind}`,
		sourceZone: actor,
		durationUs: 1,
		status: targets.length > 0 ? 'OK' : 'ERROR',
		summary: `Twin dispatch ${intent.kind} -> ${targets.length} session(s) [${correlationId}]`,
		payloadPreview: JSON.stringify(intent).slice(0, 140),
	});
	return { dispatched: targets.length > 0, correlationId, dispatchedCount: targets.length, targets };
}

export function recordTwinAckFrame(client: WsCollaboratorState, frame: WsInboundFrame): void {
	const correlationId = String(frame.correlationId ?? 'uncorrelated');
	const clientTraceId = String(frame.clientTraceId ?? 'dag-unknown');
	const activeProjection = String(frame.activeProjection ?? client.activeProjection);
	const workspaceId = String(frame.workspaceId ?? client.workspaceId);
	if (frame.activeProjection) client.activeProjection = frame.activeProjection;
	if (frame.workspaceId) client.workspaceId = frame.workspaceId;
	if (frame.focalEntityId !== undefined) client.focalEntityId = frame.focalEntityId;
	if (typeof frame.cameraZoom === 'number') client.cameraZoom = frame.cameraZoom;
	const item: TwinWireTraceItem = {
		kind: 'ACK',
		correlationId,
		clientId: client.clientId,
		username: client.username,
		intentKind: String(frame.opKind ?? HUD_EVENTS.TWIN_CLIENT_ACK),
		clientTraceId,
		activeProjection,
		workspaceId,
		status: String(frame.status ?? 'OK'),
		durationUs: Math.max(1, Number(frame.durationUs ?? 1)),
		ts: Date.now(),
	};
	pushTwinTrace(item);
	serverDagKernel.record({
		stage: 'STAGE_5_FANOUT_OBSERVE',
		channel: 'WS_COLLAB',
		intentKind: HUD_EVENTS.TWIN_CLIENT_ACK,
		sourceZone: client.username,
		durationUs: item.durationUs,
		status: item.status === 'OK' ? 'OK' : 'ERROR',
		summary: `Twin ACK ${correlationId} (${clientTraceId}) -> ${activeProjection} @ ${workspaceId}`,
		payloadPreview: JSON.stringify(item).slice(0, 140),
	});
	dispatchWorkflowWebhookAsync(activeTwinHandle, WORKFLOW_WEBHOOK_EVENTS.TWIN_INTENT_EXECUTED, item);
}

export function queryTwinWireTraces(limit = 32, correlationId?: string) {
	const acks = twinTraceBuffer.filter((t) => !correlationId || t.correlationId === correlationId).slice(0, limit);
	const serverTraces = serverDagKernel.listTraces(limit);
	return { traces: acks, serverTraces, count: acks.length };
}

export function clearTwinTraceBuffer(): void {
	twinTraceBuffer = [];
}
