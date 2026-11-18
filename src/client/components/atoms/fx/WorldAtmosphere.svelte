<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.0.1 Five-Layer Composable Optical Substrate: (0) Central Radial Illumination, (1) 1x/5x5 Drafting Grid + Crosshairs, (2) Hex-Mesh & Star-Dust, (3) Polar Telemetry Rings & Ticks, (4) 12px Inset Frame & Scanlines.
-->
<script lang="ts">
	import { FUI_DEPTH_CONSTANTS, HUD_THEME_PRESETS } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';

	let visorX = $state<number>(0);
	let visorY = $state<number>(0);

	let cfg = $derived(hudWire.substrateConfig);
	let theme = $derived(HUD_THEME_PRESETS[hudWire.activeThemeId]);
	let minorPx = $derived(Math.max(10, cfg.minorGridPx));
	let majorPx = $derived(minorPx * Math.max(2, cfg.majorGridEvery));
	let arm = $derived(cfg.crosshairArmPx);
	let subLines = $derived(Array.from({ length: Math.max(1, cfg.majorGridEvery - 1) }, (_, i) => (i + 1) * minorPx));
	let hexW = $derived(Math.max(20, cfg.hexCellPx));
	let hexH = $derived(Math.round(hexW * 0.866));

	function handlePointerMove(e: PointerEvent): void {
		if (!hudWire.kineticMotionEnabled || typeof window === 'undefined') {
			visorX = 0; visorY = 0; return;
		}
		const nx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
		const ny = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
		visorX = Math.round(nx * cfg.parallaxAmplitudePx * 10) / 10;
		visorY = Math.round(ny * cfg.parallaxAmplitudePx * 10) / 10;
	}
</script>

<svelte:window onpointermove={handlePointerMove} />

