/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v2.2.0 11-zone Game-HUD topology, 5-tier HUD_BREAKPOINTS (incl. UWQHD 5120x1440), Detachable Dock & Camera Physics tokens.
 */
import { HUD_THEME_IDS, HUD_THEME_PRESETS, type HudThemeId, type HudThemePreset } from './themes/presets.registry';
import { PRINCIPAL_POSTURE_META, SEEDED_OPERATOR_CONFIG } from './security.constants';
export { HUD_THEME_IDS, HUD_THEME_PRESETS, PRINCIPAL_POSTURE_META, SEEDED_OPERATOR_CONFIG, type HudThemeId, type HudThemePreset };
export {
	HUD_ELEVATION_TOKENS, HUD_MOTION_TOKENS, HUD_GLYPHS, SURFACE_TARGETS, SURFACE_PATTERNS, SURFACE_PATTERN_IDS,
	HULL_PROFILES, HULL_TOKENS, SUBSTRATE_DEFAULTS, FUI_DEPTH_CONSTANTS, CORNER_STYLES, ZONE_CORNER_TUPLES, FONT_SCALE_OPTIONS,
	CHAMFER_CORNERS, CHAMFER_PROFILES, mirrorCornerTuple,
	type HullProfile, type SubstrateConfig, type SurfaceTarget, type SurfacePatternId, type SurfacePatternSpec,
	type CornerVertex, type CornerTuple, type FontScalePct, type ChamferCornerMode, type ChamferCorner, type ChamferProfile,
} from './hud/hud.surfaces';
export {
	resolveLegacyCornerTuple, resolveEffectiveCornerTuple, resolveChamferCutPx,
	buildCornerPolygonPoints, buildCornerCarets, buildHullClipPath, buildEntityCartridgePolygons,
} from './hud/hud.geometry';
export { HUD_INTENT_KINDS, type HudIntent, type HudIntentKind } from './hud/hud.intents';
export const HUD_THEMES = HUD_THEME_PRESETS;
export const AUTH_LOBBY_TITLE = 'Chronos Lobby' as const;
export const HUD_BREAKPOINTS = {
	PHONE: { id: 'PHONE', minWidthPx: 0, maxWidthPx: 767, expandedTrackPx: 360, edgeTrackExpandedPx: 360, collapsedRailPx: 44, railCollapsedPx: 44, cssTrackVar: '100vw', maxVisibleProjectTabs: 2, studioCorridorMaxPx: 767 },
	TABLET: { id: 'TABLET', minWidthPx: 768, maxWidthPx: 1199, expandedTrackPx: 248, edgeTrackExpandedPx: 248, collapsedRailPx: 48, railCollapsedPx: 48, cssTrackVar: '248px', maxVisibleProjectTabs: 3, studioCorridorMaxPx: 1199 },
	DESKTOP: { id: 'DESKTOP', minWidthPx: 1200, maxWidthPx: 1919, expandedTrackPx: 288, edgeTrackExpandedPx: 288, collapsedRailPx: 48, railCollapsedPx: 48, cssTrackVar: '288px', maxVisibleProjectTabs: 4, studioCorridorMaxPx: 1919 },
	WQHD: { id: 'WQHD', minWidthPx: 1920, maxWidthPx: 3439, expandedTrackPx: 336, edgeTrackExpandedPx: 336, collapsedRailPx: 52, railCollapsedPx: 52, cssTrackVar: '336px', maxVisibleProjectTabs: 4, studioCorridorMaxPx: 2560 },
	UWQHD: { id: 'UWQHD', minWidthPx: 3440, maxWidthPx: 99999, expandedTrackPx: 360, edgeTrackExpandedPx: 360, collapsedRailPx: 56, railCollapsedPx: 56, cssTrackVar: '360px', maxVisibleProjectTabs: 6, studioCorridorMaxPx: 2560 },
} as const;
export type HudBreakpointId = keyof typeof HUD_BREAKPOINTS;

