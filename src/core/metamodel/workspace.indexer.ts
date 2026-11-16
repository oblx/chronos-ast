/**
 * @author Oblx <code@oblx.dev>
 * @description Drizzle SQLite workspace indexer orchestrating ChronosWorkerPoolScheduler, source_units, and metric persistence.
 */
import { HUD_CONFIG } from '@config/constants';
import { createChronosDb, type ChronosDatabaseHandle } from '@lib/db/client';
import { entities, metrics, references, sourceUnits } from '@lib/db/schema';
import type { GraphEntityNode, GraphReferenceEdge } from '@core/graph/graph_traversal';
import { computeTopologicalSort } from '@core/graph/topological_sort';
import { createEntityPayload } from './entity.factory';
import { mapEntitiesToGraphNodes } from './entities/registry/entity.registry';
import { resolveSymbolicReferences, type ResolvedReferencePayload } from './reference.resolver';
import { calculatePackageStability } from '@core/metrics/stability.engine';
import { countNonEmptyLines, detectLanguageFromPath, type ExtractedReference } from '@core/ast/parsers';
import { ChronosWorkerPoolScheduler } from '@workers/pool/scheduler/worker_pool';
import { loadWorkspaceSources, type SourceFileUnit } from './workspace.sources';

export interface WorkspaceSnapshot {
	readonly indexedFilesCount: number;
	readonly workerDurationMicros: number;
	readonly hasCycles: boolean;
	readonly nodes: readonly GraphEntityNode[];
	readonly edges: readonly GraphReferenceEdge[];
	readonly sourceMap: Readonly<Record<string, string>>;
}

interface InsertedEntityRecord {
	readonly id: number;
	readonly kind: GraphEntityNode['kind'];
	readonly name: string;
	readonly qualifiedName: string;
	readonly sourceSlice: string;
}

const defaultWorkerPool = new ChronosWorkerPoolScheduler();

function ingestSourceUnitsWithPool(
	handle: ChronosDatabaseHandle,
	sources: readonly SourceFileUnit[],
	pool: ChronosWorkerPoolScheduler
): {
	readonly totalMicros: number;
	readonly rawRefs: readonly ExtractedReference[];
	readonly inserted: readonly InsertedEntityRecord[];
	readonly sourceMap: Readonly<Record<string, string>>;
} {
	let totalMicros = 0;
	const rawRefs: ExtractedReference[] = [];
	const inserted: InsertedEntityRecord[] = [];
	const sourceMap: Record<string, string> = {};

	for (const item of sources) {
		sourceMap[item.path] = item.code;
		const res = pool.dispatchIndexFile(item.path, item.code);
		totalMicros += res.durationMicros;
		if (!res.analysis) continue;
		rawRefs.push(...res.analysis.references);
		let fileEntityId = 1;
		for (const sym of res.analysis.symbols) {
			const row = handle.db
				.insert(entities)
				.values(createEntityPayload({
					kind: sym.kind,
					name: sym.name,
					qualifiedName: sym.qualifiedName,
					fileId: sym.qualifiedName === item.path.replace(/^\.\//, '') ? null : fileEntityId,
					lineStart: sym.lineStart,
					colStart: sym.colStart,
					lineEnd: sym.lineEnd,
					colEnd: sym.colEnd,
					sourceContent: sym.sourceSlice,
				}))
				.returning({ id: entities.id })
				.get();
			if (sym.qualifiedName === item.path.replace(/^\.\//, '')) fileEntityId = row.id;
			inserted.push({ id: row.id, kind: sym.kind, name: sym.name, qualifiedName: sym.qualifiedName, sourceSlice: sym.sourceSlice });
			sourceMap[sym.qualifiedName] = sym.sourceSlice;
		}
		handle.db
			.insert(sourceUnits)
			.values({
				fileId: fileEntityId,
				filePath: item.path.replace(/^\.\//, ''),
				language: detectLanguageFromPath(item.path),
				lineCount: countNonEmptyLines(item.code),
				content: item.code,
			})
			.run();
	}
	return { totalMicros, rawRefs, inserted, sourceMap };
}

function persistEntityMetricsWithPool(
	handle: ChronosDatabaseHandle,
	inserted: readonly InsertedEntityRecord[],
	resolvedRefs: readonly ResolvedReferencePayload[],
	pool: ChronosWorkerPoolScheduler
): number {
	let metricMicros = 0;
	for (const ent of inserted) {
		const ca = resolvedRefs.filter((r) => r.targetEntityId === ent.id).length;
		const ce = resolvedRefs.filter((r) => r.sourceEntityId === ent.id).length;
		const stability = calculatePackageStability(ca, ce);
		const metricJob = pool.dispatchCalculateMetrics(ent.qualifiedName, ent.sourceSlice);
		metricMicros += metricJob.durationMicros;
		handle.db
			.insert(metrics)
			.values({
				entityId: ent.id,
				loc: countNonEmptyLines(ent.sourceSlice),
				cyclomaticComplexity: metricJob.complexity?.cyclomaticComplexity ?? HUD_CONFIG.METRIC_DEFAULTS.CYCLOMATIC,
				halsteadVolume: metricJob.halstead?.volume ?? HUD_CONFIG.METRIC_DEFAULTS.HALSTEAD_VOLUME,
				afferentCoupling: ca,
				efferentCoupling: ce,
				instability: stability.instabilityScaled,
			})
			.run();
	}
	return metricMicros;
}

export function indexSourcesIntoDb(
	handle: ChronosDatabaseHandle,
	sources: readonly SourceFileUnit[],
	pool: ChronosWorkerPoolScheduler = defaultWorkerPool
): WorkspaceSnapshot {
	handle.sqlite.exec('DELETE FROM source_units; DELETE FROM metrics; DELETE FROM "references"; DELETE FROM entities;');
	const { totalMicros, rawRefs, inserted, sourceMap } = ingestSourceUnitsWithPool(handle, sources, pool);
	const resolvedRefs = resolveSymbolicReferences(inserted, rawRefs);
	for (const ref of resolvedRefs) handle.db.insert(references).values(ref).run();
	const metricMicros = persistEntityMetricsWithPool(handle, inserted, resolvedRefs, pool);
	const dbEntities = handle.db.select().from(entities).all();
	const dbMetrics = handle.db.select().from(metrics).all();
	const dbRefs = handle.db.select().from(references).all();
	const nodes = mapEntitiesToGraphNodes(dbEntities, dbMetrics);
	const topo = computeTopologicalSort(
		nodes.map((n) => n.id),
		dbRefs.map((r) => ({ fromId: r.sourceEntityId, toId: r.targetEntityId }))
	);
	return { indexedFilesCount: sources.length, workerDurationMicros: totalMicros + metricMicros, hasCycles: topo.hasCycles, nodes, edges: dbRefs, sourceMap };
}

export async function bootstrapDefaultWorkspace(
	handle: ChronosDatabaseHandle = createChronosDb()
): Promise<{ readonly handle: ChronosDatabaseHandle; readonly snapshot: WorkspaceSnapshot }> {
	const sources = await loadWorkspaceSources();
	return { handle, snapshot: indexSourcesIntoDb(handle, sources) };
}
