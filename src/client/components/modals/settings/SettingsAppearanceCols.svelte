<!--
	@author Oblx <code@oblx.dev>
	@description Settings Tab 1 (Appearance & Accessibility): Horizontal Bento Deck with Hull Corner Style, Font Scale, WCAG Contrast, Edge Drawers, Surface Layers & Theme Gallery (v1.9.7).
-->
<script lang="ts">
	import { API_ROUTES } from '@config/constants';
	import {
		CORNER_STYLES, EDGE_DRAWER_MODES, FONT_SCALE_OPTIONS, HUD_GLYPHS, HUD_INTENT_KINDS, HUD_THEME_PRESETS, SURFACE_PATTERNS, SURFACE_TARGETS,
		type CornerVertex, type FontScalePct, type HudThemeId, type SurfacePatternId, type SurfaceTarget,
	} from '@config/hud.tokens';
	import { UiHorizontalDeck } from '@ui';
	import { clientDagKernel } from '@client/state/dag/client.kernel.svelte';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import HudIcon from '@client/components/atoms/HudIcon.svelte';
	import ThemeMarketplacePanel from '@client/components/modals/settings/ThemeMarketplacePanel.svelte';

	interface Props { onClose?: () => void; }
	let { onClose }: Props = $props();

	let activeTarget = $state<SurfaceTarget>(SURFACE_TARGETS.SUBSTRATE);
	const themeList = Object.values(HUD_THEME_PRESETS);
	const patternList = Object.values(SURFACE_PATTERNS);
	const targetList: readonly SurfaceTarget[] = [SURFACE_TARGETS.SUBSTRATE, SURFACE_TARGETS.DOCKS, SURFACE_TARGETS.MODALS, SURFACE_TARGETS.ALL];

	let activeTheme = $derived(HUD_THEME_PRESETS[hudWire.activeThemeId]);
	let currentPatternForTarget = $derived<SurfacePatternId>(
		activeTarget === SURFACE_TARGETS.ALL ? hudWire.surfacePatterns.SUBSTRATE : hudWire.surfacePatterns[activeTarget]
	);

	function persistPreference(patch: Record<string, unknown>, intentKind: string): void {
		void clientDagKernel.requestJson(API_ROUTES.USER_PREFERENCES, { method: 'POST', body: patch, sourceZone: 'APP_MODAL', intentKind });
	}
	function selectCornerStyle(style: CornerVertex): void { hudWire.setCornerStyle(style); persistPreference({ cornerStyle: style }, 'SET_CORNER_STYLE'); }
	function selectFontScale(pct: FontScalePct): void { hudWire.setFontScalePct(pct); persistPreference({ fontScalePct: pct }, 'SET_FONT_SCALE'); }
	function toggleHighContrast(): void { const next = !hudWire.highContrastMode; hudWire.setHighContrastMode(next); persistPreference({ highContrastMode: next }, 'SET_HIGH_CONTRAST'); }
	function toggleDyslexiaFont(): void { const next = !hudWire.dyslexiaFriendlyFont; hudWire.setDyslexiaFriendlyFont(next); persistPreference({ dyslexiaFriendlyFont: next }, 'SET_DYSLEXIA_FONT'); }
	function toggleKinetic(): void { hudWire.toggleKineticMotion(); persistPreference({ kineticMotionEnabled: hudWire.kineticMotionEnabled }, 'SET_KINETIC_MOTION'); }
	function selectSurfaceTarget(tgt: SurfaceTarget): void { activeTarget = tgt; hudWire.emitUiIntent(HUD_INTENT_KINDS.UI_TAB_SWITCH, 'APP_MODAL', { modal: 'SETTINGS_SURFACE', target: tgt }); }
</script>

