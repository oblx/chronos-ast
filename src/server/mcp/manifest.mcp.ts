/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-Human-in-the-Loop Machine-Readable MCP Capability Manifest (GET /api/mcp/manifest).
 */
import { API_ROUTES, APP_METADATA, WORKFLOW_WEBHOOK_EVENTS, WS_CONFIG } from '@config/constants';
import { CAPABILITY_BITS, CRYPTO_CONSTANTS } from '@config/security.constants';
import { okResponse, type ApiResponseEnvelope } from '../http/middleware';
import { MCP_FORENSIC_TOOLS, MCP_TWIN_TOOLS } from './mcp.types';

export interface McpCapabilityManifest {
	readonly name: string;
	readonly version: string;
	readonly license: string;
	readonly protocolVersion: string;
	readonly transports: Readonly<Record<string, unknown>>;
	readonly authSchemes: Readonly<Record<string, unknown>>;
	readonly forensicTools: typeof MCP_FORENSIC_TOOLS;
	readonly twinTools: typeof MCP_TWIN_TOOLS;
	readonly resourceTemplates: ReadonlyArray<{ readonly uriTemplate: string; readonly mimeType: string; readonly description: string }>;
	readonly capabilityBits: typeof CAPABILITY_BITS;
	readonly webhookEvents: readonly string[];
}

export function buildMcpCapabilityManifest(): McpCapabilityManifest {
	return {
		name: APP_METADATA.NAME,
		version: APP_METADATA.VERSION,
		license: APP_METADATA.LICENSE,
		protocolVersion: '2024-11-05',
		transports: {
			stdio: { command: 'bun run src/workers/mcp.server.ts', framing: 'NDJSON', jsonRpc: '2.0' },
			forensicHttp: { method: 'POST', path: API_ROUTES.MCP_FORENSIC, jsonRpc: '2.0' },
			twinHttp: { method: 'POST', path: API_ROUTES.MCP_TWIN, jsonRpc: '2.0', requiredCapabilities: ['ADMIN_WIRE_OBSERVE', 'COLLAB_OVERRIDE'] },
			websocket: { path: WS_CONFIG.PATH, maxClients: WS_CONFIG.MAX_CLIENTS },
		},
		authSchemes: {
			patPrefix: CRYPTO_CONSTANTS.PAT_PREFIX,
			header: 'Authorization: Bearer <token>',
			cliMintCommand: 'bun run mcp:token',
			httpMintRoute: API_ROUTES.AUTH_PAT,
			supportsJwtBearer: true,
			supportsGuestFallbackForForensic: true,
		},
		forensicTools: MCP_FORENSIC_TOOLS,
		twinTools: MCP_TWIN_TOOLS,
		resourceTemplates: [
			{ uriTemplate: 'chronos://project/{projectId}/manifest', mimeType: 'application/json', description: 'Project metadata, entity/edge counts, Tarjan SCC summary, Genesis entry points' },
			{ uriTemplate: 'chronos://project/{projectId}/hotspots', mimeType: 'application/json', description: 'Top 15 complexity hotspots sorted by v(G) and Halstead Volume' },
			{ uriTemplate: 'chronos://project/{projectId}/cycles', mimeType: 'application/json', description: 'Tarjan SCC cyclic clusters and acyclic posture verdict' },
			{ uriTemplate: 'chronos://project/{projectId}/codecheck', mimeType: 'application/json', description: 'CodeCheck CHR-001..CHR-017 summary grouped by severity' },
		],
		capabilityBits: CAPABILITY_BITS,
		webhookEvents: Object.values(WORKFLOW_WEBHOOK_EVENTS),
	};
}

export function handleMcpManifestRoute(): ApiResponseEnvelope {
	return okResponse(buildMcpCapabilityManifest());
}
