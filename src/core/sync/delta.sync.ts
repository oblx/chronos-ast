/**
 * @author Oblx <code@oblx.dev>
 * @description Hybrid Logical Clock (HLC) causal offline delta sync queue and idempotent conflict-aware reconciler.
 */
import { eq } from 'drizzle-orm';
import { INDEXEDDB_CONFIG } from '@config/env.schema';
import { openChronosIndexedDb } from '@lib/db/indexeddb/mirror/idb.mirror';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { annotations, syncOperations } from '@lib/db/sqlite/schema/tables';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { sha256Hex } from '@core/security/audit.chain';

export interface HlcTimestamp {
	readonly physicalMs: number;
	readonly logicalCounter: number;
}

export interface SignedSyncOp {
	readonly opId: string;
	readonly hlcPhysicalMs: number;
	readonly hlcLogicalCounter: number;
	readonly principalId: string;
	readonly entityQualifiedName: string;
	readonly opKind: string;
	readonly payloadJson: string;
	readonly entryHash: string;
}

const memoryQueue = new Map<string, SignedSyncOp>();

export function tickHlc(last: HlcTimestamp, nowMs = Date.now()): HlcTimestamp {
	if (nowMs > last.physicalMs) return { physicalMs: nowMs, logicalCounter: 0 };
	return { physicalMs: last.physicalMs, logicalCounter: last.logicalCounter + 1 };
}

export function mergeHlc(local: HlcTimestamp, remote: HlcTimestamp, nowMs = Date.now()): HlcTimestamp {
	const nextPhys = Math.max(nowMs, local.physicalMs, remote.physicalMs);
	if (nextPhys === local.physicalMs && nextPhys === remote.physicalMs) {
		return { physicalMs: nextPhys, logicalCounter: Math.max(local.logicalCounter, remote.logicalCounter) + 1 };
	}
	if (nextPhys === local.physicalMs) return { physicalMs: nextPhys, logicalCounter: local.logicalCounter + 1 };
	if (nextPhys === remote.physicalMs) return { physicalMs: nextPhys, logicalCounter: remote.logicalCounter + 1 };
	return { physicalMs: nextPhys, logicalCounter: 0 };
}

export async function computeSyncOpHash(op: Omit<SignedSyncOp, 'entryHash'>): Promise<string> {
	return sha256Hex(`${op.opId}|${op.hlcPhysicalMs}|${op.hlcLogicalCounter}|${op.principalId}|${op.entityQualifiedName}|${op.opKind}|${op.payloadJson}`);
}

export async function createSignedSyncOp(input: Omit<SignedSyncOp, 'entryHash'>): Promise<SignedSyncOp> {
	return { ...input, entryHash: await computeSyncOpHash(input) };
}

export async function queueOfflineSyncOp(op: SignedSyncOp): Promise<void> {
	memoryQueue.set(op.opId, op);
	const db = await openChronosIndexedDb();
	if (!db) return;
	await new Promise<void>((resolve) => {
		try {
			const tx = db.transaction(INDEXEDDB_CONFIG.STORES.SYNC_JOURNAL, 'readwrite');
			tx.objectStore(INDEXEDDB_CONFIG.STORES.SYNC_JOURNAL).put({ id: op.opId, ...op });
			tx.oncomplete = () => { db.close(); resolve(); };
			tx.onerror = () => { db.close(); resolve(); };
		} catch { db.close(); resolve(); }
	});
}

export async function getQueuedSyncOps(): Promise<readonly SignedSyncOp[]> {
	const db = await openChronosIndexedDb();
	if (!db) return Array.from(memoryQueue.values());
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(INDEXEDDB_CONFIG.STORES.SYNC_JOURNAL, 'readonly');
			const req = tx.objectStore(INDEXEDDB_CONFIG.STORES.SYNC_JOURNAL).getAll();
			req.onsuccess = () => { db.close(); resolve((req.result ?? []) as SignedSyncOp[]); };
			req.onerror = () => { db.close(); resolve(Array.from(memoryQueue.values())); };
		} catch { db.close(); resolve(Array.from(memoryQueue.values())); }
	});
}

export async function clearQueuedSyncOps(opIds: readonly string[]): Promise<void> {
	for (const id of opIds) memoryQueue.delete(id);
	if (opIds.length === 0) return;
	const db = await openChronosIndexedDb();
	if (!db) return;
	await new Promise<void>((resolve) => {
		try {
			const tx = db.transaction(INDEXEDDB_CONFIG.STORES.SYNC_JOURNAL, 'readwrite');
			const store = tx.objectStore(INDEXEDDB_CONFIG.STORES.SYNC_JOURNAL);
			for (const id of opIds) store.delete(id);
			tx.oncomplete = () => { db.close(); resolve(); };
			tx.onerror = () => { db.close(); resolve(); };
		} catch { db.close(); resolve(); }
	});
}

export async function reconcileHlcDeltas(
	handle: ChronosDatabaseHandle,
	ops: readonly SignedSyncOp[]
): Promise<{ readonly appliedCount: number; readonly skippedCount: number; readonly conflictOps: readonly string[]; readonly watermarkMs: number }> {
	let appliedCount = 0;
	let skippedCount = 0;
	const conflictOps: string[] = [];
	const sorted = [...ops].sort((a, b) => a.hlcPhysicalMs - b.hlcPhysicalMs || a.hlcLogicalCounter - b.hlcLogicalCounter);

	for (const op of sorted) {
		const expected = await computeSyncOpHash(op);
		if (expected !== op.entryHash) throw new Error(`Sync op ${op.opId} failed entryHash integrity check.`);
		if (handle.db.select().from(syncOperations).where(eq(syncOperations.opId, op.opId)).get()) {
			skippedCount += 1;
			continue;
		}
		const peers = handle.db.select().from(syncOperations).where(eq(syncOperations.entityQualifiedName, op.entityQualifiedName)).all();
		const hasDeviationDivergence = op.opKind === 'ANNOTATION_ADD' && peers.some((p) => p.principalId !== op.principalId && p.payloadJson !== op.payloadJson);
		const conflictFlag = hasDeviationDivergence ? 1 : 0;
		if (conflictFlag === 1) conflictOps.push(op.entityQualifiedName);

		handle.db.insert(syncOperations).values({ ...op, conflictFlag, createdAt: Date.now() }).run();
		if (op.opKind === 'ANNOTATION_ADD') {
			const p = parseSafeJson<{ entityKind?: string; tagKind?: string; ruleCode?: string; note?: string; author?: string }>(op.payloadJson);
			handle.db.insert(annotations).values({
				entityKind: (p.entityKind as 'FUNCTION') ?? 'FUNCTION', qualifiedName: op.entityQualifiedName,
				tagKind: (p.tagKind as 'NOTE') ?? 'NOTE', ruleCode: p.ruleCode ?? null, note: p.note ?? '',
				author: p.author ?? op.principalId, createdAt: op.hlcPhysicalMs,
			}).run();
		}
		appliedCount += 1;
	}
	return { appliedCount, skippedCount, conflictOps, watermarkMs: Date.now() };
}
