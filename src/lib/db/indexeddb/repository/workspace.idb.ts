/**
 * @author Oblx <code@oblx.dev>
 * @description Offline IndexedDB workspace & project repository converting between HUD project tabs, source_units, and Drizzle rows (v2.2.0).
 */
import { PROJECT_VISIBILITY, WORKSPACE_DEFAULTS, type ProjectVisibility } from '@config/constants';
import { LEXICAL_CONSTANTS } from '@config/metamodel.constants';
import { countNonEmptyLines, detectLanguageFromPath } from '@core/ast/parsers';
import { computeTopologicalSort } from '@core/graph/topological_sort';
import { mapEntitiesToGraphNodes } from '@core/metamodel/entities/registry/entity.registry';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import type { DrizzleEntityRow, DrizzleMetricRow, DrizzleSourceUnitRow } from '@lib/db/sqlite/schema/tables';
import { computeDeterministicChecksum } from '@lib/utils/byte_formatter';
import {
	getAllOfflineMirrorBundles,
	putOfflineMirrorBundle,
	removeOfflineMirrorBundle,
	type OfflineDrizzleMirrorBundle,
} from '../mirror/idb.mirror';

export interface WorkspaceTabDescriptor {
	readonly id: string;
	readonly projectId?: number;
	readonly projectIdentityKey?: string;
	readonly snapshotRevision?: number;
	readonly shortCode?: string;
	readonly slug?: string;
	readonly visibility?: ProjectVisibility;
	readonly name: string;
	readonly updatedAt: number;
	readonly isDirty: boolean;
	readonly snapshot: WorkspaceSnapshot;
}

export function deriveShortCodeFromName(name: string, fallback = WORKSPACE_DEFAULTS.CORE_SHORT_CODE): string {
	const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9-\s]/g, '');
	if (!cleaned) return fallback;
	const parts = cleaned.split(/[\s-]+/).filter(Boolean);
	if (parts.length === 1) return parts[0]!.slice(0, 12);
	if (parts[0] === 'CHRONOS' && parts[1] === 'CORE') return 'CHR-CORE';
	return `${parts[0]!.slice(0, 6)}-${parts[1]!.slice(0, 5)}`.slice(0, 12);
}

export function snapshotToDrizzleBundle(
	id: string, name: string, snapshot: WorkspaceSnapshot, ownerId = 'guest', projectId = 1,
	projectIdentityKey = `local:${id}`, snapshotRevision = 1
): OfflineDrizzleMirrorBundle {
	const entityRows: DrizzleEntityRow[] = snapshot.nodes.map((n) => ({
		id: n.id, projectId, uuid: n.uuid, kind: n.kind, name: n.name, qualifiedName: n.qualifiedName,
		fileId: null, lineStart: LEXICAL_CONSTANTS.FIRST_LINE, colStart: LEXICAL_CONSTANTS.FIRST_COLUMN,
		lineEnd: n.loc, colEnd: LEXICAL_CONSTANTS.FIRST_COLUMN,
		checksum: n.uuid.split('-').pop() ?? computeDeterministicChecksum(n.qualifiedName),
	}));
	const metricRows: DrizzleMetricRow[] = snapshot.nodes.map((n) => ({
		id: n.id, projectId, entityId: n.id, loc: n.loc, cyclomaticComplexity: n.cyclomatic,
		halsteadVolume: n.halsteadVolume, afferentCoupling: n.afferentCoupling, efferentCoupling: n.efferentCoupling, instability: n.instability,
	}));
	const fileEntries = Object.entries(snapshot.sourceMap).filter(([path]) => !path.includes(LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR));
	const sourceUnitRows: DrizzleSourceUnitRow[] = fileEntries.map(([filePath, content], idx) => {
		const fileEnt = snapshot.nodes.find((n) => n.qualifiedName === filePath);
		return { id: idx + 1, projectId, fileId: fileEnt?.id ?? idx + 1, filePath, language: detectLanguageFromPath(filePath), lineCount: countNonEmptyLines(content), content };
	});
	const now = Date.now(), srcJson = JSON.stringify(snapshot.sourceMap);
	return {
		workspace: { id, ownerId, name, updatedAt: now, indexedFilesCount: snapshot.indexedFilesCount, sourceMapJson: srcJson },
		project: {
			id: projectId, slug: id, shortCode: deriveShortCodeFromName(name), projectIdentityKey, name, description: name,
			ownerId: 1, visibility: PROJECT_VISIBILITY.INTERNAL, defaultBranch: 'main',
			indexedFilesCount: snapshot.indexedFilesCount, entityCount: snapshot.nodes.length,
			violationCount: 0, snapshotRevision, activeHlcTimestamp: `${now}:0`,
			sourceMapJson: srcJson, createdAt: now, updatedAt: now,
		},
		entities: entityRows, references: snapshot.edges.map((e) => ({ ...e, projectId })), metrics: metricRows, sourceUnits: sourceUnitRows,
	};
}

export function drizzleBundleToTab(bundle: OfflineDrizzleMirrorBundle): WorkspaceTabDescriptor {
	const nodes = mapEntitiesToGraphNodes(bundle.entities, bundle.metrics);
	const topo = computeTopologicalSort(nodes.map((n) => n.id), bundle.references.map((r) => ({ fromId: r.sourceEntityId, toId: r.targetEntityId })));
	let sourceMap: Record<string, string> = {};
	try { sourceMap = JSON.parse(bundle.workspace.sourceMapJson); } catch { sourceMap = {}; }
	for (const unit of bundle.sourceUnits ?? []) { if (!sourceMap[unit.filePath]) sourceMap[unit.filePath] = unit.content; }
	return {
		id: bundle.workspace.id, projectId: bundle.project?.id ?? 1,
		projectIdentityKey: bundle.project?.projectIdentityKey ?? `local:${bundle.workspace.id}`,
		snapshotRevision: bundle.project?.snapshotRevision ?? 1,
		shortCode: bundle.project?.shortCode ?? deriveShortCodeFromName(bundle.workspace.name),
		slug: bundle.project?.slug ?? bundle.workspace.id,
		visibility: bundle.project?.visibility ?? PROJECT_VISIBILITY.INTERNAL,
		name: bundle.workspace.name, updatedAt: bundle.workspace.updatedAt, isDirty: false,
		snapshot: { indexedFilesCount: bundle.workspace.indexedFilesCount, workerDurationMicros: WORKSPACE_DEFAULTS.OFFLINE_RESTORE_MICROS, hasCycles: topo.hasCycles, nodes, edges: bundle.references, sourceMap },
	};
}

export async function saveTabToIndexedDb(tab: WorkspaceTabDescriptor): Promise<OfflineDrizzleMirrorBundle> {
	const bundle = snapshotToDrizzleBundle(tab.id, tab.name, tab.snapshot, 'guest', tab.projectId ?? 1, tab.projectIdentityKey, tab.snapshotRevision ?? 1);
	await putOfflineMirrorBundle(bundle);
	return bundle;
}

export async function loadAllTabsFromIndexedDb(): Promise<readonly WorkspaceTabDescriptor[]> {
	const bundles = await getAllOfflineMirrorBundles();
	return bundles.map(drizzleBundleToTab);
}

export async function deleteTabFromIndexedDb(tabId: string): Promise<void> {
	await removeOfflineMirrorBundle(tabId);
}
