/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.6 HUD Event Wire: Bilateral Corner Symmetry, Fluid rem Scaling, Accessibility Suite, Spotlight Machine & Pure Intent Bus.
 */
import { HUD_VIEWS, type HudViewMode } from '@config/constants';
import { HUD_DISCLOSURE_TIERS, HUD_MODALS, type HudDisclosureTier, type HudModalId } from '@config/hud.events';
import { HUD_INTENT_KINDS, type HudIntent, type HudIntentKind, type HudParticleBurst } from '@config/hud/hud.intents';
import { CORNER_STYLES, DOCK_FLOAT_TOKENS, DOCK_PLACEMENT_MODES, EDGE_DRAWER_MODES, HUD_FOLD_VECTORS, HUD_MOTION, HUD_THEME_IDS, HUD_THEME_PRESETS, HUD_ZONE_VISIBILITY, HUD_ZONES, SUBSTRATE_DEFAULTS, SURFACE_PATTERN_IDS, SURFACE_PATTERNS, SURFACE_TARGETS, pickNextPolarityRandomTheme, type CornerVertex, type EdgeDrawerMode, type FontScalePct, type HudPerimeterZoneId, type HudThemeId, type HudZoneVisibility, type SubstrateConfig, type SurfacePatternId, type SurfaceTarget } from '@config/hud.tokens';
import { sanitizeTelemetryPayload } from '@lib/utils/log.sanitizer';
import { DEFAULT_TOUR_STEPS, UI_SPOTLIGHT_TARGETS, clampRailOffsetYRem, uiSpotlightMachine } from '@ui';
import { clientDagKernel } from './dag/client.kernel.svelte';
import { DEFAULT_DOCKS, FOLDED_ZONES, TOKEN_CSS, UNFOLDED_ZONES, applyAccessibilityDomState, applyPresetDomTokens, computeWorkspaceHealthGrade, type DetachableDockId, type DockPlacementState, type LeftEdgeDrawerTab, type RightEdgeDrawerTab, type WorkspaceHealth } from './hud.health';
export { computeWorkspaceHealthGrade, type DetachableDockId, type DockPlacementState, type LeftEdgeDrawerTab, type RightEdgeDrawerTab, type WorkspaceHealth };

export interface HudTickerEntry { readonly id: number; readonly tag: string; readonly message: string; readonly timeLabel: string; }
export type TutorialState = 'ACTIVE' | 'SKIPPED' | 'COMPLETED';
export interface HudSpotlightTarget { readonly selector?: string; readonly zone?: HudPerimeterZoneId | 'WORLD_CANVAS'; readonly title?: string; readonly description?: string; readonly stepIndex?: number; }
let nextSeq = 1;
class ChronosHudWire {
	zoneStates = $state<Record<HudPerimeterZoneId, HudZoneVisibility>>({ ...FOLDED_ZONES });
	dockPlacements = $state<Record<DetachableDockId, DockPlacementState>>({ ...DEFAULT_DOCKS });
	edgeDrawerMode = $state<EdgeDrawerMode>(EDGE_DRAWER_MODES.OVERLAY_HOVER); cornerStyle = $state<CornerVertex>(CORNER_STYLES.CHAMFER);
	fontScalePct = $state<FontScalePct>(100); highContrastMode = $state<boolean>(false); dyslexiaFriendlyFont = $state<boolean>(false);
	fontLigatures = $state<boolean>(true); codeFontSizePx = $state<number>(13); butterflyMaxHops = $state<number>(1);
	leftEdgeActiveTab = $state<LeftEdgeDrawerTab>('EXPLORER'); leftEdgeKindFilter = $state<string>('ALL'); rightEdgeActiveTab = $state<RightEdgeDrawerTab>('VERDICT');
	tourActive = $state<boolean>(false); tutorialStep = $state<number>(1); tutorialCompleted = $state<boolean>(false); tutorialMinimized = $state<boolean>(false); tutorialState = $state<TutorialState>('SKIPPED');
	spotlightTarget = $state<HudSpotlightTarget | null>(null); activeCommunitySlug = $state<string>(''); isStealthMode = $state<boolean>(false); compactMenuOpen = $state<boolean>(false);
	activeModal = $state<HudModalId>(HUD_MODALS.AUTH_LOBBY); activeView = $state<HudViewMode>(HUD_VIEWS.BUTTERFLY);
	activeThemeId = $state<HudThemeId>(HUD_THEME_IDS.OBSIDIAN_CYBER); lastDarkThemeId = $state<HudThemeId>(HUD_THEME_IDS.OBSIDIAN_CYBER); lastLightThemeId = $state<HudThemeId>(HUD_THEME_IDS.PAPER_ARCHITECT);
	disclosureTier = $state<HudDisclosureTier>(HUD_DISCLOSURE_TIERS.TIER_1_VERDICT); canvasResetNonce = $state<number>(0);
	radarZoom = $state<number>(1); radarHotspotsOnly = $state<boolean>(false); radarSweepActive = $state<boolean>(true);
	compareDrawerOpen = $state<boolean>(false); particleBursts = $state.raw<HudParticleBurst[]>([]); lastIntent = $state.raw<HudIntent | null>(null);
	showAlignmentGuides = $state<boolean>(false); kineticMotionEnabled = $state<boolean>(true); aiPromptDraft = $state<string>('');
	surfacePatterns = $state<Record<Exclude<SurfaceTarget, 'ALL'>, SurfacePatternId>>({ SUBSTRATE: SURFACE_PATTERN_IDS.ARCHITECTURAL_BLUEPRINT, DOCKS: SURFACE_PATTERN_IDS.DIAGONAL_MICRO_HATCH, MODALS: SURFACE_PATTERN_IDS.TOPOGRAPHIC_CONTOUR });
	surfaceOpacity = $state<number>(0.55); surfaceScale = $state<number>(1); substrateConfig = $state<SubstrateConfig>({ ...SUBSTRATE_DEFAULTS });
	requestedExportFormat = $state<string>(''); mermaidDraftDsl = $state<string>('');
	helpTargetRequest = $state<{ readonly chapterId: string; readonly stepIdx: number; readonly nonce: number } | null>(null);
	eventLog = $state<readonly HudTickerEntry[]>([{ id: 0, tag: 'BOOT', message: '11-Zone Tactical HUD ready (Tab/Z Stealth · Alt+G Rails)', timeLabel: '00:00' }]);

