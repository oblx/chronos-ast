/**
 * @author Oblx <code@oblx.dev>
 * @description Fluid rem/% typography, accessibility scaling, and kinetic motion tokens for @chronos-ui/svelte.
 */

export const FONT_SCALE_OPTIONS = [85, 100, 115, 130] as const;
export type FontScalePct = (typeof FONT_SCALE_OPTIONS)[number];

export const UI_TYPOGRAPHY_TOKENS = {
	BASE_FONT_REM: 0.875,
	COMPACT_FONT_REM: 0.75,
	MICRO_FONT_REM: 0.6875,
	DISPLAY_HEADING_REM: 1.125,
	LINE_HEIGHT_BODY: 1.55,
	LINE_HEIGHT_TIGHT: 1.25,
	MODAL_CLOSE_SIZE_REM: 2.25,
	RAIL_COLLAPSED_W_REM: 3,
	BOTTOM_DOCK_H_REM: 8.25,
} as const;

export const UI_MOTION_TOKENS = {
	HOVER_LIFT_PX: -2,
	HOVER_DURATION_MS: 220,
	ACTIVE_SCALE: 0.985,
	ACTIVE_TRANSLATE_Y_PX: 1,
	ACTIVE_RECOVERY_MS: 90,
	BORDER_LUMINOSITY_MS: 150,
	MODAL_RESIZE_DURATION_MS: 220,
	RESIZE_SPRING_MS: 220,
	MODAL_RESIZE_EASING: 'cubic-bezier(0.22, 1, 0.36, 1)',
	DIRECTIONAL_FLY_MS: 160,
	DIRECTIONAL_FLY_X_PX: 14,
	DIRECTIONAL_FLY_Y_PX: 8,
} as const;

export const UI_GLYPHS = {
	BRAND_CREST: '◈',
	FOCAL_RETICLE: '⌖',
	ENTITY_CLASS: '⬡',
	ENTITY_FUNCTION: '❖',
	ENTITY_VARIABLE: '⌬',
	EDGE_SIGNAL: '⟡',
	HIGH_ENERGY: '↯',
	STEALTH_MODE: '◰',
	POLARITY_SPLIT: '◐',
	SETTINGS_GEAR: '⎈',
	SUN_LIGHT: '☼',
	MOON_DARK: '☾',
} as const;
