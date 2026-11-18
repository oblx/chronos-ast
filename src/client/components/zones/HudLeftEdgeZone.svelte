<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Zone 08 LEFT_EDGE dock: Persistent 3rem outer mini-rail + slide-from-behind drawer panel with Dotted Grip drag/float mechanics.
-->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { WORKSPACE_DEFAULTS } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { DOCK_PLACEMENT_MODES, CHAMFER_PROFILES, HULL_PROFILES, HUD_GLYPHS, HUD_ZONE_VISIBILITY, HUD_ZONES, ZONE_CORNER_TUPLES } from '@config/hud.tokens';
	import { CAPABILITY_BITS } from '@config/security.constants';
	import { ENTITY_KINDS } from '@config/metamodel.constants';
	import { hudWire, securityWire, type EntityCkMetrics, type GraphEntityNode, type LeftEdgeDrawerTab } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudIcon from '@client/components/atoms/HudIcon.svelte';
	import HudAnimatedResizeBody from '@client/components/molecules/HudAnimatedResizeBody.svelte';
	import EntityFilterBar from '@client/components/molecules/overlays/EntityFilterBar.svelte';
	import { UI_SPOTLIGHT_TARGETS, uiDrawerGrip, uiSpotlight } from '@ui';

	interface Props {
		entities: readonly GraphEntityNode[]; selectedEntityId: number; searchQuery: string; activeKindFilter: string;
		ckMap: Readonly<Record<number, EntityCkMetrics>>; cyclicIds: ReadonlySet<number>; violationMap: Readonly<Record<number, number>>;
		onSelectEntity: (id: number) => void; onSearchChange: (q: string) => void; onKindChange: (kind: string) => void;
	}

	let { entities, selectedEntityId, searchQuery, activeKindFilter, ckMap, cyclicIds, violationMap, onSelectEntity, onSearchChange, onKindChange }: Props = $props();
	let isOpen = $derived(hudWire.zoneStates[HUD_ZONES.LEFT_EDGE] === HUD_ZONE_VISIBILITY.OPEN);
	let isFolded = $derived(hudWire.isZoneFolded(HUD_ZONES.LEFT_EDGE));
	let placement = $derived(hudWire.dockPlacements.LEFT_EDGE);
	let isFloating = $derived(placement.mode === DOCK_PLACEMENT_MODES.FLOATING_PANEL);
	let dur = $derived(hudWire.kineticMotionEnabled ? 200 : 0);
	let dragging = $state(false);
	let dragOffset = { x: 0, y: 0 };

	function selectDrawerTab(tab: LeftEdgeDrawerTab, kindOverride?: string): void {
		const nextKind = kindOverride ?? (tab === 'FILES' ? ENTITY_KINDS.FILE : WORKSPACE_DEFAULTS.FILTER_ALL);
		hudWire.setLeftDrawerTab(tab, nextKind, true);
	}

	function selectOrToggleKindTab(kind: string): void {
		if (isOpen && activeKindFilter === kind && hudWire.leftEdgeActiveTab === 'EXPLORER') {
			hudWire.setZoneVisibility(HUD_ZONES.LEFT_EDGE, HUD_ZONE_VISIBILITY.COMPACT);
			return;
		}
		hudWire.setLeftDrawerTab('EXPLORER', kind, true);
	}

	function startDockDrag(e: PointerEvent): void {
		if ((e.target as HTMLElement | null)?.closest('button, [data-grip-control]')) return;
		dragging = true;
		dragOffset = { x: e.clientX - placement.x, y: e.clientY - placement.y };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function moveDockDrag(e: PointerEvent): void {
		if (!dragging) return;
		hudWire.moveFloatingDock('LEFT_EDGE', e.clientX - dragOffset.x, e.clientY - dragOffset.y, window.innerWidth, window.innerHeight);
	}
</script>

<aside
	use:uiSpotlight={UI_SPOTLIGHT_TARGETS.LEFT_EDGE_RAIL}
	aria-label="AST Explorer Left Perimeter Dock"
	data-help-target="LEFT_ENTITY_EXPLORER"
	data-hud-zone={HUD_ZONES.LEFT_EDGE}
	data-dock-mode={placement.mode}
	data-drawer-mode={hudWire.edgeDrawerMode}
	inert={isFolded}
	style={isFloating && !isFolded ? `transform: translate3d(${placement.x}px, ${placement.y}px, 0); opacity: 1;` : hudWire.zoneStyle(HUD_ZONES.LEFT_EDGE)}
	class={`${isFloating ? 'fixed top-0 left-0 h-[27.5rem] z-30' : 'fixed left-3 top-1/2 h-auto max-h-[calc(100vh-20rem)] z-25 hud-zone-transition'} flex items-center gap-3 ${isFolded ? 'pointer-events-none' : 'pointer-events-auto'}`}
>
	<div data-testid="left-mini-rail" class="hud-rail-w shrink-0 z-20">
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER} chevrons={false} className="w-full p-1.5 py-2 font-mono text-[0.6875rem] leading-4">
			<div class="flex flex-col items-center gap-2">
				<HudChamferButton corners={ZONE_CORNER_TUPLES.RAIL_TOP_CAP} cutPx={6} variant="brass" testid="left-rail-expand-btn" ariaLabel={isOpen ? 'Collapse AST Explorer' : 'Expand AST Explorer'} tip={isOpen ? 'Collapse AST Explorer' : 'Expand AST Explorer'} onclick={() => hudWire.toggleEdgeZone(HUD_ZONES.LEFT_EDGE)} className="w-8 h-7 font-bold">{isOpen ? '«' : '»'}</HudChamferButton>
				<div
					data-grip-control="true"
					use:uiDrawerGrip={{
						side: 'LEFT',
						mode: 'RAIL',
						getInitialOffsetRem: () => ({ xRem: placement.x / 16, yRem: placement.y / 16, railOffsetYRem: placement.railOffsetYRem }),
						onToggleFloat: () => hudWire.toggleDockFloat('LEFT_EDGE'),
						onMoveRail: (_s, nextYRem) => hudWire.moveEdgeRail('LEFT', nextYRem, typeof window !== 'undefined' ? window.innerHeight : 900),
					}}
				>
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isFloating} variant={isFloating ? 'accent' : 'default'} testid="left-rail-float-toggle" ariaLabel="Left Rail Dotted Grip" tip={isFloating ? 'Click to Dock · Drag Vertically' : 'Click to Float · Drag Vertically'} className="w-8 h-6 cursor-grab active:cursor-grabbing"><HudIcon name="grip" sizeRem={0.8125} /></HudChamferButton>
				</div>
				<span class="text-[0.6875rem] text-[var(--hud-muted)] tabular-nums">{entities.length}</span>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isOpen && activeKindFilter === ENTITY_KINDS.FUNCTION} variant={isOpen && activeKindFilter === ENTITY_KINDS.FUNCTION ? 'accent' : 'default'} onclick={() => selectOrToggleKindTab(ENTITY_KINDS.FUNCTION)} tip="Filter Functions" ariaLabel="Filter Functions" className="w-8 h-7 text-[var(--hud-nominal)]">{HUD_GLYPHS.ENTITY_FUNCTION}</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isOpen && activeKindFilter === ENTITY_KINDS.CLASS} variant={isOpen && activeKindFilter === ENTITY_KINDS.CLASS ? 'accent' : 'default'} onclick={() => selectOrToggleKindTab(ENTITY_KINDS.CLASS)} tip="Filter Classes" ariaLabel="Filter Classes" className="w-8 h-7 text-[var(--hud-accent-primary)]">{HUD_GLYPHS.ENTITY_CLASS}</HudChamferButton>
				<HudChamferButton corners={securityWire.can(CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE) ? ZONE_CORNER_TUPLES.DIAGONAL_CHAMFER : ZONE_CORNER_TUPLES.RAIL_BOTTOM_CAP} cutPx={securityWire.can(CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE) ? 4 : 6} active={isOpen && activeKindFilter === ENTITY_KINDS.VARIABLE} variant={isOpen && activeKindFilter === ENTITY_KINDS.VARIABLE ? 'brass' : 'default'} testid={!securityWire.can(CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE) ? 'left-rail-bottom-cap' : undefined} onclick={() => selectOrToggleKindTab(ENTITY_KINDS.VARIABLE)} tip="Filter Variables" ariaLabel="Filter Variables" className="w-8 h-7 text-[var(--hud-warning)]">{HUD_GLYPHS.ENTITY_VARIABLE}</HudChamferButton>
				{#if securityWire.can(CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE)}
					<HudChamferButton corners={ZONE_CORNER_TUPLES.RAIL_BOTTOM_CAP} cutPx={6} variant="accent" testid="left-rail-bottom-cap" ariaLabel="Open Workspace Ingest" tip="Ingest .ZIP / URL" onclick={() => hudWire.openModal(HUD_MODALS.WORKSPACE_INGEST)} className="w-8 h-7 mt-0.5 font-bold">⇣</HudChamferButton>
				{/if}
			</div>
		</HudChamferFrame>
	</div>

	{#if isOpen}
		<div data-testid="left-drawer-panel" in:fly={{ x: -18, duration: dur }} out:fade={{ duration: dur }} class="hud-track-w max-h-[calc(100vh-20rem)] flex flex-col z-10">
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER} chevrons={false} className="w-full max-h-[calc(100vh-20rem)] flex flex-col" contentClassName="flex flex-col min-h-0 max-h-[calc(100vh-20rem)]">
				<div class="flex flex-col min-h-0 max-h-[calc(100vh-20rem)]">
					<div role="toolbar" tabindex="-1" onpointerdown={startDockDrag} onpointermove={moveDockDrag} onpointerup={() => (dragging = false)} class="px-3 pt-3 pb-2.5 border-b border-[var(--hud-border)] bg-[var(--hud-surface)]/80 flex items-center justify-between gap-1 font-mono text-[0.625rem] leading-4 cursor-grab active:cursor-grabbing">
						<div role="tablist" aria-label="AST Explorer Sections" class="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
							<button type="button" role="tab" data-testid="left-drawer-tab-explorer" aria-selected={hudWire.leftEdgeActiveTab === 'EXPLORER'} onclick={() => selectDrawerTab('EXPLORER', WORKSPACE_DEFAULTS.FILTER_ALL)} class={`px-1.5 py-0.5 border whitespace-nowrap cursor-pointer hud-hover-lift ${hudWire.leftEdgeActiveTab === 'EXPLORER' ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Explorer</button>
							<button type="button" role="tab" data-testid="left-drawer-tab-files" aria-selected={hudWire.leftEdgeActiveTab === 'FILES'} onclick={() => selectDrawerTab('FILES', ENTITY_KINDS.FILE)} class={`px-1.5 py-0.5 border whitespace-nowrap cursor-pointer hud-hover-lift ${hudWire.leftEdgeActiveTab === 'FILES' ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Files</button>
							<button type="button" role="tab" data-testid="left-drawer-tab-violations" aria-selected={hudWire.leftEdgeActiveTab === 'VIOLATIONS'} onclick={() => selectDrawerTab('VIOLATIONS', WORKSPACE_DEFAULTS.FILTER_ALL)} class={`px-1.5 py-0.5 border whitespace-nowrap cursor-pointer hud-hover-lift ${hudWire.leftEdgeActiveTab === 'VIOLATIONS' ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Violations</button>
						</div>
						<div
							data-grip-control="true"
							class="flex items-center gap-1 shrink-0 mr-1"
							use:uiDrawerGrip={{
								side: 'LEFT',
								mode: 'DRAWER',
								getInitialOffsetRem: () => ({ xRem: placement.x / 16, yRem: placement.y / 16, railOffsetYRem: placement.railOffsetYRem }),
								onToggleFloat: () => hudWire.toggleDockFloat('LEFT_EDGE'),
								onMoveDrawer: (_s, xRem, yRem) => hudWire.moveFloatingDock('LEFT_EDGE', xRem * 16, yRem * 16, typeof window !== 'undefined' ? window.innerWidth : 1440, typeof window !== 'undefined' ? window.innerHeight : 900),
							}}
						>
							<HudChamferButton corners={ZONE_CORNER_TUPLES.RADAR_TOP_RIGHT} cutPx={5} active={isFloating} variant={isFloating ? 'accent' : 'default'} testid="left-dock-float-toggle" ariaLabel="Left Drawer Dotted Grip" tip={isFloating ? 'Click to Dock · Drag to Move' : 'Click to Float · Drag to Detach'} className="px-2 py-1 shrink-0 cursor-grab active:cursor-grabbing"><HudIcon name="grip" sizeRem={0.8125} /></HudChamferButton>
						</div>
					</div>
					<div class="flex-1 min-h-0 flex flex-col overflow-hidden">
						<HudAnimatedResizeBody transitionKey={`${hudWire.leftEdgeActiveTab}-${activeKindFilter}`} className="flex-1 min-h-0 flex flex-col" innerClassName="flex-1 min-h-0">
							<EntityFilterBar {entities} {selectedEntityId} {searchQuery} {activeKindFilter} {ckMap} {cyclicIds} {violationMap} {onSelectEntity} {onSearchChange} {onKindChange} />
						</HudAnimatedResizeBody>
					</div>
				</div>
			</HudChamferFrame>
		</div>
	{/if}
</aside>
