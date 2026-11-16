/**
 * @author Oblx <code@oblx.dev>
 * @description Pure-TS Git Smart HTTP v2 pkt-line codec & PACK v2 binary object unpacker (COMMIT, TREE, BLOB, OFS_DELTA, REF_DELTA).
 */
import { PKZIP_CONSTANTS } from '@config/constants';
import { GIT_INGESTION_LIMITS } from '@config/hud/hud.projections';
import { FILE_EXTENSIONS_MAP } from '@config/metamodel.constants';
import type { SourceFileUnit } from '@core/metamodel/workspace.sources';
import { applyGitDelta, computeGitObjectOid, inflatePackZlibStreamAt, readOfsDeltaOffset, readPackObjectHeader } from './git_delta';

export interface ParsedTreeEntry { readonly mode: string; readonly name: string; readonly oid: string; }
interface UnpackedObject { readonly typeCode: number; readonly typeName: string; readonly data: Uint8Array; readonly oid: string; }

const TYPE_NAMES: Readonly<Record<number, string>> = { 1: 'commit', 2: 'tree', 3: 'blob', 4: 'tag' };
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

export function encodePktLine(text: string): Uint8Array {
	const body = encoder.encode(text);
	const lenHex = (body.byteLength + 4).toString(16).padStart(4, '0');
	const out = new Uint8Array(4 + body.byteLength);
	out.set(encoder.encode(lenHex), 0);
	out.set(body, 4);
	return out;
}

export function encodeSmartV2Command(command: string, args: readonly string[]): Uint8Array {
	const parts: Uint8Array[] = [encodePktLine(`command=${command}\n`), encoder.encode('0001')];
	for (const arg of args) parts.push(encodePktLine(`${arg}\n`));
	parts.push(encoder.encode('0000'));
	const total = parts.reduce((acc, p) => acc + p.byteLength, 0);
	const merged = new Uint8Array(total);
	let pos = 0;
	for (const p of parts) { merged.set(p, pos); pos += p.byteLength; }
	return merged;
}

export function extractSidebandPackfile(pktStream: Uint8Array): Uint8Array {
	if (pktStream.byteLength >= 4 && new DataView(pktStream.buffer, pktStream.byteOffset, 4).getUint32(0, false) === GIT_INGESTION_LIMITS.PACK_SIGNATURE) {
		return pktStream;
	}
	const chunks: Uint8Array[] = [];
	let pos = 0;
	while (pos + 4 <= pktStream.byteLength) {
		const hdr = decoder.decode(pktStream.subarray(pos, pos + 4));
		pos += 4;
		if (hdr === '0000' || hdr === '0001' || hdr === '0002') continue;
		const len = parseInt(hdr, 16);
		if (!Number.isFinite(len) || len < 4 || pos + (len - 4) > pktStream.byteLength) break;
		const frame = pktStream.subarray(pos, pos + len - 4);
		pos += len - 4;
		if (frame[0] === 1) chunks.push(frame.subarray(1));
	}
	const total = chunks.reduce((s, c) => s + c.byteLength, 0);
	const out = new Uint8Array(total);
	let cur = 0;
	for (const c of chunks) { out.set(c, cur); cur += c.byteLength; }
	return out;
}

export function extractRefOidFromLsRefs(pktBytes: Uint8Array, refName: string): string | null {
	const text = decoder.decode(pktBytes);
	const targets = [`refs/heads/${refName}`, `refs/tags/${refName}`, 'HEAD'];
	for (const target of targets) {
		const esc = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const match = text.match(new RegExp(`([0-9a-f]{40})\\s+${esc}(?:\\s|\\n|$)`));
		if (match) return match[1]!;
	}
	return text.match(/\b([0-9a-f]{40})\b/)?.[1] ?? null;
}

export function parseGitTreeEntries(treeBytes: Uint8Array): readonly ParsedTreeEntry[] {
	const entries: ParsedTreeEntry[] = [];
	let pos = 0;
	while (pos < treeBytes.byteLength) {
		const sp = treeBytes.indexOf(0x20, pos), nul = treeBytes.indexOf(0x00, sp + 1);
		if (sp < 0 || nul < 0 || nul + 21 > treeBytes.byteLength) break;
		const mode = decoder.decode(treeBytes.subarray(pos, sp));
		const name = decoder.decode(treeBytes.subarray(sp + 1, nul));
		const oid = Array.from(treeBytes.subarray(nul + 1, nul + 21)).map((b) => b.toString(16).padStart(2, '0')).join('');
		entries.push({ mode, name, oid });
		pos = nul + 21;
	}
	return entries;
}