export function resolveHudBreakpoint(widthPx: number): (typeof HUD_BREAKPOINTS)[HudBreakpointId] {
	if (widthPx < HUD_BREAKPOINTS.TABLET.minWidthPx) return HUD_BREAKPOINTS.PHONE;
	if (widthPx < HUD_BREAKPOINTS.DESKTOP.minWidthPx) return HUD_BREAKPOINTS.TABLET;
	if (widthPx < HUD_BREAKPOINTS.WQHD.minWidthPx) return HUD_BREAKPOINTS.DESKTOP;
	if (widthPx < HUD_BREAKPOINTS.UWQHD.minWidthPx) return HUD_BREAKPOINTS.WQHD;
	return HUD_BREAKPOINTS.UWQHD;
}

export const DOCK_PLACEMENT_MODES = { DOCKED_RAIL: 'DOCKED_RAIL', FLOATING_PANEL: 'FLOATING_PANEL' } as const;
export type DockPlacementMode = (typeof DOCK_PLACEMENT_MODES)[keyof typeof DOCK_PLACEMENT_MODES];
export const EDGE_DRAWER_MODES = { OVERLAY_HOVER: 'OVERLAY_HOVER', DOCKED_RESIZE: 'DOCKED_RESIZE' } as const;
export type EdgeDrawerMode = (typeof EDGE_DRAWER_MODES)[keyof typeof EDGE_DRAWER_MODES];
export const COLLAB_CURSOR_PALETTE = ['#00E5FF', '#F59E0B', '#10B981', '#EC4899', '#A855F7', '#3B82F6', '#EF4444', '#14B8A6'] as const;

export const DOCK_FLOAT_TOKENS = {
	SNAP_THRESHOLD_PX: 24, VIEWPORT_MARGIN_PX: 12, VIEWPORT_CLAMP_MARGIN_PX: 12, UWQHD_CORRIDOR_MAX_PX: 2560,
	DEFAULT_LEFT_FLOAT: { x: 24, y: 92 }, DEFAULT_RIGHT_FLOAT: { x: 960, y: 92 }, DEFAULT_TOOLBAR_FLOAT: { x: 340, y: 92 },
} as const;

export const CAMERA_PHYSICS_TOKENS = {
	MIN_ZOOM: 0.15, MAX_ZOOM: 4.0, DEFAULT_ZOOM: 1.0, NODE_FOCUS_ZOOM: 1.25, DOUBLE_CLICK_NODE_ZOOM: 1.25,
	MIN_AUTO_FIT_ZOOM: 0.72, AUTO_FIT_SMALL_SUBGRAPH_NODES: 16,
	FRICTION: 0.88, MIN_VELOCITY: 0.25, RIGHT_CLICK_DRAG_THRESHOLD_PX: 5, RIGHT_CLICK_DEADZONE_PX: 5,
	LONG_PRESS_MS: 450, DOUBLE_TAP_MS: 260, ANIM_DURATION_MS: 260,
} as const;

