<!--
	@author Oblx <code@oblx.dev>
	@description Shared SVG Hardware-Cartridge Node & Edge Primitive with 45° top-right chamfered hull, data-entity-id, and double-click focus (v2.2.0).
-->
<script lang="ts">
	import { buildEntityCartridgePolygons } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';

	interface Props {
		x: number;
		y: number;
		width: number;
		height: number;
		chamfer?: number;
		entityId?: number;
		title: string;
		subtitle: string;
		badge?: string;
		strokeColor: string;
		railColor?: string;
		bezelColor?: string;
		isFocal?: boolean;
		ariaLabel?: string;
		onSelect?: () => void;
		onDoubleClick?: () => void;
	}

	let {
		x,
		y,
		width,
		height,
		chamfer: customChamfer,
		entityId,
		title,
		subtitle,
		badge,
		strokeColor,
		railColor,
		bezelColor,
		isFocal = false,
		ariaLabel,
		onSelect,
		onDoubleClick,
	}: Props = $props();

	let baseChamfer = $derived(customChamfer ?? (isFocal ? 14 : 12));
	let polys = $derived(buildEntityCartridgePolygons(width, height, baseChamfer, hudWire.cornerStyle));
	let spine = $derived(railColor ?? strokeColor);
	let bezel = $derived(bezelColor ?? strokeColor);
	let textX = $derived(Math.max(15, polys.cut + 6));
	let spineW = $derived(isFocal ? 3.5 : 3);
	let spineRightBottomY = $derived(polys.cut > 0 ? Math.min(height, height - polys.cut + spineW) : height);
	let spinePts = $derived(`0,0 ${spineW},0 ${spineW},${spineRightBottomY} 0,${Math.max(0, height - polys.cut)}`);
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<g
	data-graph-node="true"
	data-entity-id={entityId}
	data-corner-style={hudWire.cornerStyle}
	transform={`translate(${x}, ${y})`}
	role={onSelect ? 'button' : undefined}
	tabindex={onSelect ? 0 : undefined}
	aria-label={ariaLabel}
	class={onSelect ? 'cursor-pointer' : ''}
	onclick={() => onSelect?.()}
	ondblclick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
	onkeydown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) onSelect(); }}
>
	{#if isFocal}
		<g class="hud-reticle-breathe">
			<polyline points="-8,10 -8,-8 10,-8" fill="none" stroke="var(--hud-accent-secondary)" stroke-width="2" />
			<polyline data-testid="focal-reticle-tr" points={polys.reticleTrPts} fill="none" stroke="var(--hud-accent-secondary)" stroke-width="2" />
			<polyline data-testid="focal-reticle-bl" points={polys.reticleBlPts} fill="none" stroke="var(--hud-accent-secondary)" stroke-width="2" />
			<polyline points={`${width - 10},${height + 8} ${width + 8},${height + 8} ${width + 8},${height - 10}`} fill="none" stroke="var(--hud-accent-secondary)" stroke-width="2" />
		</g>
	{/if}
	<polygon points={polys.outerPts} fill={isFocal ? 'url(#hud-z1-focal-grad)' : 'url(#hud-z1-node-grad)'} stroke={strokeColor} stroke-width={isFocal ? '2.2' : '1.6'} filter="url(#hud-z1-shadow)" />
	<polygon points={polys.outerPts} fill="url(#hud-z1-sheen)" />
	<polygon points={polys.innerPts} fill="none" stroke={bezel} stroke-opacity={isFocal ? '0.45' : '0.32'} />
	<polygon points={spinePts} fill={spine} />
	{#if badge}
		<text x={textX} y="19" fill={spine} font-size="11" font-family="IBM Plex Mono" font-weight="600">{badge}</text>
		<text x={textX} y="38" fill="var(--hud-text)" font-size="14" font-family="IBM Plex Mono" font-weight="700">{title}</text>
		<text x={textX} y="55" fill="var(--hud-muted)" font-size="11" font-family="IBM Plex Mono">{subtitle}</text>
	{:else}
		<text x={textX} y="20" fill="var(--hud-text)" font-size="13" font-family="IBM Plex Mono" font-weight="600">{title}</text>
		<text x={textX} y="38" fill="var(--hud-muted)" font-size="11" font-family="IBM Plex Mono">{subtitle}</text>
	{/if}
</g>
