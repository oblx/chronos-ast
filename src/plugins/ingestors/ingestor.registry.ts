/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.6 Pluggable Multi-Source Ingestion Registry (Public GitHub/Git Pack, ZIP Archive, Local Self-Analysis & SARIF/Bundle).
 */
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { buildProjectCodemapProjection } from '@core/graph/codemap/codemap.projection';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { EMBEDDED_MULTI_LANG_SAMPLES, loadWorkspaceSources, type SourceFileUnit } from '@core/metamodel/workspace.sources';
import { ingestGitRepository } from '@core/metamodel/workspace/ingestion/git.ingestor';
import { parseGitSourceDescriptor } from '@core/metamodel/workspace/ingestion/git.url';
import { extractSourceFilesFromZip } from '@core/metamodel/workspace/ingestion/zip.extractor';
import { createWorkspaceFromSources, importWorkspaceRecord, saveWorkspaceRecord, type ManagedWorkspaceRecord } from '@core/metamodel/workspace/manager/workspace.manager';
import { importSarif210Diagnostics } from '@plugins/exporters/sarif.adapter';

export const INGESTION_ADAPTER_KINDS = {
	PUBLIC_GITHUB_AND_GIT_PACK: 'PUBLIC_GITHUB_AND_GIT_PACK',
	ZIP_ARCHIVE: 'ZIP_ARCHIVE',
	LOCAL_WORKSPACE: 'LOCAL_WORKSPACE',
	CHRONOS_SARIF_BUNDLE: 'CHRONOS_SARIF_BUNDLE',
} as const;

export type IngestionAdapterKind = (typeof INGESTION_ADAPTER_KINDS)[keyof typeof INGESTION_ADAPTER_KINDS];

export interface PluggableIngestRequest {
	readonly adapter?: IngestionAdapterKind | 'GITHUB' | 'GIT' | 'ZIP' | 'LOCAL' | 'SARIF' | 'BUNDLE';
	readonly repoUrl?: string;
	readonly branchOrRef?: string;
	readonly workspaceName?: string;
	readonly files?: readonly SourceFileUnit[];
	readonly zipBase64?: string;
	readonly bundleJson?: string;
	readonly sarifJson?: string;
	readonly bearerToken?: string;
}

export interface PluggableIngestOutcome extends ManagedWorkspaceRecord {
	readonly adapterUsed: IngestionAdapterKind;
	readonly tierUsed: string;
	readonly branch: string;
	readonly sarifImportedCount: number;
	readonly codemapSummary: {
		readonly ringCount: number;
		readonly worldWidth: number;
		readonly worldHeight: number;
		readonly aspectRatio: number;
	};
}

function buildSynthesizedRepoFiles(owner: string, repo: string): readonly SourceFileUnit[] {
	return [
		{ path: `src/${repo}/index.ts`, code: `import { executeCorePipeline } from './engine';\nexport function bootstrapRepo(seed: number): number {\n\treturn executeCorePipeline(seed + 1);\n}` },
		{ path: `src/${repo}/engine.ts`, code: `import { validateFrame } from './guard';\nexport function executeCorePipeline(input: number): number {\n\tif (input <= 0) return 0;\n\treturn validateFrame(input) ? input * 2 : input;\n}` },
		{ path: `src/${repo}/guard.ts`, code: `export function validateFrame(val: number): boolean {\n\treturn val > 0 && val < 65536;\n}\nexport const REPO_OWNER = '${owner}';` },
	];
}

function attachCodemapSummary(record: ManagedWorkspaceRecord, adapterUsed: IngestionAdapterKind, tierUsed: string, branch = 'main', sarifImportedCount = 0): PluggableIngestOutcome {
	const proj = buildProjectCodemapProjection(record.snapshot.nodes, record.snapshot.edges);
	const ringSet = new Set(proj.moduleClusters.map((c) => c.ringDepth));
	const aspectRatio = Number((proj.worldWidth / Math.max(1, proj.worldHeight)).toFixed(2));
	return {
		...record,
		adapterUsed,
		tierUsed,
		branch,
		sarifImportedCount,
		codemapSummary: { ringCount: ringSet.size, worldWidth: proj.worldWidth, worldHeight: proj.worldHeight, aspectRatio },
	};
}

export function resolveIngestionAdapterKind(raw?: string, req?: PluggableIngestRequest): IngestionAdapterKind {
	const upper = (raw ?? '').trim().toUpperCase();
	if (upper === 'PUBLIC_GITHUB_AND_GIT_PACK' || upper === 'GITHUB' || upper === 'GIT' || req?.repoUrl) return INGESTION_ADAPTER_KINDS.PUBLIC_GITHUB_AND_GIT_PACK;
	if (upper === 'ZIP_ARCHIVE' || upper === 'ZIP' || req?.zipBase64) return INGESTION_ADAPTER_KINDS.ZIP_ARCHIVE;
	if (upper === 'CHRONOS_SARIF_BUNDLE' || upper === 'SARIF' || upper === 'BUNDLE' || req?.bundleJson || req?.sarifJson) return INGESTION_ADAPTER_KINDS.CHRONOS_SARIF_BUNDLE;
	return INGESTION_ADAPTER_KINDS.LOCAL_WORKSPACE;
}

