<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.2 Progressive 4-Tab HUD, Substrate, Engine, Security & Gamification Matrix Settings Modal.
-->
<script lang="ts">
	import type { GraphEngineMode } from '@config/constants';
	import { HUD_INTENT_KINDS, HUD_THEME_PRESETS, SURFACE_PATTERNS } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import { securityWire } from '@client/state/security.wire.svelte';
	import HudModalShell from '../HudModalShell.svelte';
	import HudModalHeader from '../HudModalHeader.svelte';
	import HudModalFooter from '../HudModalFooter.svelte';
	import HudSubTabBar, { type HudSubTabItem } from '@client/components/molecules/HudSubTabBar.svelte';
	import SettingsAppearanceCols from './SettingsAppearanceCols.svelte';
	import SettingsSystemCols from './SettingsSystemCols.svelte';
	import SecurityVaultSection from '../vault/SecurityVaultSection.svelte';
	import AdminXpConfigPanel from '@client/components/molecules/gamification/AdminXpConfigPanel.svelte';

	interface Props {
		isOpen: boolean;
		graphEngine: GraphEngineMode;
		useHisSafetyProfile: boolean;
		workspaceIds?: readonly string[];
		onClose: () => void;
		onToggleEngine: () => void;
		onToggleHisProfile: () => void;
		onReindexWorkspace: () => Promise<void>;
	}

	let { isOpen, graphEngine, useHisSafetyProfile, workspaceIds = [], onClose, onToggleEngine, onToggleHisProfile, onReindexWorkspace }: Props = $props();
	let activeTheme = $derived(HUD_THEME_PRESETS[hudWire.activeThemeId]);
	let activeTab = $state('VISUALS');

	const settingsTabs: readonly HudSubTabItem[] = [
		{ id: 'VISUALS', label: 'Visuals & Substrate', badge: '6' },
		{ id: 'ENGINES', label: 'Engines & Storage', badge: 'AST' },
		{ id: 'SECURITY', label: 'RBAC & Vault', badge: 'u32' },
		{ id: 'GAMIFICATION', label: 'XP Matrix', badge: 'n³' },
	];

	function handleSelectTab(tabId: string): void {
		activeTab = tabId === 'APPEARANCE' ? 'VISUALS' : tabId;
		hudWire.emitUiIntent(HUD_INTENT_KINDS.UI_TAB_SWITCH, 'APP_MODAL', { modal: 'SETTINGS', tab: activeTab });
		if (activeTab === 'SECURITY') void securityWire.refreshSecurityStatus();
	}
</script>

<HudModalShell {isOpen} transitionKey={activeTab} ariaLabel="Settings" maxWidthClass="max-w-6xl" {onClose}>
	{#snippet header()}
		<HudModalHeader
			title="Settings"
			subtitle="APPEARANCE · ACCESSIBILITY · ENGINES · SECURITY & PRIVACY"
			{onClose}
		/>
		<div class="px-5 py-2 border-b border-[var(--hud-border)] bg-[var(--hud-bg)] flex items-center justify-between gap-2 overflow-x-auto">
			<HudSubTabBar
				tabs={settingsTabs}
				activeTabId={activeTab}
				ariaLabel="Settings Sub-Tabs"
				onSelect={handleSelectTab}
			/>
			<span class="font-mono text-[0.6875rem] text-[var(--hud-muted)] whitespace-nowrap shrink-0">{securityWire.roleId} · {securityWire.maskHex()}</span>
		</div>
	{/snippet}

	<div data-testid="settings-bento-body" class="flex-1 min-h-0 overflow-y-hidden flex flex-col gap-2">
		{#if activeTab === 'GAMIFICATION'}
			<AdminXpConfigPanel />
		{:else if activeTab === 'SECURITY'}
			<SecurityVaultSection {workspaceIds} />
		{:else if activeTab === 'ENGINES'}
			<SettingsSystemCols {graphEngine} {useHisSafetyProfile} {onClose} {onToggleEngine} {onToggleHisProfile} {onReindexWorkspace} />
		{:else}
			<SettingsAppearanceCols {onClose} />
		{/if}
	</div>

	{#snippet footer()}
		<HudModalFooter metaText={`Active Theme: ${activeTheme.label} (${activeTheme.polarity}) · Principal: ${securityWire.username} (${securityWire.syncPosture}) · Substrate: ${SURFACE_PATTERNS[hudWire.surfacePatterns.SUBSTRATE].label}`}>
			{#snippet actions()}
				<button type="button" onclick={onClose} class="px-3 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-text)] text-xs hud-hover-lift cursor-pointer">Done</button>
			{/snippet}
		</HudModalFooter>
	{/snippet}
</HudModalShell>
