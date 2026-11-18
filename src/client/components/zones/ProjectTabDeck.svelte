<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Upper Tier of TOP_CENTER: Chamfered Project Tab Deck with bilateral corner symmetry, shortCode badges, +N overflow, and Ctrl+Shift+P Switcher Popover.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { API_ROUTES } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { HUD_INTENT_KINDS } from '@config/hud/hud.intents';
	import { CHAMFER_PROFILES, HULL_PROFILES, HUD_ZONES, PROJECT_DECK_TOKENS, ZONE_CORNER_TUPLES } from '@config/hud.tokens';
	import { clientDagKernel, deriveShortCodeFromName, hudWire, wsClient, type DrizzleProjectRow, type WorkspaceTabDescriptor } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import { UI_SPOTLIGHT_TARGETS, uiSpotlight } from '@ui';

	interface Props {
		tabs: readonly WorkspaceTabDescriptor[];
		activeTabId: string;
		onSelectTab: (tabId: string) => void;
		onCloseTab: (tabId: string) => void;
		onOpenPreset?: () => Promise<void>;
		onOpenProject?: (projectKey: string) => Promise<void>;
	}

	let { tabs, activeTabId, onSelectTab, onCloseTab, onOpenPreset, onOpenProject }: Props = $props();
	let switcherOpen = $state(false);
	let searchQuery = $state('');
	let remoteProjects = $state.raw<DrizzleProjectRow[]>([]);
	let maxVisible = $state<number>(PROJECT_DECK_TOKENS.MAX_VISIBLE_PROJECT_TABS.DESKTOP);

	let visibleTabs = $derived(tabs.slice(0, maxVisible));
	let overflowCount = $derived(Math.max(0, tabs.length - visibleTabs.length));
	let filteredOpen = $derived(tabs.filter((t) => !searchQuery.trim() || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || (t.shortCode ?? deriveShortCodeFromName(t.name)).toLowerCase().includes(searchQuery.toLowerCase())));
	let filteredRemote = $derived(remoteProjects.filter((p) => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) || p.slug.toLowerCase().includes(searchQuery.toLowerCase())));

	async function loadSharedProjects(): Promise<void> {
		const res = await clientDagKernel.requestJson<{ projects?: DrizzleProjectRow[] }>(API_ROUTES.PROJECTS, { sourceZone: 'TOP_CENTER', intentKind: 'PROJECTS_LIST_LOAD' });
		if (res.ok && Array.isArray(res.data.projects)) remoteProjects = res.data.projects;
	}

	onMount(() => {
		const updateMax = () => {
			const w = window.innerWidth;
			maxVisible = w >= 3440 ? PROJECT_DECK_TOKENS.MAX_VISIBLE_PROJECT_TABS.UWQHD : w >= 1200 ? PROJECT_DECK_TOKENS.MAX_VISIBLE_PROJECT_TABS.DESKTOP : PROJECT_DECK_TOKENS.MAX_VISIBLE_PROJECT_TABS.TABLET;
		};
		updateMax();
		window.addEventListener('resize', updateMax);
		void loadSharedProjects();
		return () => window.removeEventListener('resize', updateMax);
	});

	function setSwitcher(open: boolean): void {
		switcherOpen = open;
		hudWire.emitUiIntent(HUD_INTENT_KINDS.PROJECTION_OPTION_TOGGLE, HUD_ZONES.TOP_CENTER, { target: 'projectSwitcher', open });
		if (open) void loadSharedProjects();
	}

	function selectProjectTab(tabId: string, projectId = 1): void {
		onSelectTab(tabId);
		wsClient.connectWorkspace(tabId, null, projectId);
		setSwitcher(false);
	}

	function toggleSwitcher(): void { setSwitcher(!switcherOpen); }

	function openRemoteProject(proj: DrizzleProjectRow): void {
		if (tabs.some((t) => t.id === proj.slug)) selectProjectTab(proj.slug, proj.id);
		else if (onOpenProject) void onOpenProject(proj.slug);
		else void onOpenPreset?.();
		setSwitcher(false);
	}

	function handleGlobalKeys(e: KeyboardEvent): void {
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
			e.preventDefault();
			toggleSwitcher();
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeys} />

<div
	use:uiSpotlight={UI_SPOTLIGHT_TARGETS.PROJECT_TAB_DECK}
	data-testid="project-tab-deck"
	data-help-target="PROJECT_TAB_DECK"
	class="relative w-full hud-project-deck-rail flex items-center justify-center"