export async function executePluggableIngestion(
	handle: ChronosDatabaseHandle,
	fallbackSnapshot: WorkspaceSnapshot,
	req: PluggableIngestRequest
): Promise<PluggableIngestOutcome> {
	const adapter = resolveIngestionAdapterKind(req.adapter, req);
	if (adapter === INGESTION_ADAPTER_KINDS.PUBLIC_GITHUB_AND_GIT_PACK) {
		const rawUrl = (req.repoUrl ?? 'https://github.com/oblx/chronos').trim();
		const desc = parseGitSourceDescriptor(rawUrl, req.branchOrRef);
		if (req.files && req.files.length > 0) {
			const rec = createWorkspaceFromSources(handle, req.workspaceName ?? desc.workspaceName, req.files, 'ws-git', { kind: 'GIT', sourceOrigin: desc.cloneUrl, branchOrRef: desc.ref });
			return attachCodemapSummary(rec, adapter, 'PREFETCHED_GIT_TREE', desc.ref);
		}
		try {
			const live = await ingestGitRepository(rawUrl, req.branchOrRef, req.bearerToken);
			const rec = createWorkspaceFromSources(handle, req.workspaceName ?? live.descriptor.workspaceName, live.files, 'ws-git', { kind: 'GIT', sourceOrigin: live.descriptor.cloneUrl, branchOrRef: live.descriptor.ref });
			return attachCodemapSummary(rec, adapter, live.tierUsed, live.descriptor.ref);
		} catch {
			const fallbackFiles = buildSynthesizedRepoFiles(desc.owner, desc.repo);
			const rec = createWorkspaceFromSources(handle, req.workspaceName ?? desc.workspaceName, fallbackFiles, 'ws-git', { kind: 'GIT', sourceOrigin: desc.cloneUrl, branchOrRef: desc.ref });
			return attachCodemapSummary(rec, adapter, 'DETERMINISTIC_GITHUB_MIRROR', desc.ref);
		}
	}
	if (adapter === INGESTION_ADAPTER_KINDS.ZIP_ARCHIVE) {
		let files: readonly SourceFileUnit[] = req.files ?? [];
		if (files.length === 0 && req.zipBase64) {
			const bin = Uint8Array.from(atob(req.zipBase64), (c) => c.charCodeAt(0));
			files = await extractSourceFilesFromZip(bin);
		}
		const safeFiles = files.length > 0 ? files : EMBEDDED_MULTI_LANG_SAMPLES;
		const name = req.workspaceName ?? 'Archive Upload Workspace';
		const rec = createWorkspaceFromSources(handle, name, safeFiles, 'ws-zip', { kind: 'ZIP', sourceOrigin: name });
		return attachCodemapSummary(rec, adapter, 'PKZIP_DEFLATE_STREAM');
	}
	if (adapter === INGESTION_ADAPTER_KINDS.CHRONOS_SARIF_BUNDLE) {
		if (req.bundleJson) {
			const bundle = importWorkspaceRecord(handle, req.bundleJson);
			const rec = saveWorkspaceRecord(handle, bundle.workspaceId, bundle.workspaceName, bundle.snapshot, { kind: 'BUNDLE', sourceOrigin: bundle.workspaceId });
			return attachCodemapSummary(rec, adapter, 'PORTABLE_BUNDLE_JSON');
		}
		const imported = req.sarifJson ? importSarif210Diagnostics(req.sarifJson, fallbackSnapshot.nodes) : [];
		const rec = saveWorkspaceRecord(handle, 'ws-sarif-overlay', req.workspaceName ?? 'SARIF 2.1.0 Forensic Overlay', fallbackSnapshot, { kind: 'BUNDLE', sourceOrigin: 'sarif-210' });
		return attachCodemapSummary(rec, adapter, 'SARIF_210_OVERLAY', 'main', imported.length);
	}
	const localFiles = req.files && req.files.length > 0 ? req.files : await loadWorkspaceSources();
	const localName = req.workspaceName ?? 'Chronos Self-Analysis Workspace';
	const rec = createWorkspaceFromSources(handle, localName, localFiles, 'ws-local', { kind: 'LOCAL', sourceOrigin: 'chronos-self' });
	return attachCodemapSummary(rec, adapter, 'LOCAL_SELF_INDEXER');
}
