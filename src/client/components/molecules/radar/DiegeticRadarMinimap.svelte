<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.1 3-Column Mini-Bento Radar (Parallel corner-safe CHAMFER_PROFILES on all 6 side buttons, >=10px inner clearance, 96x96 polar scope).
-->
<script lang="ts">
	import { HUD_CONFIG } from '@config/constants';
	import { HUD_INTENT_KINDS } from '@config/hud/hud.intents';
	import { CHAMFER_PROFILES, HULL_PROFILES, HUD_ZONES } from '@config/hud.tokens';
	import { type GraphEntityNode, clampValue, hudWire } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';

	interface Props {
		nodes: readonly GraphEntityNode[];
		focalEntityId: number;
		panX: number;
		panY: number;
		zoomScale: number;
		inline?: boolean;
		onSelectNode: (id: number) => void;
		onRecenter?: () => void;
	}

	let { nodes, focalEntityId, panX, panY, zoomScale, inline = false, onSelectNode, onRecenter }: Props = $props();

	let filteredNodes = $derived(
		hudWire.radarHotspotsOnly
			? nodes.filter((n) => n.id === focalEntityId || n.cyclomatic >= 4)
			: nodes
	);

	let radarBlips = $derived(
		filteredNodes.slice(0, HUD_CONFIG.RADAR_MAX_BLIPS).map((node, idx) => {
			const angle = (idx / Math.max(1, Math.min(filteredNodes.length, HUD_CONFIG.RADAR_MAX_BLIPS))) * Math.PI * 2;
			const baseR = node.id === focalEntityId ? 0 : 12 + ((idx * 13) % 30);
			const r = Math.min(44, baseR * hudWire.radarZoom);
			return {
				node,
				cx: Math.round(50 + Math.cos(angle) * r),
				cy: Math.round(50 + Math.sin(angle) * r),
				isFocal: node.id === focalEntityId,
			};
		})
	);

	let effZoom = $derived(Math.max(0.2, zoomScale * hudWire.radarZoom));
	let frustumW = $derived(clampValue(Math.round(36 / effZoom), 12, 72));
	let frustumH = $derived(clampValue(Math.round(36 / effZoom), 12, 72));
	let frustumX = $derived(clampValue(Math.round(50 - frustumW / 2 - panX * 0.05), 4, 96 - frustumW));
	let frustumY = $derived(clampValue(Math.round(50 - frustumH / 2 - panY * 0.05), 4, 96 - frustumH));

	function fireRadarIntent(intentKind: (typeof HUD_INTENT_KINDS)[keyof typeof HUD_INTENT_KINDS]): void {
		hudWire.dispatchIntent({ intentKind, sourceZone: HUD_ZONES.BOTTOM_RIGHT, targetId: focalEntityId });
		if (intentKind === HUD_INTENT_KINDS.RADAR_FIT_WORLD || intentKind === HUD_INTENT_KINDS.RADAR_CENTER_FOCAL) onRecenter?.();
	}
</script>

