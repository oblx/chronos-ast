<!--
	@author Oblx <code@oblx.dev>
	@description Settings Tab 1 (Visuals & Substrate): Theme Swatches, Community Theme Marketplace, Edge Drawer Mode, and Fira Code Ligatures (v2.5.0).
-->
<script lang="ts">
	import { Sun, Moon } from 'lucide-svelte';
	import {
		EDGE_DRAWER_MODES, HUD_GLYPHS, HUD_THEME_PRESETS, SURFACE_PATTERNS, SURFACE_TARGETS,
		type HudThemeId, type SurfacePatternId, type SurfaceTarget,
	} from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import HudAccordionSection from '@client/components/molecules/HudAccordionSection.svelte';
	import ThemeMarketplacePanel from '@client/components/modals/settings/ThemeMarketplacePanel.svelte';

	interface Props { onClose?: () => void; }
	let { onClose }: Props = $props();

	let activeTarget = $state<SurfaceTarget>(SURFACE_TARGETS.SUBSTRATE);
	const themeList = Object.values(HUD_THEME_PRESETS);
	const patternList = Object.values(SURFACE_PATTERNS);
	const targetList: readonly SurfaceTarget[] = [SURFACE_TARGETS.SUBSTRATE, SURFACE_TARGETS.DOCKS, SURFACE_TARGETS.MODALS, SURFACE_TARGETS.ALL];

	let activeTheme = $derived(HUD_THEME_PRESETS[hudWire.activeThemeId]);
	let sub = $derived(hudWire.substrateConfig);
	let currentPatternForTarget = $derived<SurfacePatternId>(
		activeTarget === SURFACE_TARGETS.ALL ? hudWire.surfacePatterns.SUBSTRATE : hudWire.surfacePatterns[activeTarget]
	);
</script>

<ThemeMarketplacePanel />

