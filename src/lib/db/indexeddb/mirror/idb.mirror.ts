/**
 * @author Oblx <code@oblx.dev>
 * @description Single-transaction atomic Browser IndexedDB mirror enforcing Drizzle ORM table schema parity including projects & annotations (v2.2.0).
 */
import { INDEXEDDB_CONFIG } from '@config/env.schema';
import type {
	DrizzleAnnotationRow, DrizzleEntityRow, DrizzleMetricRow, DrizzleProjectMemberRow,
	DrizzleProjectRow, DrizzleReferenceRow, DrizzleSourceUnitRow, DrizzleWorkspaceRow,
} from '@lib/db/sqlite/schema/tables';

export interface OfflineDrizzleMirrorBundle {
	readonly workspace: DrizzleWorkspaceRow;
	readonly project?: DrizzleProjectRow;
	readonly projectMembers?: readonly DrizzleProjectMemberRow[];
	readonly entities: readonly DrizzleEntityRow[];
	readonly references: readonly DrizzleReferenceRow[];
	readonly metrics: readonly DrizzleMetricRow[];
	readonly sourceUnits?: readonly DrizzleSourceUnitRow[];
	readonly annotations?: readonly DrizzleAnnotationRow[];
}

const memoryMirrorStore = new Map<string, OfflineDrizzleMirrorBundle>();

function notifyIdbQuotaFallback(err: unknown): void {
	const name = (err as { name?: string } | null)?.name ?? '';
	const detail = name === 'QuotaExceededError' ? 'IndexedDB quota exceeded; falling back to in-memory mirror' : 'IndexedDB write unavailable (private browsing); using memory mirror';
	if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('chronos:idb-warning', { detail }));
}

export function openChronosIndexedDb(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === 'undefined') return Promise.resolve(null);
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(null), 350);
		try {
			const req = indexedDB.open(INDEXEDDB_CONFIG.DB_NAME, INDEXEDDB_CONFIG.DB_VERSION);
			req.onupgradeneeded = () => {
				const db = req.result;
				for (const s of Object.values(INDEXEDDB_CONFIG.STORES)) {
					if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
				}
			};
			req.onblocked = () => { clearTimeout(timer); resolve(null); };
			req.onsuccess = () => { clearTimeout(timer); const db = req.result; db.onversionchange = () => db.close(); resolve(db); };
			req.onerror = () => { clearTimeout(timer); resolve(null); };
		} catch { clearTimeout(timer); resolve(null); }
	});
}

export async function putOfflineMirrorBundle(bundle: OfflineDrizzleMirrorBundle): Promise<void> {
	const plainBundle: OfflineDrizzleMirrorBundle = JSON.parse(JSON.stringify(bundle));
	memoryMirrorStore.set(plainBundle.workspace.id, plainBundle);
	const db = await openChronosIndexedDb();
	if (!db) return;
	await new Promise<void>((resolve) => {
		try {
			const tx = db.transaction(Object.values(INDEXEDDB_CONFIG.STORES), 'readwrite');
			tx.objectStore(INDEXEDDB_CONFIG.STORES.WORKSPACES).put({
				...plainBundle.workspace, project: plainBundle.project, projectMembers: plainBundle.projectMembers ?? [],
				entities: plainBundle.entities, references: plainBundle.references, metrics: plainBundle.metrics,
				sourceUnits: plainBundle.sourceUnits ?? [], annotations: plainBundle.annotations ?? [],
			});
			if (plainBundle.project) tx.objectStore(INDEXEDDB_CONFIG.STORES.PROJECTS).put(plainBundle.project);
			for (const m of plainBundle.projectMembers ?? []) tx.objectStore(INDEXEDDB_CONFIG.STORES.PROJECT_MEMBERS).put(m);
			for (const ent of plainBundle.entities) tx.objectStore(INDEXEDDB_CONFIG.STORES.ENTITIES).put(ent);
			for (const ref of plainBundle.references) tx.objectStore(INDEXEDDB_CONFIG.STORES.REFERENCES).put(ref);
			for (const met of plainBundle.metrics) tx.objectStore(INDEXEDDB_CONFIG.STORES.METRICS).put(met);
			for (const unit of plainBundle.sourceUnits ?? []) tx.objectStore(INDEXEDDB_CONFIG.STORES.SOURCE_UNITS).put(unit);
			for (const atn of plainBundle.annotations ?? []) tx.objectStore(INDEXEDDB_CONFIG.STORES.ANNOTATIONS).put(atn);
			tx.oncomplete = () => { db.close(); resolve(); };
			tx.onabort = () => { notifyIdbQuotaFallback(tx.error); db.close(); resolve(); };
			tx.onerror = () => { notifyIdbQuotaFallback(tx.error); db.close(); resolve(); };
		} catch (err) { notifyIdbQuotaFallback(err); db.close(); resolve(); }
	});
}

export async function getAllOfflineMirrorBundles(): Promise<readonly OfflineDrizzleMirrorBundle[]> {
	const db = await openChronosIndexedDb();
	if (!db) return Array.from(memoryMirrorStore.values());
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(INDEXEDDB_CONFIG.STORES.WORKSPACES, 'readonly');
			const req = tx.objectStore(INDEXEDDB_CONFIG.STORES.WORKSPACES).getAll();
			req.onsuccess = () => {
				db.close();
				const rows = (req.result ?? []) as Array<DrizzleWorkspaceRow & { project?: DrizzleProjectRow; projectMembers?: DrizzleProjectMemberRow[]; entities?: DrizzleEntityRow[]; references?: DrizzleReferenceRow[]; metrics?: DrizzleMetricRow[]; sourceUnits?: DrizzleSourceUnitRow[]; annotations?: DrizzleAnnotationRow[]; }>;
				if (rows.length === 0 && memoryMirrorStore.size > 0) { resolve(Array.from(memoryMirrorStore.values())); return; }
				resolve(rows.map((r) => ({
					workspace: { id: r.id, ownerId: r.ownerId ?? 'guest', name: r.name, updatedAt: r.updatedAt, indexedFilesCount: r.indexedFilesCount, sourceMapJson: r.sourceMapJson },
					project: r.project, projectMembers: r.projectMembers ?? [], entities: r.entities ?? [],
					references: r.references ?? [], metrics: r.metrics ?? [], sourceUnits: r.sourceUnits ?? [], annotations: r.annotations ?? [],
				})));
			};
			req.onerror = () => { db.close(); resolve(Array.from(memoryMirrorStore.values())); };
		} catch { db.close(); resolve(Array.from(memoryMirrorStore.values())); }
	});
}

export async function removeOfflineMirrorBundle(workspaceId: string): Promise<void> {
	memoryMirrorStore.delete(workspaceId);
	const db = await openChronosIndexedDb();
	if (!db) return;
	await new Promise<void>((resolve) => {
		try {
			const tx = db.transaction(INDEXEDDB_CONFIG.STORES.WORKSPACES, 'readwrite');
			tx.objectStore(INDEXEDDB_CONFIG.STORES.WORKSPACES).delete(workspaceId);
			tx.oncomplete = () => { db.close(); resolve(); };
			tx.onerror = () => { db.close(); resolve(); };
		} catch { db.close(); resolve(); }
	});
}
