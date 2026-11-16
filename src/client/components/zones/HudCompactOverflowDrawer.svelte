<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.6.0 Compact Phone/Tablet Overflow Drawer preventing horizontal text clipping on narrow screens (< 768px / 1024px).
-->
<script lang="ts">
	import { GRAPH_PROJECTIONS, HUD_VIEWS, type GraphProjectionMode, type HudViewMode } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { CHAMFER_CORNERS, HULL_PROFILES } from '@config/hud.tokens';
	import { CAPABILITY_BITS, PRINCIPAL_KINDS } from '@config/security.constants';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import { securityWire } from '@client/state/security.wire.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';

	interface Props {
		onSelectGraphProjection?: (mode: GraphProjectionMode) => void;
		onReindexWorkspace?: () => Promise<void>;
	}

	let { onSelectGraphProjection, onReindexWorkspace }: Props = $props();
	let isGuest = $derived(securityWire.principalKind === PRINCIPAL_KINDS.GUEST);
	let canIndexLocal = $derived(securityWire.can(CAPABILITY_BITS.WORKSPACE_INDEX_LOCAL));

	const COMPACT_VIEWS: ReadonlyArray<{ readonly label: string; readonly view: HudViewMode; readonly proj?: GraphProjectionMode }> = [
		{ label: 'Codemap', view: HUD_VIEWS.CODEMAP, proj: GRAPH_PROJECTIONS.CODEMAP },
		{ label: 'Butterfly', view: HUD_VIEWS.BUTTERFLY, proj: GRAPH_PROJECTIONS.BUTTERFLY },
		{ label: 'DFG', view: HUD_VIEWS.DATA_FLOW },
		{ label: 'CFG', view: HUD_VIEWS.CONTROL_FLOW },
		{ label: 'Treemap', view: HUD_VIEWS.TREEMAP },
		{ label: 'DSM', view: HUD_VIEWS.DSM },
		{ label: 'UML', view: HUD_VIEWS.UML_CLASS, proj: GRAPH_PROJECTIONS.UML_CLASS },
		{ label: 'Mermaid', view: HUD_VIEWS.MERMAID, proj: GRAPH_PROJECTIONS.MERMAID },
		{ label: 'Source', view: HUD_VIEWS.INSPECTOR },
	];

	function switchView(item: (typeof COMPACT_VIEWS)[number]): void {
		if (item.proj) onSelectGraphProjection?.(item.proj);
		hudWire.selectView(item.view);
		hudWire.toggleCompactMenu(false);
	}
</script>

{#if hudWire.compactMenuOpen}
	<div data-testid="compact-overflow-drawer" class="fixed top-20 right-3 z-40 w-[min(320px,calc(100vw-24px))] lg:hidden pointer-events-auto">
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_CORNER_POD} chevrons={true} className="p-3 font-mono text-xs shadow-2xl">
			<div class="flex flex-col gap-2.5">
				<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
					<span class="font-bold text-[var(--hud-accent-secondary)] uppercase">Navigation &amp; Tools</span>
					<button type="button" data-testid="compact-overflow-close" onclick={() => hudWire.toggleCompactMenu(false)} class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[11px] text-[var(--hud-muted)] cursor-pointer">Close</button>
				</div>
				<div class="grid grid-cols-2 gap-1.5">
					{#each COMPACT_VIEWS as item (item.label)}
						<HudChamferButton chamferCorner={CHAMFER_CORNERS.DIAGONAL_PAIR} cutPx={5} active={hudWire.activeView === item.view} onclick={() => switchView(item)} className="px-2 py-1 text-[11px] justify-start">{item.label}</HudChamferButton>
					{/each}
				</div>
				<div class="flex flex-wrap gap-1.5 border-t border-[var(--hud-border)] pt-2">
					<HudChamferButton chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={5} variant="accent" onclick={() => hudWire.openModal(HUD_MODALS.SSOT_HELP_BOOK)} className="px-2.5 py-1 text-[11px]">Help [?]</HudChamferButton>
					<HudChamferButton chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={5} variant="brass" onclick={() => hudWire.randomizePolarityTheme()} className="px-2.5 py-1 text-[11px]">Theme</HudChamferButton>
					{#if !isGuest}
						<HudChamferButton chamferCorner={CHAMFER_CORNERS.DIAGONAL_PAIR} cutPx={5} onclick={() => hudWire.openModal(HUD_MODALS.STATIONS_LAUNCHER)} className="px-2.5 py-1 text-[11px]">Stations</HudChamferButton>
						<HudChamferButton chamferCorner={CHAMFER_CORNERS.DIAGONAL_PAIR} cutPx={5} onclick={() => hudWire.openModal(HUD_MODALS.SETTINGS)} className="px-2.5 py-1 text-[11px]">Settings</HudChamferButton>
						{#if canIndexLocal && onReindexWorkspace}
							<HudChamferButton chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={5} variant="nominal" onclick={() => { hudWire.toggleCompactMenu(false); void onReindexWorkspace(); }} className="px-2.5 py-1 text-[11px]">Re-Index</HudChamferButton>
						{/if}
					{/if}
				</div>
			</div>
		</HudChamferFrame>
	</div>
{/if}