<div class="grid grid-cols-1 md:grid-cols-[38.2fr_61.8fr] gap-4 font-mono">
	<section aria-label="Theme and Polarity" class="flex flex-col gap-2.5 p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/60">
		<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
			<h3 class="text-xs font-bold uppercase tracking-[0.14em] text-[var(--hud-accent-secondary)]">{HUD_GLYPHS.POLARITY_SPLIT} Theme Swatches (2×3)</h3>
			<span class="text-[11px] text-[var(--hud-muted)]">{activeTheme.polarity}</span>
		</div>
		<button type="button" onclick={() => hudWire.randomizePolarityTheme()} class="px-3 py-2 border border-[var(--hud-accent-secondary)] hud-z1-entity hud-glint-trigger text-xs flex items-center justify-between cursor-pointer">
			<span class="flex items-center gap-1.5 font-bold text-[var(--hud-accent-secondary)]">
				{#if activeTheme.polarity === 'DARK'}<Sun size={13} />{:else}<Moon size={13} />{/if}
				Flip Polarity Random
			</span>
			<span class="text-[11px] text-[var(--hud-muted)]">{activeTheme.polarity}</span>
		</button>
		<div class="grid grid-cols-2 gap-1.5">
			{#each themeList as preset (preset.id)}
				{@const isSelected = preset.id === hudWire.activeThemeId && !hudWire.activeCommunitySlug}
				<button type="button" onclick={() => hudWire.setTheme(preset.id as HudThemeId)} class={`p-2 border text-left text-xs flex flex-col gap-1 cursor-pointer hud-hover-lift ${isSelected ? 'border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-text)]'}`}>
					<span class="truncate">{preset.label}</span>
					<span class="text-[11px] text-[var(--hud-muted)] flex items-center justify-between">
						<span>{preset.polarity}</span>
						<span>{preset.polarity === 'DARK' ? HUD_GLYPHS.MOON_DARK : HUD_GLYPHS.SUN_LIGHT}</span>
					</span>
				</button>
			{/each}
		</div>
	</section>

	<div class="flex flex-col gap-2.5">
		<HudAccordionSection title="1. Edge Drawer & Code Typography" badge={hudWire.edgeDrawerMode} defaultOpen={true}>
			<div class="grid grid-cols-2 gap-2 text-[11px]">
				<button type="button" data-testid="drawer-mode-overlay" onclick={() => hudWire.setEdgeDrawerMode(EDGE_DRAWER_MODES.OVERLAY_HOVER)} class={`py-1.5 px-2 border cursor-pointer ${hudWire.edgeDrawerMode === EDGE_DRAWER_MODES.OVERLAY_HOVER ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Overlay Hover (0 CLS)</button>
				<button type="button" data-testid="drawer-mode-docked" onclick={() => hudWire.setEdgeDrawerMode(EDGE_DRAWER_MODES.DOCKED_RESIZE)} class={`py-1.5 px-2 border cursor-pointer ${hudWire.edgeDrawerMode === EDGE_DRAWER_MODES.DOCKED_RESIZE ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Docked Resize Corridor</button>
				<button type="button" data-testid="font-ligatures-toggle" onclick={() => hudWire.setFontLigatures(!hudWire.fontLigatures)} class={`py-1.5 px-2 border cursor-pointer ${hudWire.fontLigatures ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Fira Code Ligatures: {hudWire.fontLigatures ? 'ON' : 'OFF'}</button>
				<div class="flex items-center justify-between border border-[var(--hud-border)] px-2 py-1">
					<span class="text-[var(--hud-muted)]">Code Font</span>
					<div class="flex items-center gap-1">
						<button type="button" onclick={() => hudWire.setCodeFontSize(hudWire.codeFontSizePx - 1)} class="px-1.5 border border-[var(--hud-border)] cursor-pointer">-</button>
						<span class="tabular-nums font-bold">{hudWire.codeFontSizePx}px</span>
						<button type="button" onclick={() => hudWire.setCodeFontSize(hudWire.codeFontSizePx + 1)} class="px-1.5 border border-[var(--hud-border)] cursor-pointer">+</button>
					</div>
				</div>
			</div>
		</HudAccordionSection>

		<HudAccordionSection title="2. Procedural Surface Layers" badge={activeTarget} defaultOpen={false}>
			<div class="grid grid-cols-4 gap-1.5 text-[11px]">
				{#each targetList as tgt (tgt)}
					<button type="button" onclick={() => (activeTarget = tgt)} class={`py-1 border cursor-pointer ${activeTarget === tgt ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] bg-[var(--hud-surface)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>{tgt}</button>
				{/each}
			</div>
			<div class="grid grid-cols-2 gap-1.5">
				{#each patternList as pat (pat.id)}
					{@const isPat = currentPatternForTarget === pat.id}
					<button type="button" onclick={() => hudWire.setSurfacePattern(activeTarget, pat.id)} class={`px-2.5 py-1.5 border text-left text-[11px] flex items-center justify-between gap-2 cursor-pointer hud-hover-lift ${isPat ? 'border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-text)]'}`}>
						<span class="truncate">{pat.glyph} {pat.label}</span>
						<span class="text-[var(--hud-muted)] shrink-0">{pat.tileSizePx}px</span>
					</button>
				{/each}
			</div>
		</HudAccordionSection>

		<HudAccordionSection title="3. Grid, Motion & Alignment Rails" badge={`${sub.minorGridPx}px`} defaultOpen={false}>
			<label class="flex items-center justify-between gap-2 text-xs">
				<span class="text-[var(--hud-muted)]">Grid Scale</span>
				<input type="range" min="14" max="36" step="2" value={sub.minorGridPx} oninput={(e) => hudWire.setSubstrateConfig({ minorGridPx: Number((e.currentTarget as HTMLInputElement).value) })} class="w-36 accent-[var(--hud-accent-primary)]" />
				<span class="w-10 text-right tabular-nums text-[11px]">{sub.minorGridPx}px</span>
			</label>
			<div class="grid grid-cols-2 gap-2 text-xs">
				<button type="button" onclick={() => hudWire.toggleAlignmentGuides()} class={`py-1.5 px-2.5 border cursor-pointer ${hudWire.showAlignmentGuides ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-text)]'}`}>Alignment Rails (Alt+G): {hudWire.showAlignmentGuides ? 'ON' : 'OFF'}</button>
				<button type="button" data-testid="reset-dock-layout-btn" onclick={() => hudWire.resetDockLayouts()} class="py-1.5 px-2.5 border border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold cursor-pointer">Reset Dock Layout</button>
			</div>
			{#if onClose}
				<button type="button" onclick={() => { onClose(); hudWire.toggleStealth(); }} class="py-1.5 px-2.5 border border-[var(--hud-border)] text-xs text-[var(--hud-text)] flex items-center justify-between cursor-pointer"><span>{HUD_GLYPHS.STEALTH_MODE} Stealth World Mode</span><kbd class="text-[11px] px-1.5 border border-[var(--hud-border)]">Z</kbd></button>
			{/if}
		</HudAccordionSection>
	</div>
</div>
