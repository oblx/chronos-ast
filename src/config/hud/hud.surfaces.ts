/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v2.0.1 4-tier Z-elevation materials, HULL_TOKENS, SUBSTRATE_DEFAULTS, kinetic motion constants, Unicode sigils, and procedural SVG surface presets.
 */

export const HUD_ELEVATION_TOKENS = {
	Z0_SUBSTRATE: { tier: 0, vignetteOpacity: 0.45, gridScalePx: 20 },
	Z1_WORLD_ENTITY: {
		tier: 1,
		rimHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.16)',
		ambientShadow: '0 12px 28px rgba(0, 0, 0, 0.44)',
	},
	Z2_PERIMETER_DOCK: {
		tier: 2,
		backdropBlurPx: 12,
		innerBezelInsetPx: 3,
		dropShadow: '0 12px 32px rgba(0, 0, 0, 0.46)',
	},
	Z3_ELEVATED_MODAL: {
		tier: 3,
		backdropBlurPx: 16,
		dropShadow: '0 24px 64px rgba(0, 0, 0, 0.62)',
	},
} as const;

export const HUD_MOTION_TOKENS = {
	HOVER_LIFT_PX: -2,
	HOVER_DURATION_MS: 220,
	ACTIVE_SCALE: 0.98,
	SIGNAL_FLOW_DURATION_MS: 2200,
	RETICLE_BREATHE_DURATION_MS: 3200,
	RADAR_SWEEP_DURATION_MS: 6000,
	FOLD_EASING: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const HUD_GLYPHS = {
	BRAND_CREST: '◈', FOCAL_RETICLE: '⌖', ENTITY_CLASS: '⬡', ENTITY_FUNCTION: '❖',
	ENTITY_VARIABLE: '⌬', EDGE_SIGNAL: '⟡', HIGH_ENERGY: '⚡', STEALTH_MODE: '◰',
	POLARITY_SPLIT: '◐', SETTINGS_GEAR: '⚙', SUN_LIGHT: '☀', MOON_DARK: '☾',
} as const;

export const SURFACE_TARGETS = {
	ALL: 'ALL', SUBSTRATE: 'SUBSTRATE', DOCKS: 'DOCKS', MODALS: 'MODALS',
} as const;
export type SurfaceTarget = (typeof SURFACE_TARGETS)[keyof typeof SURFACE_TARGETS];

export const SURFACE_PATTERN_IDS = {
	ARCHITECTURAL_BLUEPRINT: 'ARCHITECTURAL_BLUEPRINT',
	ISOMETRIC_HEX_MESH: 'ISOMETRIC_HEX_MESH',
	PHOSPHOR_SCANLINES: 'PHOSPHOR_SCANLINES',
	TOPOGRAPHIC_CONTOUR: 'TOPOGRAPHIC_CONTOUR',
	DIAGONAL_MICRO_HATCH: 'DIAGONAL_MICRO_HATCH',
	STARBURST_RADIAL: 'STARBURST_RADIAL',
} as const;
export type SurfacePatternId = (typeof SURFACE_PATTERN_IDS)[keyof typeof SURFACE_PATTERN_IDS];

export interface SurfacePatternSpec {
	readonly id: SurfacePatternId; readonly label: string; readonly description: string;
	readonly tileSizePx: number; readonly defaultOpacity: number; readonly glyph: string;
}

export const SURFACE_PATTERNS: Readonly<Record<SurfacePatternId, SurfacePatternSpec>> = {
	ARCHITECTURAL_BLUEPRINT: { id: SURFACE_PATTERN_IDS.ARCHITECTURAL_BLUEPRINT, label: 'Architectural Blueprint', description: '20px minor / 100px major dual-scale drafting grid with + crosshairs.', tileSizePx: 100, defaultOpacity: 0.55, glyph: '⊞' },
	ISOMETRIC_HEX_MESH: { id: SURFACE_PATTERN_IDS.ISOMETRIC_HEX_MESH, label: 'Isometric Hex Mesh', description: 'Tactical interlocking honeycomb geometry for spatial substrates.', tileSizePx: 36, defaultOpacity: 0.46, glyph: '⬡' },
	PHOSPHOR_SCANLINES: { id: SURFACE_PATTERN_IDS.PHOSPHOR_SCANLINES, label: 'Phosphor Scanlines', description: 'Fine 2px horizontal CRT scanline weave with micro-stipple grain.', tileSizePx: 12, defaultOpacity: 0.44, glyph: '≡' },
	TOPOGRAPHIC_CONTOUR: { id: SURFACE_PATTERN_IDS.TOPOGRAPHIC_CONTOUR, label: 'Topographic Contour', description: 'Smooth cubic-Bezier elevation isolines for modal & glass depth.', tileSizePx: 96, defaultOpacity: 0.36, glyph: '◎' },
	DIAGONAL_MICRO_HATCH: { id: SURFACE_PATTERN_IDS.DIAGONAL_MICRO_HATCH, label: 'Diagonal Micro-Hatch', description: 'Precision 45° hairline hatching for docks and recessed trays.', tileSizePx: 14, defaultOpacity: 0.42, glyph: '▤' },
	STARBURST_RADIAL: { id: SURFACE_PATTERN_IDS.STARBURST_RADIAL, label: 'Starburst Radial', description: 'Conic vanishing-point rays for elevated modal crowns and crests.', tileSizePx: 120, defaultOpacity: 0.48, glyph: '✦' },
} as const;

export const HULL_PROFILES = {
	CHAMFER_OCTAGON: 'CHAMFER_OCTAGON',
	CHAMFER_CORNER_POD: 'CHAMFER_CORNER_POD',
	WING_CREST: 'WING_CREST',
} as const;
export type HullProfile = (typeof HULL_PROFILES)[keyof typeof HULL_PROFILES];

export const HULL_TOKENS = {
	CHAMFER_PX: 12,
	CREST_CHAMFER_PX: 16,
	OCTAGON_CHAMFER_PX: 10,
	INNER_BEZEL_INSET_PX: 3,
	INNER_BEZEL_OPACITY: 0.35,
	CORNER_CAP_LEG_PX: 10,
	CORNER_CAP_STROKE_PX: 2,
	OUTER_STROKE_PX: 1.5,
	CHEVRON_COUNT: 5,
	CHEVRON_WIDTH_PX: 5,
	CHEVRON_GAP_PX: 3,
	CHEVRON_HEIGHT_PX: 4,
	CHEVRON_SLANT_PX: 4,
	MIN_MEASURE_WIDTH_PX: 180,
	MIN_MEASURE_HEIGHT_PX: 44,
} as const;

export interface SubstrateConfig {
	readonly radialFocusX: number;
	readonly radialFocusY: number;
	readonly bloomIntensity: number;
	readonly minorGridPx: number;
	readonly majorGridEvery: number;
	readonly minorGridOpacity: number;
	readonly majorGridOpacity: number;
	readonly crosshairArmPx: number;
	readonly crosshairOpacity: number;
	readonly hexMeshEnabled: boolean;
	readonly hexCellPx: number;
	readonly hexOpacity: number;
	readonly starDustDensity: number;
	readonly polarRingsEnabled: boolean;
	readonly parallaxAmplitudePx: number;
	readonly insetFrameMarginPx: number;
	readonly scanlineOpacity: number;
	readonly vignetteStrength: number;
}

export const SUBSTRATE_DEFAULTS: SubstrateConfig = {
	radialFocusX: 50,
	radialFocusY: 48,
	bloomIntensity: 0.85,
	minorGridPx: 20,
	majorGridEvery: 5,
	minorGridOpacity: 0.14,
	majorGridOpacity: 0.32,
	crosshairArmPx: 5,
	crosshairOpacity: 0.60,
	hexMeshEnabled: true,
	hexCellPx: 36,
	hexOpacity: 0.12,
	starDustDensity: 0.45,
	polarRingsEnabled: true,
	parallaxAmplitudePx: 4,
	insetFrameMarginPx: 12,
	scanlineOpacity: 0.08,
	vignetteStrength: 0.45,
} as const;

export const FUI_DEPTH_CONSTANTS = {
	BEVEL_CUT_PX: HULL_TOKENS.CHAMFER_PX,
	INNER_BEZEL_PX: HULL_TOKENS.INNER_BEZEL_INSET_PX,
	BRACKET_LEG_PX: HULL_TOKENS.CORNER_CAP_LEG_PX,
	PARALLAX_MAX_PX: SUBSTRATE_DEFAULTS.parallaxAmplitudePx,
	RANGE_RINGS_PX: [220, 440, 680] as const,
	DEGREE_TICKS: [0, 45, 90, 135, 180, 225, 270, 315] as const,
} as const;
