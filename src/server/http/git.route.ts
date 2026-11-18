/**
 * @author Oblx <code@oblx.dev>
 * @description Server-side /api/projects/ingest-git and /api/projects/git-pr handlers with AEAD Vault PAT decryption and zeroing (v2.5.0).
 */
import { and, eq } from 'drizzle-orm';
import { WORKFLOW_WEBHOOK_EVENTS } from '@config/constants';
import { CAPABILITY_BITS } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { secretsVault } from '@lib/db/sqlite/schema/tables';
import { publishGitPullRequest } from '@core/ingestion/git.publisher';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { ingestGitRepository } from '@core/metamodel/workspace/ingestion/git.ingestor';
import { createWorkspaceFromSources } from '@core/metamodel/workspace/manager/workspace.manager';
import { appendAuditEntry } from '@core/security/audit.chain';
import { redactSourceFilesMap } from '@core/security/guards/payload.redactor';
import { decryptVaultSecret } from '@core/security/vault.crypto';
import { dispatchWorkflowWebhookAsync } from '@plugins/exporters/webhook.bridge';
import { badRequestResponse, okResponse, parseBodyObject, requireCapability, type ApiResponseEnvelope, type RequestPrincipal } from './middleware';

async function resolveVaultBearerToken(
	handle: ChronosDatabaseHandle, principal: RequestPrincipal, method: string,
	headers: Record<string, string>, vaultSecretId?: string
): Promise<{ readonly token?: string; readonly denied?: ApiResponseEnvelope }> {
	if (!vaultSecretId) return {};
	const vaultDenied = await requireCapability(principal, method, headers, CAPABILITY_BITS.VAULT_SECRET_USE);
	if (vaultDenied) return { denied: vaultDenied };
	const row = handle.db.select().from(secretsVault).where(and(eq(secretsVault.id, vaultSecretId), eq(secretsVault.ownerId, principal.userId))).get();
	if (!row) return { denied: badRequestResponse('Referenced vault secret not found for principal.') };
	const token = await decryptVaultSecret({ ownerId: row.ownerId, secretId: row.id, ciphertextB64: row.ciphertextB64, ivB64: row.ivB64, keyVersion: row.keyVersion });
	return { token };
}

export async function handleGitIngestRoute(
	handle: ChronosDatabaseHandle, bodyText: string | undefined, method: string, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope> {
	const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.WORKSPACE_INGEST_REMOTE);
	if (denied) return denied;
	const body = parseBodyObject(bodyText);
	const repoUrl = String(body.repoUrl ?? body.url ?? '').trim();
	if (!repoUrl) return badRequestResponse('Git repository URL or shorthand is required.');
	const branchOrRef = body.branchOrRef ? String(body.branchOrRef).trim() : undefined;
	const vaultSecretId = body.vaultSecretId ? String(body.vaultSecretId).trim() : undefined;
	const resolved = await resolveVaultBearerToken(handle, principal, method, headers, vaultSecretId);
	if (resolved.denied) return resolved.denied;
	const result = await ingestGitRepository(repoUrl, branchOrRef, resolved.token);
	const record = createWorkspaceFromSources(handle, result.descriptor.workspaceName, result.files, 'ws-git', {
		kind: 'GIT', sourceOrigin: result.descriptor.cloneUrl, branchOrRef: result.descriptor.ref,
	});
	await appendAuditEntry(handle, principal.userId, 'GIT_REPO_INGESTED', 'INFO', `${result.tierUsed}: ${result.descriptor.workspaceName} (${result.files.length} files)`);
	dispatchWorkflowWebhookAsync(handle, WORKFLOW_WEBHOOK_EVENTS.PROJECT_INDEXED, { projectId: record.id, filesCount: result.files.length, origin: result.descriptor.cloneUrl });
	return okResponse({ ...record, tierUsed: result.tierUsed, branch: result.descriptor.ref });
}

export async function handleGitPrPublishRoute(
	handle: ChronosDatabaseHandle, snapshot: WorkspaceSnapshot, bodyText: string | undefined,
	method: string, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope> {
	const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.EXPORT_ARTIFACTS);
	if (denied) return denied;
	const vaultCapDenied = await requireCapability(principal, method, headers, CAPABILITY_BITS.VAULT_SECRET_USE);
	if (vaultCapDenied) return vaultCapDenied;
	const body = parseBodyObject(bodyText);
	const repoUrl = String(body.repoUrl ?? body.url ?? '').trim();
	if (!repoUrl) return badRequestResponse('Git repository URL or shorthand is required for PR publication.');
	const vaultSecretId = body.vaultSecretId ? String(body.vaultSecretId).trim() : undefined;
	const resolved = await resolveVaultBearerToken(handle, principal, method, headers, vaultSecretId);
	if (resolved.denied) return resolved.denied;
	const patPlaintext = resolved.token ?? String(body.patToken ?? 'chronos-ephemeral-pat');
	const deliverables = Array.isArray(body.deliverables) ? body.deliverables.map((d) => String(d)) : [];
	const modFiles = typeof body.modifiedFiles === 'object' && body.modifiedFiles !== null
		? redactSourceFilesMap(Object.entries(body.modifiedFiles as Record<string, string>).map(([path, content]) => ({ path, content })))
		: undefined;
	const result = await publishGitPullRequest({
		repoUrl,
		baseBranch: body.baseBranch ? String(body.baseBranch) : 'main',
		shortCode: body.shortCode ? String(body.shortCode) : 'CHR-CORE',
		snapshot,
		plaintextPat: patPlaintext,
		deliverables: deliverables.length > 0 ? {
			includeMermaidDsl: deliverables.includes('docs/architecture.mmd'),
			includePlantUml: deliverables.includes('docs/architecture.puml'),
			includeSarifReport: deliverables.includes('chronos-report.sarif.json'),
			includeAuditMarkdown: deliverables.includes('docs/CHRONOS_AUDIT.md'),
			modifiedFiles: modFiles,
		} : { includePlantUml: true, modifiedFiles: modFiles },
		dryRun: Boolean(body.dryRun ?? true),
	});
	await appendAuditEntry(handle, principal.userId, 'GIT_PR_PUBLISHED', 'INFO', `${result.forge} ${result.branchName} -> ${result.baseBranch} (${result.committedFiles.length} files)`);
	dispatchWorkflowWebhookAsync(handle, WORKFLOW_WEBHOOK_EVENTS.PR_PUBLISHED, { forge: result.forge, branchName: result.branchName, baseBranch: result.baseBranch, committedFiles: result.committedFiles });
	return okResponse(result);
}
