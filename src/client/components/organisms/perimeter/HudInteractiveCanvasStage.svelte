<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Universal Interactive Camera Stage: 4-corner CHAMFER_OCTAGON hull frame, ResizeObserver auto-fit to Safe Corridor, pan/zoom & pinch.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { DOCK_PLACEMENT_MODES, EDGE_DRAWER_MODES, HULL_PROFILES, HUD_ZONE_VISIBILITY, HUD_ZONES, ZONE_CORNER_TUPLES, resolveHudBreakpoint } from '@config/hud.tokens';
	import { HUD_INTENT_KINDS } from '@config/hud/hud.intents';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import { securityWire } from '@client/state/security.wire.svelte';
	import { createViewportCameraController, type DrawerSafeOffsets, type ViewportCameraController } from '@client/state/viewport.camera.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';

	export type InteractiveStageCamera = ViewportCameraController;

	interface Props {
		boundsWidth: number;
		boundsHeight: number;
		nodeCount?: number;
		fitKey?: string;
		paddingPx?: number;
		resetNonce?: number;
		ariaLabel?: string;
		onCameraChange?: (cam: { panX: number; panY: number; zoomScale: number }) => void;
		onStageReady?: (cam: ViewportCameraController) => void;
		children: Snippet<[{ cam: ViewportCameraController }]>;
	}

	let { boundsWidth, boundsHeight, nodeCount, fitKey = '', paddingPx = 28, resetNonce = 0, ariaLabel = 'Interactive Workspace Stage', onCameraChange, onStageReady, children }: Props = $props();
	let stageEl = $state<HTMLDivElement | null>(null);
	let vpWidth = $state(0);
	let vpHeight = $state(0);
	let lastFitSignature = '';
	const cam = createViewportCameraController();

	let leftDrawerOpen = $derived(
		!hudWire.isStealthMode &&
		hudWire.edgeDrawerMode === EDGE_DRAWER_MODES.OVERLAY_HOVER &&
		hudWire.zoneStates[HUD_ZONES.LEFT_EDGE] === HUD_ZONE_VISIBILITY.OPEN &&
		hudWire.dockPlacements.LEFT_EDGE.mode === DOCK_PLACEMENT_MODES.DOCKED_RAIL
	);
	let rightDrawerOpen = $derived(
		!hudWire.isStealthMode &&
		hudWire.edgeDrawerMode === EDGE_DRAWER_MODES.OVERLAY_HOVER &&
		hudWire.zoneStates[HUD_ZONES.RIGHT_EDGE] === HUD_ZONE_VISIBILITY.OPEN &&
		hudWire.dockPlacements.RIGHT_EDGE.mode === DOCK_PLACEMENT_MODES.DOCKED_RAIL
	);

	function computeDrawerOffsets(): DrawerSafeOffsets {
		if (typeof window === 'undefined' || (!leftDrawerOpen && !rightDrawerOpen)) return { leftPx: 0, rightPx: 0 };
		const bp = resolveHudBreakpoint(window.innerWidth);
		if (bp.id === 'PHONE') return { leftPx: 0, rightPx: 0 };
		const occupiedPx = bp.collapsedRailPx + bp.expandedTrackPx + 24;
		return { leftPx: leftDrawerOpen ? occupiedPx : 0, rightPx: rightDrawerOpen ? occupiedPx : 0 };
	}

	function fitNow(): void {
		if (vpWidth <= 0 || vpHeight <= 0) return;
		cam.fitToBounds({ width: boundsWidth, height: boundsHeight }, { width: vpWidth, height: vpHeight }, paddingPx, computeDrawerOffsets(), nodeCount);
	}

	function handleStageWheel(e: WheelEvent): void {
		e.preventDefault();
		cam.closeContextMenu();
		const rect = stageEl?.getBoundingClientRect();
		const cx = rect ? e.clientX - rect.left : e.clientX;
		const cy = rect ? e.clientY - rect.top : e.clientY;
		cam.stepZoom(-e.deltaY * 0.0012 * (e.ctrlKey ? 1.65 : 1), cx, cy);
	}

	onMount(() => {
		onStageReady?.(cam);
		if (!stageEl || typeof ResizeObserver === 'undefined') return () => cam.destroy();
		const r = stageEl.getBoundingClientRect();
		if (r.width > 0 && r.height > 0) { vpWidth = Math.round(r.width); vpHeight = Math.round(r.height); fitNow(); }
		const ro = new ResizeObserver((entries) => {
			const cr = entries[0]?.contentRect;
			if (cr && cr.width > 0 && cr.height > 0) { vpWidth = Math.round(cr.width); vpHeight = Math.round(cr.height); }
		});
		ro.observe(stageEl);
		return () => { ro.disconnect(); cam.destroy(); };
	});

	$effect(() => {
		const drawerSig = `${leftDrawerOpen ? 'L' : '-'}${rightDrawerOpen ? 'R' : '-'}:${securityWire.principalKind}:${hudWire.isStealthMode ? 'S' : 'N'}`;
		const sig = `${fitKey}:${boundsWidth}x${boundsHeight}:${nodeCount ?? 'all'}:${vpWidth}x${vpHeight}:${resetNonce}:${drawerSig}`;
		if (vpWidth > 0 && vpHeight > 0 && sig !== lastFitSignature) {
			lastFitSignature = sig;
			fitNow();
		}
	});

	$effect(() => {
		const intent = hudWire.lastIntent;
		if (intent && (intent.intentKind === HUD_INTENT_KINDS.RADAR_FIT_WORLD || intent.intentKind === HUD_INTENT_KINDS.RADAR_CENTER_FOCAL)) fitNow();
	});

	$effect(() => { onCameraChange?.({ panX: cam.panX, panY: cam.panY, zoomScale: cam.zoomScale }); });
</script>

<HudChamferFrame
	profile={HULL_PROFILES.CHAMFER_OCTAGON}
	corners={ZONE_CORNER_TUPLES.PERIMETER_CHAMFER}
	chamferPx={12}
	chevrons={false}
	fillColor="transparent"
	strokeColor="var(--hud-border)"
	testid="interactive-canvas-chamfer-frame"
	className="relative w-full h-full overflow-hidden"
	contentClassName="relative w-full h-full overflow-hidden"
>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={stageEl}
		role="application"
		aria-label={ariaLabel}
		onwheel={handleStageWheel}
		onpointerdown={cam.handlePointerDown}
		onpointermove={cam.handlePointerMove}
		onpointerup={cam.handlePointerUp}
		onpointercancel={cam.handlePointerUp}
		ontouchstart={cam.handleTouchStart}
		ontouchmove={cam.handleTouchMove}
		ontouchend={cam.handleTouchEnd}
		oncontextmenu={cam.handleContextMenu}
		ondblclick={fitNow}
		class="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
	>
		<div style={`width: ${boundsWidth}px; height: ${boundsHeight}px; transform-origin: 0 0; transform: translate3d(${cam.panX}px, ${cam.panY}px, 0) scale(${cam.zoomScale});`} class="transition-transform duration-75">
			{@render children({ cam })}
		</div>
	</div>
</HudChamferFrame>
