<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.2 Progressive 4-Tab HUD, Substrate, Engine, Security & Gamification Matrix Settings Modal.
-->
<script lang="ts">
	import type { GraphEngineMode } from '@config/constants';
	import { HUD_THEME_PRESETS, SURFACE_PATTERNS } from '@config/hud.tokens';
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
		{ id: 'VISUALS', label: 'Visuals & Substrate', badge: '6 THEMES' },
		{ id: 'ENGINES', label: 'Engines & Storage', badge: 'DAG / AST' },
		{ id: 'SECURITY', label: 'RBAC, Vault & Audit', badge: 'u32 / AEAD' },
		{ id: 'GAMIFICATION', label: 'Gamification & XP Matrix', badge: 'CUBIC' },
	];

	function handleSelectTab(tabId: string): void {
		activeTab = tabId === 'APPEARANCE' ? 'VISUALS' : tabId;
		if (activeTab === 'SECURITY') securityWire.refreshSecurityTelemetry();
	}
</script>

<HudModalShell {isOpen} ariaLabel="Chronos HUD and Engine Settings" maxWidthClass="max-w-5xl" {onClose}>
	{#snippet header()}
		<HudModalHeader
			title="HUD, Substrate & Security Calibration"
			subtitle="PROGRESSIVE DISCLOSURE · 5-LAYER SUBSTRATE · U32 RBAC MATRIX · WRITE-ONLY AEAD VAULT"
			{onClose}
		/>
		<div class="px-5 py-2 border-b border-[var(--hud-border)] bg-[var(--hud-bg)] flex items-center justify-between gap-3">
			<HudSubTabBar
				tabs={settingsTabs}
				activeTabId={activeTab}
				ariaLabel="Settings Sub-Tabs"
				onSelect={handleSelectTab}
			/>
			<span class="font-mono text-[11px] text-[var(--hud-muted)] shrink-0">{securityWire.roleId} · {securityWire.maskHex()}</span>
		</div>
	{/snippet}

	<div data-hud-vscroll="true" class="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3">
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
