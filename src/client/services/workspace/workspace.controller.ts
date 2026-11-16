/**
 * @author Oblx <code@oblx.dev>
 * @description Event-driven realtime workspace lifecycle service with IndexedDB/SQLite parity and default No-Workspace-Open state.
 */
import { API_ROUTES, WORKSPACE_DEFAULTS, WORKSPACE_EVENT_KINDS, WORKSPACE_OPERATIONS, type WorkspaceEventKind } from '@config/constants';
import { ENTITY_KINDS } from '@lib/db/schema';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { buildInMemorySnapshotFromSources, EMBEDDED_MULTI_LANG_SAMPLES, type SourceFileUnit } from '@core/metamodel/workspace.sources';
import { deleteTabFromIndexedDb, loadAllTabsFromIndexedDb, saveTabToIndexedDb, type WorkspaceTabDescriptor } from '@lib/db/indexeddb/repository/workspace.idb';
import { deserializeWorkspaceBundle, serializeWorkspaceBundle } from '@core/metamodel/workspace/serialization/bundle.serializer';
import { buildSyntheticZipArchive, extractSourceFilesFromZip } from '@core/metamodel/workspace/ingestion/zip.extractor';
import { computeProjectIdentity } from '@core/metamodel/project.identity';
import { securityWire } from '@client/state/security.wire.svelte';

interface ServerWorkspaceResponse {
	readonly id: string; readonly projectId?: number; readonly projectIdentityKey?: string; readonly slug?: string;
	readonly shortCode?: string; readonly snapshotRevision?: number; readonly name: string; readonly updatedAt: number; readonly snapshot: WorkspaceSnapshot;
}
export interface WorkspaceDomainEvent { readonly kind: WorkspaceEventKind; readonly workspaceId: string | null; readonly workspaceName: string; readonly message: string; readonly timestamp: number; }
const workspaceEventBus = new EventTarget();
const crossTabChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('chronos:workspace:events') : null;

export function emitWorkspaceDomainEvent(kind: WorkspaceEventKind, workspaceId: string | null, workspaceName: string, message: string): WorkspaceDomainEvent {
	const detail: WorkspaceDomainEvent = { kind, workspaceId, workspaceName, message, timestamp: Date.now() };
	workspaceEventBus.dispatchEvent(new CustomEvent<WorkspaceDomainEvent>('workspace-event', { detail }));
	try { crossTabChannel?.postMessage(detail); } catch {}
	return detail;
}

export function subscribeWorkspaceDomainEvents(listener: (event: WorkspaceDomainEvent) => void): () => void {
	const onLocal = (e: Event): void => listener((e as CustomEvent<WorkspaceDomainEvent>).detail);
	const onRemote = (e: MessageEvent<WorkspaceDomainEvent>): void => { if (e.data?.kind) listener(e.data); };
	workspaceEventBus.addEventListener('workspace-event', onLocal);
	crossTabChannel?.addEventListener('message', onRemote);
	return () => { workspaceEventBus.removeEventListener('workspace-event', onLocal); crossTabChannel?.removeEventListener('message', onRemote); };
}

async function postWorkspaceCommand<TResponse = ServerWorkspaceResponse>(payload: Record<string, unknown>, route: string = API_ROUTES.WORKSPACES): Promise<TResponse> {
	const res = await fetch(route, { method: 'POST', headers: securityWire.buildHeaders(), body: JSON.stringify(payload) });
	const data = await res.json();
	if (!res.ok) throw new Error(data?.error ?? `Workspace command failed (${res.status})`);
	return data as TResponse;
}

async function registerServerWorkspaceAsTab(created: ServerWorkspaceResponse, eventKind: WorkspaceEventKind = WORKSPACE_EVENT_KINDS.OPENED): Promise<WorkspaceTabDescriptor> {
	const tab: WorkspaceTabDescriptor = {
		id: created.id, projectId: created.projectId ?? 1, projectIdentityKey: created.projectIdentityKey,
		slug: created.slug, shortCode: created.shortCode, snapshotRevision: created.snapshotRevision ?? 1,
		name: created.name, updatedAt: created.updatedAt, isDirty: false, snapshot: created.snapshot,
	};
	await saveTabToIndexedDb(tab);
	emitWorkspaceDomainEvent(eventKind, tab.id, tab.name, `${eventKind}: ${tab.name} (${tab.snapshot.nodes.length} entities · r${tab.snapshotRevision})`);
	return tab;
}

export function pickDefaultFocalEntityId(data: WorkspaceSnapshot): number {
	const fnNode = data.nodes.find((n) => n.kind === ENTITY_KINDS.FUNCTION && (n.afferentCoupling > 0 || n.efferentCoupling > 0));
	return fnNode?.id ?? data.nodes[0]?.id ?? WORKSPACE_DEFAULTS.FALLBACK_ENTITY_ID;
}

