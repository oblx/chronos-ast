/**
 * @author Oblx <code@oblx.dev>
 * @description Universal Git Protocol Ingestor: Tier-1 archive fast-path + Tier-2 Smart HTTP v2 / Smart HTTP v1 fallback & Vault PAT auth.
 */
import { APP_METADATA } from '@config/constants';
import { safeFetchWithRedirectGuard, validateOutboundUrl } from '@core/security/guards/net.guard';
import type { SourceFileUnit } from '@core/metamodel/workspace.sources';
import { extractSourceFilesFromZip } from './zip.extractor';
import { parseGitSourceDescriptor, type GitSourceDescriptor } from './git.url';
import {
	encodeSmartV1Want, encodeSmartV2Command, extractRefOidFromInfoRefs, extractRefOidFromLsRefs,
	extractSidebandPackfile, isSmartHttpV2Advertisement, parseGitPackfileToSources,
} from './git_pack.parser';

export interface GitIngestionResult {
	readonly descriptor: GitSourceDescriptor;
	readonly tierUsed: 'TIER1_ARCHIVE_ZIP' | 'TIER2_SMART_HTTP_V2' | 'TIER2_SMART_HTTP_V1';
	readonly files: readonly SourceFileUnit[];
}

function buildAuthHeaders(bearerToken?: string): Record<string, string> {
	const headers: Record<string, string> = { 'User-Agent': `${APP_METADATA.NAME}-Git-Ingestor/${APP_METADATA.VERSION}` };
	if (bearerToken?.trim()) headers.Authorization = `Bearer ${bearerToken.trim()}`;
	return headers;
}

async function tryTier1ArchiveFastPath(desc: GitSourceDescriptor, authHeaders: Record<string, string>): Promise<readonly SourceFileUnit[] | null> {
	for (const archiveUrl of desc.archiveUrls) {
		try {
			const res = await safeFetchWithRedirectGuard(archiveUrl, { headers: authHeaders });
			if (!res.ok) continue;
			const bytes = new Uint8Array(await res.arrayBuffer());
			const files = await extractSourceFilesFromZip(bytes);
			const scoped = desc.subpath ? files.filter((f) => f.path.startsWith(desc.subpath)) : files;
			if (scoped.length > 0) return scoped;
		} catch { continue; }
	}
	return null;
}

async function executeSmartUploadPackV1(
	desc: GitSourceDescriptor, uploadUrl: string, infoBytes: Uint8Array, authHeaders: Record<string, string>
): Promise<readonly SourceFileUnit[]> {
	const targetOid = extractRefOidFromInfoRefs(infoBytes, desc.ref);
	if (!targetOid) throw new Error(`Git ref '${desc.ref}' not found in v1 remote advertisement.`);
	const v1Headers = { ...authHeaders, 'Content-Type': 'application/x-git-upload-pack-request' };
	const packRes = await safeFetchWithRedirectGuard(uploadUrl, { method: 'POST', headers: v1Headers, body: new Uint8Array(encodeSmartV1Want(targetOid)) });
	if (!packRes.ok) throw new Error(`Git Smart HTTP v1 upload-pack failed (HTTP ${packRes.status}).`);
	const packBytes = extractSidebandPackfile(new Uint8Array(await packRes.arrayBuffer()));
	return parseGitPackfileToSources(packBytes, targetOid, desc.subpath);
}

async function executeTier2SmartHttp(
	desc: GitSourceDescriptor, authHeaders: Record<string, string>
): Promise<{ tierUsed: 'TIER2_SMART_HTTP_V2' | 'TIER2_SMART_HTTP_V1'; files: readonly SourceFileUnit[] }> {
	const infoRes = await safeFetchWithRedirectGuard(`${desc.cloneUrl}/info/refs?service=git-upload-pack`, {
		headers: { ...authHeaders, 'Git-Protocol': 'version=2' },
	});
	if (!infoRes.ok) throw new Error(`Git Smart HTTP discovery failed (HTTP ${infoRes.status}).`);
	const infoBytes = new Uint8Array(await infoRes.arrayBuffer());
	const uploadUrl = `${desc.cloneUrl}/git-upload-pack`;
	if (!isSmartHttpV2Advertisement(infoBytes)) {
		return { tierUsed: 'TIER2_SMART_HTTP_V1', files: await executeSmartUploadPackV1(desc, uploadUrl, infoBytes, authHeaders) };
	}
	const v2Headers = { ...authHeaders, 'Git-Protocol': 'version=2', 'Content-Type': 'application/x-git-upload-pack-request' };
	const lsBody = encodeSmartV2Command('ls-refs', ['peel', 'symrefs', `ref-prefix refs/heads/${desc.ref}`, `ref-prefix refs/tags/${desc.ref}`, 'ref-prefix HEAD']);
	const lsRes = await safeFetchWithRedirectGuard(uploadUrl, { method: 'POST', headers: v2Headers, body: new Uint8Array(lsBody) });
	if (!lsRes.ok) throw new Error(`Git ls-refs failed (HTTP ${lsRes.status}).`);
	const targetOid = extractRefOidFromLsRefs(new Uint8Array(await lsRes.arrayBuffer()), desc.ref);
	if (!targetOid) throw new Error(`Git ref '${desc.ref}' not found on remote repository.`);
	const fetchBody = encodeSmartV2Command('fetch', ['deepen 1', 'no-progress', `want ${targetOid}`, 'done']);
	const packRes = await safeFetchWithRedirectGuard(uploadUrl, { method: 'POST', headers: v2Headers, body: new Uint8Array(fetchBody) });
	if (!packRes.ok) throw new Error(`Git upload-pack fetch failed (HTTP ${packRes.status}).`);
	const packBytes = extractSidebandPackfile(new Uint8Array(await packRes.arrayBuffer()));
	return { tierUsed: 'TIER2_SMART_HTTP_V2', files: await parseGitPackfileToSources(packBytes, targetOid, desc.subpath) };
}

export async function ingestGitRepository(rawRepoUrl: string, branchOrRef?: string, bearerToken?: string): Promise<GitIngestionResult> {
	const descriptor = parseGitSourceDescriptor(rawRepoUrl, branchOrRef);
	await validateOutboundUrl(descriptor.cloneUrl);
	const headers = buildAuthHeaders(bearerToken);
	const tier1Files = await tryTier1ArchiveFastPath(descriptor, headers);
	if (tier1Files && tier1Files.length > 0) {
		return { descriptor, tierUsed: 'TIER1_ARCHIVE_ZIP', files: tier1Files };
	}
	const { tierUsed, files } = await executeTier2SmartHttp(descriptor, headers);
	if (files.length === 0) throw new Error('No supported source files discovered in Git repository.');
	return { descriptor, tierUsed, files };
}
