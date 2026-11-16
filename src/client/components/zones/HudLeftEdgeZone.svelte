<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.5.0 Zone 08 LEFT_EDGE dock: Persistent 48px outer mini-rail + slide-from-behind drawer panel and floating dock mode.
-->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { HUD_MODALS } from '@config/hud.events';
	import { DOCK_PLACEMENT_MODES, CHAMFER_PROFILES, HULL_PROFILES, HUD_GLYPHS, HUD_ZONE_VISIBILITY, HUD_ZONES } from '@config/hud.tokens';
	import { CAPABILITY_BITS } from '@config/security.constants';
	import { ENTITY_KINDS } from '@config/metamodel.constants';
	import { hudWire, securityWire, type EntityCkMetrics, type GraphEntityNode } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import EntityFilterBar from '@client/components/molecules/overlays/EntityFilterBar.svelte';

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

	function selectOrToggleKindTab(kind: string): void {
		if (isOpen && activeKindFilter === kind) {
			hudWire.setZoneVisibility(HUD_ZONES.LEFT_EDGE, HUD_ZONE_VISIBILITY.COMPACT);
			return;
		}
		onKindChange(kind);
		hudWire.setZoneVisibility(HUD_ZONES.LEFT_EDGE, HUD_ZONE_VISIBILITY.OPEN);
	}

	function startDockDrag(e: PointerEvent): void {
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
	aria-label="AST Explorer Left Perimeter Dock"
	data-help-target="LEFT_ENTITY_EXPLORER"
	data-hud-zone={HUD_ZONES.LEFT_EDGE}
	data-dock-mode={placement.mode}
	data-drawer-mode={hudWire.edgeDrawerMode}
	inert={isFolded}
	style={isFloating && !isFolded ? `transform: translate3d(${placement.x}px, ${placement.y}px, 0); opacity: 1;` : hudWire.zoneStyle(HUD_ZONES.LEFT_EDGE)}
	class={`${isFloating ? 'fixed top-0 left-0 h-[440px] z-30' : 'fixed left-3 top-1/2 h-auto max-h-[calc(100vh-320px)] z-25 hud-zone-transition'} flex items-center gap-3 ${isFolded ? 'pointer-events-none' : 'pointer-events-auto'}`}
>
	<!-- Persistent 48px Outer Mini-Rail -->
	<div data-testid="left-mini-rail" class="hud-rail-w shrink-0 z-20">
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={false} className="w-full p-1.5 py-2 font-mono text-[11px] leading-4">
			<div class="flex flex-col items-center gap-2">
				<div class="flex flex-col items-center gap-2">
					<HudChamferButton
						chamferCorner={CHAMFER_PROFILES.TOP_CAP_CHAMFER}
						cutPx={6}
						variant="brass"
						testid="left-rail-expand-btn"
						ariaLabel={isOpen ? 'Collapse AST Explorer' : 'Expand AST Explorer'}
						tip={isOpen ? 'Collapse AST Explorer' : 'Expand AST Explorer'}
						onclick={() => hudWire.toggleEdgeZone(HUD_ZONES.LEFT_EDGE)}
						className="w-8 h-7 font-bold"
					>
						{isOpen ? '«' : '»'}
					</HudChamferButton>
					<button type="button" data-testid="left-rail-float-toggle" data-hud-tip={isFloating ? 'Dock to Rail' : 'Float Rail'} onclick={() => hudWire.toggleDockFloat('LEFT_EDGE')} class="w-7 h-5 border border-[var(--hud-border)] text-[9px] text-[var(--hud-muted)] cursor-pointer">⋮⋮</button>
					<span class="text-[11px] text-[var(--hud-muted)] tabular-nums">{entities.length}</span>
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isOpen && activeKindFilter === ENTITY_KINDS.FUNCTION} variant={isOpen && activeKindFilter === ENTITY_KINDS.FUNCTION ? 'accent' : 'default'} onclick={() => selectOrToggleKindTab(ENTITY_KINDS.FUNCTION)} tip="Filter Functions" ariaLabel="Filter Functions" className="w-8 h-7 text-[var(--hud-nominal)]">{HUD_GLYPHS.ENTITY_FUNCTION}</HudChamferButton>
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} active={isOpen && activeKindFilter === ENTITY_KINDS.CLASS} variant={isOpen && activeKindFilter === ENTITY_KINDS.CLASS ? 'accent' : 'default'} onclick={() => selectOrToggleKindTab(ENTITY_KINDS.CLASS)} tip="Filter Classes" ariaLabel="Filter Classes" className="w-8 h-7 text-[var(--hud-accent-primary)]">{HUD_GLYPHS.ENTITY_CLASS}</HudChamferButton>
					<HudChamferButton chamferCorner={securityWire.can(CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE) ? CHAMFER_PROFILES.INTERIOR_CHAMFER : CHAMFER_PROFILES.BOTTOM_CAP_CHAMFER} cutPx={securityWire.can(CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE) ? 4 : 6} active={isOpen && activeKindFilter === ENTITY_KINDS.VARIABLE} variant={isOpen && activeKindFilter === ENTITY_KINDS.VARIABLE ? 'brass' : 'default'} testid={!securityWire.can(CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE) ? 'left-rail-bottom-cap' : undefined} onclick={() => selectOrToggleKindTab(ENTITY_KINDS.VARIABLE)} tip="Filter Variables" ariaLabel="Filter Variables" className="w-8 h-7 text-[var(--hud-warning)]">{HUD_GLYPHS.ENTITY_VARIABLE}</HudChamferButton>
					{#if securityWire.can(CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE)}
						<HudChamferButton chamferCorner={CHAMFER_PROFILES.BOTTOM_CAP_CHAMFER} cutPx={6} variant="accent" testid="left-rail-bottom-cap" ariaLabel="Open Workspace Ingest" tip="Ingest .ZIP / URL" onclick={() => hudWire.openModal(HUD_MODALS.WORKSPACE_INGEST)} className="w-8 h-7 mt-0.5 font-bold">⇣</HudChamferButton>
					{/if}
				</div>
			</div>
		</HudChamferFrame>
	</div>

	<!-- Slide-From-Behind Unfolded Drawer Panel -->
	{#if isOpen}
		<div data-testid="left-drawer-panel" in:fly={{ x: -18, duration: dur }} out:fade={{ duration: dur }} class="hud-track-w max-h-[calc(100vh-320px)] flex flex-col z-10">
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_CORNER_POD} chevrons={false} className="w-full max-h-[calc(100vh-320px)] flex flex-col" contentClassName="flex flex-col min-h-0 max-h-[calc(100vh-320px)]">
				<div class="flex flex-col min-h-0 max-h-[calc(100vh-320px)]">
					<div
						role="toolbar"
						tabindex="-1"
						onpointerdown={startDockDrag}
						onpointermove={moveDockDrag}
						onpointerup={() => (dragging = false)}
						class="px-4 pt-3 pb-2.5 border-b border-[var(--hud-border)] bg-[var(--hud-surface)]/80 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
					>
						<span class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--hud-accent-secondary)] flex items-center gap-1 truncate">
							<span class="text-[var(--hud-muted)]" data-hud-tip="Drag to float dock">⋮⋮</span>
							{HUD_GLYPHS.ENTITY_CLASS} AST Explorer
						</span>
						<div class="flex items-center gap-1 shrink-0 mr-1">
							<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={5} variant={isFloating ? 'accent' : 'default'} testid="left-dock-float-toggle" tip={isFloating ? 'Snap to Left Rail' : 'Detach Floating Dock'} onclick={() => hudWire.toggleDockFloat('LEFT_EDGE')} className="px-2.5 py-0.5 font-mono text-[10px] shrink-0">{isFloating ? 'PIN' : 'FLOAT'}</HudChamferButton>
						</div>
					</div>
					<div class="flex-1 min-h-0 flex flex-col overflow-hidden">
						<EntityFilterBar {entities} {selectedEntityId} {searchQuery} {activeKindFilter} {ckMap} {cyclicIds} {violationMap} {onSelectEntity} {onSearchChange} {onKindChange} />
					</div>
				</div>
			</HudChamferFrame>
		</div>
	{/if}
</aside>
