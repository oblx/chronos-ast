/**
 * @author Oblx <code@oblx.dev>
 * @description Hardened remote URL workspace fetcher with SSRF egress validation and prototype-pollution-free JSON parsing.
 */
import { PKZIP_CONSTANTS } from '@config/metamodel.constants';
import { safeFetchWithRedirectGuard } from '@core/security/guards/net.guard';
import type { SourceFileUnit } from '@core/metamodel/workspace.sources';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { deserializeWorkspaceBundle, type PortableWorkspaceBundle } from '../serialization/bundle.serializer';
import { extractSourceFilesFromZip } from './zip.extractor';

export type RemoteIngestOutcome =
	| { readonly kind: 'BUNDLE'; readonly bundle: PortableWorkspaceBundle }
	| { readonly kind: 'SOURCES'; readonly workspaceName: string; readonly files: readonly SourceFileUnit[] };

function isPkzipBuffer(bytes: Uint8Array): boolean {
	if (bytes.byteLength < 4) return false;
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) === PKZIP_CONSTANTS.LOCAL_FILE_HEADER_SIG;
}

export function parseRemoteJsonPayload(rawText: string, fallbackName: string): RemoteIngestOutcome {
	const parsed = parseSafeJson<Record<string, unknown>>(rawText);
	const snap = parsed?.snapshot as Record<string, unknown> | undefined;
	if (snap && Array.isArray(snap.nodes)) {
		return { kind: 'BUNDLE', bundle: deserializeWorkspaceBundle(rawText) };
	}
	if (Array.isArray(parsed?.files)) {
		const files: SourceFileUnit[] = (parsed.files as Array<{ path?: string; code?: string }>)
			.filter((f) => Boolean(f?.path && f?.code))
			.map((f) => ({ path: String(f.path), code: String(f.code) }));
		return { kind: 'SOURCES', workspaceName: String(parsed.name ?? fallbackName), files };
	}
	if (parsed && typeof parsed === 'object') {
		const files: SourceFileUnit[] = Object.entries(parsed)
			.filter(([k, v]) => typeof v === 'string' && k.includes('.'))
			.map(([path, code]) => ({ path, code: String(code) }));
		if (files.length > 0) return { kind: 'SOURCES', workspaceName: fallbackName, files };
	}
	throw new Error('Remote JSON does not match Chronos Bundle or Source File schema.');
}

export async function ingestFromRemoteUrl(targetUrl: string, customName?: string): Promise<RemoteIngestOutcome> {
	const response = await safeFetchWithRedirectGuard(targetUrl);
	if (!response.ok) throw new Error(`Remote fetch failed with HTTP ${response.status}`);
	const derivedName =
		customName?.trim() ||
		targetUrl.split('/').filter(Boolean).pop()?.replace(/\.(json|zip)$/i, '') ||
		'Remote Workspace';

	const bytes = new Uint8Array(await response.arrayBuffer());
	if (targetUrl.toLowerCase().endsWith('.zip') || isPkzipBuffer(bytes)) {
		const files = await extractSourceFilesFromZip(bytes);
		if (files.length === 0) throw new Error('No supported source files found in remote .zip archive.');
		return { kind: 'SOURCES', workspaceName: derivedName, files };
	}
	const text = new TextDecoder().decode(bytes).trim();
	if (text.startsWith('{') || text.startsWith('[')) return parseRemoteJsonPayload(text, derivedName);
	return { kind: 'SOURCES', workspaceName: derivedName, files: [{ path: targetUrl.split('/').pop() ?? 'remote_module.ts', code: text }] };
}