export const PROJECT_DECK_TOKENS = {
	SHORT_CODE_MAX_LEN: 12, SHORT_CODE_MAX_CHARS: 12,
	MAX_VISIBLE_PROJECT_TABS: { PHONE: 2, TABLET: 3, DESKTOP: 4, WQHD: 4, UWQHD: 6 },
	CROWN_TOP_PX: 12, CROWN_HEIGHT_PX: 40,
	SUB_BAR_TOP_PX: 60, SUB_BAR_HEIGHT_PX: 30,
	TAB_HEIGHT_PX: 24, TAB_MAX_WIDTH_PX: 148, UPPER_DECK_TOP_PX: 60, UPPER_DECK_HEIGHT_PX: 30,
	LOWER_CROWN_TOP_PX: 12, LOWER_CROWN_HEIGHT_PX: 40, HOTBAR_ROW_HEIGHT_PX: 44, AI_CAVITY_HEIGHT_PX: 88,
} as const;
export const DSM_TOKENS = { MAX_MATRIX_ENTITIES: 16, CELL_SIZE_PX: 26 } as const;
export const HELP_BOOK_TOKENS = {
	MAX_TERM_COLON_INDEX: 48, MAX_TABLE_ROWS: 8, MAX_BULLETS_PER_STEP: 6,
	CARD_WIDTH_PX: 320, CARD_HEIGHT_PX: 196, ANCHOR_GAP_PX: 14, SIDE_OFFSET_Y_PX: 8, VIEWPORT_MARGIN_PX: 16,
} as const;
export const VECTOR_EXPORT_TOKENS = {
	SVG_WIDTH: 920, SVG_HEIGHT: 520, FONT_FAMILY: 'IBM Plex Mono',
	CFG_START_Y: 40, CFG_STEP_Y: 54, CFG_RECT_X: 280, CFG_RECT_W: 360, CFG_RECT_H: 40, CFG_TEXT_X: 294, CFG_TEXT_OFFSET_Y: 25,
	DFG_STEP_Y: 48, DFG_RECT_X: 220, DFG_RECT_W: 480, DFG_RECT_H: 36, DFG_TEXT_X: 234, DFG_TEXT_OFFSET_Y: 22,
	FOCAL_RECT_X: 310, FOCAL_RECT_Y: 210, FOCAL_RECT_W: 300, FOCAL_RECT_H: 64, FOCAL_TEXT_X: 326, FOCAL_TEXT_Y: 246,
} as const;
export const TYPOGRAPHY_TOKENS = {
	TEXT_MICRO_TELEMETRY: { px: 13, rem: '0.8125rem', lineHeightPx: 18, className: 'text-[13px] leading-4' },
	TEXT_CONTROL_LABEL: { px: 14, rem: '0.875rem', lineHeightPx: 18, className: 'text-sm font-medium leading-4' },
	TEXT_BODY_READABLE: { px: 16, rem: '1rem', lineHeightPx: 24, className: 'text-base leading-relaxed' },
	TEXT_BODY_COMPACT: { px: 15, rem: '0.9375rem', lineHeightPx: 22, className: 'text-[15px] leading-5' },
	TEXT_ENTITY_TITLE: { px: 18, rem: '1.125rem', lineHeightPx: 24, className: 'text-lg font-semibold' },
	TEXT_EDITORIAL_CROWN: { px: 26, rem: '1.625rem', lineHeightPx: 32, className: 'text-2xl md:text-3xl font-bold' },
} as const;
export const ENTITY_KIND_STYLE_MAP: Readonly<Record<string, { readonly glyph: string; readonly colorVar: string; readonly textClass: string }>> = {
	FILE: { glyph: '⊞', colorVar: 'var(--hud-accent-primary)', textClass: 'text-[var(--hud-accent-primary)]' },
	MODULE: { glyph: '⊞', colorVar: 'var(--hud-accent-primary)', textClass: 'text-[var(--hud-accent-primary)]' },
	CLASS: { glyph: '⬡', colorVar: 'var(--hud-accent-primary)', textClass: 'text-[var(--hud-accent-primary)]' },
	INTERFACE: { glyph: '⬡', colorVar: 'var(--hud-accent-secondary)', textClass: 'text-[var(--hud-accent-secondary)]' },
	FUNCTION: { glyph: '❖', colorVar: 'var(--hud-nominal)', textClass: 'text-[var(--hud-nominal)]' },
	METHOD: { glyph: '❖', colorVar: 'var(--hud-nominal)', textClass: 'text-[var(--hud-nominal)]' },
	VARIABLE: { glyph: '⌬', colorVar: 'var(--hud-warning)', textClass: 'text-[var(--hud-warning)]' },
} as const;
export const SEVERITY_STYLE_MAP: Readonly<Record<string, { readonly colorVar: string; readonly textClass: string; readonly borderClass: string }>> = {
	BLOCKER: { colorVar: 'var(--hud-danger)', textClass: 'text-[var(--hud-danger)] font-bold', borderClass: 'border-[var(--hud-danger)]' },
	CRITICAL: { colorVar: 'var(--hud-danger)', textClass: 'text-[var(--hud-danger)] font-bold', borderClass: 'border-[var(--hud-danger)]' },
	WARNING: { colorVar: 'var(--hud-warning)', textClass: 'text-[var(--hud-warning)] font-semibold', borderClass: 'border-[var(--hud-warning)]' },
	NOMINAL: { colorVar: 'var(--hud-nominal)', textClass: 'text-[var(--hud-nominal)]', borderClass: 'border-[var(--hud-nominal)]' },
} as const;
export const DARK_HUD_THEME_IDS: readonly HudThemeId[] = [HUD_THEME_IDS.OBSIDIAN_CYBER, HUD_THEME_IDS.TITANIUM_NIGHT, HUD_THEME_IDS.VOID_AMBER] as const;
export const LIGHT_HUD_THEME_IDS: readonly HudThemeId[] = [HUD_THEME_IDS.CLINICAL_LAB, HUD_THEME_IDS.PAPER_ARCHITECT, HUD_THEME_IDS.DAYLIGHT_SOLAR] as const;
export function pickNextPolarityRandomTheme(currentThemeId: HudThemeId, lastUsedInTargetPolarity?: HudThemeId, randomValue: number = Math.random()): HudThemeId {
	const pool = HUD_THEME_PRESETS[currentThemeId].polarity === 'DARK' ? LIGHT_HUD_THEME_IDS : DARK_HUD_THEME_IDS;
	const candidates = lastUsedInTargetPolarity ? pool.filter((id) => id !== lastUsedInTargetPolarity) : [...pool];
	const idx = Math.floor(Math.max(0, Math.min(0.999999, randomValue)) * candidates.length);
	return candidates[idx] ?? pool[0]!;
}
export const HUD_HARMONIC_RATIOS = {
	PHI: 1.618, GOLDEN_MAJOR: 0.618, GOLDEN_MINOR: 0.382, BASE_UNIT_PX: 4,
	COLLAPSED_RAIL_PX: 44, CORNER_DOCK_HEIGHT_PX: 132, CORNER_DOCK_CLEARANCE_PX: 12,
} as const;
export const HUD_ALIGNMENT_RAILS = {
	UPPER_PERIMETER_TOP_PX: 12, UPPER_WORLD_SAFE_TOP_PX: 96, LOWER_WORLD_SAFE_BOTTOM_PX: 156, BOTTOM_PERIMETER_BOTTOM_PX: 12,
} as const;
export const HUD_ZONES = {
	TOP_LEFT: 'TOP_LEFT', TOP_CENTER: 'TOP_CENTER', TOP_RIGHT: 'TOP_RIGHT', RIGHT_EDGE: 'RIGHT_EDGE',
	BOTTOM_RIGHT: 'BOTTOM_RIGHT', BOTTOM_CENTER: 'BOTTOM_CENTER', BOTTOM_LEFT: 'BOTTOM_LEFT', LEFT_EDGE: 'LEFT_EDGE',
	WORLD_CANVAS: 'WORLD_CANVAS', APP_BACKGROUND: 'APP_BACKGROUND', APP_MODAL: 'APP_MODAL',
} as const;
export type HudZoneId = (typeof HUD_ZONES)[keyof typeof HUD_ZONES];
export type HudPerimeterZoneId =
	| typeof HUD_ZONES.TOP_LEFT | typeof HUD_ZONES.TOP_CENTER | typeof HUD_ZONES.TOP_RIGHT | typeof HUD_ZONES.RIGHT_EDGE
	| typeof HUD_ZONES.BOTTOM_RIGHT | typeof HUD_ZONES.BOTTOM_CENTER | typeof HUD_ZONES.BOTTOM_LEFT | typeof HUD_ZONES.LEFT_EDGE;
