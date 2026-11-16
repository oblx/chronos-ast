/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.6.2 HUD Event Wire: First-Paint Folded Lobby, Progressive Unfolding, Spotlight Veil & Universal Intent Bus.
 */
import { HUD_VIEWS, type HudViewMode } from '@config/constants';
import { HUD_DISCLOSURE_TIERS, HUD_MODALS, type HudDisclosureTier, type HudModalId } from '@config/hud.events';
import { HUD_INTENT_KINDS, type HudIntent, type HudParticleBurst } from '@config/hud/hud.intents';
import { DOCK_FLOAT_TOKENS, DOCK_PLACEMENT_MODES, EDGE_DRAWER_MODES, HUD_FOLD_VECTORS, HUD_MOTION, HUD_THEME_IDS, HUD_THEME_PRESETS, HUD_ZONE_VISIBILITY, HUD_ZONES, SUBSTRATE_DEFAULTS, SURFACE_PATTERN_IDS, SURFACE_PATTERNS, SURFACE_TARGETS, pickNextPolarityRandomTheme, type DockPlacementMode, type EdgeDrawerMode, type HudPerimeterZoneId, type HudThemeId, type HudZoneVisibility, type SubstrateConfig, type SurfacePatternId, type SurfaceTarget } from '@config/hud.tokens';
import { sanitizeTelemetryPayload } from '@lib/utils/log.sanitizer';
export { computeWorkspaceHealthGrade, type WorkspaceHealth } from './hud.health';

export interface HudTickerEntry { readonly id: number; readonly tag: string; readonly message: string; readonly timeLabel: string; }
export type DetachableDockId = 'LEFT_EDGE' | 'RIGHT_EDGE' | 'CANVAS_TOOLBAR';
export interface DockPlacementState { readonly mode: DockPlacementMode; readonly x: number; readonly y: number; readonly snapped: boolean; }
export type TutorialState = 'ACTIVE' | 'SKIPPED' | 'COMPLETED';
export interface HudSpotlightTarget { readonly selector?: string; readonly zone?: HudPerimeterZoneId | 'WORLD_CANVAS'; readonly title?: string; readonly description?: string; readonly stepIndex?: number; }

const DEFAULT_DOCKS: Record<DetachableDockId, DockPlacementState> = { LEFT_EDGE: { mode: DOCK_PLACEMENT_MODES.DOCKED_RAIL, x: 24, y: 96, snapped: true }, RIGHT_EDGE: { mode: DOCK_PLACEMENT_MODES.DOCKED_RAIL, x: 1120, y: 96, snapped: true }, CANVAS_TOOLBAR: { mode: DOCK_PLACEMENT_MODES.DOCKED_RAIL, x: 320, y: 92, snapped: true } };
const FOLDED_ZONES: Record<HudPerimeterZoneId, HudZoneVisibility> = { [HUD_ZONES.TOP_LEFT]: HUD_ZONE_VISIBILITY.FOLDED, [HUD_ZONES.TOP_CENTER]: HUD_ZONE_VISIBILITY.FOLDED, [HUD_ZONES.TOP_RIGHT]: HUD_ZONE_VISIBILITY.FOLDED, [HUD_ZONES.RIGHT_EDGE]: HUD_ZONE_VISIBILITY.FOLDED, [HUD_ZONES.BOTTOM_RIGHT]: HUD_ZONE_VISIBILITY.FOLDED, [HUD_ZONES.BOTTOM_CENTER]: HUD_ZONE_VISIBILITY.FOLDED, [HUD_ZONES.BOTTOM_LEFT]: HUD_ZONE_VISIBILITY.FOLDED, [HUD_ZONES.LEFT_EDGE]: HUD_ZONE_VISIBILITY.FOLDED };
const UNFOLDED_ZONES: Record<HudPerimeterZoneId, HudZoneVisibility> = { [HUD_ZONES.TOP_LEFT]: HUD_ZONE_VISIBILITY.OPEN, [HUD_ZONES.TOP_CENTER]: HUD_ZONE_VISIBILITY.OPEN, [HUD_ZONES.TOP_RIGHT]: HUD_ZONE_VISIBILITY.OPEN, [HUD_ZONES.RIGHT_EDGE]: HUD_ZONE_VISIBILITY.COMPACT, [HUD_ZONES.BOTTOM_RIGHT]: HUD_ZONE_VISIBILITY.OPEN, [HUD_ZONES.BOTTOM_CENTER]: HUD_ZONE_VISIBILITY.OPEN, [HUD_ZONES.BOTTOM_LEFT]: HUD_ZONE_VISIBILITY.OPEN, [HUD_ZONES.LEFT_EDGE]: HUD_ZONE_VISIBILITY.COMPACT };
const TOKEN_CSS: Record<string, string> = { bgCanvas: '--hud-bg', bgPanel: '--hud-panel', bgSurface: '--hud-surface', borderHairline: '--hud-border', textPrimary: '--hud-text', textMuted: '--hud-muted', accentPrimary: '--hud-accent-primary', accentSecondary: '--hud-accent-secondary', statusNominal: '--hud-nominal', statusWarning: '--hud-warning', statusDanger: '--hud-danger', gridLine: '--hud-grid', syntaxKeyword: '--syntax-keyword', syntaxControl: '--syntax-control', syntaxType: '--syntax-type', syntaxFn: '--syntax-fn', syntaxString: '--syntax-string', syntaxNumber: '--syntax-number', syntaxComment: '--syntax-comment', syntaxOperator: '--syntax-operator' };
let nextSeq = 1;

