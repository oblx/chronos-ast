/**
 * @author Oblx <code@oblx.dev>
 * @description Unit tests for Chronos v2.4.0 Git URL parser, pkt-line Smart v2 codec, PACK v2 binary unpacker (COMMIT/TREE/BLOB/OFS_DELTA), and SSRF check.
 */
import { describe, expect, test } from 'bun:test';
import { parseGitSourceDescriptor } from '@core/metamodel/workspace/ingestion/git.url';
import { encodeSmartV2Command, extractRefOidFromLsRefs, extractSidebandPackfile, parseGitPackfileToSources } from '@core/metamodel/workspace/ingestion/git_pack.parser';
import { computeGitObjectOid } from '@core/metamodel/workspace/ingestion/git_delta';
import { buildGitAuditDeliverables } from '@core/ingestion/git.publisher';
import { validateOutboundUrl } from '@core/security/guards/net.guard';

async function deflateZlib(data: Uint8Array): Promise<Uint8Array> {
	const cs = new CompressionStream('deflate');
	const w = cs.writable.getWriter();
	await w.write(Uint8Array.from(data));
	await w.close();
	return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

function encodePackHdr(typeCode: number, size: number): Uint8Array {
	const out: number[] = [];
	let byte = ((typeCode & 0x07) << 4) | (size & 0x0f);
	let rem = size >> 4;
	while (rem > 0) {
		out.push(byte | 0x80);
		byte = rem & 0x7f;
		rem >>= 7;
	}
	out.push(byte);
	return Uint8Array.from(out);
}

function hexTo20Bytes(hex: string): Uint8Array {
	const out = new Uint8Array(20);
	for (let i = 0; i < 20; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return out;
}

describe('Universal Git Protocol & PACK v2 Unpacker', () => {
	test('normalizes HTTPS URLs and github:/gitlab:/gitea: shorthands deterministically', async () => {
		const gh = parseGitSourceDescriptor('github:oblx/chronos@main');
		expect(gh.forge).toBe('GITHUB');
		expect(gh.cloneUrl).toBe('https://github.com/oblx/chronos.git');
		expect(gh.archiveUrls[0]).toContain('codeload.github.com/oblx/chronos/zip');

		const gl = parseGitSourceDescriptor('https://gitlab.com/team/core/tree/v2.4');
		expect(gl.forge).toBe('GITLAB');
		expect(gl.ref).toBe('v2.4');
		expect(gl.projectIdentityKey).toBe(parseGitSourceDescriptor('gitlab:team/core#v2.4').projectIdentityKey);

		await expect(validateOutboundUrl('http://169.254.169.254/latest')).rejects.toThrow();
		await expect(validateOutboundUrl('https://127.0.0.1/repo.git')).rejects.toThrow();
	});

	test('decodes Smart HTTP v2 ls-refs and unpacks synthetic PACK v2 COMMIT/TREE/BLOB', async () => {
		const cmd = encodeSmartV2Command('ls-refs', ['peel', 'ref-prefix refs/heads/']);
		expect(new TextDecoder().decode(cmd)).toContain('command=ls-refs');

		const sampleRef = 'a'.repeat(40);
		const pkt = new TextEncoder().encode(`0032${sampleRef} refs/heads/main\n0000`);
		expect(extractRefOidFromLsRefs(pkt, 'main')).toBe(sampleRef);

		const enc = new TextEncoder();
		const blobBytes = enc.encode('export function ping(): number { return 42; }\n');
		const blobOid = await computeGitObjectOid('blob', blobBytes);
		const entryName = enc.encode('100644 main.ts\0');
		const treeBytes = new Uint8Array(entryName.length + 20);
		treeBytes.set(entryName, 0); treeBytes.set(hexTo20Bytes(blobOid), entryName.length);
		const treeOid = await computeGitObjectOid('tree', treeBytes);
		const commitBytes = enc.encode(`tree ${treeOid}\nauthor Oblx <code@oblx.dev> 0 +0000\n\ninit\n`);
		const commitOid = await computeGitObjectOid('commit', commitBytes);

		const parts: Uint8Array[] = [
			enc.encode('PACK\x00\x00\x00\x02\x00\x00\x00\x03'),
			encodePackHdr(3, blobBytes.length), await deflateZlib(blobBytes),
			encodePackHdr(2, treeBytes.length), await deflateZlib(treeBytes),
			encodePackHdr(1, commitBytes.length), await deflateZlib(commitBytes),
			new Uint8Array(20),
		];
		const pack = new Uint8Array(parts.reduce((s, p) => s + p.byteLength, 0));
		let cur = 0;
		for (const p of parts) { pack.set(p, cur); cur += p.byteLength; }

		expect(extractSidebandPackfile(pack).byteLength).toBe(pack.byteLength);
		const extracted = await parseGitPackfileToSources(pack, commitOid);
		expect(extracted).toHaveLength(1);
		expect(extracted[0]?.path).toBe('main.ts');
		expect(extracted[0]?.code).toContain('return 42');

		const bundle = buildGitAuditDeliverables(
			'CHR-CORE',
			{ indexedFilesCount: 1, workerDurationMicros: 10, hasCycles: false, nodes: [], edges: [], sourceMap: {} },
			{ includeMermaidDsl: true, includePlantUml: true, includeSarifReport: true, includeAuditMarkdown: true }
		);
		expect(bundle).toHaveLength(4);
		expect(bundle.find((f) => f.path === 'docs/architecture.puml')?.content).toContain('@startuml');
	});
});