export async function fetchInitialWorkspaceTabs(): Promise<{ readonly tabs: WorkspaceTabDescriptor[]; readonly statusBanner: string }> {
	const persistedTabs = await loadAllTabsFromIndexedDb();
	if (persistedTabs.length > 0) {
		emitWorkspaceDomainEvent(WORKSPACE_EVENT_KINDS.HYDRATED, persistedTabs[0]!.id, persistedTabs[0]!.name, `Restored ${persistedTabs.length} workspace(s) from IndexedDB`);
		return { tabs: [...persistedTabs], statusBanner: `Restored ${persistedTabs.length} Workspace(s) (IDB)` };
	}
	const defaultTab = await openCoreSnapshotWorkspaceTab();
	return { tabs: [defaultTab], statusBanner: 'Restored 1 Workspace(s) (IDB)' };
}

export async function openCoreSnapshotWorkspaceTab(): Promise<WorkspaceTabDescriptor> {
	const core = computeProjectIdentity({ kind: 'CORE', name: WORKSPACE_DEFAULTS.CORE_NAME });
	try {
		const res = await fetch(API_ROUTES.SNAPSHOT);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const primarySnap: WorkspaceSnapshot = await res.json();
		return await registerServerWorkspaceAsTab({ id: core.workspaceId, projectIdentityKey: core.projectIdentityKey, slug: core.slug, shortCode: WORKSPACE_DEFAULTS.CORE_SHORT_CODE, name: WORKSPACE_DEFAULTS.CORE_NAME, updatedAt: Date.now(), snapshot: primarySnap });
	} catch {
		return registerServerWorkspaceAsTab({ id: core.workspaceId, projectIdentityKey: core.projectIdentityKey, slug: core.slug, shortCode: WORKSPACE_DEFAULTS.CORE_SHORT_CODE, name: WORKSPACE_DEFAULTS.CORE_NAME, updatedAt: Date.now(), snapshot: buildInMemorySnapshotFromSources(EMBEDDED_MULTI_LANG_SAMPLES) });
	}
}

