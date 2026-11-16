/**
 * @author Oblx <code@oblx.dev>
 * @description Server project snapshot loader hydrating Project Tabs (including chronos-self) into IndexedDB & active state.
 */
import { API_ROUTES, WORKSPACE_EVENT_KINDS } from '@config/constants';
import { computeProjectIdentity } from '@core/metamodel/project.identity';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { deriveShortCodeFromName, saveTabToIndexedDb, type WorkspaceTabDescriptor } from '@lib/db/indexeddb/repository/workspace.idb';
import { securityWire } from '@client/state/security.wire.svelte';
import { emitWorkspaceDomainEvent } from './workspace.controller';

interface ServerProjectMeta {
	readonly id?: number;
	readonly slug?: string;
	readonly shortCode?: string;
	readonly name?: string;
	readonly projectIdentityKey?: string;
	readonly snapshotRevision?: number;
}

export async function openServerProjectTab(projectKey: string): Promise<WorkspaceTabDescriptor> {
	const slug = projectKey.trim() || 'chronos-core';
	let meta: ServerProjectMeta = {};
	try {
		const projRes = await fetch(API_ROUTES.PROJECTS, { headers: securityWire.buildHeaders() });
		if (projRes.ok) {
			const data = (await projRes.json()) as { projects?: ServerProjectMeta[] };
			meta = data.projects?.find((p) => p.slug === slug || String(p.id) === slug) ?? {};
		}
	} catch {}
	const snapRes = await fetch(`${API_ROUTES.SNAPSHOT}?project=${encodeURIComponent(slug)}`, { headers: securityWire.buildHeaders() });
	if (!snapRes.ok) throw new Error(`Failed to fetch project snapshot for ${slug} (${snapRes.status})`);
	const snapshot = (await snapRes.json()) as WorkspaceSnapshot;
	const name = meta.name ?? (slug === 'chronos-self' ? 'Chronos Self-Analysis' : slug);
	const identity = computeProjectIdentity({ kind: 'LOCAL', name, sourceOrigin: slug });
	const tab: WorkspaceTabDescriptor = {
		id: slug,
		projectId: meta.id ?? 1,
		projectIdentityKey: meta.projectIdentityKey ?? identity.projectIdentityKey,
		slug: meta.slug ?? slug,
		shortCode: meta.shortCode ?? deriveShortCodeFromName(name),
		snapshotRevision: meta.snapshotRevision ?? 1,
		name,
		updatedAt: Date.now(),
		isDirty: false,
		snapshot,
	};
	await saveTabToIndexedDb(tab);
	emitWorkspaceDomainEvent(WORKSPACE_EVENT_KINDS.OPENED, tab.id, tab.name, `OPENED: ${tab.name} (${tab.snapshot.nodes.length} entities)`);
	return tab;
}
