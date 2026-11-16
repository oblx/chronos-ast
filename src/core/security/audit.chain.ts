/**
 * @author Oblx <code@oblx.dev>
 * @description Tamper-evident SHA-256 linked audit log chain with telemetry sanitization.
 */
import { desc, asc } from 'drizzle-orm';
import { CRYPTO_CONSTANTS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { auditLog } from '@lib/db/sqlite/schema/tables';
import { sanitizeTelemetryPayload, toHex } from '@lib/utils/log.sanitizer';

const encoder = new TextEncoder();

export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export async function sha256Hex(payload: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
	return toHex(new Uint8Array(buf));
}

function buildChainMaterial(
	prevHash: string,
	actorId: string,
	eventKind: string,
	severity: AuditSeverity,
	detail: string,
	createdAt: number
): string {
	return `${prevHash}|${actorId}|${eventKind}|${severity}|${detail}|${createdAt}`;
}

export async function appendAuditEntry(
	handle: ChronosDatabaseHandle,
	actorId: string,
	eventKind: string,
	severity: AuditSeverity,
	rawDetail: string
): Promise<{ readonly seq: number; readonly rowHash: string; readonly detail: string }> {
	const detail = sanitizeTelemetryPayload(rawDetail);
	const latest = handle.db.select().from(auditLog).orderBy(desc(auditLog.seq)).limit(1).get();
	const prevHash = latest?.rowHash ?? CRYPTO_CONSTANTS.AUDIT_GENESIS_HASH;
	const createdAt = Date.now();
	const rowHash = await sha256Hex(buildChainMaterial(prevHash, actorId, eventKind, severity, detail, createdAt));
	const inserted = handle.db
		.insert(auditLog)
		.values({ actorId, eventKind, severity, detail, prevHash, rowHash, createdAt })
		.returning()
		.get();
	return { seq: inserted.seq, rowHash: inserted.rowHash, detail };
}

export async function verifyAuditChain(
	handle: ChronosDatabaseHandle
): Promise<{ readonly valid: boolean; readonly count: number; readonly brokenSeq: number | null }> {
	const rows = handle.db.select().from(auditLog).orderBy(asc(auditLog.seq)).all();
	let expectedPrev: string = CRYPTO_CONSTANTS.AUDIT_GENESIS_HASH;
	for (const row of rows) {
		if (row.prevHash !== expectedPrev) {
			return { valid: false, count: rows.length, brokenSeq: row.seq };
		}
		const computed = await sha256Hex(
			buildChainMaterial(row.prevHash, row.actorId, row.eventKind, row.severity as AuditSeverity, row.detail, row.createdAt)
		);
		if (computed !== row.rowHash) {
			return { valid: false, count: rows.length, brokenSeq: row.seq };
		}
		expectedPrev = row.rowHash;
	}
	return { valid: true, count: rows.length, brokenSeq: null };
}

export function listAuditEntries(handle: ChronosDatabaseHandle, limit = 50) {
	return handle.db.select().from(auditLog).orderBy(desc(auditLog.seq)).limit(limit).all();
}