class ChronosHudWire {
	zoneStates = $state<Record<HudPerimeterZoneId, HudZoneVisibility>>({ ...FOLDED_ZONES });
	dockPlacements = $state<Record<DetachableDockId, DockPlacementState>>({ ...DEFAULT_DOCKS });
	edgeDrawerMode = $state<EdgeDrawerMode>(EDGE_DRAWER_MODES.OVERLAY_HOVER);
	fontLigatures = $state<boolean>(true); codeFontSizePx = $state<number>(13); butterflyMaxHops = $state<number>(1);
	tourActive = $state<boolean>(false); tutorialStep = $state<number>(1); tutorialCompleted = $state<boolean>(false); tutorialMinimized = $state<boolean>(false); tutorialState = $state<TutorialState>('SKIPPED');
	spotlightTarget = $state<HudSpotlightTarget | null>(null);
	activeCommunitySlug = $state<string>(''); isStealthMode = $state<boolean>(false); compactMenuOpen = $state<boolean>(false);
	activeModal = $state<HudModalId>(HUD_MODALS.AUTH_LOBBY); activeView = $state<HudViewMode>(HUD_VIEWS.BUTTERFLY);
	activeThemeId = $state<HudThemeId>(HUD_THEME_IDS.OBSIDIAN_CYBER); lastDarkThemeId = $state<HudThemeId>(HUD_THEME_IDS.OBSIDIAN_CYBER); lastLightThemeId = $state<HudThemeId>(HUD_THEME_IDS.PAPER_ARCHITECT);
	disclosureTier = $state<HudDisclosureTier>(HUD_DISCLOSURE_TIERS.TIER_1_VERDICT); canvasResetNonce = $state<number>(0);
	radarZoom = $state<number>(1); radarHotspotsOnly = $state<boolean>(false); radarSweepActive = $state<boolean>(true);
	compareDrawerOpen = $state<boolean>(false); particleBursts = $state.raw<HudParticleBurst[]>([]); lastIntent = $state.raw<HudIntent | null>(null);
	showAlignmentGuides = $state<boolean>(false); kineticMotionEnabled = $state<boolean>(true); aiPromptDraft = $state<string>('');
	surfacePatterns = $state<Record<Exclude<SurfaceTarget, 'ALL'>, SurfacePatternId>>({ SUBSTRATE: SURFACE_PATTERN_IDS.ARCHITECTURAL_BLUEPRINT, DOCKS: SURFACE_PATTERN_IDS.DIAGONAL_MICRO_HATCH, MODALS: SURFACE_PATTERN_IDS.TOPOGRAPHIC_CONTOUR });
	surfaceOpacity = $state<number>(0.55); surfaceScale = $state<number>(1); substrateConfig = $state<SubstrateConfig>({ ...SUBSTRATE_DEFAULTS });
	requestedExportFormat = $state<string>(''); mermaidDraftDsl = $state<string>('');
	eventLog = $state<readonly HudTickerEntry[]>([{ id: 0, tag: 'BOOT', message: '11-Zone Tactical HUD ready (Tab/Z Stealth · Alt+G Rails)', timeLabel: '00:00' }]);

