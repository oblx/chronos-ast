<!--
	@author Oblx <code@oblx.dev>
	@description Universal Multi-Source Workspace Ingestion Deck (.zip, Multi-File, Git Repo & Direct PR Publisher, Remote URL, JSON Bundle) (v2.5.0).
-->
<script lang="ts">
	import { API_ROUTES, WORKSPACE_DEFAULTS } from '@config/constants';
	import { clientDagKernel, validateClientForm, type SourceFileUnit } from '@client/state';
	import HudModalShell from '@client/components/modals/HudModalShell.svelte';
	import HudModalHeader from '@client/components/modals/HudModalHeader.svelte';
	import HudModalFooter from '@client/components/modals/HudModalFooter.svelte';

	interface Props {
		isOpen: boolean; exportedJson: string; providerUrl: string; providerBearer: string; onClose: () => void;
		onImportBundleJson: (rawJson: string) => Promise<void>; onUploadZipBytes: (zipBytes: Uint8Array, workspaceName: string) => Promise<void>;
		onUploadSourceFiles: (workspaceName: string, files: readonly SourceFileUnit[]) => Promise<void>; onIngestSampleZip: () => Promise<void>;
		onIngestRemoteUrl: (url: string, workspaceName?: string) => Promise<void>;
		onIngestGitRepo?: (repoUrl: string, branchOrRef?: string, vaultSecretId?: string) => Promise<void>;
		onSaveAiConfig: (url: string, bearer: string) => void;
	}
	let { isOpen, exportedJson, providerUrl, providerBearer, onClose, onImportBundleJson, onUploadZipBytes, onUploadSourceFiles, onIngestSampleZip, onIngestRemoteUrl, onIngestGitRepo, onSaveAiConfig }: Props = $props();
	let activeSourceTab = $state<'ZIP_FOLDER' | 'GIT_REPO' | 'REMOTE_URL' | 'JSON_BUNDLE'>('ZIP_FOLDER');
	let workspaceTitle = $state(''), remoteUrlInput = $state<string>(WORKSPACE_DEFAULTS.SAMPLE_REMOTE_URL), importText = $state('');
	let gitRepoInput = $state('github:sveltejs/svelte@main'), gitBranchInput = $state('main'), gitVaultSecretId = $state('');
	let prMode = $state(false), prDeliverables = $state<string[]>(['docs/architecture.mmd', 'chronos-report.sarif.json', 'docs/CHRONOS_AUDIT.md']), prStatus = $state('');
	let draftUrl = $state(''), draftBearer = $state(''), errorMsg = $state(''), isBusy = $state(false), shakeForm = $state(false);
	function triggerShake(): void { shakeForm = true; setTimeout(() => (shakeForm = false), 300); }

	async function handleFileSelection(fileList: FileList | null): Promise<void> {
		if (!fileList || fileList.length === 0) return;
		errorMsg = ''; isBusy = true;
		try {
			const first = fileList[0]!;
			if (first.name.toLowerCase().endsWith('.zip')) { await onUploadZipBytes(new Uint8Array(await first.arrayBuffer()), workspaceTitle.trim() || first.name.replace(/\.zip$/i, '')); onClose(); return; }
			const units: SourceFileUnit[] = [];
			for (let i = 0; i < fileList.length; i++) {
				const f = fileList[i]!;
				if (f.name.toLowerCase().endsWith('.json') && fileList.length === 1) { await onImportBundleJson(await f.text()); onClose(); return; }
				units.push({ path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, code: await f.text() });
			}
			await onUploadSourceFiles(workspaceTitle.trim() || 'Uploaded Multi-File Project', units); onClose();
		} catch (err) { errorMsg = err instanceof Error ? err.message : 'Archive or file ingestion failed'; triggerShake(); }
		finally { isBusy = false; }
	}
	async function handleUrlSubmit(): Promise<void> {
		errorMsg = ''; if (!remoteUrlInput.trim()) { errorMsg = 'Enter a remote URL.'; triggerShake(); return; }
		isBusy = true;
		try { await onIngestRemoteUrl(remoteUrlInput.trim(), workspaceTitle.trim() || undefined); onClose(); }
		catch (err) { errorMsg = err instanceof Error ? err.message : 'Remote URL ingestion failed'; triggerShake(); }
		finally { isBusy = false; }
	}
	async function handleGitSubmit(): Promise<void> {
		errorMsg = ''; prStatus = '';
		const v = validateClientForm('GIT_REPO', { repoUrl: gitRepoInput, branch: gitBranchInput });
		if (!v.valid) { errorMsg = v.error; triggerShake(); return; }
		isBusy = true;
		try {
			if (prMode) {
				const res = await clientDagKernel.requestJson<{ error?: string; branchName?: string; prUrl?: string; mode?: string }>(API_ROUTES.GIT_PR, { method: 'POST', body: { repoUrl: gitRepoInput.trim(), baseBranch: gitBranchInput.trim() || 'main', vaultSecretId: gitVaultSecretId.trim() || undefined, deliverables: prDeliverables }, sourceZone: 'APP_MODAL', intentKind: 'GIT_PUBLISH_PR' });
				if (!res.ok) throw new Error(res.data.error ?? 'Git PR publish failed');
				prStatus = `${res.data.mode ?? 'PUBLISHED'} → ${res.data.branchName} (${res.data.prUrl})`;
			} else if (onIngestGitRepo) { await onIngestGitRepo(gitRepoInput.trim(), gitBranchInput.trim() || undefined, gitVaultSecretId.trim() || undefined); onClose(); }
		} catch (err) { errorMsg = err instanceof Error ? err.message : 'Git operation failed'; triggerShake(); }
		finally { isBusy = false; }
	}
	async function handleBundleSubmit(): Promise<void> {
		errorMsg = ''; if (!importText.trim()) { errorMsg = 'Paste a valid Chronos Workspace Bundle JSON payload.'; triggerShake(); return; }
		try { await onImportBundleJson(importText.trim()); importText = ''; onClose(); }
		catch (err) { errorMsg = err instanceof Error ? err.message : 'Invalid JSON bundle'; triggerShake(); }
	}
	function toggleDeliverable(path: string): void { prDeliverables = prDeliverables.includes(path) ? prDeliverables.filter((p) => p !== path) : [...prDeliverables, path]; }
