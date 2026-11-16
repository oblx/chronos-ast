/**
 * @author Oblx <code@oblx.dev>
 * @description Pure-TS Git binary pack header decoders, SHA-1 OID hashing, OFS/REF delta reconstruction, and Web DecompressionStream boundary framer.
 */
export interface PackVarintHeader {
	readonly typeCode: number;
	readonly size: number;
	readonly nextOffset: number;
}

export function readPackObjectHeader(buf: Uint8Array, start: number): PackVarintHeader {
	let byte = buf[start]!;
	const typeCode = (byte >> 4) & 0x07;
	let size = byte & 0x0f;
	let shift = 4, offset = start + 1;
	while ((byte & 0x80) !== 0 && offset < buf.length) {
		byte = buf[offset++]!;
		size += (byte & 0x7f) << shift;
		shift += 7;
	}
	return { typeCode, size, nextOffset: offset };
}

export function readOfsDeltaOffset(buf: Uint8Array, start: number): { readonly backOffset: number; readonly nextOffset: number } {
	let offset = start, byte = buf[offset++]!;
	let val = byte & 0x7f;
	while ((byte & 0x80) !== 0 && offset < buf.length) {
		byte = buf[offset++]!;
		val = ((val + 1) << 7) | (byte & 0x7f);
	}
	return { backOffset: val, nextOffset: offset };
}

function readDeltaSize(buf: Uint8Array, start: number): { readonly value: number; readonly nextOffset: number } {
	let value = 0, shift = 0, offset = start;
	while (offset < buf.length) {
		const b = buf[offset++]!;
		value |= (b & 0x7f) << shift;
		if ((b & 0x80) === 0) break;
		shift += 7;
	}
	return { value, nextOffset: offset };
}

export function applyGitDelta(base: Uint8Array, delta: Uint8Array): Uint8Array {
	const srcInfo = readDeltaSize(delta, 0);
	if (srcInfo.value !== base.byteLength) throw new Error('Git delta base size mismatch.');
	const tgtInfo = readDeltaSize(delta, srcInfo.nextOffset);
	const out = new Uint8Array(tgtInfo.value);
	let dPos = tgtInfo.nextOffset, outPos = 0;
	while (dPos < delta.byteLength) {
		const cmd = delta[dPos++]!;
		if ((cmd & 0x80) !== 0) {
			let cpOff = 0, cpSize = 0;
			if (cmd & 0x01) cpOff |= delta[dPos++]!;
			if (cmd & 0x02) cpOff |= delta[dPos++]! << 8;
			if (cmd & 0x04) cpOff |= delta[dPos++]! << 16;
			if (cmd & 0x08) cpOff |= delta[dPos++]! << 24;
			if (cmd & 0x10) cpSize |= delta[dPos++]!;
			if (cmd & 0x20) cpSize |= delta[dPos++]! << 8;
			if (cmd & 0x40) cpSize |= delta[dPos++]! << 16;
			if (cpSize === 0) cpSize = 0x10000;
			out.set(base.subarray(cpOff, cpOff + cpSize), outPos);
			outPos += cpSize;
		} else if (cmd > 0) {
			out.set(delta.subarray(dPos, dPos + cmd), outPos);
			dPos += cmd; outPos += cmd;
		} else {
			throw new Error('Invalid zero opcode inside Git pack delta.');
		}
	}
	return out;
}

export async function computeGitObjectOid(typeName: string, body: Uint8Array): Promise<string> {
	const header = new TextEncoder().encode(`${typeName} ${body.byteLength}\0`);
	const combined = new Uint8Array(header.byteLength + body.byteLength);
	combined.set(header, 0);
	combined.set(body, header.byteLength);
	const digest = await crypto.subtle.digest('SHA-1', combined);
	return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function tryZlibDecompress(slice: Uint8Array): Promise<{ readonly status: 'OK' | 'SHORT' | 'LONG'; readonly data?: Uint8Array }> {
	const ds = new DecompressionStream('deflate');
	const writer = ds.writable.getWriter(), reader = ds.readable.getReader();
	const collect = (async () => {
		const chunks: Uint8Array[] = []; let total = 0;
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value); total += value.byteLength;
		}
		const merged = new Uint8Array(total); let pos = 0;
		for (const c of chunks) { merged.set(c, pos); pos += c.byteLength; }
		return merged;
	})();
	try {
		await writer.write(new Uint8Array(slice));
		await writer.close();
		return { status: 'OK', data: await collect };
	} catch (err) {
		await collect.catch(() => {});
		return { status: String(err).includes('TRAILING_JUNK') ? 'LONG' : 'SHORT' };
	}
}

export async function inflatePackZlibStreamAt(buf: Uint8Array, start: number, maxEnd: number): Promise<{ readonly data: Uint8Array; readonly nextOffset: number }> {
	const remaining = maxEnd - start;
	let lo = 6, hi = Math.min(remaining, 64);
	while (hi < remaining) {
		const probe = await tryZlibDecompress(buf.subarray(start, start + hi));
		if (probe.status === 'OK') return { data: probe.data!, nextOffset: start + hi };
		if (probe.status === 'LONG') break;
		lo = hi + 1; hi = Math.min(remaining, hi * 2);
	}
	hi = Math.min(hi, remaining);
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		const probe = await tryZlibDecompress(buf.subarray(start, start + mid));
		if (probe.status === 'OK') return { data: probe.data!, nextOffset: start + mid };
		if (probe.status === 'SHORT') lo = mid + 1; else hi = mid - 1;
	}
	throw new Error('Corrupt zlib stream inside Git PACK v2 entry.');
}
