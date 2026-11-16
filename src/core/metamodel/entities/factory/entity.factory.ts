/**
 * @author Oblx <code@oblx.dev>
 * @description Deep-tree deterministic Metamodel Entity Factory with FNV-1a checksums.
 */
import type { EntityKind } from '@lib/db/sqlite/schema/tables';
import { computeDeterministicChecksum } from '@lib/utils/byte_formatter';

export interface EntityDraftInput {
	readonly kind: EntityKind;
	readonly name: string;
	readonly qualifiedName: string;
	readonly fileId: number | null;
	readonly lineStart: number;
	readonly colStart: number;
	readonly lineEnd: number;
	readonly colEnd: number;
	readonly sourceContent: string;
}

export interface PersistedEntityPayload {
	readonly uuid: string;
	readonly kind: EntityKind;
	readonly name: string;
	readonly qualifiedName: string;
	readonly fileId: number | null;
	readonly lineStart: number;
	readonly colStart: number;
	readonly lineEnd: number;
	readonly colEnd: number;
	readonly checksum: string;
}

export function createEntityPayload(
	input: EntityDraftInput
): PersistedEntityPayload {
	const checksum = computeDeterministicChecksum(
		`${input.qualifiedName}:${input.sourceContent}`
	);
	const uuidPrefix = computeDeterministicChecksum(
		`${input.qualifiedName}:${input.lineStart}:${input.colStart}`
	);
	const uuid = `chr-${input.kind.toLowerCase()}-${uuidPrefix}-${checksum}`;

	return {
		uuid,
		kind: input.kind,
		name: input.name,
		qualifiedName: input.qualifiedName,
		fileId: input.fileId,
		lineStart: Math.max(1, input.lineStart),
		colStart: Math.max(1, input.colStart),
		lineEnd: Math.max(input.lineStart, input.lineEnd),
		colEnd: Math.max(1, input.colEnd),
		checksum,
	};
}