</script>

<HudModalShell {isOpen} ariaLabel="Universal Multi-Source Workspace Ingestion Deck" maxWidthClass="max-w-3xl" {onClose}>
	{#snippet header()}
		<HudModalHeader title="Workspace Ingest" subtitle="UNIVERSAL MULTI-SOURCE .ZIP · GIT PROTOCOL & PR PUBLISHER · REMOTE URL · JSON BUNDLE" {onClose}>
			{#snippet tabs()}
				<button type="button" onclick={() => (activeSourceTab = 'ZIP_FOLDER')} class={`px-2.5 py-1 text-[11px] font-mono border cursor-pointer ${activeSourceTab === 'ZIP_FOLDER' ? 'bg-[var(--hud-surface)] border-[var(--hud-accent)] text-[var(--hud-accent)] font-semibold' : 'bg-[var(--hud-bg)] border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>1. .ZIP / Files</button>
				<button type="button" data-testid="ingest-tab-git" onclick={() => (activeSourceTab = 'GIT_REPO')} class={`px-2.5 py-1 text-[11px] font-mono border cursor-pointer ${activeSourceTab === 'GIT_REPO' ? 'bg-[var(--hud-surface)] border-[var(--hud-accent)] text-[var(--hud-accent)] font-semibold' : 'bg-[var(--hud-bg)] border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>2. Git Repo &amp; PR</button>
				<button type="button" onclick={() => (activeSourceTab = 'REMOTE_URL')} class={`px-2.5 py-1 text-[11px] font-mono border cursor-pointer ${activeSourceTab === 'REMOTE_URL' ? 'bg-[var(--hud-surface)] border-[var(--hud-accent)] text-[var(--hud-accent)] font-semibold' : 'bg-[var(--hud-bg)] border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>3. Remote URL</button>
				<button type="button" onclick={() => (activeSourceTab = 'JSON_BUNDLE')} class={`px-2.5 py-1 text-[11px] font-mono border cursor-pointer ${activeSourceTab === 'JSON_BUNDLE' ? 'bg-[var(--hud-surface)] border-[var(--hud-accent)] text-[var(--hud-accent)] font-semibold' : 'bg-[var(--hud-bg)] border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>4. Bundle &amp; AI</button>
			{/snippet}
		</HudModalHeader>
	{/snippet}

	<div data-hud-vscroll="true" class={`flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3 font-mono text-xs ${shakeForm ? 'hud-form-shake' : ''}`}>
		<div class="flex flex-col gap-1">
			<label for="ws-custom-title" class="text-[var(--hud-muted)]">Target Workspace Tab Name (Optional)</label>
			<input id="ws-custom-title" type="text" bind:value={workspaceTitle} placeholder="e.g. Custom Rust Kernel or Uploaded .ZIP Project" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-3 py-1.5 text-xs text-[var(--hud-text)]" />
		</div>
		{#if activeSourceTab === 'ZIP_FOLDER'}
			<div class="border border-dashed border-[var(--hud-accent)] bg-[var(--hud-bg)] p-5 flex flex-col items-center justify-center gap-3 text-center">
				<p class="text-xs text-[var(--hud-text)] font-semibold">Select a Project <span class="text-[var(--hud-accent)]">.ZIP</span> Archive or Source Files (<span class="text-[var(--hud-nominal)]">.ts, .svelte, .rs, .cpp, .py, .go</span>)</p>
				<input aria-label="Upload project zip or source files" type="file" multiple accept=".zip,.ts,.tsx,.js,.jsx,.svelte,.rs,.cpp,.cc,.c,.hpp,.h,.go,.py,.json" onchange={(e) => handleFileSelection((e.currentTarget as HTMLInputElement).files)} class="text-xs text-[var(--hud-muted)] file:mr-3 file:px-3 file:py-1.5 file:border file:border-[var(--hud-accent)] file:bg-[var(--hud-surface)] file:text-[var(--hud-accent)] file:cursor-pointer" />
				<button type="button" disabled={isBusy} onclick={async () => { isBusy = true; await onIngestSampleZip(); isBusy = false; onClose(); }} class="px-3 py-1.5 bg-[var(--hud-accent)] text-[var(--hud-bg-base)] font-semibold cursor-pointer hud-tactile-bevel">Load Sample .ZIP Archive (Arcade Vector SDK)</button>
			</div>
		{:else if activeSourceTab === 'GIT_REPO'}
			<div class="flex flex-col gap-2.5 bg-[var(--hud-bg)] border border-[var(--hud-border)] p-3.5">
				<div class="flex items-center justify-between gap-2">
					<label for="git-repo-url" class="text-[var(--hud-muted)]">Git Repo (HTTPS .git, github:owner/repo@ref, gitlab:, gitea:)</label>
					<button type="button" data-testid="toggle-git-pr-mode" onclick={() => (prMode = !prMode)} class="px-2 py-0.5 border text-[10px] cursor-pointer {prMode ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}">{prMode ? 'Mode: Publish Branch & PR' : 'Mode: Clone & Index'}</button>
				</div>
				<input id="git-repo-url" data-testid="git-repo-input" type="text" bind:value={gitRepoInput} placeholder="https://github.com/owner/repo.git#main or github:owner/repo@main" class="bg-[var(--hud-panel)] border border-[var(--hud-border)] px-3 py-1.5 text-xs text-[var(--hud-text)]" />
				<div class="grid grid-cols-2 gap-2">
					<input aria-label="Branch or Tag ref" type="text" bind:value={gitBranchInput} placeholder="Base branch (default: main)" class="bg-[var(--hud-panel)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]" />
					<input aria-label="Optional Vault Secret ID" type="text" bind:value={gitVaultSecretId} placeholder="Vault PAT Secret ID (GITHUB_PAT / GITLAB_PAT)" class="bg-[var(--hud-panel)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]" />
				</div>
				{#if prMode}
					<div class="flex flex-wrap gap-2 text-[10px] border border-[var(--hud-border)] p-2 bg-[var(--hud-panel)]/60">
						{#each ['docs/architecture.mmd', 'docs/architecture.puml', 'chronos-report.sarif.json', 'docs/CHRONOS_AUDIT.md'] as item (item)}
							<label class="inline-flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={prDeliverables.includes(item)} onchange={() => toggleDeliverable(item)} /><span>{item}</span></label>
						{/each}
					</div>
				{/if}
				<div class="flex items-center justify-between pt-1">
					<span class="text-[11px] text-[var(--hud-muted)]">{prMode ? 'Commit to chronos/audit-* & Open PR' : 'Tier-1 Archive Fast-Path + Tier-2 Smart HTTP v2 PACK'}</span>
					<button type="button" data-testid="git-ingest-submit" disabled={isBusy} onclick={handleGitSubmit} class="px-4 py-1.5 bg-[var(--hud-accent-secondary)] text-[var(--hud-bg-base)] font-bold cursor-pointer hud-glint-trigger">{isBusy ? 'Working...' : prMode ? 'Publish Branch & Open PR' : 'Clone & Index Repo'}</button>
				</div>
				{#if prStatus}<p class="text-[11px] text-[var(--hud-nominal)] border border-[var(--hud-nominal)]/50 px-2 py-1">{prStatus}</p>{/if}
			</div>
		{:else if activeSourceTab === 'REMOTE_URL'}
			<div class="flex flex-col gap-2.5 bg-[var(--hud-bg)] border border-[var(--hud-border)] p-4">
				<label for="remote-ws-url" class="text-[var(--hud-muted)]">Remote URL (.json Bundle, .zip Archive, or Raw Source URL)</label>
				<div class="flex gap-2">
					<input id="remote-ws-url" type="text" bind:value={remoteUrlInput} placeholder="https://example.com/workspace-bundle.json" class="flex-1 bg-[var(--hud-panel)] border border-[var(--hud-border)] px-3 py-1.5 text-xs text-[var(--hud-text)]" />
					<button type="button" disabled={isBusy} onclick={handleUrlSubmit} class="px-4 py-1.5 bg-[var(--hud-accent)] text-[var(--hud-bg-base)] font-semibold cursor-pointer whitespace-nowrap hud-tactile-bevel">{isBusy ? 'Fetching...' : 'Fetch & Index URL'}</button>
				</div>
			</div>
		{:else}
			{#if exportedJson}<textarea id="export-bundle-box" aria-label="Exported Workspace Bundle JSON" readonly rows="3" value={exportedJson} class="w-full bg-[var(--hud-bg)] border border-[var(--hud-border)] p-2 text-[11px]"></textarea>{/if}
			<textarea id="import-bundle-box" aria-label="Import Workspace Bundle JSON" rows="3" bind:value={importText} placeholder="Paste Chronos Workspace Bundle JSON payload..." class="w-full bg-[var(--hud-bg)] border border-[var(--hud-border)] p-2 text-[11px]"></textarea>
			<button type="button" onclick={handleBundleSubmit} class="self-end px-3 py-1.5 bg-[var(--hud-accent)] text-[var(--hud-bg-base)] font-semibold cursor-pointer">Import JSON Bundle</button>
			<div class="border-t border-[var(--hud-border)] pt-2 grid grid-cols-2 gap-2">
				<input id="ai-provider-url" aria-label="Optional AI provider_url" type="text" value={draftUrl || providerUrl} oninput={(e) => (draftUrl = (e.currentTarget as HTMLInputElement).value)} placeholder="Optional provider_url" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1 text-xs" />
				<div class="flex gap-2"><input id="ai-provider-bearer" aria-label="Optional AI provider_bearer" type="password" value={draftBearer || providerBearer} oninput={(e) => (draftBearer = (e.currentTarget as HTMLInputElement).value)} placeholder="Optional provider_bearer" class="flex-1 bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1 text-xs" /><button type="button" onclick={() => onSaveAiConfig(draftUrl, draftBearer)} class="px-2.5 py-1 bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-nominal)] cursor-pointer">Save AI</button></div>
			</div>
		{/if}
		{#if errorMsg}<p role="alert" class="text-[var(--hud-danger)] border border-[var(--hud-danger)]/50 bg-[var(--hud-bg)] px-3 py-1.5">{errorMsg}</p>{/if}
	</div>

	{#snippet footer()}<HudModalFooter metaText="IndexedDB + SQLite WAL parity · Press [ESC] to close">{#snippet actions()}<button type="button" onclick={onClose} class="px-3 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-text)] hover:border-[var(--hud-accent)] cursor-pointer">Close</button>{/snippet}</HudModalFooter>{/snippet}
</HudModalShell>
