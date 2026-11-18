<!--
	@author Oblx <code@oblx.dev>
	@description Chronos Top Perimeter Orchestrator: Bilateral Corner Symmetry with matched 6.25rem height parity across TOP_LEFT, stacked TOP_CENTER (Crown + ProjectTabDeck), and TOP_RIGHT.
-->
<script lang="ts">
	import { GRAPH_PROJECTIONS, HUD_VIEWS, type GraphEngineMode, type GraphProjectionMode, type HudViewMode } from '@config/constants';
	import { HULL_PROFILES, HUD_GLYPHS, HUD_ZONES, ZONE_CORNER_TUPLES } from '@config/hud.tokens';
	import { PRINCIPAL_KINDS } from '@config/security.constants';
	import { type GraphEntityNode, type WorkspaceTabDescriptor, hudWire, securityWire } from '@client/state';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import { UI_SPOTLIGHT_TARGETS, uiSpotlight } from '@ui';
	import ProjectTabDeck from './ProjectTabDeck.svelte';
	import { HudTopLeftSystemPod, HudTopRightUtilityPod } from './top';

	interface Props {
		tabs: readonly WorkspaceTabDescriptor[];
		activeTabId: string;
		activeEntity: GraphEntityNode | undefined;
		indexedFilesCount: number;
		entityCount: number;
		blockerCount: number;
		criticalCount: number;
		warningCount: number;
		isAnalyzing: boolean;
		graphEngine: GraphEngineMode;
		activeGraphProjection?: GraphProjectionMode;
		onToggleEngine: () => void;
		onReindexWorkspace: () => Promise<void>;
		onSelectGraphProjection?: (mode: GraphProjectionMode) => void;
		onSelectTab: (tabId: string) => void;
		onCloseTab: (tabId: string) => void;
		onOpenPreset?: () => Promise<void>;
		onOpenProject?: (projectKey: string) => Promise<void>;
	}

	let {
		tabs, activeTabId, activeEntity, indexedFilesCount, entityCount, blockerCount, criticalCount, warningCount,
		isAnalyzing, graphEngine, activeGraphProjection = GRAPH_PROJECTIONS.BUTTERFLY,
		onToggleEngine, onReindexWorkspace, onSelectGraphProjection, onSelectTab, onCloseTab, onOpenPreset, onOpenProject,
	}: Props = $props();

	interface CrownSlot { readonly id: string; readonly mode: HudViewMode; readonly graphProj?: GraphProjectionMode; readonly label: string; readonly shortLabel: string; readonly glyph: string; }

	const CROWN_SLOTS: readonly CrownSlot[] = [
		{ id: 'CODEMAP', mode: HUD_VIEWS.CODEMAP, graphProj: GRAPH_PROJECTIONS.CODEMAP, label: 'Codemap', shortLabel: 'Map', glyph: '↯' },
		{ id: 'BUTTERFLY', mode: HUD_VIEWS.BUTTERFLY, graphProj: GRAPH_PROJECTIONS.BUTTERFLY, label: 'Butterfly', shortLabel: 'Bfly', glyph: '⌖' },
		{ id: 'DFG', mode: HUD_VIEWS.DATA_FLOW, label: 'DFG', shortLabel: 'DFG', glyph: '⟡' },
		{ id: 'CFG', mode: HUD_VIEWS.CONTROL_FLOW, label: 'CFG', shortLabel: 'CFG', glyph: '⑂' },
		{ id: 'TREEMAP', mode: HUD_VIEWS.TREEMAP, label: 'Treemap', shortLabel: 'Tree', glyph: '⊞' },
		{ id: 'DSM', mode: HUD_VIEWS.DSM, label: 'DSM', shortLabel: 'DSM', glyph: '▦' },
		{ id: 'UML', mode: HUD_VIEWS.UML_CLASS, graphProj: GRAPH_PROJECTIONS.UML_CLASS, label: 'UML', shortLabel: 'UML', glyph: '◈' },
		{ id: 'MERMAID', mode: HUD_VIEWS.MERMAID, graphProj: GRAPH_PROJECTIONS.MERMAID, label: 'Mermaid', shortLabel: 'Mmd', glyph: '❖' },
		{ id: 'SOURCE', mode: HUD_VIEWS.INSPECTOR, label: 'Source', shortLabel: 'Src', glyph: '⌥' },
	];

	let isGuest = $derived(securityWire.principalKind === PRINCIPAL_KINDS.GUEST);

	function isSlotActive(slot: CrownSlot): boolean {
		const isUml = hudWire.activeView === HUD_VIEWS.UML_CLASS || hudWire.activeView === HUD_VIEWS.UML_SEQUENCE || hudWire.activeView === HUD_VIEWS.SHARED_OBJECTS || (hudWire.activeView === HUD_VIEWS.BUTTERFLY && activeGraphProjection !== GRAPH_PROJECTIONS.BUTTERFLY && activeGraphProjection !== GRAPH_PROJECTIONS.MERMAID && activeGraphProjection !== GRAPH_PROJECTIONS.CODEMAP);
		if (slot.id === 'UML') return isUml;
		if (slot.id === 'BUTTERFLY') return hudWire.activeView === HUD_VIEWS.BUTTERFLY && !isUml;
		return hudWire.activeView === slot.mode;
	}

	function activateSlot(slot: CrownSlot): void {
		if (slot.graphProj) onSelectGraphProjection?.(slot.graphProj);
		hudWire.selectView(slot.mode);
	}
