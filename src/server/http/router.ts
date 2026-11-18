/**
 * @author Oblx <code@oblx.dev>
 * @description Hardened HTTP API router unifying Metamodel, Dual-Spine & Twin MCP, Multi-Project CRUD, Auth, RBAC, AEAD Vault, and HLC Sync.
 */
import { API_ROUTES, HTTP_STATUS, WORKFLOW_WEBHOOK_EVENTS, WORKSPACE_DEFAULTS } from '@config/constants';
import { LEXICAL_CONSTANTS } from '@config/metamodel.constants';
import { CAPABILITY_BITS } from '@config/security.constants';
import { closeChronosDb, createChronosDb, type ChronosDatabaseHandle } from '@lib/db/client';
import { ensureSeededOperatorAccount } from '@lib/db/seed.operator';
import { bootstrapDefaultWorkspace, indexSourcesIntoDb, type WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { saveWorkspaceRecord } from '@core/metamodel/workspace/manager/workspace.manager';
import { evaluateWorkspaceCodeCheck } from '@core/metrics/codecheck.engine';
import { dispatchWorkflowWebhookAsync } from '@plugins/exporters/webhook.bridge';
import { ensureDefaultProjectsSeeded } from '../routes/project.routes';
import { ensureCommunityThemesSeeded } from '../routes/theme.routes';
import { badRequestResponse, normalizeHeaders, okResponse, parseBodyObject, requireCapability, resolveRequestPrincipal, sanitizedErrorResponse, type ApiResponseEnvelope, type RequestPrincipal } from './middleware';
import { dispatchChronosDomainRoutes, finalizeEnvelopeForPrincipal, sanitizeInboundBody } from './domain.dispatch';
import { handleQueryAndExportRoutes, loadLiveDocsMarkdownMap } from './workspace.routes';
import { type McpRuntimeContext } from '../mcp';
import { emitClusterServerCommit } from '@server/ws/ws.hub';
import { setTwinBridgeDbHandle } from '@server/ws/twin.bridge';
import { serverDagKernel } from './server.kernel';

export { loadLiveDocsMarkdownMap };
let activeHandle: ChronosDatabaseHandle | null = null, cachedSnapshot: WorkspaceSnapshot | null = null;
let customSourceFiles: Array<{ readonly path: string; readonly code: string }> = [];
const projectSnapshots = new Map<string, WorkspaceSnapshot>();

export async function ensureSnapshot(): Promise<WorkspaceSnapshot> {
	if (!activeHandle || !cachedSnapshot) {
		activeHandle = createChronosDb();
		setTwinBridgeDbHandle(activeHandle);
		await ensureSeededOperatorAccount(activeHandle);
		cachedSnapshot = (await bootstrapDefaultWorkspace(activeHandle)).snapshot;
		projectSnapshots.set('chronos-core', cachedSnapshot);
		ensureDefaultProjectsSeeded(activeHandle, cachedSnapshot);
		ensureCommunityThemesSeeded(activeHandle);
		saveWorkspaceRecord(activeHandle, WORKSPACE_DEFAULTS.CORE_ID, WORKSPACE_DEFAULTS.CORE_NAME, cachedSnapshot);
	}
	return cachedSnapshot;
}

function buildMcpContext(): McpRuntimeContext {
	return {
		handle: activeHandle!,
		getSnapshot: (key) => (key ? projectSnapshots.get(key) : undefined) ?? projectSnapshots.get('chronos-self') ?? cachedSnapshot!,
		setSnapshot: (key, snap) => { projectSnapshots.set(key, snap); },
	};
}

export async function resolveWsUpgradePrincipal(token?: string | null): Promise<RequestPrincipal> {
	await ensureSnapshot();
	return resolveRequestPrincipal(activeHandle!, token ? { authorization: `Bearer ${token}` } : {});
}

async function handleMetamodelExtraRoutes(
	urlPath: string, method: string, bodyText: string | undefined, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	if (urlPath.startsWith(API_ROUTES.REINDEX_WORKSPACE) && method === 'POST') {
		const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.WORKSPACE_INDEX_LOCAL);
		if (denied) return denied;
		closeChronosDb(activeHandle); activeHandle = createChronosDb(); setTwinBridgeDbHandle(activeHandle); projectSnapshots.clear();
		await ensureSeededOperatorAccount(activeHandle);
		cachedSnapshot = (await bootstrapDefaultWorkspace(activeHandle)).snapshot; customSourceFiles = [];
		projectSnapshots.set('chronos-core', cachedSnapshot);
		ensureDefaultProjectsSeeded(activeHandle, cachedSnapshot); ensureCommunityThemesSeeded(activeHandle);
		dispatchWorkflowWebhookAsync(activeHandle, WORKFLOW_WEBHOOK_EVENTS.PROJECT_INDEXED, { projectId: 'chronos-core', entityCount: cachedSnapshot.nodes.length });
		return okResponse(cachedSnapshot);
	}
	if (urlPath.startsWith(API_ROUTES.ANALYZE_SOURCE) && method === 'POST') {
		const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.WORKSPACE_INDEX_LOCAL);
		if (denied) return denied;
		const parsed = parseBodyObject(bodyText);
		const filePath = String(parsed.filePath ?? '').trim(), sourceCode = String(parsed.sourceCode ?? '').trim();
		if (!filePath || !sourceCode) return badRequestResponse('Both filePath and sourceCode are required.');
		customSourceFiles = [...customSourceFiles.filter((f) => f.path !== filePath), { path: filePath, code: sourceCode }];
		const baseEntries = Object.entries(cachedSnapshot!.sourceMap).filter(([k]) => !k.includes(LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR)).map(([path, code]) => ({ path, code }));
		cachedSnapshot = indexSourcesIntoDb(activeHandle!, [...baseEntries.filter((b) => b.path !== filePath), ...customSourceFiles]);
		projectSnapshots.set('chronos-core', cachedSnapshot);
		const suite = evaluateWorkspaceCodeCheck(cachedSnapshot.nodes, cachedSnapshot.edges, cachedSnapshot.sourceMap);
		if (suite.violations.length > 0) dispatchWorkflowWebhookAsync(activeHandle, WORKFLOW_WEBHOOK_EVENTS.CODECHECK_REGRESSION, { filePath, violationCount: suite.violations.length });
		return okResponse(cachedSnapshot);
	}
	return handleQueryAndExportRoutes(urlPath, method, bodyText, headers, principal, await ensureSnapshot());
}

