/**
 * @author Oblx <code@oblx.dev>
 * @description Canonical WebSocket Dual-Plane types for Awareness/Causal frames, Twin ACK loopback, and Collaborator state.
 */
import type { CollabActivityStatus } from '@core/security/privacy.guard';

export interface WsCollaboratorState {
	readonly clientId: string; readonly sessionId: string; uid: number; username: string; roleId: string; effectiveMask: number;
	cursorColor: string; scopeKind: 'WORKSPACE' | 'FULL_APP'; workspaceId: string; projectId: number; clusterId?: string;
	activeProjection: string; activeZone: string; activityStatus: CollabActivityStatus; focalEntityId: number | null;
	viewportTier: string; cameraZoom: number;
	cursorX: number; cursorY: number; worldX: number; worldY: number; normalizedX: number; normalizedY: number;
	caretLine: number | null; caretCol: number | null; followingClientId: string | null;
	lastCursorMs: number; lastPongMs: number; msgWindowStartMs: number; msgCountInWindow: number;
	sendFrame?: (payload: string) => void; getBufferedAmount?: () => number;
}

export interface WsInboundFrame {
	readonly type:
		| 'JOIN' | 'WS_SWITCH_PROJECT_ROOM' | 'CREATE_CLUSTER' | 'JOIN_CLUSTER' | 'LEAVE_CLUSTER'
		| 'CURSOR' | 'AWARENESS_STATE_FRAME' | 'CAUSAL_OP_FRAME' | 'FOLLOW_PEER_SESSION'
		| 'FOCAL_LOCK' | 'ANNOTATION' | 'LOCKDOWN' | 'TWIN_CLIENT_ACK' | 'PING' | 'PONG';
	readonly workspaceId?: string; readonly projectId?: number; readonly clusterId?: string; readonly scopeKind?: 'WORKSPACE' | 'FULL_APP';
	readonly activeProjection?: string; readonly activeZone?: string; readonly activityStatus?: CollabActivityStatus;
	readonly focalEntityId?: number | null; readonly viewportTier?: string; readonly cameraZoom?: number;
	readonly cursorX?: number; readonly cursorY?: number; readonly worldX?: number; readonly worldY?: number;
	readonly normalizedX?: number; readonly normalizedY?: number; readonly caretLine?: number | null; readonly caretCol?: number | null;
	readonly followingClientId?: string | null; readonly opKind?: string; readonly targetId?: string | number; readonly payload?: Record<string, unknown>;
	readonly hlcTimestamp?: string; readonly entityId?: number; readonly note?: string; readonly lockdownActive?: boolean;
	readonly correlationId?: string; readonly clientTraceId?: string; readonly status?: string; readonly durationUs?: number;
}

export interface WsAnnotationRecord {
	readonly id: string; readonly workspaceId: string; readonly entityId: number; readonly author: string; readonly note: string; readonly createdAt: number;
}