</script>

<header class="fixed top-3 inset-x-3 z-20 flex items-stretch justify-between gap-2 pointer-events-none select-none hud-uwqhd-corridor">
	<HudTopLeftSystemPod {tabs} {activeTabId} {entityCount} {blockerCount} {criticalCount} {warningCount} {isAnalyzing} />

	<div
		data-hud-zone={HUD_ZONES.TOP_CENTER}
		inert={hudWire.isZoneFolded(HUD_ZONES.TOP_CENTER)}
		style={hudWire.zoneStyle(HUD_ZONES.TOP_CENTER)}
		class={`${hudWire.isZoneFolded(HUD_ZONES.TOP_CENTER) ? 'pointer-events-none' : 'pointer-events-auto'} hud-zone-transition hud-center-corridor-w hud-top-band-h hidden lg:flex flex-col justify-between min-w-0 shrink`}
	>
		<div use:uiSpotlight={UI_SPOTLIGHT_TARGETS.TOP_CENTER_CROWN} data-help-target="HEADER_NAV" class="w-full hud-top-crown-locked flex items-center justify-center">
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.TOP_CENTER} chamferPx={10} chevrons={true} className="w-full h-full px-4">
				<nav aria-label="World Projections Crest" class="h-full flex items-center justify-center gap-1 xl:gap-1.5 flex-nowrap">
					{#each CROWN_SLOTS as slot (slot.id)}
						{@const active = isSlotActive(slot)}
						<button type="button" data-testid={`crown-slot-${slot.id.toLowerCase()}`} onclick={() => activateSlot(slot)} class={`px-1.5 xl:px-2 py-0.5 font-mono text-xs leading-4 whitespace-nowrap cursor-pointer hud-hover-lift ${active ? 'text-[var(--hud-accent-secondary)] border-b-2 border-[var(--hud-accent-secondary)] font-bold bg-[var(--hud-surface)]/65' : 'text-[var(--hud-muted)] hover:text-[var(--hud-text)]'}`}>
							<span class="opacity-80 mr-0.5">{slot.glyph}</span><span class="hidden xl:inline">{slot.label}</span><span class="xl:hidden">{slot.shortLabel}</span>
						</button>
					{/each}
					{#if activeEntity && !isGuest}
						<span class="hidden 2xl:inline ml-1 pl-2 border-l border-[var(--hud-border)] font-mono text-[0.6875rem] leading-4 text-[var(--hud-accent-secondary)] truncate max-w-[7.25rem]" data-hud-tip={activeEntity.qualifiedName}>{HUD_GLYPHS.FOCAL_RETICLE} {activeEntity.name}</span>
					{/if}
				</nav>
			</HudChamferFrame>
		</div>

		<ProjectTabDeck {tabs} {activeTabId} {onSelectTab} {onCloseTab} {onOpenPreset} {onOpenProject} />
	</div>

	<HudTopRightUtilityPod {indexedFilesCount} {entityCount} {blockerCount} {criticalCount} {warningCount} {isAnalyzing} {graphEngine} {onToggleEngine} {onReindexWorkspace} />
</header>
