/**
 * @author Oblx <code@oblx.dev>
 * @description Forensic Metamodel MCP tools: self-analysis of src/ TypeScript sources, metamodel query, entity inspection, Codemap trace, and CodeCheck.
 */
import { resolve } from 'node:path';
import { PROJECT_VISIBILITY, WORKFLOW_WEBHOOK_EVENTS } from '@config/constants';
import { resolveVirtualLayerForEntity } from '@config/registries/architecture.schema';
import { buildProjectCodemapProjection, traceCodemapEntryPath } from '@core/graph/codemap';
import { computeTarjanScc } from '@core/graph/scc.tarjan';
import { indexSourcesIntoDb, type WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import type { SourceFileUnit } from '@core/metamodel/workspace.sources';
import { upsertProjectRowFromSnapshot } from '@core/metamodel/workspace/manager/workspace.manager';
import { evaluateWorkspaceCodeCheck } from '@core/metrics/codecheck.engine';
import { computeChidamberKemererSuite } from '@core/metrics/oo_metrics.engine';
import { dispatchWorkflowWebhookAsync } from '@plugins/exporters/webhook.bridge';
import { FORENSIC_TOOL_NAMES, type McpRuntimeContext } from './mcp.types';

function countCrossRingCycles(snap: WorkspaceSnapshot, cyclicClusters: ReturnType<typeof computeTarjanScc>['cyclicClusters']): number {
	const byId = new Map(snap.nodes.map((n) => [n.id, n]));
	let crossRingCount = 0;
	for (const cluster of cyclicClusters) {
		const layers = new Set<string>();
		for (const id of cluster.memberEntityIds) {
			const node = byId.get(id);
			if (node) layers.add(resolveVirtualLayerForEntity(node.qualifiedName).id);
		}
		if (layers.size > 1) crossRingCount += 1;
	}
	return crossRingCount;
}

async function loadTsSourcesFromRoot(rootDir: string): Promise<SourceFileUnit[]> {
	const cleanDir = rootDir.replace(/^\/+|\/+$/g, '') || 'src';
	const absRoot = resolve(process.cwd(), cleanDir);
	if (!absRoot.startsWith(process.cwd())) throw new Error('Invalid rootDir outside workspace boundary.');
	const scanned = Array.from(new Bun.Glob('**/*.ts').scanSync({ cwd: absRoot }))
		.filter((rel) => !rel.includes('node_modules/') && !rel.includes('.trash/') && !rel.includes('dist/'))
		.sort();
	const out: SourceFileUnit[] = [];
	for (const rel of scanned) {
		const path = `${cleanDir}/${rel}`;
		out.push({ path, code: await Bun.file(path).text() });
	}
	return out;
}

async function execAnalyzeSelf(ctx: McpRuntimeContext, args: Readonly<Record<string, unknown>>) {
	const rootDir = typeof args.rootDir === 'string' && args.rootDir.trim() ? args.rootDir.trim() : 'src';
	const sources = await loadTsSourcesFromRoot(rootDir);
	const snapshot = indexSourcesIntoDb(ctx.handle, sources);
	const scc = computeTarjanScc(snapshot.nodes, snapshot.edges);
	const crossRingCycleCount = countCrossRingCycles(snapshot, scc.cyclicClusters);
	upsertProjectRowFromSnapshot(ctx.handle, {
		projectIdentityKey: 'self:chronos-self', slug: 'chronos-self', name: 'Chronos Self-Analysis',
		snapshot, visibility: PROJECT_VISIBILITY.INTERNAL, ownerId: 1,
	});
	ctx.setSnapshot('chronos-self', snapshot);
	const summary = {
		projectId: 'chronos-self', rootDir, indexedFilesCount: snapshot.indexedFilesCount,
		entityCount: snapshot.nodes.length, edgeCount: snapshot.edges.length,
		cyclicSccCount: scc.cyclicClusters.length, crossRingCycleCount,
		hasCycles: crossRingCycleCount > 0, workerDurationMicros: snapshot.workerDurationMicros,
	};
	dispatchWorkflowWebhookAsync(ctx.handle, WORKFLOW_WEBHOOK_EVENTS.PROJECT_INDEXED, summary);
	return summary;
}

function execQueryMetamodel(ctx: McpRuntimeContext, args: Readonly<Record<string, unknown>>) {
	const projectId = typeof args.projectId === 'string' ? args.projectId : undefined;
	const snap = ctx.getSnapshot(projectId);
	const kindFilter = typeof args.kind === 'string' ? args.kind.trim().toUpperCase() : '';
	const pat = typeof args.namePattern === 'string' ? args.namePattern.trim().toLowerCase() : '';
	const limit = Math.min(100, Math.max(1, Number(args.limit ?? 40) || 40));
	const filtered = snap.nodes.filter((n) => (!kindFilter || n.kind === kindFilter) && (!pat || n.name.toLowerCase().includes(pat) || n.qualifiedName.toLowerCase().includes(pat)));
	const entities = filtered.slice(0, limit);
	const idSet = new Set(entities.map((e) => e.id));
	const edges = snap.edges.filter((e) => idSet.has(e.sourceEntityId) || idSet.has(e.targetEntityId)).slice(0, 100);
	return { projectId: projectId ?? 'active', totalMatched: filtered.length, totalEdges: snap.edges.length, entities, edges };
}

function resolveTargetNode(snap: WorkspaceSnapshot, args: Readonly<Record<string, unknown>>) {
	const idArg = typeof args.entityId === 'number' ? args.entityId : undefined;
	const qArg = typeof args.qualifiedName === 'string' ? args.qualifiedName : undefined;
	const nArg = typeof args.name === 'string' ? args.name : undefined;
	return snap.nodes.find((n) => (idArg !== undefined && n.id === idArg) || (qArg && n.qualifiedName === qArg) || (nArg && n.name === nArg)) ?? snap.nodes[0];
}

function execInspectEntity(ctx: McpRuntimeContext, args: Readonly<Record<string, unknown>>) {
	const snap = ctx.getSnapshot(typeof args.projectId === 'string' ? args.projectId : undefined);
	const target = resolveTargetNode(snap, args);
	if (!target) return { error: 'Workspace has no indexed entities.' };
	const ckMap = computeChidamberKemererSuite(snap.nodes, snap.edges);
	const suite = evaluateWorkspaceCodeCheck(snap.nodes, snap.edges, snap.sourceMap);
	return { entity: target, ckMetrics: ckMap[target.id] ?? null, sourceSlice: snap.sourceMap[target.qualifiedName] ?? '', violations: suite.violations.filter((v) => v.entityId === target.id) };
}

function execTraceCodemapEntry(ctx: McpRuntimeContext, args: Readonly<Record<string, unknown>>) {
	const projectId = typeof args.projectId === 'string' ? args.projectId : undefined;
	const snap = ctx.getSnapshot(projectId);
	const scc = computeTarjanScc(snap.nodes, snap.edges);
	const proj = buildProjectCodemapProjection(snap.nodes, snap.edges, scc.cyclicEntityIds);
	const target = typeof args.entityId === 'number' || typeof args.qualifiedName === 'string' ? resolveTargetNode(snap, args) : undefined;
	const hops = traceCodemapEntryPath(proj, target?.id ?? proj.entryPoints[0]?.entityId ?? null);
	return { projectId: projectId ?? 'active', entryPoints: proj.entryPoints.slice(0, 12), hops, totalClusters: proj.moduleClusters.length, totalFileContainers: proj.fileContainers.length };
}

function execRunCodeCheck(ctx: McpRuntimeContext, args: Readonly<Record<string, unknown>>) {
	const projectId = typeof args.projectId === 'string' ? args.projectId : undefined;
	const snap = ctx.getSnapshot(projectId);
	const suite = evaluateWorkspaceCodeCheck(snap.nodes, snap.edges, snap.sourceMap, [], [], Boolean(args.useHisSafetyProfile));
	const complianceScore = Math.max(0, 100 - Math.min(100, Math.round(suite.violations.length * 0.25)));
	if (suite.violations.length > 0) dispatchWorkflowWebhookAsync(ctx.handle, WORKFLOW_WEBHOOK_EVENTS.CODECHECK_REGRESSION, { projectId: projectId ?? 'active', violationCount: suite.violations.length, complianceScore });
	return { projectId: projectId ?? 'active', violationCount: suite.violations.length, suppressedCount: suite.suppressedCount, complianceScore, violations: suite.violations.slice(0, 50) };
}

export async function executeForensicTool(ctx: McpRuntimeContext, toolName: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
	if (toolName === FORENSIC_TOOL_NAMES.ANALYZE_SELF) return execAnalyzeSelf(ctx, args);
	if (toolName === FORENSIC_TOOL_NAMES.QUERY_METAMODEL) return execQueryMetamodel(ctx, args);
	if (toolName === FORENSIC_TOOL_NAMES.INSPECT_ENTITY) return execInspectEntity(ctx, args);
	if (toolName === FORENSIC_TOOL_NAMES.TRACE_CODEMAP_ENTRY) return execTraceCodemapEntry(ctx, args);
	if (toolName === FORENSIC_TOOL_NAMES.RUN_CODECHECK) return execRunCodeCheck(ctx, args);
	throw new Error(`Unknown Forensic MCP tool: ${toolName}`);
}
