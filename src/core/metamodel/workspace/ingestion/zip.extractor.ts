/**
 * @author Oblx <code@oblx.dev>
 * @description Hardened zero-dependency PKZIP binary extractor with Zip-Slip path rejection and PKZIP bomb caps.
 */
import { PKZIP_CONSTANTS } from '@config/constants';
import { FILE_EXTENSIONS_MAP } from '@config/metamodel.constants';
import { PKZIP_BOMB_LIMITS } from '@config/security.constants';
import type { SourceFileUnit } from '@core/metamodel/workspace.sources';

function validateEntryPathSafety(rawPath: string): void {
	if (!rawPath || rawPath.includes('\0') || rawPath.startsWith('/') || rawPath.startsWith('\\') || rawPath.includes(':')) {
		throw new Error(`Unsafe archive entry path rejected (Zip-Slip): ${rawPath}`);
	}
	const segments = rawPath.replace(/\\/g, '/').split('/');
	if (segments.some((seg) => seg === '..')) {
		throw new Error(`Path traversal segment rejected in archive: ${rawPath}`);
	}
}

function isSupportedSourcePath(entryPath: string): boolean {
	if (!entryPath || entryPath.endsWith('/')) return false;
	for (const ignored of PKZIP_CONSTANTS.IGNORED_PATH_SEGMENTS) {
		if (entryPath.includes(ignored)) return false;
	}
	const dotIdx = entryPath.lastIndexOf('.');
	if (dotIdx < 0) return false;
	return Boolean(FILE_EXTENSIONS_MAP[entryPath.slice(dotIdx).toLowerCase()]);
}

async function decompressDeflateBounded(compressed: Uint8Array, remainingBudget: number): Promise<Uint8Array> {
	if (typeof DecompressionStream !== 'undefined') {
		const stream = new DecompressionStream('deflate-raw');
		const writer = stream.writable.getWriter();
		await writer.write(new Uint8Array(compressed));
		await writer.close();
		const reader = stream.readable.getReader();
		const chunks: Uint8Array[] = [];
		let total = 0;
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > remainingBudget) throw new Error('PKZIP bomb guard: decompressed stream exceeded 128 MiB cap.');
			chunks.push(value);
		}
		const merged = new Uint8Array(total);
		let pos = 0;
		for (const c of chunks) { merged.set(c, pos); pos += c.byteLength; }
		return merged;
	}
	if (typeof Bun !== 'undefined' && typeof Bun.inflateSync === 'function') {
		const out = Bun.inflateSync(new Uint8Array(compressed));
		if (out.byteLength > remainingBudget) throw new Error('PKZIP bomb guard: decompressed payload exceeded budget.');
		return out;
	}
	return compressed;
}

