/**
 * @author Oblx <code@oblx.dev>
 * @description Forensic MCP URI resources (chronos://project/{projectId}/{manifest,hotspots,cycles,codecheck}).
 */
import { buildProjectCodemapProjection } from '@core/graph/codemap';
import { computeTarjanScc } from '@core/graph/scc.tarjan';
import { evaluateWorkspaceCodeCheck } from '@core/metrics/codecheck.engine';
import { projects } from '@lib/db/sqlite/schema/tables';
import type { McpRuntimeContext } from './mcp.types';

const RESOURCE_KINDS = ['manifest', 'hotspots', 'cycles', 'codecheck'] as const;
type ResourceKind = (typeof RESOURCE_KINDS)[number];

export interface McpResourceItem {
	readonly uri: string;
	readonly name: string;
	readonly mimeType: 'application/json';
	readonly description: string;
}

export function listForensicResources(ctx: McpRuntimeContext): readonly McpResourceItem[] {
	const dbProjects = ctx.handle.db.select().from(projects).all();
	const slugs = Array.from(new Set(['chronos-core', ...dbProjects.map((p) => p.slug)]));
	const out: McpResourceItem[] = [];
	for (const slug of slugs) {
		for (const kind of RESOURCE_KINDS) {
			out.push({
				uri: `chronos://project/${slug}/${kind}`,
				name: `${slug}:${kind}`,
				mimeType: 'application/json',
				description: `Chronos ${kind} JSON telemetry for project ${slug}.`,
			});
		}
	}
	return out;
}

function buildResourcePayload(ctx: McpRuntimeContext, projectId: string, kind: ResourceKind): unknown {
	const snap = ctx.getSnapshot(projectId);
	const scc = computeTarjanScc(snap.nodes, snap.edges);
	if (kind === 'manifest') {
		const codemap = buildProjectCodemapProjection(snap.nodes, snap.edges, scc.cyclicEntityIds);
		const dbRow = ctx.handle.db.select().from(projects).all().find((p) => p.slug === projectId || String(p.id) === projectId);
		return {
			projectId,
			name: dbRow?.name ?? projectId,
			shortCode: dbRow?.shortCode ?? projectId.toUpperCase(),
			indexedFilesCount: snap.indexedFilesCount,
			entityCount: snap.nodes.length,
			edgeCount: snap.edges.length,
			cyclicClusterCount: scc.cyclicClusters.length,
			entryPoints: codemap.entryPoints.slice(0, 8),
		};
	}
	if (kind === 'hotspots') {
		return {
			projectId,
			hotspots: [...snap.nodes].sort((a, b) => b.cyclomatic - a.cyclomatic || b.halsteadVolume - a.halsteadVolume).slice(0, 15),
		};
	}
	if (kind === 'cycles') {
		return {
			projectId,
			hasCycles: snap.hasCycles,
			cyclicClusterCount: scc.cyclicClusters.length,
			cyclicClusters: scc.cyclicClusters.slice(0, 20),
		};
	}
	const suite = evaluateWorkspaceCodeCheck(snap.nodes, snap.edges, snap.sourceMap);
	const bySeverity: Record<string, number> = {};
	for (const v of suite.violations) bySeverity[v.severity] = (bySeverity[v.severity] ?? 0) + 1;
	return { projectId, violationCount: suite.violations.length, suppressedCount: suite.suppressedCount, bySeverity };
}

export function readForensicResource(
	ctx: McpRuntimeContext,
	uri: string
): { readonly contents: ReadonlyArray<{ readonly uri: string; readonly mimeType: string; readonly text: string }> } {
	const match = uri.match(/^chronos:\/\/project\/([^/]+)\/(manifest|hotspots|cycles|codecheck)$/);
	if (!match) throw new Error(`Invalid or unsupported resource URI: ${uri}`);
	const payload = buildResourcePayload(ctx, match[1]!, match[2] as ResourceKind);
	return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(payload) }] };
}
