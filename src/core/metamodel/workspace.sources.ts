/**
 * @author Oblx <code@oblx.dev>
 * @description Workspace source loader and pure in-memory static SPA snapshot builder for TypeScript, Rust, and C++ targets.
 */
import { HUD_CONFIG } from '@config/constants';
import { countNonEmptyLines, type ExtractedReference } from '@core/ast/parsers';
import type { GraphEntityNode, GraphReferenceEdge } from '@core/graph/graph_traversal';
import { computeTopologicalSort } from '@core/graph/topological_sort';
import { calculatePackageStability } from '@core/metrics/stability.engine';
import { ChronosWorkerPoolScheduler } from '@workers/pool/scheduler/worker_pool';
import { createEntityPayload } from './entity.factory';
import { resolveSymbolicReferences } from './reference.resolver';
import type { WorkspaceSnapshot } from './workspace.indexer';

export interface SourceFileUnit {
	readonly path: string;
	readonly code: string;
}

export const EMBEDDED_MULTI_LANG_SAMPLES: readonly SourceFileUnit[] = [
	{
		path: 'src/plugins/kernels/chronos_scheduler.rs',
		code: `pub struct WorkerScheduler {\n\tpub pool_size: usize,\n}\npub fn dispatch_ast_job(lines: usize) -> usize {\n\tif lines > 500 && lines < 5000 {\n\t\tfor idx in 0..lines {\n\t\t\tif idx % 2 == 0 {\n\t\t\t\tcompute_metric_fold(idx);\n\t\t\t}\n\t\t}\n\t}\n\tlines\n}\npub fn compute_metric_fold(seed: usize) -> usize {\n\tif seed > 10 || seed == 0 { return seed + 1; }\n\tseed * 2\n}`,
	},
	{
		path: 'src/plugins/kernels/simd_tokenizer.cpp',
		code: `namespace ChronosSimd {\n\tclass ByteLexer {\n\tpublic:\n\t\tint scanBuffer(int len) {\n\t\t\tif (len <= 0) return 0;\n\t\t\tfor (int i = 0; i < len; i++) {\n\t\t\t\tif (i % 4 == 0 && len > 16) {\n\t\t\t\t\tdispatch_ast_job(i);\n\t\t\t\t}\n\t\t\t}\n\t\t\treturn len;\n\t\t}\n\t};\n}`,
	},
];

const DEFAULT_TS_TARGETS: readonly string[] = [
	'src/core/metrics/complexity.engine.ts',
	'src/core/metrics/halstead.engine.ts',
	'src/core/metrics/stability.engine.ts',
	'src/core/ast/tree_sitter_bridge.ts',
	'src/core/ast/parsers.ts',
	'src/core/graph/graph_traversal.ts',
	'src/core/graph/topological_sort.ts',
	'src/core/metamodel/reference.resolver.ts',
	'src/workers/ast.worker.ts',
];

export async function loadWorkspaceSources(): Promise<SourceFileUnit[]> {
	const loaded: SourceFileUnit[] = [...EMBEDDED_MULTI_LANG_SAMPLES];
	if (typeof Bun !== 'undefined') {
		for (const relPath of DEFAULT_TS_TARGETS) {
			const file = Bun.file(relPath);
			if (await file.exists()) {
				loaded.push({ path: relPath, code: await file.text() });
			}
		}
	}
	return loaded;
}

export function buildInMemorySnapshotFromSources(sources: readonly SourceFileUnit[]): WorkspaceSnapshot {
	const pool = new ChronosWorkerPoolScheduler();
	let totalMicros = 0;
	const rawRefs: ExtractedReference[] = [];
	const sourceMap: Record<string, string> = {};
	const tempEntities: Array<{ readonly id: number; readonly uuid: string; readonly kind: GraphEntityNode['kind']; readonly name: string; readonly qualifiedName: string; readonly sourceSlice: string }> = [];

	for (const unit of sources) {
		sourceMap[unit.path] = unit.code;
		const res = pool.dispatchIndexFile(unit.path, unit.code);
		totalMicros += res.durationMicros;
		if (!res.analysis) continue;
		rawRefs.push(...res.analysis.references);
		for (const sym of res.analysis.symbols) {
			const id = tempEntities.length + 1;
			const payload = createEntityPayload({ kind: sym.kind, name: sym.name, qualifiedName: sym.qualifiedName, fileId: null, lineStart: sym.lineStart, colStart: sym.colStart, lineEnd: sym.lineEnd, colEnd: sym.colEnd, sourceContent: sym.sourceSlice });
			tempEntities.push({ id, uuid: payload.uuid, kind: sym.kind, name: sym.name, qualifiedName: sym.qualifiedName, sourceSlice: sym.sourceSlice });
			sourceMap[sym.qualifiedName] = sym.sourceSlice;
		}
	}

	const resolvedRefs = resolveSymbolicReferences(tempEntities, rawRefs);
	const edges: GraphReferenceEdge[] = resolvedRefs.map((r, i) => ({ id: i + 1, ...r }));
	const nodes: GraphEntityNode[] = tempEntities.map((ent) => {
		const ca = edges.filter((e) => e.targetEntityId === ent.id).length;
		const ce = edges.filter((e) => e.sourceEntityId === ent.id).length;
		const stability = calculatePackageStability(ca, ce);
		const mJob = pool.dispatchCalculateMetrics(ent.qualifiedName, ent.sourceSlice);
		totalMicros += mJob.durationMicros;
		return {
			id: ent.id,
			uuid: ent.uuid,
			kind: ent.kind,
			name: ent.name,
			qualifiedName: ent.qualifiedName,
			loc: countNonEmptyLines(ent.sourceSlice),
			cyclomatic: mJob.complexity?.cyclomaticComplexity ?? HUD_CONFIG.METRIC_DEFAULTS.CYCLOMATIC,
			halsteadVolume: mJob.halstead?.volume ?? HUD_CONFIG.METRIC_DEFAULTS.HALSTEAD_VOLUME,
			afferentCoupling: ca,
			efferentCoupling: ce,
			instability: stability.instabilityScaled,
		};
	});
	const topo = computeTopologicalSort(nodes.map((n) => n.id), edges.map((e) => ({ fromId: e.sourceEntityId, toId: e.targetEntityId })));
	return { indexedFilesCount: sources.length, workerDurationMicros: totalMicros, hasCycles: topo.hasCycles, nodes, edges, sourceMap };
}
