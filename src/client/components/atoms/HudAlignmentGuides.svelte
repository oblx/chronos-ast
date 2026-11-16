<!--
	@author Oblx <code@oblx.dev>
	@description Interactive QA Alignment Overlay (Alt+G) rendering Golden Ratio splits (38.2% / 61.8%) and the 4 Virtual Alignment Rails.
-->
<script lang="ts">
	import { HUD_ALIGNMENT_RAILS, HUD_HARMONIC_RATIOS } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';

	const minorPct = `${(HUD_HARMONIC_RATIOS.GOLDEN_MINOR * 100).toFixed(1)}%`;
	const majorPct = `${(HUD_HARMONIC_RATIOS.GOLDEN_MAJOR * 100).toFixed(1)}%`;
</script>

{#if hudWire.showAlignmentGuides}
	<div aria-hidden="true" data-testid="hud-alignment-guides" class="fixed inset-0 z-40 pointer-events-none select-none font-mono text-[11px] text-[var(--hud-accent)]">
		<div class="absolute inset-x-0 border-t border-dashed border-[var(--hud-accent)]/60" style={`top: ${HUD_ALIGNMENT_RAILS.UPPER_PERIMETER_TOP_PX}px;`}>
			<span class="absolute left-[22%] -top-2.5 px-1 bg-[var(--hud-bg)]/90">RAIL 1 · {HUD_ALIGNMENT_RAILS.UPPER_PERIMETER_TOP_PX}px</span>
		</div>
		<div class="absolute inset-x-0 border-t border-dashed border-[var(--hud-nominal)]/55" style={`top: ${HUD_ALIGNMENT_RAILS.UPPER_WORLD_SAFE_TOP_PX}px;`}>
			<span class="absolute left-[22%] -top-3.5 px-1 bg-[var(--hud-bg)]/90 text-[var(--hud-nominal)]">RAIL 2 · SAFE_TOP ({HUD_ALIGNMENT_RAILS.UPPER_WORLD_SAFE_TOP_PX}px)</span>
		</div>
		<div class="absolute inset-x-0 border-t border-dashed border-[var(--hud-nominal)]/55" style={`bottom: ${HUD_ALIGNMENT_RAILS.LOWER_WORLD_SAFE_BOTTOM_PX}px;`}>
			<span class="absolute left-[22%] top-0.5 px-1 bg-[var(--hud-bg)]/90 text-[var(--hud-nominal)]">RAIL 3 · SAFE_BOTTOM ({HUD_ALIGNMENT_RAILS.LOWER_WORLD_SAFE_BOTTOM_PX}px)</span>
		</div>
		<div class="absolute inset-x-0 border-b border-dashed border-[var(--hud-accent)]/60" style={`bottom: ${HUD_ALIGNMENT_RAILS.BOTTOM_PERIMETER_BOTTOM_PX}px;`}>
			<span class="absolute left-[22%] -bottom-2.5 px-1 bg-[var(--hud-bg)]/90">RAIL 4 · {HUD_ALIGNMENT_RAILS.BOTTOM_PERIMETER_BOTTOM_PX}px</span>
		</div>
		<div class="absolute inset-y-0 border-l border-dotted border-[var(--hud-warning)]/45" style={`left: ${minorPct};`}>
			<span class="mt-32 ml-1 inline-block px-1 bg-[var(--hud-bg)]/90 text-[var(--hud-warning)]">φ⁻² {minorPct}</span>
		</div>
		<div class="absolute inset-y-0 border-l border-dotted border-[var(--hud-warning)]/45" style={`left: ${majorPct};`}>
			<span class="mt-32 ml-1 inline-block px-1 bg-[var(--hud-bg)]/90 text-[var(--hud-warning)]">φ⁻¹ {majorPct}</span>
		</div>
	</div>
{/if}
