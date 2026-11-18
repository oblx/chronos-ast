/**
 * @author Oblx <code@oblx.dev>
 * @description Shared Chronos domain API route dispatcher unifying production router and ephemeral QA server.
 */
import { API_ROUTES, HTTP_STATUS } from '@config/constants';
import { compileHelpBookFromDocs } from '@core/metamodel/help.engine';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { sanitizeInboundPayload, sanitizeOutboundForPrincipal } from '@plugins/sanitizers/form.sanitizer';
import { handleForensicMcpHttp, handleMcpManifestRoute, handleTwinMcpHttp, type McpRuntimeContext } from '../mcp';
import { handleCollabRoutes } from '../routes/collab.routes';
import { handleGamificationRoutes } from '../routes/gamification.routes';
import { handlePrivacyRoutes } from '../routes/privacy.routes';
import { handleProjectAndAiRoutes } from '../routes/project.routes';
import { handleSecurityRoutes } from '../routes/security.routes';
import { handleThemeAndPreferenceRoutes } from '../routes/theme.routes';
import { okResponse, sanitizedErrorResponse, type ApiResponseEnvelope, type RequestPrincipal } from './middleware';
import { serverDagKernel } from './server.kernel';
import { handleVaultAndSyncRoutes } from './vault_sync.routes';
import { handleWorkspaceRoute, loadLiveDocsMarkdownMap } from './workspace.routes';

export function sanitizeInboundBody(bodyText?: string): string | undefined {
	return bodyText ? JSON.stringify(sanitizeInboundPayload(parseSafeJson<unknown>(bodyText))) : undefined;
}

export function finalizeEnvelopeForPrincipal(res: ApiResponseEnvelope, principal: RequestPrincipal): ApiResponseEnvelope {
	const pObj = res.payload as Record<string, unknown> | null;
	const outMask = pObj && typeof pObj.effectiveMask === 'number' ? pObj.effectiveMask : principal.effectiveMask;
	const outRole = pObj && pObj.user && typeof (pObj.user as Record<string, unknown>).roleId === 'string'
		? String((pObj.user as Record<string, unknown>).roleId)
		: principal.roleId;
	return { ...res, payload: sanitizeOutboundForPrincipal(res.payload, outMask, outRole) };
}

export async function dispatchChronosDomainRoutes(opts: {
	readonly handle: ChronosDatabaseHandle;
	readonly snapshot: WorkspaceSnapshot;
	readonly getProjectSnapshot: (slug: string | null) => WorkspaceSnapshot | undefined;
	readonly mcpCtx: McpRuntimeContext;
	readonly urlPath: string;
	readonly method: string;
	readonly safeBody: string | undefined;
	readonly headers: Record<string, string>;
	readonly principal: RequestPrincipal;
	readonly extraRoutes?: () => Promise<ApiResponseEnvelope | null>;
}): Promise<ApiResponseEnvelope> {
	const { handle, snapshot, getProjectSnapshot, mcpCtx, urlPath, method, safeBody, headers, principal, extraRoutes } = opts;
	const reqProj = urlPath.startsWith(API_ROUTES.SNAPSHOT) ? new URL(`http://chronos${urlPath}`).searchParams.get('project') : null;
	try {
		return (await serverDagKernel.handleWireObserveRoute(urlPath, method, headers, principal))
			?? (urlPath.startsWith(API_ROUTES.MCP_MANIFEST) && method === 'GET' ? handleMcpManifestRoute() : null)
			?? (urlPath.startsWith(API_ROUTES.MCP_TWIN) && method === 'POST' ? await handleTwinMcpHttp(mcpCtx, safeBody, principal) : null)
			?? (urlPath.startsWith(API_ROUTES.MCP_FORENSIC) && method === 'POST' ? await handleForensicMcpHttp(mcpCtx, safeBody, principal) : null)
			?? (await handleSecurityRoutes(handle, urlPath, method, safeBody, headers, principal))
			?? (await handlePrivacyRoutes(handle, urlPath, method, principal))
			?? (await handleVaultAndSyncRoutes(handle, urlPath, method, safeBody, headers, principal))
			?? (await handleCollabRoutes(handle, urlPath, method, safeBody, principal))
			?? (await handleThemeAndPreferenceRoutes(handle, urlPath, method, safeBody, headers, principal))
			?? (await handleProjectAndAiRoutes(handle, snapshot, urlPath, method, safeBody, headers, principal))
			?? (await handleGamificationRoutes(handle, urlPath, method, safeBody, headers, principal))
			?? (urlPath.startsWith(API_ROUTES.HELP_BOOK) && method === 'GET' ? okResponse({ chapters: compileHelpBookFromDocs(loadLiveDocsMarkdownMap()) }) : null)
			?? (urlPath.startsWith(API_ROUTES.SNAPSHOT) && method === 'GET' ? okResponse(getProjectSnapshot(reqProj) ?? snapshot) : null)
			?? (urlPath.startsWith(API_ROUTES.WORKSPACES) && method === 'POST' ? await handleWorkspaceRoute(handle, snapshot, safeBody, method, headers, principal) : null)
			?? (extraRoutes ? await extraRoutes() : null)
			?? { status: HTTP_STATUS.NOT_FOUND, payload: { error: 'Unknown Chronos API route' } };
	} catch (err) {
		const msg = err instanceof Error ? err.message : '';
		return sanitizedErrorResponse(msg.startsWith('Rate limited') ? HTTP_STATUS.TOO_MANY_REQUESTS : HTTP_STATUS.BAD_REQUEST, err);
	}
}