<UiHorizontalDeck testid="settings-visuals-deck" ariaLabel="Appearance and Accessibility Bento Cards" showSteppers={true} className="items-stretch font-mono">
	<section aria-label="Theme and Polarity" class="shrink-0 w-[21rem] h-[22rem] snap-start flex flex-col justify-between gap-2 p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/65">
		<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
			<h3 class="text-xs font-bold uppercase tracking-[0.12em] text-[var(--hud-accent-secondary)]">{HUD_GLYPHS.POLARITY_SPLIT} Theme Swatches</h3>
			<span class="text-[0.6875rem] text-[var(--hud-muted)]">{activeTheme.polarity}</span>
		</div>
		<button type="button" onclick={() => hudWire.randomizePolarityTheme()} class="px-3 py-1.5 border border-[var(--hud-accent-secondary)] hud-z1-entity hud-glint-trigger text-xs flex items-center justify-between cursor-pointer">
			<span class="flex items-center gap-1.5 font-bold text-[var(--hud-accent-secondary)]">
				{#if activeTheme.polarity === 'DARK'}<HudIcon name="sun" className="text-xs" />{:else}<HudIcon name="moon" className="text-xs" />{/if}
				Flip Polarity Random
			</span>
			<span class="text-[0.6875rem] text-[var(--hud-muted)]">{activeTheme.polarity}</span>
		</button>
		<div class="grid grid-cols-2 gap-1.5 flex-1 content-start">
			{#each themeList as preset (preset.id)}
				{@const isSelected = preset.id === hudWire.activeThemeId && !hudWire.activeCommunitySlug}
				<button type="button" onclick={() => hudWire.setTheme(preset.id as HudThemeId)} class={`p-2 border text-left text-xs flex flex-col gap-0.5 cursor-pointer hud-hover-lift ${isSelected ? 'border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-text)]'}`}>
					<span class="truncate">{preset.label}</span>
					<span class="text-[0.6875rem] text-[var(--hud-muted)] flex items-center justify-between"><span>{preset.polarity}</span><span>{preset.polarity === 'DARK' ? HUD_GLYPHS.MOON_DARK : HUD_GLYPHS.SUN_LIGHT}</span></span>
				</button>
			{/each}
		</div>
	</section>

	<section aria-label="Hull Geometry and Accessibility" class="shrink-0 w-[23rem] h-[22rem] snap-start flex flex-col justify-between gap-2 p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/65 text-[0.6875rem]">
		<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
			<h3 class="text-xs font-bold uppercase tracking-[0.12em] text-[var(--hud-accent-secondary)]">Hull &amp; WCAG A11y</h3>
			<span class="text-[var(--hud-muted)]">{hudWire.cornerStyle} · {hudWire.fontScalePct}%</span>
		</div>
		<div class="flex flex-col gap-2 flex-1 justify-center">
			<div class="grid grid-cols-2 gap-2">
				<button type="button" data-testid="corner-style-chamfer" aria-pressed={hudWire.cornerStyle === CORNER_STYLES.CHAMFER} onclick={() => selectCornerStyle(CORNER_STYLES.CHAMFER)} class={`py-2 px-2 border cursor-pointer ${hudWire.cornerStyle === CORNER_STYLES.CHAMFER ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] bg-[var(--hud-surface)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Corners: CHAMFER (45°)</button>
				<button type="button" data-testid="corner-style-straight" aria-pressed={hudWire.cornerStyle === CORNER_STYLES.STRAIGHT} onclick={() => selectCornerStyle(CORNER_STYLES.STRAIGHT)} class={`py-2 px-2 border cursor-pointer ${hudWire.cornerStyle === CORNER_STYLES.STRAIGHT ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] bg-[var(--hud-surface)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Corners: STRAIGHT (90°)</button>
			</div>
			<div class="grid grid-cols-4 gap-1.5" role="group" aria-label="UI Font Scale">
				{#each FONT_SCALE_OPTIONS as pct (pct)}
					<button type="button" data-testid={`font-scale-${pct}`} aria-pressed={hudWire.fontScalePct === pct} onclick={() => selectFontScale(pct)} class={`py-1.5 px-1 border cursor-pointer tabular-nums ${hudWire.fontScalePct === pct ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] bg-[var(--hud-surface)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Scale {pct}%</button>
				{/each}
			</div>
			<div class="grid grid-cols-1 gap-1.5">
				<button type="button" data-testid="high-contrast-toggle" aria-pressed={hudWire.highContrastMode} onclick={toggleHighContrast} class={`py-1.5 px-2 border cursor-pointer text-left flex justify-between ${hudWire.highContrastMode ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}><span>WCAG Contrast</span><span>{hudWire.highContrastMode ? 'AAA' : 'STD'}</span></button>
				<button type="button" data-testid="kinetic-motion-toggle" aria-pressed={hudWire.kineticMotionEnabled} onclick={toggleKinetic} class={`py-1.5 px-2 border cursor-pointer text-left flex justify-between ${hudWire.kineticMotionEnabled ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}><span>Kinetic Motion</span><span>{hudWire.kineticMotionEnabled ? 'KINETIC' : 'REDUCED'}</span></button>
				<button type="button" data-testid="dyslexia-font-toggle" aria-pressed={hudWire.dyslexiaFriendlyFont} onclick={toggleDyslexiaFont} class={`py-1.5 px-2 border cursor-pointer text-left flex justify-between ${hudWire.dyslexiaFriendlyFont ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}><span>Dyslexia Spacing</span><span>{hudWire.dyslexiaFriendlyFont ? 'ON' : 'OFF'}</span></button>
			</div>
		</div>
	</section>

	<section aria-label="Edge Drawers and Code Typography" class="shrink-0 w-[21rem] h-[22rem] snap-start flex flex-col justify-between gap-2 p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/65 text-[0.6875rem]">
		<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
			<h3 class="text-xs font-bold uppercase tracking-[0.12em] text-[var(--hud-accent-secondary)]">Drawers &amp; Typography</h3>
			<span class="text-[var(--hud-muted)]">{hudWire.edgeDrawerMode}</span>
		</div>
		<div class="flex flex-col gap-2 flex-1 justify-center">
			<button type="button" data-testid="drawer-mode-overlay" onclick={() => hudWire.setEdgeDrawerMode(EDGE_DRAWER_MODES.OVERLAY_HOVER)} class={`py-1.5 px-2 border cursor-pointer text-left ${hudWire.edgeDrawerMode === EDGE_DRAWER_MODES.OVERLAY_HOVER ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Overlay Hover (0 CLS)</button>
			<button type="button" data-testid="drawer-mode-docked" onclick={() => hudWire.setEdgeDrawerMode(EDGE_DRAWER_MODES.DOCKED_RESIZE)} class={`py-1.5 px-2 border cursor-pointer text-left ${hudWire.edgeDrawerMode === EDGE_DRAWER_MODES.DOCKED_RESIZE ? 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>Docked Resize Corridor</button>
			<button type="button" data-testid="font-ligatures-toggle" onclick={() => hudWire.setFontLigatures(!hudWire.fontLigatures)} class={`py-1.5 px-2 border cursor-pointer text-left flex justify-between ${hudWire.fontLigatures ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}><span>Fira Code Ligatures</span><span>{hudWire.fontLigatures ? 'ON' : 'OFF'}</span></button>
			<div class="flex items-center justify-between border border-[var(--hud-border)] px-2 py-1.5">
				<span class="text-[var(--hud-muted)]">Code Font Size</span>
				<div class="flex items-center gap-1.5">
					<button type="button" onclick={() => hudWire.setCodeFontSize(hudWire.codeFontSizePx - 1)} class="px-2 py-0.5 border border-[var(--hud-border)] cursor-pointer">-</button>
					<span class="tabular-nums font-bold">{hudWire.codeFontSizePx}px</span>
					<button type="button" onclick={() => hudWire.setCodeFontSize(hudWire.codeFontSizePx + 1)} class="px-2 py-0.5 border border-[var(--hud-border)] cursor-pointer">+</button>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-1.5 pt-1">
				<button type="button" onclick={() => hudWire.toggleAlignmentGuides()} class={`py-1.5 px-2 border cursor-pointer ${hudWire.showAlignmentGuides ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-text)]'}`}>Rails: {hudWire.showAlignmentGuides ? 'ON' : 'OFF'}</button>
				<button type="button" data-testid="reset-dock-layout-btn" onclick={() => hudWire.resetDockLayouts()} class="py-1.5 px-2 border border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] font-bold cursor-pointer">Reset Docks</button>
			</div>
		</div>
	</section>

	<section aria-label="Procedural Surface Layers" class="shrink-0 w-[22rem] h-[22rem] snap-start flex flex-col justify-between gap-2 p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/65 text-[0.6875rem]">
		<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
			<h3 class="text-xs font-bold uppercase tracking-[0.12em] text-[var(--hud-accent-secondary)]">Surface Layers</h3>
			<span class="text-[var(--hud-muted)]">{activeTarget}</span>
		</div>
		<div class="grid grid-cols-4 gap-1">
			{#each targetList as tgt (tgt)}
				<button type="button" onclick={() => selectSurfaceTarget(tgt)} class={`py-1 border cursor-pointer ${activeTarget === tgt ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] bg-[var(--hud-surface)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>{tgt}</button>
			{/each}
		</div>
		<div class="grid grid-cols-2 gap-1.5 flex-1 content-start overflow-y-auto">
			{#each patternList as pat (pat.id)}
				{@const isPat = currentPatternForTarget === pat.id}
				<button type="button" onclick={() => hudWire.setSurfacePattern(activeTarget, pat.id)} class={`px-2 py-1.5 border text-left flex items-center justify-between gap-1 cursor-pointer hud-hover-lift ${isPat ? 'border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-text)]'}`}>
					<span class="truncate">{pat.glyph} {pat.label}</span><span class="text-[var(--hud-muted)] shrink-0">{pat.tileSizePx}px</span>
				</button>
			{/each}
		</div>
		{#if onClose}
			<button type="button" onclick={() => { onClose(); hudWire.toggleStealth(); }} class="py-1.5 px-2.5 border border-[var(--hud-border)] text-xs text-[var(--hud-text)] flex items-center justify-between cursor-pointer shrink-0"><span>{HUD_GLYPHS.STEALTH_MODE} Stealth World Mode</span><kbd class="text-[0.6875rem] px-1.5 border border-[var(--hud-border)]">Z</kbd></button>
		{/if}
	</section>

	<section aria-label="Community Theme Gallery and Studio" class="shrink-0 w-[25rem] h-[22rem] snap-start flex flex-col min-h-0">
		<ThemeMarketplacePanel />
	</section>
</UiHorizontalDeck>