<aside aria-label="Diegetic Radar Minimap and Complexity Oscilloscope" class={inline ? 'hud-track-w h-full' : 'absolute bottom-3 right-3 hud-track-w pointer-events-auto'}>
	<HudChamferFrame profile={HULL_PROFILES.CHAMFER_CORNER_POD} chevrons={false} className="w-full h-full px-3 py-2.5 font-mono text-[11px] select-none">
		<div class="h-full grid grid-cols-[36px_1fr_36px] items-center gap-1.5">
			<div class="h-full flex flex-col justify-between gap-1">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_LEFT} cutPx={6} testid="radar-zoom-in" tip="Radar Zoom In" onclick={() => fireRadarIntent(HUD_INTENT_KINDS.RADAR_ZOOM_IN)} className="w-full h-[30px] text-xs font-bold">+</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} testid="radar-zoom-out" tip="Radar Zoom Out" onclick={() => fireRadarIntent(HUD_INTENT_KINDS.RADAR_ZOOM_OUT)} className="w-full h-[30px] text-xs font-bold">-</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT} cutPx={6} testid="radar-fit-world" tip="Fit World to Safe Corridor" onclick={() => fireRadarIntent(HUD_INTENT_KINDS.RADAR_FIT_WORLD)} className="w-full h-[30px] text-xs font-bold">⊡</HudChamferButton>
			</div>

			<div class="flex flex-col items-center justify-center gap-0.5 min-w-0">
				<div data-testid="bento-radar-scope" class="relative w-[92px] h-[92px] shrink-0 bg-[var(--hud-bg)] border border-[var(--hud-border)] overflow-hidden">
					<svg viewBox="0 0 100 100" class="w-full h-full block">
						<defs>
							<radialGradient id="chronosRadarSweepGrad" cx="50%" cy="50%" r="50%">
								<stop offset="0%" stop-color="var(--hud-accent-primary)" stop-opacity="0.48" />
								<stop offset="100%" stop-color="var(--hud-accent-primary)" stop-opacity="0.06" />
							</radialGradient>
						</defs>
						<g class={hudWire.radarSweepActive ? 'hud-radar-sweep' : 'opacity-20'} style="transform-origin: 50px 50px;">
							<path d="M50,50 L50,4 A46,46 0 0,1 89.8,27 Z" fill="url(#chronosRadarSweepGrad)" />
							<line x1="50" y1="50" x2="50" y2="4" stroke="var(--hud-accent-primary)" stroke-opacity="0.75" stroke-width="1" />
						</g>
						<line x1="50" y1="0" x2="50" y2="100" stroke="var(--hud-grid)" stroke-width="0.8" stroke-opacity="0.45" />
						<line x1="0" y1="50" x2="100" y2="50" stroke="var(--hud-grid)" stroke-width="0.8" stroke-opacity="0.45" />
						<circle cx="50" cy="50" r="18" fill="none" stroke="var(--hud-accent-primary)" stroke-opacity="0.3" stroke-dasharray="2 2" />
						<circle cx="50" cy="50" r="32" fill="none" stroke="var(--hud-accent-primary)" stroke-opacity="0.4" stroke-dasharray="2 2" />
						<circle cx="50" cy="50" r="46" fill="none" stroke="var(--hud-accent-primary)" stroke-opacity="0.5" />
						<rect x={frustumX} y={frustumY} width={frustumW} height={frustumH} fill="none" stroke="var(--hud-accent-secondary)" stroke-width="1.1" />
						{#each radarBlips as blip (blip.node.id)}
							<circle role="button" tabindex="0" aria-label={`Select entity ${blip.node.name}`} data-hud-tip={`${blip.node.name} (v(G)=${blip.node.cyclomatic})`} cx={blip.cx} cy={blip.cy} r={blip.isFocal ? 3.5 : 2} fill={blip.isFocal ? 'var(--hud-accent-secondary)' : blip.node.cyclomatic >= 5 ? 'var(--hud-warning)' : 'var(--hud-nominal)'} class="cursor-pointer" onclick={() => onSelectNode(blip.node.id)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectNode(blip.node.id); }} />
						{/each}
					</svg>
				</div>
				<span class="text-[9px] leading-3 text-[var(--hud-muted)] tabular-nums whitespace-nowrap">{filteredNodes.length} ENT · {Math.round(hudWire.radarZoom * 100)}%</span>
			</div>

			<div class="h-full flex flex-col justify-between gap-1">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={6} testid="radar-center-focal" tip="Center Focal Entity" onclick={() => fireRadarIntent(HUD_INTENT_KINDS.RADAR_CENTER_FOCAL)} className="w-full h-[30px] text-xs font-bold">⌖</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} active={hudWire.radarHotspotsOnly} variant={hudWire.radarHotspotsOnly ? 'brass' : 'default'} testid="radar-filter-hotspots" tip="Filter High-Complexity Hotspots" onclick={() => fireRadarIntent(HUD_INTENT_KINDS.RADAR_FILTER_HOTSPOTS)} className="w-full h-[30px] text-xs font-bold">!</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={6} active={hudWire.radarSweepActive} variant={hudWire.radarSweepActive ? 'accent' : 'default'} testid="radar-toggle-sweep" tip="Toggle Phosphor Sweep" onclick={() => fireRadarIntent(HUD_INTENT_KINDS.RADAR_TOGGLE_SWEEP)} className="w-full h-[30px] text-xs font-bold">◐</HudChamferButton>
			</div>
		</div>
	</HudChamferFrame>
</aside>
