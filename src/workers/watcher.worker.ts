/**
 * @author Oblx <code@oblx.dev>
 * @description Incremental single-file re-indexing watcher (< 50ms) and Structured Deviation Audit Annotations (Atn) repository.
 */
import { createStructuredDeviationMetadata, type DeviationTemplateId } from '@config/registries/annotation.templates';
import { APP_METADATA, HIS_SAFETY_THRESHOLDS } from '@config/constants';
import type { AnnotationKind, EntityKind } from '@config/metamodel.constants';
import type { ChronosDatabaseHandle } from '@lib/db/client';
import { annotations, type DrizzleAnnotationRow } from '@lib/db/sqlite/schema/tables';
import { indexSourcesIntoDb, type WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import type { SourceFileUnit } from '@core/metamodel/workspace.sources';

export interface IncrementalWatchCycleResult {
	readonly updatedFilePath: string;
	readonly elapsedMs: number;
	readonly withinBudget: boolean;
	readonly preservedAnnotationCount: number;
	readonly snapshot: WorkspaceSnapshot;
	readonly annotations: readonly DrizzleAnnotationRow[];
}

export function attachAuditAnnotation(
	handle: ChronosDatabaseHandle,
	input: {
		readonly entityKind: EntityKind;
		readonly qualifiedName: string;
		readonly tagKind: AnnotationKind;
		readonly note: string;
		readonly ruleCode?: string | null;
		readonly templateId?: DeviationTemplateId | null;
		readonly reviewer?: string | null;
		readonly ticketId?: string | null;
		readonly expiresAt?: number | null;
		readonly author?: string;
	}
): DrizzleAnnotationRow {
	const meta = input.templateId
		? createStructuredDeviationMetadata(
				input.templateId,
				input.note,
				input.ticketId ?? undefined,
				input.reviewer ?? input.author ?? APP_METADATA.AUTHOR
			)
		: null;

	return handle.db
		.insert(annotations)
		.values({
			entityKind: input.entityKind,
			qualifiedName: input.qualifiedName,
			tagKind: input.tagKind,
			ruleCode: input.ruleCode ?? null,
			templateId: input.templateId ?? null,
			reviewer: input.reviewer ?? meta?.reviewer ?? null,
			ticketId: input.ticketId ?? meta?.ticketId ?? null,
			expiresAt: input.expiresAt ?? meta?.expiresAt ?? null,
			note: input.note,
			author: input.author ?? APP_METADATA.AUTHOR,
			createdAt: Date.now(),
		})
		.returning()
		.get();
}

export function listAuditAnnotations(handle: ChronosDatabaseHandle): readonly DrizzleAnnotationRow[] {
	return handle.db.select().from(annotations).all();
}

export function reindexSingleFileIncremental(
	handle: ChronosDatabaseHandle,
	existingSources: readonly SourceFileUnit[],
	updatedFilePath: string,
	updatedSourceCode: string
): IncrementalWatchCycleResult {
	const startNs = typeof Bun !== 'undefined' ? Bun.nanoseconds() : performance.now() * 1_000_000;
	const cleanTarget = updatedFilePath.replace(/^\.\//, '');

	const nextSources: SourceFileUnit[] = [];
	let replaced = false;
	for (const unit of existingSources) {
		if (unit.path.replace(/^\.\//, '') === cleanTarget) {
			nextSources.push({ path: cleanTarget, code: updatedSourceCode });
			replaced = true;
		} else {
			nextSources.push(unit);
		}
	}
	if (!replaced) nextSources.push({ path: cleanTarget, code: updatedSourceCode });

	const snapshot = indexSourcesIntoDb(handle, nextSources);
	const savedAnnotations = listAuditAnnotations(handle);
	const endNs = typeof Bun !== 'undefined' ? Bun.nanoseconds() : performance.now() * 1_000_000;
	const elapsedMs = Math.round(((endNs - startNs) / 1_000_000) * 100) / 100;

	return {
		updatedFilePath: cleanTarget,
		elapsedMs,
		withinBudget: elapsedMs <= HIS_SAFETY_THRESHOLDS.INCREMENTAL_BUDGET_MS,
		preservedAnnotationCount: savedAnnotations.length,
		snapshot,
		annotations: savedAnnotations,
	};
}

export function createDebouncedIncrementalWatcher(
	handle: ChronosDatabaseHandle,
	initialSources: readonly SourceFileUnit[],
	onReindexed: (result: IncrementalWatchCycleResult) => void,
	debounceMs: number = HIS_SAFETY_THRESHOLDS.DEBOUNCE_WATCH_MS
): {
	readonly notifyFileSaved: (filePath: string, newCode: string) => void;
	readonly flushNow: (filePath: string, newCode: string) => IncrementalWatchCycleResult;
} {
	let currentSources: readonly SourceFileUnit[] = [...initialSources];
	let timer: ReturnType<typeof setTimeout> | null = null;

	function executeIncremental(filePath: string, newCode: string): IncrementalWatchCycleResult {
		const res = reindexSingleFileIncremental(handle, currentSources, filePath, newCode);
		const clean = filePath.replace(/^\.\//, '');
		const exists = currentSources.some((s) => s.path.replace(/^\.\//, '') === clean);
		currentSources = exists
			? currentSources.map((s) => (s.path.replace(/^\.\//, '') === clean ? { path: clean, code: newCode } : s))
			: [...currentSources, { path: clean, code: newCode }];
		onReindexed(res);
		return res;
	}

	return {
		notifyFileSaved(filePath: string, newCode: string): void {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => { timer = null; executeIncremental(filePath, newCode); }, debounceMs);
		},
		flushNow(filePath: string, newCode: string): IncrementalWatchCycleResult {
			if (timer) { clearTimeout(timer); timer = null; }
			return executeIncremental(filePath, newCode);
		},
	};
}
