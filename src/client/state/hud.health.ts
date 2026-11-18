/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.6 Workspace Health Grade Evaluator & DOM Accessibility/Theme Sync Helpers.
 */
import {
	DOCK_PLACEMENT_MODES, HUD_THEME_PRESETS, HUD_ZONE_VISIBILITY, HUD_ZONES,
	type CornerVertex, type DockPlacementMode, type FontScalePct, type HudPerimeterZoneId, type HudThemeId, type HudZoneVisibility,
} from '@config/hud.tokens';

export interface WorkspaceHealth {
	readonly grade: string;
	readonly label: string;
}

export type LeftEdgeDrawerTab = 'EXPLORER' | 'FILES' | 'VIOLATIONS';
export type RightEdgeDrawerTab = 'VERDICT' | 'RELATIONS' | 'FORENSIC';
export type DetachableDockId = 'LEFT_EDGE' | 'RIGHT_EDGE' | 'CANVAS_TOOLBAR';
export interface DockPlacementState { readonly mode: DockPlacementMode; readonly x: number; readonly y: number; readonly railOffsetYRem: number; readonly snapped: boolean; }

export const DEFAULT_DOCKS: Record<DetachableDockId, DockPlacementState> = {
	LEFT_EDGE: { mode: DOCK_PLACEMENT_MODES.DOCKED_RAIL, x: 24, y: 96, railOffsetYRem: 0, snapped: true },
	RIGHT_EDGE: { mode: DOCK_PLACEMENT_MODES.DOCKED_RAIL, x: 1120, y: 96, railOffsetYRem: 0, snapped: true },
	CANVAS_TOOLBAR: { mode: DOCK_PLACEMENT_MODES.DOCKED_RAIL, x: 320, y: 92, railOffsetYRem: 0, snapped: true },
};

export const FOLDED_ZONES: Record<HudPerimeterZoneId, HudZoneVisibility> = {
	[HUD_ZONES.TOP_LEFT]: HUD_ZONE_VISIBILITY.FOLDED,
	[HUD_ZONES.TOP_CENTER]: HUD_ZONE_VISIBILITY.FOLDED,
	[HUD_ZONES.TOP_RIGHT]: HUD_ZONE_VISIBILITY.FOLDED,
	[HUD_ZONES.RIGHT_EDGE]: HUD_ZONE_VISIBILITY.FOLDED,
	[HUD_ZONES.BOTTOM_RIGHT]: HUD_ZONE_VISIBILITY.FOLDED,
	[HUD_ZONES.BOTTOM_CENTER]: HUD_ZONE_VISIBILITY.FOLDED,
	[HUD_ZONES.BOTTOM_LEFT]: HUD_ZONE_VISIBILITY.FOLDED,
	[HUD_ZONES.LEFT_EDGE]: HUD_ZONE_VISIBILITY.FOLDED,
};

export const UNFOLDED_ZONES: Record<HudPerimeterZoneId, HudZoneVisibility> = {
	[HUD_ZONES.TOP_LEFT]: HUD_ZONE_VISIBILITY.OPEN,
	[HUD_ZONES.TOP_CENTER]: HUD_ZONE_VISIBILITY.OPEN,
	[HUD_ZONES.TOP_RIGHT]: HUD_ZONE_VISIBILITY.OPEN,
	[HUD_ZONES.RIGHT_EDGE]: HUD_ZONE_VISIBILITY.COMPACT,
	[HUD_ZONES.BOTTOM_RIGHT]: HUD_ZONE_VISIBILITY.OPEN,
	[HUD_ZONES.BOTTOM_CENTER]: HUD_ZONE_VISIBILITY.OPEN,
	[HUD_ZONES.BOTTOM_LEFT]: HUD_ZONE_VISIBILITY.OPEN,
	[HUD_ZONES.LEFT_EDGE]: HUD_ZONE_VISIBILITY.COMPACT,
};

export const TOKEN_CSS: Record<string, string> = {
	bgCanvas: '--hud-bg', bgPanel: '--hud-panel', bgSurface: '--hud-surface', borderHairline: '--hud-border',
	textPrimary: '--hud-text', textMuted: '--hud-muted', accentPrimary: '--hud-accent-primary', accentSecondary: '--hud-accent-secondary',
	statusNominal: '--hud-nominal', statusWarning: '--hud-warning', statusDanger: '--hud-danger', gridLine: '--hud-grid',
	syntaxKeyword: '--syntax-keyword', syntaxControl: '--syntax-control', syntaxType: '--syntax-type', syntaxFn: '--syntax-fn',
	syntaxString: '--syntax-string', syntaxNumber: '--syntax-number', syntaxComment: '--syntax-comment', syntaxOperator: '--syntax-operator',
};

export function computeWorkspaceHealthGrade(violationsCount: number, entityCount: number): WorkspaceHealth {
	if (entityCount === 0) return { grade: '—', label: 'Idle' };
	const r = violationsCount / Math.max(1, entityCount);
	if (r === 0) return { grade: 'A+', label: 'Optimal' };
	if (r <= 0.15) return { grade: 'A', label: 'Nominal' };
	if (r <= 0.35) return { grade: 'B', label: 'Guarded' };
	if (r <= 0.65) return { grade: 'C', label: 'Elevated' };
	return { grade: 'D', label: 'Critical' };
}

export function applyAccessibilityDomState(opts: {
	readonly cornerStyle: CornerVertex;
	readonly fontScalePct: FontScalePct;
	readonly highContrastMode: boolean;
	readonly dyslexiaFriendlyFont: boolean;
	readonly kineticMotionEnabled: boolean;
}): void {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.style.setProperty('--hud-font-scale', String(Number((opts.fontScalePct / 100).toFixed(2))));
	root.style.setProperty('--hud-corner-cut', opts.cornerStyle === 'STRAIGHT' ? '0rem' : '0.75rem');
	root.style.setProperty('--hud-btn-corner-cut', opts.cornerStyle === 'STRAIGHT' ? '0rem' : '0.375rem');
	root.setAttribute('data-hud-corners', opts.cornerStyle);
	root.setAttribute('data-hud-contrast', opts.highContrastMode ? 'HIGH' : 'STANDARD');
	root.setAttribute('data-hud-dyslexia', opts.dyslexiaFriendlyFont ? 'true' : 'false');
	root.setAttribute('data-hud-motion', opts.kineticMotionEnabled ? 'KINETIC' : 'REDUCED');
}

export function applyPresetDomTokens(themeId: HudThemeId): void {
	if (typeof document === 'undefined') return;
	const preset = HUD_THEME_PRESETS[themeId];
	for (const v of [...Object.values(TOKEN_CSS), '--hud-accent', '--hud-brass']) document.documentElement.style.removeProperty(v);
	document.documentElement.setAttribute('data-hud-theme', themeId);
	document.documentElement.classList.toggle('dark', preset.polarity === 'DARK');
}
