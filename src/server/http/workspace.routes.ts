/**
 * @author Oblx <code@oblx.dev>
 * @description Modular workspace lifecycle HTTP handlers and live docs markdown reader.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { API_ROUTES, EXPORT_FORMATS, WORKFLOW_WEBHOOK_EVENTS, WORKSPACE_DEFAULTS, WORKSPACE_OPERATIONS } from '@config/constants';
import { CAPABILITY_BITS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { createChronosAiRegistry } from '@lib/ai/provider/client/ai.bridge';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import type { SourceFileUnit } from '@core/metamodel/workspace.sources';
import { createPresetWorkspace, createWorkspaceFromSources, deleteWorkspaceRecord, exportWorkspaceRecord, importWorkspaceRecord, saveWorkspaceRecord } from '@core/metamodel/workspace/manager/workspace.manager';
import { ingestFromRemoteUrl } from '@core/metamodel/workspace/ingestion/remote.fetcher';
import { exportCytoscapeGraph } from '@plugins/exporters/cytoscape.exporter';
import { exportMemgraphCypherBatch, syncAndAnalyzeMemgraph } from '@plugins/exporters/memgraph.exporter';
import { exportSonarQubeReport } from '@plugins/exporters/sonarqube.exporter';
import { dispatchWorkflowWebhookAsync } from '@plugins/exporters/webhook.bridge';
import { badRequestResponse, okResponse, requireCapability, type ApiResponseEnvelope, type RequestPrincipal } from './middleware';

export function loadLiveDocsMarkdownMap(dir = 'docs'): Readonly<Record<string, string>> {
	const out: Record<string, string> = {};
	const walk = (d: string): void => {
		for (const entry of readdirSync(d)) {
			if (entry === 'skills') continue;
			const full = join(d, entry);
			if (statSync(full).isDirectory()) walk(full);
			else if (full.endsWith('.md')) out[`/${full}`] = readFileSync(full, 'utf8');
		}
	};
	walk(dir);
	return out;
}

function requiredWorkspaceCapability(action: string): number {
	if (action === WORKSPACE_OPERATIONS.IMPORT_URL) return CAPABILITY_BITS.WORKSPACE_INGEST_REMOTE;
	if (action === WORKSPACE_OPERATIONS.IMPORT_FILES || action === WORKSPACE_OPERATIONS.IMPORT) return CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE;
	if (action === WORKSPACE_OPERATIONS.CLOSE) return CAPABILITY_BITS.WORKSPACE_DELETE;
	return CAPABILITY_BITS.WORKSPACE_CREATE;
}

async function handleRemoteUrlImport(handle: ChronosDatabaseHandle, body: Record<string, unknown>, fallbackSnap: WorkspaceSnapshot): Promise<ApiResponseEnvelope> {
	const targetUrl = String(body.url ?? '').trim();
	if (!targetUrl) return badRequestResponse('Remote URL is required.');
	const customName = body.workspaceName ? String(body.workspaceName) : undefined;
	if (targetUrl.startsWith(API_ROUTES.EXPORT_REPORT)) {
		return okResponse(saveWorkspaceRecord(handle, 'ws-remote-export', customName?.trim() || 'Exported Remote Mirror', fallbackSnap, { kind: 'REMOTE', sourceOrigin: targetUrl }));
	}
	const outcome = await ingestFromRemoteUrl(targetUrl, customName);
	if (outcome.kind === 'BUNDLE') {
		return okResponse(saveWorkspaceRecord(handle, `ws-url-${outcome.bundle.workspaceId}`, customName?.trim() || outcome.bundle.workspaceName, outcome.bundle.snapshot, { kind: 'REMOTE', sourceOrigin: targetUrl }));
	}
	return okResponse(createWorkspaceFromSources(handle, outcome.workspaceName, outcome.files, 'ws-url', { kind: 'REMOTE', sourceOrigin: targetUrl }));
}

export async function handleWorkspaceRoute(
	handle: ChronosDatabaseHandle, fallbackSnap: WorkspaceSnapshot, bodyText: string | undefined, method: string, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope> {
	const body = bodyText ? parseSafeJson<Record<string, unknown>>(bodyText) : {};
	const action = String(body.operation ?? WORKSPACE_OPERATIONS.OPEN);
	const denied = await requireCapability(principal, method, headers, requiredWorkspaceCapability(action));
	if (denied) return denied;
	if (action === WORKSPACE_OPERATIONS.OPEN) return okResponse(createPresetWorkspace(handle, String(body.preset ?? WORKSPACE_DEFAULTS.PRESET_KEYS.CHRONOS_KERNEL)));
	if (action === WORKSPACE_OPERATIONS.REINDEX) {
		const rawFiles = Array.isArray(body.files) ? (body.files as SourceFileUnit[]) : [];
		const wsId = String(body.workspaceId ?? WORKSPACE_DEFAULTS.CORE_ID);
		const wsName = String(body.workspaceName ?? WORKSPACE_DEFAULTS.CORE_NAME);
		const snap = (body.snapshot as WorkspaceSnapshot | undefined) ?? fallbackSnap;
		const sources: SourceFileUnit[] = rawFiles.length > 0 ? rawFiles : Object.entries(snap.sourceMap).filter(([p]) => !p.includes('::')).map(([path, code]) => ({ path, code }));
		if (sources.length > 0) {
			const rec = createWorkspaceFromSources(handle, wsName, sources, wsId === WORKSPACE_DEFAULTS.CORE_ID ? 'ws-core' : 'ws-local', { kind: wsId === WORKSPACE_DEFAULTS.CORE_ID ? 'CORE' : 'LOCAL', sourceOrigin: String(body.projectIdentityKey ?? wsId) });
			dispatchWorkflowWebhookAsync(handle, WORKFLOW_WEBHOOK_EVENTS.PROJECT_INDEXED, { projectId: rec.id, filesCount: sources.length });
			return okResponse(rec);
		}
		return okResponse(saveWorkspaceRecord(handle, wsId, wsName, snap));
	}
	if (action === WORKSPACE_OPERATIONS.IMPORT_FILES) {
		const rawFiles = Array.isArray(body.files) ? (body.files as SourceFileUnit[]) : [];
		if (rawFiles.length === 0) return badRequestResponse('At least one source file is required.');
		const rec = createWorkspaceFromSources(handle, String(body.workspaceName ?? WORKSPACE_DEFAULTS.UPLOADED_NAME), rawFiles, 'ws-zip', { kind: 'ZIP', sourceOrigin: String(body.sourceOrigin ?? body.workspaceName ?? WORKSPACE_DEFAULTS.UPLOADED_NAME) });
		dispatchWorkflowWebhookAsync(handle, WORKFLOW_WEBHOOK_EVENTS.PROJECT_INDEXED, { projectId: rec.id, filesCount: rawFiles.length });
		return okResponse(rec);
	}
	if (action === WORKSPACE_OPERATIONS.IMPORT_URL) return handleRemoteUrlImport(handle, body, fallbackSnap);
	if (action === WORKSPACE_OPERATIONS.SAVE) {
		const snap = (body.snapshot as WorkspaceSnapshot) ?? fallbackSnap;
		const aiBridge = createChronosAiRegistry({ provider_url: body.provider_url as string | undefined, provider_bearer: body.provider_bearer as string | undefined });
		return okResponse({ ...saveWorkspaceRecord(handle, String(body.workspaceId ?? WORKSPACE_DEFAULTS.CORE_ID), String(body.workspaceName ?? WORKSPACE_DEFAULTS.CORE_NAME), snap), aiStatus: aiBridge.status });
	}
	if (action === WORKSPACE_OPERATIONS.CLOSE) {
		const wsId = String(body.workspaceId ?? '');
		if (wsId) deleteWorkspaceRecord(handle, wsId);
		return okResponse({ closedId: wsId });
	}
	if (action === WORKSPACE_OPERATIONS.IMPORT) {
		const bundleJson = String(body.bundleJson ?? '').trim();
		return bundleJson ? okResponse(importWorkspaceRecord(handle, bundleJson)) : badRequestResponse('Bundle JSON is required.');
	}
	return badRequestResponse('Unsupported workspace operation');
}

export async function handleQueryAndExportRoutes(
	urlPath: string, method: string, bodyText: string | undefined, headers: Record<string, string>, principal: RequestPrincipal, snap: WorkspaceSnapshot
): Promise<ApiResponseEnvelope | null> {
	if (urlPath.startsWith(API_ROUTES.GRAPH_QUERY) && method === 'POST') {
		const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.METAMODEL_QUERY);
		if (denied) return denied;
		const body = bodyText ? parseSafeJson<Record<string, unknown>>(bodyText) : {};
		const focalId = Number(body.focalEntityId ?? snap.nodes[0]?.id ?? WORKSPACE_DEFAULTS.FALLBACK_ENTITY_ID);
		return okResponse(await syncAndAnalyzeMemgraph(focalId, snap.nodes, snap.edges, body.maxHops ? Number(body.maxHops) : undefined));
	}
	if (urlPath.startsWith(API_ROUTES.EXPORT_REPORT) && method === 'GET') {
		const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.EXPORT_ARTIFACTS);
		if (denied) return denied;
		if (urlPath.includes(EXPORT_FORMATS.WORKSPACE_BUNDLE)) return okResponse(exportWorkspaceRecord(WORKSPACE_DEFAULTS.CORE_ID, WORKSPACE_DEFAULTS.CORE_NAME, snap));
		if (urlPath.includes(EXPORT_FORMATS.MEMGRAPH_CYPHER)) return okResponse(exportMemgraphCypherBatch(snap.nodes, snap.edges));
		return okResponse(urlPath.includes(EXPORT_FORMATS.CYTOSCAPE) ? exportCytoscapeGraph(snap.nodes, snap.edges) : exportSonarQubeReport(snap.nodes));
	}
	return null;
}