export const HUD_ZONE_VISIBILITY = { OPEN: 'OPEN', COMPACT: 'COMPACT', FOLDED: 'FOLDED' } as const;
export type HudZoneVisibility = (typeof HUD_ZONE_VISIBILITY)[keyof typeof HUD_ZONE_VISIBILITY];
export const HUD_FOLD_VECTORS: Readonly<Record<HudPerimeterZoneId, string>> = {
	TOP_LEFT: 'translate3d(-110%, -110%, 0)', TOP_CENTER: 'translate3d(0, -110%, 0)', TOP_RIGHT: 'translate3d(110%, -110%, 0)',
	RIGHT_EDGE: 'translate3d(110%, -50%, 0)', BOTTOM_RIGHT: 'translate3d(110%, 110%, 0)', BOTTOM_CENTER: 'translate3d(0, 110%, 0)',
	BOTTOM_LEFT: 'translate3d(-110%, 110%, 0)', LEFT_EDGE: 'translate3d(-110%, -50%, 0)',
} as const;
export const HUD_MOTION = { FOLD_EASING: 'cubic-bezier(0.16, 1, 0.3, 1)', FOLD_DURATION_MS: 240, TICKER_MAX_ITEMS: 12, TICKER_VISIBLE_ITEMS: 3 } as const;
export const SOURCE_VIEWER_TOKENS = { GUTTER_WIDTH_PX: 44, ACTIVE_HIGHLIGHT_DURATION_MS: 1200, CONTEXT_WINDOW_LINES: 5, MAX_VISIBLE_LINES: 240 } as const;
export const CFG_LAYOUT_CONSTANTS = { VIEWBOX_WIDTH: 760, VIEWBOX_HEIGHT: 480, CENTER_X: 380, TOP_PADDING_Y: 44, NODE_WIDTH: 210, NODE_HALF_WIDTH: 105, NODE_HEIGHT: 46, NODE_HALF_HEIGHT: 23, RANK_SPACING_Y: 74, BRANCH_OFFSET_X: 145, CURVE_TENSION: 0.45 } as const;

