<!--
	@author Oblx <code@oblx.dev>
	@description Root SPA route entry coordinating event-driven multi-workspace state, .zip/Folder/URL/Git/Project ingestion, and default No-Workspace-Open state.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { API_ROUTES, WORKSPACE_EVENT_KINDS } from '@config/constants';
	import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
	import type { SourceFileUnit } from '@core/metamodel/workspace.sources';
	import { saveTabToIndexedDb, type WorkspaceTabDescriptor } from '@lib/db/indexeddb/repository/workspace.idb';
	import {
		closeWorkspaceTabById, emitWorkspaceDomainEvent, exportTabBundleJson, fetchInitialWorkspaceTabs,
		generateSampleZipWorkspaceTab, importBundleIntoTab, ingestGitRepoIntoTab, ingestRemoteUrlIntoTab,
		ingestSourceFilesIntoTab, ingestZipArchiveBytesIntoTab, openNamedServerProjectTab, openPresetWorkspaceTab,
		persistWorkspaceTab, pickDefaultFocalEntityId, subscribeWorkspaceDomainEvents,
	} from '@client/services/workspace/workspace.controller';
	import ViewportHUD from '@client/components/organisms/ViewportHUD.svelte';

	let tabs = $state<WorkspaceTabDescriptor[]>([]), activeTabId = $state<string>(''), selectedEntityId = $state<number>(1);
	let isAnalyzing = $state<boolean>(false), statusBanner = $state<string>('IDLE // NO WORKSPACE OPEN'), errorMessage = $state<string>('');

	function activateTab(nextTab: WorkspaceTabDescriptor, bannerText: string): void {
		tabs = [...tabs.filter((t) => t.id !== nextTab.id), nextTab];
		activeTabId = nextTab.id;
		selectedEntityId = pickDefaultFocalEntityId(nextTab.snapshot);
		statusBanner = bannerText;
	}

	async function initializeWorkspaces(): Promise<void> {
		isAnalyzing = true; errorMessage = '';
		try {
			const res = await fetchInitialWorkspaceTabs();
			tabs = [...res.tabs];
			activeTabId = tabs[0]?.id ?? '';
			selectedEntityId = tabs[0] ? pickDefaultFocalEntityId(tabs[0].snapshot) : 1;
			statusBanner = res.statusBanner;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Workspace bootstrap failed';
		} finally {
			isAnalyzing = false;
		}
	}

	function handleSelectTab(tabId: string): void {
		activeTabId = tabId;
		const found = tabs.find((t) => t.id === tabId || t.slug === tabId);
		if (found) {
			activeTabId = found.id;
			selectedEntityId = pickDefaultFocalEntityId(found.snapshot);
			emitWorkspaceDomainEvent(WORKSPACE_EVENT_KINDS.SWITCHED, found.id, found.name, `Active: ${found.name}`);
		}
	}

	async function handleCloseTab(tabId: string): Promise<void> {
		if (!tabId) return;
		await closeWorkspaceTabById(tabId);
		tabs = tabs.filter((t) => t.id !== tabId);
		if (tabs.length === 0) { activeTabId = ''; statusBanner = 'IDLE // NO WORKSPACE OPEN'; }
		else if (activeTabId === tabId) handleSelectTab(tabs[0]!.id);
	}

	async function handleOpenPreset(): Promise<void> {
		isAnalyzing = true;
		try { const newTab = await openPresetWorkspaceTab(tabs.length); activateTab(newTab, `Opened ${newTab.name}`); }
		finally { isAnalyzing = false; }
	}

	async function handleOpenProject(projectKey: string): Promise<void> {
		isAnalyzing = true;
		try { const newTab = await openNamedServerProjectTab(projectKey); activateTab(newTab, `Opened ${newTab.name}`); }
		finally { isAnalyzing = false; }
	}

	async function handleSaveWorkspace(): Promise<void> {
		const active = tabs.find((t) => t.id === activeTabId);
		if (active) await persistWorkspaceTab(active);
	}

	async function handleImportBundleJson(rawJson: string): Promise<void> { const imported = await importBundleIntoTab(rawJson); activateTab(imported, `Imported ${imported.name}`); }
	async function handleUploadZipBytes(zipBytes: Uint8Array, workspaceName: string): Promise<void> { const created = await ingestZipArchiveBytesIntoTab(zipBytes, workspaceName); activateTab(created, `Unpacked .ZIP: ${created.name}`); }
	async function handleUploadSourceFiles(workspaceName: string, files: readonly SourceFileUnit[]): Promise<void> { const created = await ingestSourceFilesIntoTab(workspaceName, files); activateTab(created, `Indexed ${files.length} files: ${created.name}`); }
	async function handleIngestSampleZip(): Promise<void> { const created = await generateSampleZipWorkspaceTab(); activateTab(created, `Unpacked .ZIP: ${created.name}`); }
	async function handleIngestRemoteUrl(url: string, workspaceName?: string): Promise<void> { const created = await ingestRemoteUrlIntoTab(url, workspaceName); activateTab(created, `Fetched URL: ${created.name}`); }
	async function handleIngestGitRepo(repoUrl: string, branch?: string, secretId?: string): Promise<void> { const created = await ingestGitRepoIntoTab(repoUrl, branch, secretId); activateTab(created, `Cloned Git: ${created.name}`); }

	async function handleExportBundle(): Promise<string> {
		const active = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
		if (!active) return '{}';
		statusBanner = `Exported ${active.name}`;
		return exportTabBundleJson(active);
	}

	async function handleAnalyzeSource(filePath: string, sourceCode: string): Promise<void> {
		isAnalyzing = true;
		try {
			const res = await fetch(API_ROUTES.ANALYZE_SOURCE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePath, sourceCode }) });
			const updatedSnap: WorkspaceSnapshot = await res.json();
			tabs = tabs.map((t) => (t.id === activeTabId ? { ...t, snapshot: updatedSnap } : t));
			const current = tabs.find((t) => t.id === activeTabId);
			if (current) await saveTabToIndexedDb(current);
			emitWorkspaceDomainEvent(WORKSPACE_EVENT_KINDS.INDEXED, current?.id ?? null, filePath, `Indexed ${filePath}`);
		} finally {
			isAnalyzing = false;
		}
	}

	onMount(() => {
		const unsubscribe = subscribeWorkspaceDomainEvents((evt) => { statusBanner = evt.message; });
		initializeWorkspaces();
		return unsubscribe;
	});
</script>

{#if errorMessage}
	<div class="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4 p-6 font-mono">
		<p class="text-sm text-rose-400">{errorMessage}</p>
		<button type="button" onclick={initializeWorkspaces} class="px-4 py-2 bg-cyan-500 text-slate-950 text-xs font-semibold cursor-pointer">Retry Metamodel Bootstrap</button>
	</div>
{:else}
	<ViewportHUD {tabs} {activeTabId} {selectedEntityId} {isAnalyzing} {statusBanner} onSelectTab={handleSelectTab} onCloseTab={handleCloseTab} onOpenPreset={handleOpenPreset} onOpenProject={handleOpenProject} onSaveWorkspace={handleSaveWorkspace} onImportBundleJson={handleImportBundleJson} onUploadZipBytes={handleUploadZipBytes} onUploadSourceFiles={handleUploadSourceFiles} onIngestSampleZip={handleIngestSampleZip} onIngestRemoteUrl={handleIngestRemoteUrl} onIngestGitRepo={handleIngestGitRepo} onExportBundle={handleExportBundle} onSelectEntity={(id) => (selectedEntityId = id)} onAnalyzeSource={handleAnalyzeSource} onReindexWorkspace={handleOpenPreset} />
{/if}
