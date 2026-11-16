/**
 * @author Oblx <code@oblx.dev>
 * @description Client WebSocket collaborator, annotation & live collab feed contracts (v1.7.3).
 */
export interface RemoteCollaborator {
	readonly clientId: string; readonly sessionId?: string; readonly uid: number; readonly username: string; readonly roleId: string;
	readonly workspaceId: string; readonly focalEntityId: number | null; readonly cursorX: number; readonly cursorY: number;
	readonly worldX?: number; readonly worldY?: number; readonly normalizedX?: number; readonly normalizedY?: number;
	readonly colorHex?: string; readonly scopeKind?: 'WORKSPACE' | 'FULL_APP'; readonly activeZone?: string;
	readonly activeProjection?: string; readonly activityStatus?: string; readonly caretLine?: number | null;
	readonly caretCol?: number | null; readonly followingClientId?: string | null; readonly lastUpdatedMs?: number;
}

export interface RemoteAnnotation {
	readonly id: string; readonly workspaceId: string; readonly entityId: number; readonly author: string; readonly note: string; readonly createdAt: number;
}

export interface CollabFeedEvent {
	readonly id: number; readonly kind: 'PING' | 'GATHER' | 'SNAPSHOT' | 'INVITE' | 'OVERRIDE' | 'SESSION';
	readonly actor: string; readonly text: string; readonly timeLabel: string;
}