export const HUD_THEME = {
	PALETTE: HUD_THEME_PRESETS.OBSIDIAN_CYBER,
	RETICLE_STATES: { ACTIVE: 'ACTIVE', SCANNING: 'SCANNING', WARNING: 'WARNING', CRITICAL: 'CRITICAL' },
	COLORS: { CYBER_CYAN: '#00E5FF', NOMINAL: '#10B981', WARNING: '#F59E0B', DANGER: '#EF4444' },
	TYPOGRAPHY: { FONT_DISPLAY: '"Cormorant Garamond", Georgia, serif', FONT_SANS: '"Plus Jakarta Sans", system-ui, sans-serif', FONT_MONO: '"IBM Plex Mono", monospace', REM_BASE_PX: 16 },
	CANVAS_BOUNDS: { ZOOM_MIN: 0.15, ZOOM_MAX: 4.0, ZOOM_DEFAULT: 1.0, ZOOM_STEP: 0.15, WHEEL_SENSITIVITY: 0.0012, PINCH_SENSITIVITY: 0.005, PAN_STEP_X: 80, PAN_STEP_Y: 60 },
	GRAPH_LAYOUT: { VIEWBOX_WIDTH: 1320, VIEWBOX_HEIGHT: 520, LEFT_WING_X: 210, CENTER_X: 660, RIGHT_WING_X: 1110, CENTER_Y: 250, VERTICAL_GAP: 86, NODE_WIDTH: 224, NODE_HEIGHT: 56, NODE_HALF_WIDTH: 112, NODE_HALF_HEIGHT: 28, FOCAL_WIDTH: 256, FOCAL_HEIGHT: 68, FOCAL_HALF_WIDTH: 128, FOCAL_HALF_HEIGHT: 34, CORNER_BRACKET_LEN: 10, BEZIER_TENSION: 0.5, LABEL_MAX_CHARS: 64, MIN_CHANNEL_GAP_PX: 176 },
	RADAR_MINIMAP: { WIDTH: 180, HEIGHT: 104, VIEWPORT_RECT_W: 56, VIEWPORT_RECT_H: 34 },
	TREEMAP_LAYOUT: { VIEWBOX_WIDTH: 920, VIEWBOX_HEIGHT: 520, CELL_PADDING: 3, MIN_LABEL_WIDTH: 56, MIN_LABEL_HEIGHT: 26, MAX_VISIBLE_TILES: 72, HEADER_HEIGHT_PX: 20 },
} as const;
export type ReticleState = (typeof HUD_THEME.RETICLE_STATES)[keyof typeof HUD_THEME.RETICLE_STATES];