	setSpotlight(t: HudSpotlightTarget | null): void {
		this.spotlightTarget = t;
		if (!t) uiSpotlightMachine.stopTour();
		else if (t.stepIndex && t.stepIndex >= 1 && t.stepIndex <= 5) uiSpotlightMachine.setStep(t.stepIndex);
		else uiSpotlightMachine.spotlightCustom({ stepIndex: t.stepIndex ?? 1, totalSteps: 5, targetIds: [t.zone === HUD_ZONES.TOP_CENTER ? UI_SPOTLIGHT_TARGETS.TOP_CENTER_CROWN : t.zone === HUD_ZONES.LEFT_EDGE ? UI_SPOTLIGHT_TARGETS.LEFT_EDGE_RAIL : t.zone === HUD_ZONES.RIGHT_EDGE ? UI_SPOTLIGHT_TARGETS.RIGHT_EDGE_RAIL : t.zone === HUD_ZONES.BOTTOM_CENTER ? UI_SPOTLIGHT_TARGETS.BOTTOM_CENTER_DECK : t.zone === HUD_ZONES.BOTTOM_RIGHT ? UI_SPOTLIGHT_TARGETS.BOTTOM_RIGHT_RADAR : UI_SPOTLIGHT_TARGETS.WORLD_CANVAS], title: t.title ?? 'HUD Spotlight', description: t.description ?? '' });
		if (t && typeof queueMicrotask === 'function') queueMicrotask(() => uiSpotlightMachine.recomputeRects());
		this.dispatchIntent({ intentKind: t ? HUD_INTENT_KINDS.HUD_SPOTLIGHT_SET : HUD_INTENT_KINDS.HUD_SPOTLIGHT_CLEAR, sourceZone: HUD_ZONES.WORLD_CANVAS, payload: t as unknown as Record<string, unknown> });
	}
	clearSpotlight(): void { this.setSpotlight(null); }
	triggerParticleBurst(x: number, y: number, tone: HudParticleBurst['tone'] = 'accent'): void { this.particleBursts = [...this.particleBursts.slice(-6), { id: nextSeq++, x: Math.round(x), y: Math.round(y), tone }]; }
	clearParticleBurst(id: number): void { this.particleBursts = this.particleBursts.filter((b) => b.id !== id); }
	emitUiIntent(intentKind: HudIntentKind, sourceZone: HudIntent['sourceZone'], payload: Record<string, unknown> = {}, targetId?: string | number): void {
		this.lastIntent = { intentKind, sourceZone, targetId, payload, timestamp: Date.now() };
		clientDagKernel.dispatch({ intentKind, sourceZone: String(sourceZone), payload: targetId !== undefined ? { ...payload, targetId } : payload });
	}
	private emitDag(intentKind: HudIntentKind, sourceZone: HudIntent['sourceZone'], payload: Record<string, unknown> = {}, targetId?: string | number): void { this.emitUiIntent(intentKind, sourceZone, payload, targetId); }
	dispatchIntent(intent: Omit<HudIntent, 'timestamp'>): HudIntent {
		const full: HudIntent = { ...intent, timestamp: Date.now() }; this.lastIntent = full;
		clientDagKernel.dispatch({ intentKind: full.intentKind, sourceZone: String(full.sourceZone ?? 'HUD'), payload: full.payload ?? (full.targetId !== undefined ? { targetId: full.targetId } : {}) });
		if (full.intentKind === HUD_INTENT_KINDS.RADAR_ZOOM_IN) this.radarZoom = Number(Math.min(2.5, this.radarZoom + 0.25).toFixed(2));
		else if (full.intentKind === HUD_INTENT_KINDS.RADAR_ZOOM_OUT) this.radarZoom = Number(Math.max(0.5, this.radarZoom - 0.25).toFixed(2));
		else if (full.intentKind === HUD_INTENT_KINDS.RADAR_FIT_WORLD) { this.radarZoom = 1; this.triggerCanvasRecenter(); }
		else if (full.intentKind === HUD_INTENT_KINDS.RADAR_FILTER_HOTSPOTS) this.radarHotspotsOnly = !this.radarHotspotsOnly;
		else if (full.intentKind === HUD_INTENT_KINDS.RADAR_TOGGLE_SWEEP) this.radarSweepActive = !this.radarSweepActive;
		else if (full.intentKind === HUD_INTENT_KINDS.COMPARE_TOGGLE_DRAWER) this.compareDrawerOpen = !this.compareDrawerOpen;
		else if (full.intentKind === HUD_INTENT_KINDS.COMPARE_CLEAR_BASELINE) this.compareDrawerOpen = false;
		else if (full.intentKind === HUD_INTENT_KINDS.VIEW_SWITCH && typeof full.targetId === 'string') { this.activeView = full.targetId as HudViewMode; this.pushTicker('VIEW', `Projection switched to ${this.activeView}`); }
		else if (full.intentKind === HUD_INTENT_KINDS.MODAL_OPEN && typeof full.targetId === 'string') { this.activeModal = full.targetId as HudModalId; this.compactMenuOpen = false; }
		return full;
	}
	setLeftDrawerTab(tab: LeftEdgeDrawerTab, kindFilter?: string, expandZone = false): void {
		this.leftEdgeActiveTab = tab; if (kindFilter !== undefined) this.leftEdgeKindFilter = kindFilter;
		if (expandZone) this.setZoneVisibility(HUD_ZONES.LEFT_EDGE, HUD_ZONE_VISIBILITY.OPEN);
		this.emitDag(HUD_INTENT_KINDS.HUD_SET_LEFT_DRAWER_TAB, HUD_ZONES.LEFT_EDGE, { tab, kindFilter: this.leftEdgeKindFilter });
	}
	setLeftKindFilter(kindFilter: string): void { this.leftEdgeKindFilter = kindFilter; this.emitDag(HUD_INTENT_KINDS.HUD_SET_LEFT_KIND_FILTER, HUD_ZONES.LEFT_EDGE, { kindFilter }); }
	setRightDrawerTab(tab: RightEdgeDrawerTab, expandZone = false): void {
		this.rightEdgeActiveTab = tab; this.disclosureTier = tab === 'VERDICT' ? HUD_DISCLOSURE_TIERS.TIER_1_VERDICT : tab === 'RELATIONS' ? HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY : HUD_DISCLOSURE_TIERS.TIER_3_FORENSIC;
		if (expandZone) this.setZoneVisibility(HUD_ZONES.RIGHT_EDGE, HUD_ZONE_VISIBILITY.OPEN);
		this.emitDag(HUD_INTENT_KINDS.HUD_SET_RIGHT_DRAWER_TAB, HUD_ZONES.RIGHT_EDGE, { tab, disclosureTier: this.disclosureTier });
	}
	setCornerStyle(style: CornerVertex): void { this.cornerStyle = style; applyAccessibilityDomState(this); this.dispatchIntent({ intentKind: HUD_INTENT_KINDS.SET_CORNER_STYLE, sourceZone: HUD_ZONES.APP_MODAL, payload: { cornerStyle: style } }); this.pushTicker('HULL', `Corner profile → ${style}`); }
	setFontScalePct(pct: FontScalePct): void { this.fontScalePct = pct; applyAccessibilityDomState(this); this.dispatchIntent({ intentKind: HUD_INTENT_KINDS.SET_FONT_SCALE, sourceZone: HUD_ZONES.APP_MODAL, payload: { fontScalePct: pct } }); this.pushTicker('SCALE', `UI font scale → ${pct}%`); }
	setHighContrastMode(enabled: boolean): void { this.highContrastMode = enabled; applyAccessibilityDomState(this); this.dispatchIntent({ intentKind: HUD_INTENT_KINDS.SET_HIGH_CONTRAST, sourceZone: HUD_ZONES.APP_MODAL, payload: { highContrastMode: enabled } }); this.pushTicker('A11Y', enabled ? 'WCAG High-Contrast mode active' : 'Standard contrast mode'); }
	setDyslexiaFriendlyFont(enabled: boolean): void { this.dyslexiaFriendlyFont = enabled; applyAccessibilityDomState(this); this.dispatchIntent({ intentKind: HUD_INTENT_KINDS.SET_DYSLEXIA_FONT, sourceZone: HUD_ZONES.APP_MODAL, payload: { dyslexiaFriendlyFont: enabled } }); this.pushTicker('A11Y', enabled ? 'Dyslexia-friendly spacing active' : 'Standard letter spacing'); }
	revealZone(...zones: HudPerimeterZoneId[]): void {
		const next = { ...this.zoneStates }; for (const z of zones) next[z] = z === HUD_ZONES.LEFT_EDGE || z === HUD_ZONES.RIGHT_EDGE ? HUD_ZONE_VISIBILITY.COMPACT : HUD_ZONE_VISIBILITY.OPEN;
		this.zoneStates = next; this.dispatchIntent({ intentKind: HUD_INTENT_KINDS.HUD_REVEAL_ZONE, sourceZone: HUD_ZONES.WORLD_CANVAS, targetId: zones.join(',') }); this.pushTicker('REVEAL', `HUD_REVEAL_ZONE → ${zones.join(', ')}`);
	}
	startInteractiveTour(): void {
		this.zoneStates = { ...FOLDED_ZONES, [HUD_ZONES.TOP_LEFT]: HUD_ZONE_VISIBILITY.OPEN };
		this.tourActive = true; this.tutorialStep = 1; this.tutorialCompleted = false; this.tutorialState = 'ACTIVE';
		this.activeModal = HUD_MODALS.NONE; this.selectView(HUD_VIEWS.BUTTERFLY); this.pushTicker('TOUR', 'Started 30s Progressive HUD Tour (Step 1/5)');
		const spec = DEFAULT_TOUR_STEPS[0]!;
		this.setSpotlight({ zone: 'WORLD_CANVAS', selector: `[data-ui-spotlight="${UI_SPOTLIGHT_TARGETS.WORLD_CANVAS}"]`, title: spec.title, description: spec.description, stepIndex: 1 });
	}
	resumeTour(step?: number): void { this.tutorialState = 'ACTIVE'; this.tourActive = true; this.tutorialCompleted = false; this.activeModal = HUD_MODALS.NONE; this.advanceTourStep(step ?? this.tutorialStep); }
	advanceTourStep(nextStep?: number, targetView?: HudViewMode): void {
		const step = Math.max(1, Math.min(5, nextStep ?? this.tutorialStep + 1)), spec = DEFAULT_TOUR_STEPS[step - 1]!;
		this.tutorialStep = step; this.tourActive = true; this.tutorialState = 'ACTIVE'; if (targetView) this.selectView(targetView);
		this.dispatchIntent({ intentKind: HUD_INTENT_KINDS.TOUR_STEP_ADVANCE, sourceZone: HUD_ZONES.WORLD_CANVAS, targetId: step });
		if (step === 1) this.revealZone(HUD_ZONES.TOP_LEFT);
		if (step >= 2) this.revealZone(HUD_ZONES.TOP_CENTER);
		if (step >= 4) this.revealZone(HUD_ZONES.LEFT_EDGE, HUD_ZONES.RIGHT_EDGE);
		if (step >= 5) this.revealZone(HUD_ZONES.BOTTOM_CENTER, HUD_ZONES.BOTTOM_RIGHT, HUD_ZONES.BOTTOM_LEFT, HUD_ZONES.TOP_RIGHT);
		const zoneMap: Record<number, HudPerimeterZoneId | 'WORLD_CANVAS'> = { 1: 'WORLD_CANVAS', 2: HUD_ZONES.TOP_CENTER, 3: HUD_ZONES.TOP_CENTER, 4: HUD_ZONES.LEFT_EDGE, 5: HUD_ZONES.BOTTOM_CENTER };
		this.setSpotlight({ zone: zoneMap[step], selector: `[data-ui-spotlight="${spec.targetIds[0]}"]`, title: spec.title, description: spec.description, stepIndex: step });
	}
	completeTourAndOpenAuth(): void { this.tutorialCompleted = true; this.tourActive = false; this.tutorialState = 'COMPLETED'; this.clearSpotlight(); this.openModal(HUD_MODALS.AUTH_LOBBY); }
	unfoldPermittedHudZones(): void { this.activeModal = HUD_MODALS.NONE; this.tourActive = false; this.tutorialCompleted = true; this.tutorialState = 'SKIPPED'; this.clearSpotlight(); this.zoneStates = { ...UNFOLDED_ZONES }; this.pushTicker('TOUR', 'HUD_REVEAL_ZONE: Unfolded permitted perimeter zones'); }
	skipTourAndUnfoldHud(): void { this.unfoldPermittedHudZones(); }
	unfoldAllZonesForPrincipal(isGuest: boolean): void { this.unfoldPermittedHudZones(); if (!isGuest) this.tutorialCompleted = true; }
	requestExport(format: string): void { this.requestedExportFormat = format; }
	consumeRequestedExport(): string { const fmt = this.requestedExportFormat; if (fmt) this.requestedExportFormat = ''; return fmt; }
	openMermaidWithDsl(dsl: string): void { this.mermaidDraftDsl = dsl; this.selectView(HUD_VIEWS.MERMAID); }
	prefillAiPrompt(prompt: string): void { this.aiPromptDraft = prompt; }
	consumeAiPromptDraft(): string { const d = this.aiPromptDraft; if (d) this.aiPromptDraft = ''; return d; }
	toggleStealth(): void { this.isStealthMode = !this.isStealthMode; this.emitDag(HUD_INTENT_KINDS.HUD_REVEAL_ZONE, HUD_ZONES.WORLD_CANVAS, { stealth: this.isStealthMode }); this.pushTicker('HUD', this.isStealthMode ? 'Stealth World Mode engaged' : 'Perimeter HUD restored'); }
	toggleCompactMenu(force?: boolean): void { this.compactMenuOpen = force ?? !this.compactMenuOpen; this.emitDag(HUD_INTENT_KINDS.HUD_REVEAL_ZONE, HUD_ZONES.TOP_RIGHT, { compactMenuOpen: this.compactMenuOpen }); }
	setZoneVisibility(zone: HudPerimeterZoneId, next: HudZoneVisibility): void { this.zoneStates = { ...this.zoneStates, [zone]: next }; this.emitDag(HUD_INTENT_KINDS.HUD_REVEAL_ZONE, zone, { visibility: next }, zone); }
	toggleEdgeZone(zone: typeof HUD_ZONES.LEFT_EDGE | typeof HUD_ZONES.RIGHT_EDGE): void { this.setZoneVisibility(zone, this.zoneStates[zone] === HUD_ZONE_VISIBILITY.OPEN ? HUD_ZONE_VISIBILITY.COMPACT : HUD_ZONE_VISIBILITY.OPEN); }
	setEdgeDrawerMode(mode: EdgeDrawerMode): void { this.edgeDrawerMode = mode; this.emitDag(HUD_INTENT_KINDS.EDGE_DRAWER_MODE_SET, HUD_ZONES.APP_MODAL, { mode }); this.pushTicker('EDGE', `Edge drawer expansion → ${mode}`); }
	setFontLigatures(enabled: boolean): void { this.fontLigatures = enabled; this.emitDag(HUD_INTENT_KINDS.TYPOGRAPHY_SET, HUD_ZONES.APP_MODAL, { fontLigatures: enabled }); if (typeof document === 'undefined') return; document.documentElement.style.setProperty('--hud-font-ligatures', enabled ? 'contextual' : 'none'); document.documentElement.style.setProperty('--hud-font-features', enabled ? '"calt" 1, "liga" 1' : '"calt" 0, "liga" 0'); }
	setCodeFontSize(px: number): void { this.codeFontSizePx = Math.max(12, Math.min(16, Math.round(px))); this.emitDag(HUD_INTENT_KINDS.TYPOGRAPHY_SET, HUD_ZONES.APP_MODAL, { codeFontSizePx: this.codeFontSizePx }); if (typeof document !== 'undefined') document.documentElement.style.setProperty('--hud-code-size', `${this.codeFontSizePx}px`); }
	setButterflyMaxHops(hops: number): void { this.butterflyMaxHops = Math.max(1, Math.min(3, Math.round(hops))); this.emitDag(HUD_INTENT_KINDS.BUTTERFLY_HOPS_SET, HUD_ZONES.WORLD_CANVAS, { hops: this.butterflyMaxHops }); }
	advanceTutorialStep(nextStep?: number): void { this.advanceTourStep(nextStep); }
	toggleTutorialMinimized(): void { this.tutorialMinimized = !this.tutorialMinimized; this.emitDag(HUD_INTENT_KINDS.TOUR_STEP_ADVANCE, HUD_ZONES.WORLD_CANVAS, { tutorialMinimized: this.tutorialMinimized }); }
	resetTutorialQuest(): void { this.startInteractiveTour(); }
	toggleDockFloat(dock: DetachableDockId): void { const cur = this.dockPlacements[dock], nextMode = cur.mode === DOCK_PLACEMENT_MODES.DOCKED_RAIL ? DOCK_PLACEMENT_MODES.FLOATING_PANEL : DOCK_PLACEMENT_MODES.DOCKED_RAIL, side = dock === 'LEFT_EDGE' ? 'LEFT' : dock === 'RIGHT_EDGE' ? 'RIGHT' : dock; this.dockPlacements = { ...this.dockPlacements, [dock]: { ...cur, mode: nextMode, snapped: nextMode === DOCK_PLACEMENT_MODES.DOCKED_RAIL } }; this.emitDag(HUD_INTENT_KINDS.HUD_TOGGLE_DRAWER_FLOAT, dock === 'CANVAS_TOOLBAR' ? HUD_ZONES.WORLD_CANVAS : dock, { side, dock, mode: nextMode }); this.pushTicker('DOCK', `${dock} → ${nextMode}`); }
	moveEdgeRail(side: 'LEFT' | 'RIGHT', rawOffsetYRem: number, vh = 900): number { const dock: DetachableDockId = side === 'LEFT' ? 'LEFT_EDGE' : 'RIGHT_EDGE', cur = this.dockPlacements[dock], offsetYRem = clampRailOffsetYRem(rawOffsetYRem, vh); this.dockPlacements = { ...this.dockPlacements, [dock]: { ...cur, railOffsetYRem: offsetYRem } }; this.emitDag(HUD_INTENT_KINDS.HUD_MOVE_EDGE_RAIL, dock, { side, offsetYRem }); return offsetYRem; }
	moveFloatingDock(dock: DetachableDockId, rawX: number, rawY: number, vw = 1440, vh = 900): void { const cur = this.dockPlacements[dock], m = DOCK_FLOAT_TOKENS.VIEWPORT_CLAMP_MARGIN_PX, s = DOCK_FLOAT_TOKENS.SNAP_THRESHOLD_PX, x = Math.max(m, Math.min(vw - 260, Math.round(rawX))), y = Math.max(m + 68, Math.min(vh - 180, Math.round(rawY))), snapped = (dock === 'LEFT_EDGE' && x <= m + s) || (dock === 'RIGHT_EDGE' && x >= vw - 320 - s), side = dock === 'LEFT_EDGE' ? 'LEFT' : 'RIGHT'; this.dockPlacements = { ...this.dockPlacements, [dock]: { ...cur, mode: snapped ? DOCK_PLACEMENT_MODES.DOCKED_RAIL : DOCK_PLACEMENT_MODES.FLOATING_PANEL, x, y, snapped } }; this.emitDag(snapped ? HUD_INTENT_KINDS.DOCK_LAYOUT_MUTATE : HUD_INTENT_KINDS.HUD_MOVE_FLOATING_DRAWER, dock === 'CANVAS_TOOLBAR' ? HUD_ZONES.WORLD_CANVAS : dock, { side, dock, xRem: Number((x / 16).toFixed(2)), yRem: Number((y / 16).toFixed(2)), snapped }); }
	resetDockLayouts(): void { this.dockPlacements = { ...DEFAULT_DOCKS }; this.emitDag(HUD_INTENT_KINDS.DOCK_LAYOUT_MUTATE, HUD_ZONES.APP_MODAL, { reset: true }); this.pushTicker('DOCK', 'All detachable docks reset to perimeter rails'); }
	openModal(modal: HudModalId): void { this.activeModal = modal; this.compactMenuOpen = false; this.emitDag(HUD_INTENT_KINDS.MODAL_OPEN, HUD_ZONES.APP_MODAL, { modal }, modal); }
	openContextualHelp(target: { readonly chapterId: string; readonly sectionIndex: number; readonly topicTitle?: string }): void { this.helpTargetRequest = { chapterId: target.chapterId, stepIdx: target.sectionIndex, nonce: nextSeq++ }; this.activeModal = HUD_MODALS.SSOT_HELP_BOOK; this.compactMenuOpen = false; this.emitDag(HUD_INTENT_KINDS.OPEN_CONTEXTUAL_HELP, HUD_ZONES.TOP_RIGHT, { chapterId: target.chapterId, sectionIndex: target.sectionIndex, topicTitle: target.topicTitle ?? '' }, target.chapterId); }
	closeModal(): void { if (this.activeModal === HUD_MODALS.AUTH_LOBBY) { this.unfoldPermittedHudZones(); return; } this.activeModal = HUD_MODALS.NONE; this.emitDag(HUD_INTENT_KINDS.MODAL_OPEN, HUD_ZONES.APP_MODAL, { modal: HUD_MODALS.NONE }, HUD_MODALS.NONE); }
	selectView(view: HudViewMode): void { this.activeView = view; this.emitDag(HUD_INTENT_KINDS.VIEW_SWITCH, HUD_ZONES.TOP_CENTER, { view }, view); this.pushTicker('VIEW', `Projection switched to ${view}`); }
	setTheme(themeId: HudThemeId): void { this.activeThemeId = themeId; this.activeCommunitySlug = ''; const preset = HUD_THEME_PRESETS[themeId]; if (preset.polarity === 'DARK') this.lastDarkThemeId = themeId; else this.lastLightThemeId = themeId; applyPresetDomTokens(themeId); this.emitDag(HUD_INTENT_KINDS.THEME_SET, HUD_ZONES.APP_MODAL, { themeId }); this.pushTicker('THEME', `HUD_THEME_CHANGED: ${preset.polarity} · ${preset.label}`); }
	applyCommunityThemeTokens(slug: string, label: string, polarity: 'DARK' | 'LIGHT', tokens: Record<string, string | number>): void { this.activeCommunitySlug = slug; if (typeof document !== 'undefined') { document.documentElement.classList.toggle('dark', polarity === 'DARK'); for (const [k, cssVar] of Object.entries(TOKEN_CSS)) if (typeof tokens[k] === 'string') document.documentElement.style.setProperty(cssVar, String(tokens[k])); if (typeof tokens.accentPrimary === 'string') document.documentElement.style.setProperty('--hud-accent', String(tokens.accentPrimary)); if (typeof tokens.accentSecondary === 'string') document.documentElement.style.setProperty('--hud-brass', String(tokens.accentSecondary)); } this.emitDag(HUD_INTENT_KINDS.THEME_SET, HUD_ZONES.APP_MODAL, { slug, polarity }); this.pushTicker('THEME', `Applied community theme: ${label} (${polarity})`); }
	randomizePolarityTheme(): HudThemeId { const nextId = pickNextPolarityRandomTheme(this.activeThemeId, HUD_THEME_PRESETS[this.activeThemeId].polarity === 'DARK' ? this.lastLightThemeId : this.lastDarkThemeId); this.setTheme(nextId); return nextId; }
	setSurfacePattern(target: SurfaceTarget, patternId: SurfacePatternId, opacity?: number, scale?: number): void { this.surfacePatterns = target === SURFACE_TARGETS.ALL ? { SUBSTRATE: patternId, DOCKS: patternId, MODALS: patternId } : { ...this.surfacePatterns, [target]: patternId }; if (opacity !== undefined) this.surfaceOpacity = opacity; if (scale !== undefined) this.surfaceScale = scale; this.emitDag(HUD_INTENT_KINDS.SURFACE_PATTERN_SET, HUD_ZONES.APP_MODAL, { target, patternId }); this.pushTicker('SURFACE', `${target} → ${SURFACE_PATTERNS[patternId].label}`); }
	setSubstrateConfig(patch: Partial<SubstrateConfig>): void { this.substrateConfig = { ...this.substrateConfig, ...patch }; if (patch.minorGridPx !== undefined) this.surfaceScale = Number((patch.minorGridPx / SUBSTRATE_DEFAULTS.minorGridPx).toFixed(2)); this.emitDag(HUD_INTENT_KINDS.SUBSTRATE_CONFIG_SET, HUD_ZONES.APP_MODAL, { keys: Object.keys(patch) }); this.pushTicker('SUBSTRATE', `HUD_SET_SUBSTRATE_CONFIG (${Object.keys(patch).join(', ')})`); }
	toggleAlignmentGuides(): void { this.showAlignmentGuides = !this.showAlignmentGuides; this.emitDag(HUD_INTENT_KINDS.ALIGNMENT_GUIDES_TOGGLE, HUD_ZONES.APP_MODAL, { visible: this.showAlignmentGuides }); this.pushTicker('RAILS', this.showAlignmentGuides ? 'Harmonic alignment rails visible (Alt+G)' : 'Alignment rails hidden'); }
	toggleKineticMotion(): void { this.kineticMotionEnabled = !this.kineticMotionEnabled; applyAccessibilityDomState(this); this.dispatchIntent({ intentKind: HUD_INTENT_KINDS.SET_KINETIC_MOTION, sourceZone: HUD_ZONES.APP_MODAL, payload: { kineticMotionEnabled: this.kineticMotionEnabled } }); this.pushTicker('MOTION', this.kineticMotionEnabled ? 'Kinetic micro-animations active' : 'Reduced motion mode'); }
	setDisclosureTier(tier: HudDisclosureTier): void { const tab: RightEdgeDrawerTab = tier === HUD_DISCLOSURE_TIERS.TIER_1_VERDICT ? 'VERDICT' : tier === HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY ? 'RELATIONS' : 'FORENSIC'; this.setRightDrawerTab(tab); }
	triggerCanvasRecenter(): void { this.canvasResetNonce += 1; this.emitDag(HUD_INTENT_KINDS.CANVAS_RECENTER, HUD_ZONES.WORLD_CANVAS, { nonce: this.canvasResetNonce }); this.pushTicker('CAM', 'Viewport camera re-centered'); }
	pushTicker(tag: string, message: string): void { const now = new Date(), timeLabel = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`; this.eventLog = [{ id: nextSeq++, tag, message: sanitizeTelemetryPayload(message), timeLabel }, ...this.eventLog].slice(0, HUD_MOTION.TICKER_MAX_ITEMS); }
	isZoneFolded(zone: HudPerimeterZoneId): boolean { return this.isStealthMode || this.zoneStates[zone] === HUD_ZONE_VISIBILITY.FOLDED; }
	zoneStyle(zone: HudPerimeterZoneId): string { if (this.isZoneFolded(zone)) return `transform: ${HUD_FOLD_VECTORS[zone]}; opacity: 0; pointer-events: none;`; const delays: Partial<Record<HudPerimeterZoneId, number>> = { [HUD_ZONES.TOP_LEFT]: 0, [HUD_ZONES.TOP_CENTER]: 30, [HUD_ZONES.TOP_RIGHT]: 60, [HUD_ZONES.RIGHT_EDGE]: 90, [HUD_ZONES.BOTTOM_RIGHT]: 120, [HUD_ZONES.BOTTOM_CENTER]: 150, [HUD_ZONES.BOTTOM_LEFT]: 180, [HUD_ZONES.LEFT_EDGE]: 210 }; const railOff = zone === HUD_ZONES.LEFT_EDGE ? this.dockPlacements.LEFT_EDGE.railOffsetYRem : zone === HUD_ZONES.RIGHT_EDGE ? this.dockPlacements.RIGHT_EDGE.railOffsetYRem : 0; const baseTransform = zone === HUD_ZONES.LEFT_EDGE || zone === HUD_ZONES.RIGHT_EDGE ? `translate3d(0, calc(-50% + ${railOff}rem), 0)` : 'translate3d(0, 0, 0)'; return `transform: ${baseTransform}; opacity: 1; transition-delay: ${delays[zone] ?? 0}ms;`; }
}
export const hudWire = new ChronosHudWire();