export async function openPresetWorkspaceTab(currentCount: number): Promise<WorkspaceTabDescriptor> {
	if (currentCount === 0) return openCoreSnapshotWorkspaceTab();
	const preset = currentCount % 2 === 1 ? WORKSPACE_DEFAULTS.PRESET_KEYS.CHRONOS_KERNEL : WORKSPACE_DEFAULTS.PRESET_KEYS.HEXAGONAL_GRAPH;
	const identity = computeProjectIdentity({ kind: 'PRESET', name: `Static Preset (${preset})`, sourceOrigin: preset });
	try {
		return await registerServerWorkspaceAsTab(await postWorkspaceCommand({ operation: WORKSPACE_OPERATIONS.OPEN, preset }));
	} catch {
		return registerServerWorkspaceAsTab({ id: identity.workspaceId, projectIdentityKey: identity.projectIdentityKey, slug: identity.slug, name: `Static Preset (${preset})`, updatedAt: Date.now(), snapshot: buildInMemorySnapshotFromSources(EMBEDDED_MULTI_LANG_SAMPLES) });
	}
}
export async function reindexActiveWorkspaceTab(activeTab: WorkspaceTabDescriptor): Promise<WorkspaceTabDescriptor> {
	const sources: SourceFileUnit[] = Object.entries(activeTab.snapshot.sourceMap).filter(([p]) => !p.includes('::')).map(([path, code]) => ({ path, code }));
	try {
		const res = await postWorkspaceCommand({ operation: WORKSPACE_OPERATIONS.REINDEX, workspaceId: activeTab.id, workspaceName: activeTab.name, projectIdentityKey: activeTab.projectIdentityKey, files: sources, snapshot: activeTab.snapshot });
		return await registerServerWorkspaceAsTab({ ...res, id: activeTab.id, projectIdentityKey: activeTab.projectIdentityKey ?? res.projectIdentityKey, snapshotRevision: (activeTab.snapshotRevision ?? 1) + 1 }, WORKSPACE_EVENT_KINDS.INDEXED);
	} catch {
		const nextSnap = sources.length > 0 ? buildInMemorySnapshotFromSources(sources) : activeTab.snapshot;
		return registerServerWorkspaceAsTab({ id: activeTab.id, projectId: activeTab.projectId, projectIdentityKey: activeTab.projectIdentityKey, slug: activeTab.slug, shortCode: activeTab.shortCode, snapshotRevision: (activeTab.snapshotRevision ?? 1) + 1, name: activeTab.name, updatedAt: Date.now(), snapshot: nextSnap }, WORKSPACE_EVENT_KINDS.INDEXED);
	}
}
export async function ingestSourceFilesIntoTab(workspaceName: string, files: readonly SourceFileUnit[], sourceOrigin?: string): Promise<WorkspaceTabDescriptor> {
	const identity = computeProjectIdentity({ kind: 'ZIP', name: workspaceName, sourceOrigin: sourceOrigin ?? workspaceName });
	try {
		return await registerServerWorkspaceAsTab(await postWorkspaceCommand({ operation: WORKSPACE_OPERATIONS.IMPORT_FILES, workspaceName, sourceOrigin, files }), WORKSPACE_EVENT_KINDS.INDEXED);
	} catch {
		return registerServerWorkspaceAsTab({ id: identity.workspaceId, projectIdentityKey: identity.projectIdentityKey, slug: identity.slug, name: workspaceName, updatedAt: Date.now(), snapshot: buildInMemorySnapshotFromSources(files) }, WORKSPACE_EVENT_KINDS.INDEXED);
	}
}
export async function ingestZipArchiveBytesIntoTab(zipBytes: Uint8Array, workspaceName: string): Promise<WorkspaceTabDescriptor> {
	const files = await extractSourceFilesFromZip(zipBytes);
	if (files.length === 0) throw new Error('No supported source files found in .zip archive.');
	return ingestSourceFilesIntoTab(workspaceName, files, workspaceName);
}
export async function generateSampleZipWorkspaceTab(): Promise<WorkspaceTabDescriptor> {
	const sampleZipBytes = buildSyntheticZipArchive([
		{ path: 'invaders-arcade/src/phosphor_beam.rs', code: `pub struct BeamCannon {\n\tpub charge: usize,\n}\npub fn fire_vector_pulse(angle: usize) -> usize {\n\tif angle > 0 && angle < 90 {\n\t\treturn calibrate_deflector(angle);\n\t}\n\t0\n}\npub fn calibrate_deflector(deg: usize) -> usize {\n\tif deg > 45 { return deg * 2; }\n\tdeg + 1\n}` },
		{ path: 'invaders-arcade/src/crt_raster.cpp', code: `namespace BaerConsole {\n\tclass BrownBoxRaster {\n\tpublic:\n\t\tint syncScanline(int vblank) {\n\t\t\tif (vblank <= 0) return 0;\n\t\t\treturn fire_vector_pulse(vblank);\n\t\t}\n\t};\n}` },
		{ path: 'invaders-arcade/src/hud_affordance.ts', code: `export function evaluateAffordance(signal: number): number {\n\tif (signal > 10) {\n\t\treturn fire_vector_pulse(signal);\n\t}\n\treturn 1;\n}` },
	]);
	return ingestZipArchiveBytesIntoTab(sampleZipBytes, 'Arcade Vector SDK (.zip)');
}
export async function ingestRemoteUrlIntoTab(url: string, workspaceName?: string): Promise<WorkspaceTabDescriptor> {
	return registerServerWorkspaceAsTab(await postWorkspaceCommand({ operation: WORKSPACE_OPERATIONS.IMPORT_URL, url, workspaceName }), WORKSPACE_EVENT_KINDS.INDEXED);
}
export async function ingestGitRepoIntoTab(repoUrl: string, branchOrRef?: string, vaultSecretId?: string): Promise<WorkspaceTabDescriptor> {
	return registerServerWorkspaceAsTab(await postWorkspaceCommand({ repoUrl, branchOrRef, vaultSecretId }, API_ROUTES.INGEST_GIT), WORKSPACE_EVENT_KINDS.INDEXED);
}

export async function closeWorkspaceTabById(tabId: string): Promise<void> {
	await deleteTabFromIndexedDb(tabId);
	emitWorkspaceDomainEvent(WORKSPACE_EVENT_KINDS.CLOSED, tabId, tabId, `Closed workspace ${tabId}`);
	try { await postWorkspaceCommand({ operation: WORKSPACE_OPERATIONS.CLOSE, workspaceId: tabId }); } catch {}
}
export async function persistWorkspaceTab(tab: WorkspaceTabDescriptor): Promise<void> {
	await saveTabToIndexedDb(tab);
	emitWorkspaceDomainEvent(WORKSPACE_EVENT_KINDS.SAVED, tab.id, tab.name, `Saved ${tab.name} (SQLite + IDB)`);
	try { await postWorkspaceCommand({ operation: WORKSPACE_OPERATIONS.SAVE, workspaceId: tab.id, workspaceName: tab.name, snapshot: tab.snapshot }); } catch {}
}
export async function importBundleIntoTab(rawJson: string): Promise<WorkspaceTabDescriptor> {
	const bundle = deserializeWorkspaceBundle(rawJson), identity = computeProjectIdentity({ kind: 'BUNDLE', name: bundle.workspaceName, sourceOrigin: bundle.workspaceId });
	return registerServerWorkspaceAsTab({ id: identity.workspaceId, projectIdentityKey: identity.projectIdentityKey, slug: identity.slug, name: bundle.workspaceName, updatedAt: Date.now(), snapshot: bundle.snapshot });
}
export function exportTabBundleJson(tab: WorkspaceTabDescriptor): string {
	return JSON.stringify(serializeWorkspaceBundle(tab.id, tab.name, tab.snapshot), null, 2);
}
