/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-dependency JSON-RPC 2.0 MCP types, Forensic/Twin tool manifests, and Twin intent contracts.
 */
import type { HudViewMode } from '@config/constants';
import type { HudModalId } from '@config/hud.events';
import type { HudThemeId } from '@config/hud.tokens';
import { CAPABILITY_BITS } from '@config/security.constants';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';

export interface JsonRpcRequest {
	readonly jsonrpc?: string;
	readonly id: number | string | null;
	readonly method: string;
	readonly params?: Readonly<Record<string, unknown>>;
}

export interface JsonRpcError {
	readonly code: number;
	readonly message: string;
	readonly data?: unknown;
}

export interface JsonRpcResponse {
	readonly jsonrpc: '2.0';
	readonly id: number | string | null;
	readonly result?: unknown;
	readonly error?: JsonRpcError;
}

export const FORENSIC_TOOL_NAMES = {
	ANALYZE_SELF: 'chronos_analyze_self',
	QUERY_METAMODEL: 'chronos_query_metamodel',
	INSPECT_ENTITY: 'chronos_inspect_entity',
	TRACE_CODEMAP_ENTRY: 'chronos_trace_codemap_entry',
	RUN_CODECHECK: 'chronos_run_codecheck',
} as const;

export const TWIN_TOOL_NAMES = {
	LIST_SESSIONS: 'chronos_twin_list_sessions',
	DISPATCH_INTENT: 'chronos_twin_dispatch_intent',
	CAPTURE_WIRE_TRACE: 'chronos_twin_capture_wire_trace',
} as const;

export type TwinIntentKind =
	| 'SWITCH_PROJECT'
	| 'SWITCH_PROJECTION'
	| 'SELECT_ENTITY'
	| 'SET_THEME'
	| 'TOGGLE_DRAWER'
	| 'CAMERA_FIT'
	| 'OPEN_MODAL'
	| 'CLOSE_MODAL';

export interface TwinIntentPayload {
	readonly kind: TwinIntentKind;
	readonly projectId?: string;
	readonly view?: HudViewMode;
	readonly entityId?: number;
	readonly qualifiedName?: string;
	readonly themeId?: HudThemeId;
	readonly drawer?: 'LEFT_EDGE' | 'RIGHT_EDGE';
	readonly open?: boolean;
	readonly modal?: HudModalId;
}

export interface WsSessionDescriptor {
	readonly clientId: string;
	readonly uid: number;
	readonly username: string;
	readonly roleId: string;
	readonly roleBadge: string;
	readonly workspaceId: string;
	readonly projectId: number;
	readonly activeProjection: string;
	readonly viewportTier: string;
	readonly cameraZoom: number;
	readonly focalEntityId: number | null;
	readonly lastPongMs: number;
}

export interface McpToolSpec {
	readonly name: string;
	readonly description: string;
	readonly requiredCapability: number;
	readonly inputSchema: Readonly<Record<string, unknown>>;
}

export interface McpRuntimeContext {
	readonly handle: ChronosDatabaseHandle;
	readonly getSnapshot: (projectKey?: string) => WorkspaceSnapshot;
	readonly setSnapshot: (projectKey: string, snapshot: WorkspaceSnapshot) => void;
}

export const MCP_FORENSIC_TOOLS: readonly McpToolSpec[] = [
	{
		name: FORENSIC_TOOL_NAMES.ANALYZE_SELF,
		description: 'Scan src/**/*.ts, persist the chronos-self project snapshot, and report Tarjan SCC & entity metrics.',
		requiredCapability: CAPABILITY_BITS.WORKSPACE_INDEX_LOCAL,
		inputSchema: { type: 'object', properties: { rootDir: { type: 'string' } } },
	},
	{
		name: FORENSIC_TOOL_NAMES.QUERY_METAMODEL,
		description: 'Query AST entities and edges filtered by kind, namePattern, projectId, and limit (<= 100).',
		requiredCapability: CAPABILITY_BITS.METAMODEL_QUERY,
		inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, kind: { type: 'string' }, namePattern: { type: 'string' }, limit: { type: 'number' } } },
	},
	{
		name: FORENSIC_TOOL_NAMES.INSPECT_ENTITY,
		description: 'Inspect entity details, Chidamber-Kemerer metrics, source slice, and CodeCheck violations.',
		requiredCapability: CAPABILITY_BITS.METAMODEL_QUERY,
		inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, entityId: { type: 'number' }, qualifiedName: { type: 'string' }, name: { type: 'string' } } },
	},
	{
		name: FORENSIC_TOOL_NAMES.TRACE_CODEMAP_ENTRY,
		description: 'Detect project Genesis entry points and compute the BFS Codemap travel spine.',
		requiredCapability: CAPABILITY_BITS.METAMODEL_QUERY,
		inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, entityId: { type: 'number' }, qualifiedName: { type: 'string' } } },
	},
	{
		name: FORENSIC_TOOL_NAMES.RUN_CODECHECK,
		description: 'Run CHR-001..CHR-017 CodeCheck rules and return violations, suppressed count, and compliance score.',
		requiredCapability: CAPABILITY_BITS.CODECHECK_RUN,
		inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, useHisSafetyProfile: { type: 'boolean' } } },
	},
] as const;

export const MCP_TWIN_TOOLS: readonly McpToolSpec[] = [
	{
		name: TWIN_TOOL_NAMES.LIST_SESSIONS,
		description: 'List active WebSocket browser sessions with identity, workspace, projection, viewportTier, and zoom.',
		requiredCapability: CAPABILITY_BITS.ADMIN_WIRE_OBSERVE,
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: TWIN_TOOL_NAMES.DISPATCH_INTENT,
		description: 'Dispatch a live UI/workspace Twin intent to targeted WebSocket browser sessions.',
		requiredCapability: CAPABILITY_BITS.ADMIN_WIRE_OBSERVE | CAPABILITY_BITS.COLLAB_OVERRIDE,
		inputSchema: { type: 'object', required: ['intent'], properties: { target: { type: 'string' }, intent: { type: 'object' } } },
	},
	{
		name: TWIN_TOOL_NAMES.CAPTURE_WIRE_TRACE,
		description: 'Capture correlated serverDagKernel and TWIN_CLIENT_ACK wire telemetry traces.',
		requiredCapability: CAPABILITY_BITS.ADMIN_WIRE_OBSERVE,
		inputSchema: { type: 'object', properties: { limit: { type: 'number' }, correlationId: { type: 'string' } } },
	},
] as const;