function isSupportedRepoSource(path: string, subpathPrefix: string): boolean {
	if (subpathPrefix && !path.startsWith(subpathPrefix)) return false;
	for (const ignored of PKZIP_CONSTANTS.IGNORED_PATH_SEGMENTS) { if (path.includes(ignored)) return false; }
	const dot = path.lastIndexOf('.');
	return dot >= 0 && Boolean(FILE_EXTENSIONS_MAP[path.slice(dot).toLowerCase()]);
}

export async function parseGitPackfileToSources(packBytes: Uint8Array, targetCommitOid?: string, subpathPrefix = ''): Promise<readonly SourceFileUnit[]> {
	if (packBytes.byteLength < 32 || packBytes.byteLength > GIT_INGESTION_LIMITS.MAX_PACKFILE_BYTES) {
		throw new Error('Git PACK payload missing or exceeds 32 MiB security cap.');
	}
	const dv = new DataView(packBytes.buffer, packBytes.byteOffset, packBytes.byteLength);
	if (dv.getUint32(0, false) !== GIT_INGESTION_LIMITS.PACK_SIGNATURE || dv.getUint32(4, false) !== GIT_INGESTION_LIMITS.PACK_VERSION) {
		throw new Error('Invalid Git PACK v2 header.');
	}
	const count = dv.getUint32(8, false), maxEnd = packBytes.byteLength - 20;
	const byOffset = new Map<number, UnpackedObject>(), byOid = new Map<string, UnpackedObject>();
	let cursor = 12;
	for (let i = 0; i < count && cursor < maxEnd; i++) {
		const entryStart = cursor, hdr = readPackObjectHeader(packBytes, cursor);
		cursor = hdr.nextOffset;
		if (hdr.size > GIT_INGESTION_LIMITS.MAX_UNPACKED_BLOB_BYTES) throw new Error('Unpacked Git blob exceeded 2 MiB cap.');
		let baseRefOffset: number | null = null, baseRefOid: string | null = null;
		if (hdr.typeCode === 6) {
			const ofs = readOfsDeltaOffset(packBytes, cursor); baseRefOffset = entryStart - ofs.backOffset; cursor = ofs.nextOffset;
		} else if (hdr.typeCode === 7) {
			baseRefOid = Array.from(packBytes.subarray(cursor, cursor + 20)).map((b) => b.toString(16).padStart(2, '0')).join(''); cursor += 20;
		}
		const inflated = await inflatePackZlibStreamAt(packBytes, cursor, maxEnd);
		cursor = inflated.nextOffset;
		const base = baseRefOffset !== null ? byOffset.get(baseRefOffset) : baseRefOid ? byOid.get(baseRefOid) : undefined;
		const typeCode = base ? base.typeCode : hdr.typeCode, typeName = TYPE_NAMES[typeCode] ?? 'blob';
		const data = base ? applyGitDelta(base.data, inflated.data) : inflated.data;
		const oid = await computeGitObjectOid(typeName, data);
		const obj: UnpackedObject = { typeCode, typeName, data, oid };
		byOffset.set(entryStart, obj); byOid.set(oid, obj);
	}
	const commitObj = (targetCommitOid ? byOid.get(targetCommitOid) : undefined) ?? Array.from(byOid.values()).find((o) => o.typeCode === 1);
	const rootTreeOid = commitObj ? decoder.decode(commitObj.data).match(/^tree ([0-9a-f]{40})/m)?.[1] : Array.from(byOid.values()).find((o) => o.typeCode === 2)?.oid;
	if (!rootTreeOid || !byOid.get(rootTreeOid)) return [];
	const files: SourceFileUnit[] = [];
	const walkTree = (treeOid: string, prefix: string): void => {
		const treeObj = byOid.get(treeOid); if (!treeObj || files.length >= GIT_INGESTION_LIMITS.MAX_SOURCE_FILES) return;
		for (const ent of parseGitTreeEntries(treeObj.data)) {
			const full = prefix ? `${prefix}/${ent.name}` : ent.name;
			if (ent.mode === '40000' || ent.mode === '040000') walkTree(ent.oid, full);
			else if (isSupportedRepoSource(full, subpathPrefix)) {
				const blob = byOid.get(ent.oid);
				if (blob) { const code = decoder.decode(blob.data).trim(); if (code) files.push({ path: full, code }); }
			}
		}
	};
	walkTree(rootTreeOid, '');
	return files;
}