<div aria-hidden="true" data-testid="world-atmosphere-substrate" class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
	<!-- Layer 0: Central Radial Illumination (mk_6.jpg center-lit drafting depth) -->
	<div
		class="absolute inset-0 transition-opacity duration-300"
		style={`opacity: ${cfg.bloomIntensity}; background: radial-gradient(ellipse 78% 72% at ${cfg.radialFocusX}% ${cfg.radialFocusY}%, ${theme.coreGradientColor} 0%, ${theme.midGradientColor} 54%, ${theme.edgeGradientColor} 100%);`}
	></div>

	<!-- Layer 1 (1x / 5x5 Drafting Grid + '+' Crosshairs) & Layer 2 (Hex-Mesh & Star-Dust Lattice) -->
	<svg class="absolute inset-0 w-full h-full">
		<defs>
			<pattern id="chronos-drafting-grid-v201" width={majorPx} height={majorPx} patternUnits="userSpaceOnUse">
				{#each subLines as pos (pos)}
					<line x1={pos} y1="0" x2={pos} y2={majorPx} stroke="var(--hud-grid)" stroke-width="0.75" stroke-opacity={cfg.minorGridOpacity} />
					<line x1="0" y1={pos} x2={majorPx} y2={pos} stroke="var(--hud-grid)" stroke-width="0.75" stroke-opacity={cfg.minorGridOpacity} />
				{/each}
				<path d={`M ${majorPx} 0 L 0 0 0 ${majorPx}`} fill="none" stroke="var(--hud-accent-primary)" stroke-width="1.1" stroke-opacity={cfg.majorGridOpacity} />
				{#if cfg.crosshairOpacity > 0}
					<line x1="0" y1="0" x2={arm} y2="0" stroke="var(--hud-accent-secondary)" stroke-width="1.4" stroke-opacity={cfg.crosshairOpacity} />
					<line x1={majorPx - arm} y1="0" x2={majorPx} y2="0" stroke="var(--hud-accent-secondary)" stroke-width="1.4" stroke-opacity={cfg.crosshairOpacity} />
					<line x1="0" y1="0" x2="0" y2={arm} stroke="var(--hud-accent-secondary)" stroke-width="1.4" stroke-opacity={cfg.crosshairOpacity} />
					<line x1="0" y1={majorPx - arm} x2="0" y2={majorPx} stroke="var(--hud-accent-secondary)" stroke-width="1.4" stroke-opacity={cfg.crosshairOpacity} />
				{/if}
			</pattern>
			{#if cfg.hexMeshEnabled}
				<pattern id="chronos-hex-lattice-v201" width={hexW} height={hexH} patternUnits="userSpaceOnUse">
					<polygon
						points={`${hexW * 0.25},0 ${hexW * 0.75},0 ${hexW},${hexH * 0.5} ${hexW * 0.75},${hexH} ${hexW * 0.25},${hexH} 0,${hexH * 0.5}`}
						fill="none"
						stroke="var(--hud-accent-primary)"
						stroke-width="0.75"
						stroke-opacity={cfg.hexOpacity}
					/>
					{#if cfg.starDustDensity > 0}
						<circle cx={hexW * 0.5} cy={hexH * 0.5} r="0.9" fill="var(--hud-accent-secondary)" fill-opacity={cfg.starDustDensity * 0.45} />
						<circle cx={hexW * 0.15} cy={hexH * 0.22} r="0.65" fill="var(--hud-accent-primary)" fill-opacity={cfg.starDustDensity * 0.35} />
					{/if}
				</pattern>
			{/if}
		</defs>
		<rect width="100%" height="100%" fill="url(#chronos-drafting-grid-v201)" />
		{#if cfg.hexMeshEnabled}
			<rect width="100%" height="100%" fill="url(#chronos-hex-lattice-v201)" />
		{/if}
	</svg>

	<!-- Layer 3: Polar Telemetry Rings, Cardinal Axes & 000°-315° Degree Ticks -->
	{#if cfg.polarRingsEnabled}
		<div class="absolute inset-0 transition-transform duration-150" style={`transform: translate3d(${visorX}px, ${visorY}px, 0);`}>
			<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" class="w-full h-full opacity-35">
				{#each FUI_DEPTH_CONSTANTS.RANGE_RINGS_PX as radius, idx (radius)}
					<circle
						cx="800"
						cy="500"
						r={radius}
						fill="none"
						stroke={idx === 1 ? 'var(--hud-accent-primary)' : 'var(--hud-accent-secondary)'}
						stroke-width={idx === 1 ? '1.1' : '0.8'}
						stroke-dasharray={idx === 0 ? '4 6' : idx === 2 ? '2 8' : 'none'}
					/>
				{/each}
				{#each FUI_DEPTH_CONSTANTS.DEGREE_TICKS as deg (deg)}
					{@const rad = (deg * Math.PI) / 180}
					{@const rIn = FUI_DEPTH_CONSTANTS.RANGE_RINGS_PX[1] - 8}
					{@const rOut = FUI_DEPTH_CONSTANTS.RANGE_RINGS_PX[1] + 8}
					{@const tx = Math.round(800 + Math.cos(rad) * (rOut + 18))}
					{@const ty = Math.round(503 + Math.sin(rad) * (rOut + 18))}
					<line x1={800 + Math.cos(rad) * rIn} y1={500 + Math.sin(rad) * rIn} x2={800 + Math.cos(rad) * rOut} y2={500 + Math.sin(rad) * rOut} stroke="var(--hud-accent-secondary)" stroke-width="1.2" />
					<text x={tx} y={ty} text-anchor="middle" fill="var(--hud-accent-secondary)" font-size="11" font-family="IBM Plex Mono">{String(deg).padStart(3, '0')}°</text>
				{/each}
				<line x1="800" y1="40" x2="800" y2="960" stroke="var(--hud-accent-primary)" stroke-width="0.65" stroke-dasharray="3 9" opacity="0.6" />
				<line x1="120" y1="500" x2="1480" y2="500" stroke="var(--hud-accent-primary)" stroke-width="0.65" stroke-dasharray="3 9" opacity="0.6" />
			</svg>
		</div>
	{/if}

	<!-- Layer 4: CRT Scanline Weave & Vignette (outer bevels framed by screen-corner pods) -->
	<div
		class="absolute inset-0"
		style={`background: repeating-linear-gradient(180deg, transparent 0px, transparent 2px, rgba(0, 0, 0, ${cfg.scanlineOpacity}) 2px, rgba(0, 0, 0, ${cfg.scanlineOpacity}) 3px), radial-gradient(ellipse 88% 82% at 50% 50%, transparent 52%, rgba(0, 0, 0, ${cfg.vignetteStrength}) 100%);`}
	></div>
</div>