	setSpotlight(t: HudSpotlightTarget | null): void { this.spotlightTarget = t; this.dispatchIntent({ intentKind: t ? HUD_INTENT_KINDS.HUD_SPOTLIGHT_SET : HUD_INTENT_KINDS.HUD_SPOTLIGHT_CLEAR, sourceZone: HUD_ZONES.WORLD_CANVAS, payload: t as unknown as Record<string, unknown> }); }
	clearSpotlight(): void { this.setSpotlight(null); }
	triggerParticleBurst(x: number, y: number, tone: HudParticleBurst['tone'] = 'accent'): void { this.particleBursts = [...this.particleBursts.slice(-6), { id: nextSeq++, x: Math.round(x), y: Math.round(y), tone }]; }
	clearParticleBurst(id: number): void { this.particleBursts = this.particleBursts.filter((b) => b.id !== id); }
	dispatchIntent(intent: Omit<HudIntent, 'timestamp'>): HudIntent {
		const full: HudIntent = { ...intent, timestamp: Date.now() }; this.lastIntent = full;
		if (full.intentKind === HUD_INTENT_KINDS.RADAR_ZOOM_IN) this.radarZoom = Number(Math.min(2.5, this.radarZoom + 0.25).toFixed(2));
		else if (full.intentKind === HUD_INTENT_KINDS.RADAR_ZOOM_OUT) this.radarZoom = Number(Math.max(0.5, this.radarZoom - 0.25).toFixed(2));
		else if (full.intentKind === HUD_INTENT_KINDS.RADAR_FIT_WORLD) { this.radarZoom = 1; this.triggerCanvasRecenter(); }
		else if (full.intentKind === HUD_INTENT_KINDS.RADAR_FILTER_HOTSPOTS) this.radarHotspotsOnly = !this.radarHotspotsOnly;
		else if (full.intentKind === HUD_INTENT_KINDS.RADAR_TOGGLE_SWEEP) this.radarSweepActive = !this.radarSweepActive;
		else if (full.intentKind === HUD_INTENT_KINDS.COMPARE_TOGGLE_DRAWER) this.compareDrawerOpen = !this.compareDrawerOpen;
		else if (full.intentKind === HUD_INTENT_KINDS.VIEW_SWITCH && typeof full.targetId === 'string') this.selectView(full.targetId as HudViewMode);
		else if (full.intentKind === HUD_INTENT_KINDS.MODAL_OPEN && typeof full.targetId === 'string') this.openModal(full.targetId as HudModalId);
		return full;
	}
	revealZone(...zones: HudPerimeterZoneId[]): void {
		const next = { ...this.zoneStates };
		for (const z of zones) next[z] = z === HUD_ZONES.LEFT_EDGE || z === HUD_ZONES.RIGHT_EDGE ? HUD_ZONE_VISIBILITY.COMPACT : HUD_ZONE_VISIBILITY.OPEN;
		this.zoneStates = next; this.dispatchIntent({ intentKind: HUD_INTENT_KINDS.HUD_REVEAL_ZONE, sourceZone: HUD_ZONES.WORLD_CANVAS, targetId: zones.join(',') });
		this.pushTicker('REVEAL', `HUD_REVEAL_ZONE → ${zones.join(', ')}`);
	}
	startInteractiveTour(): void {
		this.zoneStates = { ...FOLDED_ZONES, [HUD_ZONES.TOP_LEFT]: HUD_ZONE_VISIBILITY.OPEN };
		this.tourActive = true; this.tutorialStep = 1; this.tutorialCompleted = false; this.tutorialState = 'ACTIVE';
		this.activeModal = HUD_MODALS.NONE; this.selectView(HUD_VIEWS.BUTTERFLY); this.pushTicker('TOUR', 'Started 30s Progressive HUD Tour (Step 1/5)');
		this.setSpotlight({ zone: 'WORLD_CANVAS', title: 'World Graph Canvas', description: 'Interactive multi-dimensional AST, call-graphs, and treemaps with zero-CLS pan and zoom.', stepIndex: 1 });
	}
	resumeTour(step?: number): void { this.tutorialState = 'ACTIVE'; this.tourActive = true; this.tutorialCompleted = false; this.activeModal = HUD_MODALS.NONE; this.advanceTourStep(step ?? this.tutorialStep); }
	advanceTourStep(nextStep?: number, targetView?: HudViewMode): void {
		const step = Math.max(1, Math.min(5, nextStep ?? this.tutorialStep + 1));
		this.tutorialStep = step; this.tourActive = true; this.tutorialState = 'ACTIVE'; if (targetView) this.selectView(targetView);
		this.dispatchIntent({ intentKind: HUD_INTENT_KINDS.TOUR_STEP_ADVANCE, sourceZone: HUD_ZONES.WORLD_CANVAS, targetId: step });
		if (step === 1) { this.revealZone(HUD_ZONES.TOP_LEFT); this.setSpotlight({ zone: 'WORLD_CANVAS', title: 'World Graph Canvas', description: 'Interactive multi-dimensional AST, call-graphs, and treemaps with zero-CLS pan and zoom.', stepIndex: 1 }); }
		if (step >= 2) { this.revealZone(HUD_ZONES.TOP_CENTER); if (step === 2) this.setSpotlight({ zone: HUD_ZONES.TOP_CENTER, selector: '[data-zone="TOP_CENTER"]', title: 'Projection Crown', description: '9 architectural projections: Codemap, Butterfly, DFG, CFG, Treemap, DSM, UML, Mermaid, and Source.', stepIndex: 2 }); }
		if (step >= 3) { this.revealZone(HUD_ZONES.BOTTOM_RIGHT); if (step === 3) this.setSpotlight({ zone: HUD_ZONES.BOTTOM_RIGHT, selector: '[data-zone="BOTTOM_RIGHT"]', title: 'Bento Tactical Radar', description: 'Structural hotspot telemetry, sweep scanner, and universal camera centering.', stepIndex: 3 }); }
		if (step >= 4) { this.revealZone(HUD_ZONES.LEFT_EDGE, HUD_ZONES.RIGHT_EDGE); if (step === 4) this.setSpotlight({ zone: HUD_ZONES.LEFT_EDGE, selector: '[data-zone="LEFT_EDGE"]', title: 'Persistent Edge Rails', description: 'Hierarchical symbols, metrics, and file layers inside chamfered drawers.', stepIndex: 4 }); }
		if (step >= 5) { this.revealZone(HUD_ZONES.TOP_LEFT, HUD_ZONES.TOP_RIGHT); if (step === 5) this.setSpotlight({ zone: HUD_ZONES.TOP_RIGHT, selector: '[data-zone="TOP_RIGHT"]', title: 'Telemetry & Latency Pod', description: 'Real-time worker parse latency and benchmarks.', stepIndex: 5 }); }
	}
	completeTourAndOpenAuth(): void { this.tutorialCompleted = true; this.tourActive = false; this.tutorialState = 'COMPLETED'; this.clearSpotlight(); this.openModal(HUD_MODALS.AUTH_LOBBY); }
	unfoldPermittedHudZones(): void {
		this.activeModal = HUD_MODALS.NONE; this.tourActive = false; this.tutorialCompleted = true; this.tutorialState = 'SKIPPED';
		this.clearSpotlight(); this.zoneStates = { ...UNFOLDED_ZONES }; this.pushTicker('TOUR', 'HUD_REVEAL_ZONE: Unfolded permitted perimeter zones');
	}
	skipTourAndUnfoldHud(): void { this.unfoldPermittedHudZones(); }
	unfoldAllZonesForPrincipal(isGuest: boolean): void { this.unfoldPermittedHudZones(); if (!isGuest) this.tutorialCompleted = true; }
	requestExport(format: string): void { this.requestedExportFormat = format; }
	openMermaidWithDsl(dsl: string): void { this.mermaidDraftDsl = dsl; this.selectView(HUD_VIEWS.MERMAID); }
	prefillAiPrompt(prompt: string): void { this.aiPromptDraft = prompt; }
	toggleStealth(): void { this.isStealthMode = !this.isStealthMode; this.pushTicker('HUD', this.isStealthMode ? 'Stealth World Mode engaged' : 'Perimeter HUD restored'); }
	toggleCompactMenu(force?: boolean): void { this.compactMenuOpen = force ?? !this.compactMenuOpen; }
	setZoneVisibility(zone: HudPerimeterZoneId, next: HudZoneVisibility): void { this.zoneStates = { ...this.zoneStates, [zone]: next }; }
	toggleEdgeZone(zone: typeof HUD_ZONES.LEFT_EDGE | typeof HUD_ZONES.RIGHT_EDGE): void { this.setZoneVisibility(zone, this.zoneStates[zone] === HUD_ZONE_VISIBILITY.OPEN ? HUD_ZONE_VISIBILITY.COMPACT : HUD_ZONE_VISIBILITY.OPEN); }
	setEdgeDrawerMode(mode: EdgeDrawerMode): void { this.edgeDrawerMode = mode; this.pushTicker('EDGE', `Edge drawer expansion → ${mode}`); }
	setFontLigatures(enabled: boolean): void { this.fontLigatures = enabled; if (typeof document === 'undefined') return; document.documentElement.style.setProperty('--hud-font-ligatures', enabled ? 'contextual' : 'none'); document.documentElement.style.setProperty('--hud-font-features', enabled ? '"calt" 1, "liga" 1' : '"calt" 0, "liga" 0'); }
	setCodeFontSize(px: number): void { this.codeFontSizePx = Math.max(12, Math.min(16, Math.round(px))); if (typeof document !== 'undefined') document.documentElement.style.setProperty('--hud-code-size', `${this.codeFontSizePx}px`); }
	setButterflyMaxHops(hops: number): void { this.butterflyMaxHops = Math.max(1, Math.min(3, Math.round(hops))); }
	advanceTutorialStep(nextStep?: number): void { this.advanceTourStep(nextStep); }
	toggleTutorialMinimized(): void { this.tutorialMinimized = !this.tutorialMinimized; }
	resetTutorialQuest(): void { this.startInteractiveTour(); }
	toggleDockFloat(dock: DetachableDockId): void { const cur = this.dockPlacements[dock], nextMode = cur.mode === DOCK_PLACEMENT_MODES.DOCKED_RAIL ? DOCK_PLACEMENT_MODES.FLOATING_PANEL : DOCK_PLACEMENT_MODES.DOCKED_RAIL; this.dockPlacements = { ...this.dockPlacements, [dock]: { ...cur, mode: nextMode, snapped: nextMode === DOCK_PLACEMENT_MODES.DOCKED_RAIL } }; this.pushTicker('DOCK', `${dock} → ${nextMode}`); }
	moveFloatingDock(dock: DetachableDockId, rawX: number, rawY: number, vw = 1440, vh = 900): void {
		const m = DOCK_FLOAT_TOKENS.VIEWPORT_CLAMP_MARGIN_PX, s = DOCK_FLOAT_TOKENS.SNAP_THRESHOLD_PX, x = Math.max(m, Math.min(vw - 260, Math.round(rawX))), y = Math.max(m + 68, Math.min(vh - 180, Math.round(rawY)));
		const snapped = (dock === 'LEFT_EDGE' && x <= m + s) || (dock === 'RIGHT_EDGE' && x >= vw - 320 - s);
		this.dockPlacements = { ...this.dockPlacements, [dock]: { mode: snapped ? DOCK_PLACEMENT_MODES.DOCKED_RAIL : DOCK_PLACEMENT_MODES.FLOATING_PANEL, x, y, snapped } };
	}
	resetDockLayouts(): void { this.dockPlacements = { ...DEFAULT_DOCKS }; this.pushTicker('DOCK', 'All detachable docks reset to perimeter rails'); }
	openModal(modal: HudModalId): void { this.activeModal = modal; this.compactMenuOpen = false; }
	closeModal(): void {
		if (this.activeModal === HUD_MODALS.AUTH_LOBBY) { this.unfoldPermittedHudZones(); return; }
		this.activeModal = HUD_MODALS.NONE;
	}
	selectView(view: HudViewMode): void { this.activeView = view; this.pushTicker('VIEW', `Projection switched to ${view}`); }
	setTheme(themeId: HudThemeId): void {
		this.activeThemeId = themeId; this.activeCommunitySlug = ''; const preset = HUD_THEME_PRESETS[themeId];
		if (preset.polarity === 'DARK') this.lastDarkThemeId = themeId; else this.lastLightThemeId = themeId;
		if (typeof document !== 'undefined') { for (const v of [...Object.values(TOKEN_CSS), '--hud-accent', '--hud-brass']) document.documentElement.style.removeProperty(v); document.documentElement.setAttribute('data-hud-theme', themeId); document.documentElement.classList.toggle('dark', preset.polarity === 'DARK'); }
		this.pushTicker('THEME', `HUD_THEME_CHANGED: ${preset.label} (${preset.polarity})`);
	}
	applyCommunityThemeTokens(slug: string, label: string, polarity: 'DARK' | 'LIGHT', tokens: Record<string, string | number>): void {
		this.activeCommunitySlug = slug;
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', polarity === 'DARK');
			for (const [k, cssVar] of Object.entries(TOKEN_CSS)) if (typeof tokens[k] === 'string') document.documentElement.style.setProperty(cssVar, String(tokens[k]));
			if (typeof tokens.accentPrimary === 'string') document.documentElement.style.setProperty('--hud-accent', String(tokens.accentPrimary));
			if (typeof tokens.accentSecondary === 'string') document.documentElement.style.setProperty('--hud-brass', String(tokens.accentSecondary));
		}
		this.pushTicker('THEME', `Applied community theme: ${label} (${polarity})`);
	}
	randomizePolarityTheme(): HudThemeId { const nextId = pickNextPolarityRandomTheme(this.activeThemeId, HUD_THEME_PRESETS[this.activeThemeId].polarity === 'DARK' ? this.lastLightThemeId : this.lastDarkThemeId); this.setTheme(nextId); return nextId; }
	setSurfacePattern(target: SurfaceTarget, patternId: SurfacePatternId, opacity?: number, scale?: number): void { this.surfacePatterns = target === SURFACE_TARGETS.ALL ? { SUBSTRATE: patternId, DOCKS: patternId, MODALS: patternId } : { ...this.surfacePatterns, [target]: patternId }; if (opacity !== undefined) this.surfaceOpacity = opacity; if (scale !== undefined) this.surfaceScale = scale; this.pushTicker('SURFACE', `${target} → ${SURFACE_PATTERNS[patternId].label}`); }
	setSubstrateConfig(patch: Partial<SubstrateConfig>): void { this.substrateConfig = { ...this.substrateConfig, ...patch }; if (patch.minorGridPx !== undefined) this.surfaceScale = Number((patch.minorGridPx / SUBSTRATE_DEFAULTS.minorGridPx).toFixed(2)); this.pushTicker('SUBSTRATE', `HUD_SET_SUBSTRATE_CONFIG (${Object.keys(patch).join(', ')})`); }
	toggleAlignmentGuides(): void { this.showAlignmentGuides = !this.showAlignmentGuides; this.pushTicker('RAILS', this.showAlignmentGuides ? 'Harmonic alignment rails visible (Alt+G)' : 'Alignment rails hidden'); }
	toggleKineticMotion(): void { this.kineticMotionEnabled = !this.kineticMotionEnabled; this.pushTicker('MOTION', this.kineticMotionEnabled ? 'Kinetic micro-animations active' : 'Reduced motion mode'); }
	setDisclosureTier(tier: HudDisclosureTier): void { this.disclosureTier = tier; }
	triggerCanvasRecenter(): void { this.canvasResetNonce += 1; this.pushTicker('CAM', 'Viewport camera re-centered'); }
	pushTicker(tag: string, message: string): void { const now = new Date(), timeLabel = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`; this.eventLog = [{ id: nextSeq++, tag, message: sanitizeTelemetryPayload(message), timeLabel }, ...this.eventLog].slice(0, HUD_MOTION.TICKER_MAX_ITEMS); }
	isZoneFolded(zone: HudPerimeterZoneId): boolean { return this.isStealthMode || this.zoneStates[zone] === HUD_ZONE_VISIBILITY.FOLDED; }
	zoneStyle(zone: HudPerimeterZoneId): string {
		if (this.isZoneFolded(zone)) return `transform: ${HUD_FOLD_VECTORS[zone]}; opacity: 0; pointer-events: none;`;
		const delays: Partial<Record<HudPerimeterZoneId, number>> = { [HUD_ZONES.TOP_LEFT]: 0, [HUD_ZONES.TOP_CENTER]: 30, [HUD_ZONES.TOP_RIGHT]: 60, [HUD_ZONES.RIGHT_EDGE]: 90, [HUD_ZONES.BOTTOM_RIGHT]: 120, [HUD_ZONES.BOTTOM_CENTER]: 150, [HUD_ZONES.BOTTOM_LEFT]: 180, [HUD_ZONES.LEFT_EDGE]: 210 };
		const baseTransform = zone === HUD_ZONES.LEFT_EDGE || zone === HUD_ZONES.RIGHT_EDGE ? 'translate3d(0, -50%, 0)' : 'translate3d(0, 0, 0)';
		return `transform: ${baseTransform}; opacity: 1; transition-delay: ${delays[zone] ?? 0}ms;`;
	}
}

export const hudWire = new ChronosHudWire();