export async function extractSourceFilesFromZip(zipBytes: Uint8Array): Promise<readonly SourceFileUnit[]> {
	if (zipBytes.byteLength > PKZIP_BOMB_LIMITS.MAX_ARCHIVE_COMPRESSED_BYTES) {
		throw new Error('PKZIP archive exceeds 25 MiB compressed limit.');
	}
	const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
	const decoder = new TextDecoder('utf-8', { fatal: false });
	const extracted: SourceFileUnit[] = [];
	let offset = 0;
	let entryCount = 0;
	let totalUncompressed = 0;

	while (offset + PKZIP_CONSTANTS.HEADER_FIXED_SIZE <= zipBytes.byteLength) {
		if (view.getUint32(offset, true) !== PKZIP_CONSTANTS.LOCAL_FILE_HEADER_SIG) break;
		if (++entryCount > PKZIP_BOMB_LIMITS.MAX_ARCHIVE_ENTRIES) {
			throw new Error(`PKZIP bomb guard: entry count exceeded ${PKZIP_BOMB_LIMITS.MAX_ARCHIVE_ENTRIES}.`);
		}
		const method = view.getUint16(offset + PKZIP_CONSTANTS.OFFSET_METHOD, true);
		const compSize = view.getUint32(offset + PKZIP_CONSTANTS.OFFSET_COMPRESSED_SIZE, true);
		const uncompSize = view.getUint32(offset + PKZIP_CONSTANTS.OFFSET_UNCOMPRESSED_SIZE, true);
		const nameLen = view.getUint16(offset + PKZIP_CONSTANTS.OFFSET_NAME_LEN, true);
		const extraLen = view.getUint16(offset + PKZIP_CONSTANTS.OFFSET_EXTRA_LEN, true);
		const nameStart = offset + PKZIP_CONSTANTS.HEADER_FIXED_SIZE;
		const dataStart = nameStart + nameLen + extraLen;
		const dataEnd = dataStart + compSize;
		if (dataEnd > zipBytes.byteLength) break;

		if (compSize > 0 && uncompSize / compSize > PKZIP_BOMB_LIMITS.MAX_COMPRESSION_RATIO) {
			throw new Error('PKZIP bomb guard: compression ratio exceeded 100x limit.');
		}
		const rawPath = decoder.decode(zipBytes.subarray(nameStart, nameStart + nameLen));
		validateEntryPathSafety(rawPath);
		const cleanPath = rawPath.replace(/^[^/]+\//, '');
		const targetPath = isSupportedSourcePath(cleanPath) ? cleanPath : rawPath;

		if (isSupportedSourcePath(targetPath) && compSize > 0) {
			const payloadSlice = zipBytes.subarray(dataStart, dataEnd);
			const budget = PKZIP_BOMB_LIMITS.MAX_ARCHIVE_UNCOMPRESSED_BYTES - totalUncompressed;
			const rawBytes = method === PKZIP_CONSTANTS.METHOD_DEFLATE ? await decompressDeflateBounded(payloadSlice, budget) : payloadSlice;
			totalUncompressed += rawBytes.byteLength;
			if (totalUncompressed > PKZIP_BOMB_LIMITS.MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
				throw new Error('PKZIP bomb guard: total uncompressed bytes exceeded 128 MiB limit.');
			}
			if (compSize > 0 && rawBytes.byteLength / compSize > PKZIP_BOMB_LIMITS.MAX_COMPRESSION_RATIO) {
				throw new Error('PKZIP bomb guard: inflated ratio exceeded 100x limit.');
			}
			const code = decoder.decode(rawBytes).trim();
			if (code.length > 0) extracted.push({ path: targetPath, code });
		}
		offset = dataEnd;
	}
	return extracted;
}

export function buildSyntheticZipArchive(files: readonly SourceFileUnit[]): Uint8Array {
	const encoder = new TextEncoder();
	const localChunks: Uint8Array[] = [];
	let totalLength = 0;
	for (const file of files) {
		const nameBytes = encoder.encode(file.path);
		const dataBytes = encoder.encode(file.code);
		const header = new Uint8Array(PKZIP_CONSTANTS.HEADER_FIXED_SIZE + nameBytes.byteLength + dataBytes.byteLength);
		const view = new DataView(header.buffer);
		view.setUint32(0, PKZIP_CONSTANTS.LOCAL_FILE_HEADER_SIG, true);
		view.setUint16(PKZIP_CONSTANTS.OFFSET_VERSION, PKZIP_CONSTANTS.VERSION_20, true);
		view.setUint16(PKZIP_CONSTANTS.OFFSET_METHOD, PKZIP_CONSTANTS.METHOD_STORE, true);
		view.setUint32(PKZIP_CONSTANTS.OFFSET_COMPRESSED_SIZE, dataBytes.byteLength, true);
		view.setUint32(PKZIP_CONSTANTS.OFFSET_UNCOMPRESSED_SIZE, dataBytes.byteLength, true);
		view.setUint16(PKZIP_CONSTANTS.OFFSET_NAME_LEN, nameBytes.byteLength, true);
		header.set(nameBytes, PKZIP_CONSTANTS.HEADER_FIXED_SIZE);
		header.set(dataBytes, PKZIP_CONSTANTS.HEADER_FIXED_SIZE + nameBytes.byteLength);
		localChunks.push(header);
		totalLength += header.byteLength;
	}
	const eocd = new Uint8Array(PKZIP_CONSTANTS.EOCD_FIXED_SIZE);
	new DataView(eocd.buffer).setUint32(0, PKZIP_CONSTANTS.END_OF_CENTRAL_DIR_SIG, true);
	const output = new Uint8Array(totalLength + eocd.byteLength);
	let cursor = 0;
	for (const chunk of localChunks) { output.set(chunk, cursor); cursor += chunk.byteLength; }
	output.set(eocd, cursor);
	return output;
}