export async function handleMetamodelApiRequest(
	urlPath: string, method: string, bodyText?: string, rawHeaders?: Record<string, string | string[] | undefined>
): Promise<ApiResponseEnvelope> {
	try {
		const snapshot = await ensureSnapshot();
		const headers = normalizeHeaders(rawHeaders);
		const principal = await resolveRequestPrincipal(activeHandle!, headers);
		const safeBody = sanitizeInboundBody(bodyText);
		return await serverDagKernel.execute(urlPath, method, principal, safeBody ?? '', async () => {
			const res = await dispatchChronosDomainRoutes({
				handle: activeHandle!, snapshot, getProjectSnapshot: (slug) => (slug ? projectSnapshots.get(slug) : undefined),
				mcpCtx: buildMcpContext(), urlPath, method, safeBody, headers, principal,
				extraRoutes: () => handleMetamodelExtraRoutes(urlPath, method, safeBody, headers, principal),
			});
			if (res.status === HTTP_STATUS.OK && (method === 'POST' || method === 'PUT' || method === 'DELETE') && !urlPath.startsWith(API_ROUTES.WS_COLLAB)) {
				emitClusterServerCommit(WORKSPACE_DEFAULTS.CORE_ID, principal.sid, urlPath, principal.username);
			}
			return finalizeEnvelopeForPrincipal(res, principal);
		});
	} catch (err) {
		return sanitizedErrorResponse(HTTP_STATUS.BAD_REQUEST, err);
	}
}
