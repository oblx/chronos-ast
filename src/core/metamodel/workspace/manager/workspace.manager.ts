/**
 * @author Oblx <code@oblx.dev>
 * @description Idempotent multi-workspace lifecycle manager with deterministic projectIdentityKey upsert, re-indexing, and bundle serialization.
 */
import { PROJECT_VISIBILITY, WORKSPACE_DEFAULTS, type ProjectVisibility } from '@config/constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { projects, workspaces } from '@lib/db/sqlite/schema/tables';
import { deriveShortCodeFromName } from '@lib/db/indexeddb/repository/workspace.idb';
import { eq, or } from 'drizzle-orm';
import { indexSourcesIntoDb, type WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import type { SourceFileUnit } from '@core/metamodel/workspace.sources';
import { computeProjectIdentity, type ProjectOriginKind } from '@core/metamodel/project.identity';
import { evaluateWorkspaceCodeCheck } from '@core/metrics/codecheck.engine';
import { deserializeWorkspaceBundle, serializeWorkspaceBundle, type PortableWorkspaceBundle } from '../serialization/bundle.serializer';

export interface ManagedWorkspaceRecord {
	readonly id: string;
	readonly projectId?: number;
	readonly projectIdentityKey: string;
	readonly slug: string;
	readonly shortCode: string;
	readonly snapshotRevision: number;
	readonly name: string;
	readonly updatedAt: number;
	readonly snapshot: WorkspaceSnapshot;
}

const PRESET_TEMPLATES: Readonly<Record<string, { readonly name: string; readonly files: readonly SourceFileUnit[] }>> = {
	[WORKSPACE_DEFAULTS.PRESET_KEYS.CHRONOS_KERNEL]: {
		name: 'Rust & C++ Telemetry Kernel',
		files: [
			{ path: 'src/kernel/ring_buffer.rs', code: `pub struct RingBuffer {\n\tpub capacity: usize,\n}\npub fn push_telemetry_frame(seq: usize) -> usize {\n\tif seq > 0 && seq % 2 == 0 {\n\t\treturn flush_ring(seq);\n\t}\n\tseq\n}\npub fn flush_ring(slot: usize) -> usize {\n\tif slot > 128 { return 0; }\n\tslot + 1\n}` },
			{ path: 'src/kernel/avx_scanner.cpp', code: `namespace AvxEngine {\n\tclass VectorScanner {\n\tpublic:\n\t\tint alignFrame(int offset) {\n\t\t\tif (offset < 0) return 0;\n\t\t\treturn push_telemetry_frame(offset);\n\t\t}\n\t};\n}` },
		],
	},
	[WORKSPACE_DEFAULTS.PRESET_KEYS.HEXAGONAL_GRAPH]: {
		name: 'Hexagonal Graph Engine',
		files: [
			{ path: 'src/domain/dag_scheduler.ts', code: `export function scheduleDagNodes(ids: number[]): number {\n\tlet visited = 0;\n\tfor (let i = 0; i < ids.length; i++) {\n\t\tif (ids[i] > 0) {\n\t\t\tvisited += verifyNodeInvariant(ids[i]);\n\t\t}\n\t}\n\treturn visited;\n}\nexport function verifyNodeInvariant(id: number): number {\n\treturn id > 10 ? 2 : 1;\n}` },
		],
	},
};

export function upsertProjectRowFromSnapshot(
	handle: ChronosDatabaseHandle,
	opts: { readonly projectIdentityKey: string; readonly slug: string; readonly name: string; readonly snapshot: WorkspaceSnapshot; readonly branch?: string; readonly visibility?: ProjectVisibility; readonly ownerId?: number }
) {
	const now = Date.now(), violations = evaluateWorkspaceCodeCheck(opts.snapshot.nodes, opts.snapshot.edges, opts.snapshot.sourceMap).violations.length;
	const existing = handle.db.select().from(projects).where(or(eq(projects.projectIdentityKey, opts.projectIdentityKey), eq(projects.slug, opts.slug))).get();
	if (existing) {
		const nextRev = (existing.snapshotRevision ?? 1) + 1;
		return handle.db.update(projects).set({
			name: opts.name, indexedFilesCount: opts.snapshot.indexedFilesCount, entityCount: opts.snapshot.nodes.length,
			violationCount: violations, snapshotRevision: nextRev, defaultBranch: opts.branch ?? existing.defaultBranch, updatedAt: now,
		}).where(eq(projects.id, existing.id)).returning().get()!;
	}
	return handle.db.insert(projects).values({
		slug: opts.slug, shortCode: deriveShortCodeFromName(opts.name), projectIdentityKey: opts.projectIdentityKey,
		name: opts.name, description: opts.name, ownerId: opts.ownerId ?? 1, visibility: opts.visibility ?? PROJECT_VISIBILITY.INTERNAL,
		defaultBranch: opts.branch ?? 'main', indexedFilesCount: opts.snapshot.indexedFilesCount, entityCount: opts.snapshot.nodes.length,
		violationCount: violations, snapshotRevision: 1, activeHlcTimestamp: `${now}:0`, sourceMapJson: '{}', createdAt: now, updatedAt: now,
	}).returning().get();
}

export function saveWorkspaceRecord(
	handle: ChronosDatabaseHandle, id: string, name: string, snapshot: WorkspaceSnapshot,
	meta?: { readonly projectIdentityKey?: string; readonly slug?: string; readonly branch?: string; readonly kind?: ProjectOriginKind; readonly sourceOrigin?: string }
): ManagedWorkspaceRecord {
	const updatedAt = Date.now();
	const identity = computeProjectIdentity({ kind: meta?.kind ?? (id === WORKSPACE_DEFAULTS.CORE_ID ? 'CORE' : 'LOCAL'), name, sourceOrigin: meta?.sourceOrigin ?? meta?.slug ?? id, branchOrRef: meta?.branch });
	const key = meta?.projectIdentityKey ?? identity.projectIdentityKey, slug = meta?.slug ?? identity.slug;
	const rowPayload = { name, updatedAt, indexedFilesCount: snapshot.indexedFilesCount, sourceMapJson: JSON.stringify(snapshot.sourceMap) };
	handle.db.insert(workspaces).values({ id, ...rowPayload }).onConflictDoUpdate({ target: workspaces.id, set: rowPayload }).run();
	const proj = upsertProjectRowFromSnapshot(handle, { projectIdentityKey: key, slug, name, snapshot, branch: meta?.branch });
	return { id, projectId: proj.id, projectIdentityKey: proj.projectIdentityKey, slug: proj.slug, shortCode: proj.shortCode, snapshotRevision: proj.snapshotRevision, name, updatedAt, snapshot };
}

export function createWorkspaceFromSources(
	handle: ChronosDatabaseHandle, workspaceName: string, files: readonly SourceFileUnit[], idPrefix = 'ws-custom',
	meta?: { readonly kind?: ProjectOriginKind; readonly sourceOrigin?: string; readonly branchOrRef?: string }
): ManagedWorkspaceRecord {
	const cleanName = workspaceName.trim() || WORKSPACE_DEFAULTS.UPLOADED_NAME;
	const originKind: ProjectOriginKind = meta?.kind ?? (idPrefix === 'ws-preset' ? 'PRESET' : idPrefix === 'ws-url' ? 'REMOTE' : idPrefix === 'ws-zip' ? 'ZIP' : 'LOCAL');
	const identity = computeProjectIdentity({ kind: originKind, name: cleanName, sourceOrigin: meta?.sourceOrigin ?? cleanName, branchOrRef: meta?.branchOrRef });
	const snapshot = indexSourcesIntoDb(handle, files);
	return saveWorkspaceRecord(handle, identity.workspaceId, cleanName, snapshot, { projectIdentityKey: identity.projectIdentityKey, slug: identity.slug, branch: meta?.branchOrRef, kind: originKind });
}

export function createPresetWorkspace(handle: ChronosDatabaseHandle, presetKey: string): ManagedWorkspaceRecord {
	const resolvedKey = PRESET_TEMPLATES[presetKey] ? presetKey : WORKSPACE_DEFAULTS.PRESET_KEYS.CHRONOS_KERNEL;
	const preset = PRESET_TEMPLATES[resolvedKey]!;
	return createWorkspaceFromSources(handle, preset.name, preset.files, 'ws-preset', { kind: 'PRESET', sourceOrigin: resolvedKey });
}

export function reindexWorkspaceSources(
	handle: ChronosDatabaseHandle, workspaceId: string, name: string, files: readonly SourceFileUnit[],
	meta?: { readonly projectIdentityKey?: string; readonly slug?: string }
): ManagedWorkspaceRecord {
	const snapshot = indexSourcesIntoDb(handle, files);
	return saveWorkspaceRecord(handle, workspaceId, name, snapshot, meta);
}

export function deleteWorkspaceRecord(handle: ChronosDatabaseHandle, id: string): void {
	handle.db.delete(workspaces).where(eq(workspaces.id, id)).run();
}

export function importWorkspaceRecord(handle: ChronosDatabaseHandle, rawBundleJson: string): PortableWorkspaceBundle {
	const bundle = deserializeWorkspaceBundle(rawBundleJson);
	saveWorkspaceRecord(handle, bundle.workspaceId, bundle.workspaceName, bundle.snapshot, { kind: 'BUNDLE', sourceOrigin: bundle.workspaceId });
	return bundle;
}

export function exportWorkspaceRecord(id: string, name: string, snapshot: WorkspaceSnapshot): PortableWorkspaceBundle {
	return serializeWorkspaceBundle(id, name, snapshot);
}