>
	<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.PROJECT_TAB_DECK} chamferPx={10} chevrons={false} className="w-full h-full px-3.5 font-mono text-[0.6875rem] leading-4">
		<div class="w-full h-full px-1 flex items-center justify-between gap-2 flex-nowrap">
			<div class="flex items-center gap-1.5 flex-nowrap min-w-0 overflow-hidden">
				{#each visibleTabs as tab, idx (tab.id)}
					{@const isActive = tab.id === activeTabId}
					{@const badge = (tab.shortCode ?? deriveShortCodeFromName(tab.name)).slice(0, PROJECT_DECK_TOKENS.SHORT_CODE_MAX_CHARS)}
					<div class="flex items-center gap-0.5 shrink-0">
						<HudChamferButton chamferCorner={idx === 0 ? CHAMFER_PROFILES.LEFT_END_CAP : CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={6} active={isActive} variant={isActive ? 'brass' : 'default'} testid={`project-tab-${tab.id}`} tip={`${tab.name} · r${tab.snapshotRevision ?? 1} · ${tab.snapshot.indexedFilesCount}F · ${tab.snapshot.nodes.length}E`} onclick={() => selectProjectTab(tab.id, tab.projectId ?? 1)} className="h-[1.375rem] max-w-[9.25rem] px-2.5 text-[0.625rem] font-bold">
							<span class={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-[var(--hud-nominal)]' : 'bg-[var(--hud-accent-primary)]/60'}`}></span>
							<span class="uppercase tracking-wider truncate">{badge}</span>
							<span class="px-1 bg-[var(--hud-bg)] border border-[var(--hud-border)]/70 text-[0.625rem] leading-3 text-[var(--hud-text)] tabular-nums shrink-0">{tab.snapshot.nodes.length}</span>
						</HudChamferButton>
						{#if tabs.length > 1}
							<button type="button" aria-label={`Close project ${tab.name}`} onclick={() => onCloseTab(tab.id)} class="h-[1.375rem] px-1 border border-[var(--hud-border)] bg-[var(--hud-bg)]/80 text-[0.6875rem] text-[var(--hud-muted)] hover:text-[var(--hud-danger)] cursor-pointer shrink-0">×</button>
						{/if}
					</div>
				{/each}
			</div>
			<div class="flex items-center gap-1.5 shrink-0 flex-nowrap">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="accent" testid="project-deck-add-btn" ariaLabel="Ingest or Create Project" tip="Ingest or Create Project" onclick={() => hudWire.openModal(HUD_MODALS.WORKSPACE_INGEST)} className="h-[1.375rem] px-2 text-[0.6875rem] font-bold">+</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={6} testid="project-switcher-trigger" onclick={toggleSwitcher} className="h-[1.375rem] px-2.5 text-[0.6875rem]">
					{overflowCount > 0 ? `+${overflowCount} More ▾` : 'Projects ▾'}
				</HudChamferButton>
			</div>
		</div>
	</HudChamferFrame>

	{#if switcherOpen}
		<div data-testid="project-switcher-popover" class="absolute top-9 left-1/2 -translate-x-1/2 z-40 w-80">
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER} chevrons={true} className="p-2.5 font-mono text-xs shadow-2xl">
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1">
						<span class="text-[0.6875rem] font-bold text-[var(--hud-accent-secondary)] uppercase">Project Switcher [Ctrl+Shift+P]</span>
						<button type="button" onclick={() => setSwitcher(false)} class="text-[0.6875rem] text-[var(--hud-muted)] hover:text-[var(--hud-text)] cursor-pointer">ESC</button>
					</div>
					<input type="search" data-testid="project-switcher-search" bind:value={searchQuery} placeholder="Search shortCode, name, or slug..." class="w-full px-2 py-1 bg-[var(--hud-bg)] border border-[var(--hud-border)] text-xs text-[var(--hud-text)]" />
					<div class="max-h-48 overflow-y-auto flex flex-col gap-1">
						<span class="text-[0.625rem] text-[var(--hud-muted)] uppercase">Open Project Tabs ({filteredOpen.length})</span>
						{#each filteredOpen as tab (tab.id)}
							<button type="button" onclick={() => selectProjectTab(tab.id, tab.projectId ?? 1)} class="px-2 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)]/70 flex items-center justify-between text-left hover:border-[var(--hud-accent-secondary)] cursor-pointer">
								<span class="font-bold text-[var(--hud-accent-secondary)]">{tab.shortCode ?? deriveShortCodeFromName(tab.name)}</span>
								<span class="truncate max-w-[8.75rem] text-[0.6875rem] text-[var(--hud-text)]">{tab.name}</span>
								<span class="text-[0.625rem] text-[var(--hud-muted)] tabular-nums">{tab.snapshot.nodes.length}E</span>
							</button>
						{/each}
						<span class="text-[0.625rem] text-[var(--hud-muted)] uppercase mt-1">Team Shared Projects ({filteredRemote.length})</span>
						{#each filteredRemote as proj (proj.id)}
							<button type="button" onclick={() => openRemoteProject(proj)} class="px-2 py-1 border border-[var(--hud-border)] bg-[var(--hud-bg)]/80 flex items-center justify-between text-left hover:border-[var(--hud-accent-primary)] cursor-pointer">
								<span class="font-bold text-[var(--hud-accent-primary)]">{proj.shortCode}</span>
								<span class="truncate max-w-[8.125rem] text-[0.6875rem] text-[var(--hud-text)]">{proj.name}</span>
								<span class="text-[0.625rem] px-1 border border-[var(--hud-border)] text-[var(--hud-nominal)]">{proj.visibility}</span>
							</button>
						{/each}
					</div>
				</div>
			</HudChamferFrame>
		</div>
	{/if}
</div>
