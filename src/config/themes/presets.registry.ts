/**
 * @author Oblx <code@oblx.dev>
 * @description Calibrated 6 canonical themes + 4 community showcase presets with dual-phosphor accents and syntax highlight tokens (v2.5.0).
 */

export const HUD_THEME_IDS = {
	OBSIDIAN_CYBER: 'OBSIDIAN_CYBER',
	TITANIUM_NIGHT: 'TITANIUM_NIGHT',
	VOID_AMBER: 'VOID_AMBER',
	CLINICAL_LAB: 'CLINICAL_LAB',
	PAPER_ARCHITECT: 'PAPER_ARCHITECT',
	DAYLIGHT_SOLAR: 'DAYLIGHT_SOLAR',
} as const;

export type HudThemeId = (typeof HUD_THEME_IDS)[keyof typeof HUD_THEME_IDS];

export interface SyntaxPaletteTokens {
	readonly syntaxKeyword: string;
	readonly syntaxControl: string;
	readonly syntaxType: string;
	readonly syntaxFn: string;
	readonly syntaxString: string;
	readonly syntaxNumber: string;
	readonly syntaxComment: string;
	readonly syntaxOperator: string;
}

export interface HudThemePreset extends SyntaxPaletteTokens {
	readonly id: HudThemeId;
	readonly label: string;
	readonly polarity: 'DARK' | 'LIGHT';
	readonly bgCanvas: string;
	readonly bgPanel: string;
	readonly bgSurface: string;
	readonly borderHairline: string;
	readonly textPrimary: string;
	readonly textMuted: string;
	readonly accentPrimary: string;
	readonly accentSecondary: string;
	readonly brassFrame: string;
	readonly statusNominal: string;
	readonly statusWarning: string;
	readonly statusDanger: string;
	readonly gridLine: string;
	readonly coreGradientColor: string;
	readonly midGradientColor: string;
	readonly edgeGradientColor: string;
}

export const DARK_SYNTAX_DEFAULTS: SyntaxPaletteTokens = {
	syntaxKeyword: '#38BDF8', syntaxControl: '#F472B6', syntaxType: '#2DD4BF', syntaxFn: '#FBBF24',
	syntaxString: '#34D399', syntaxNumber: '#FB923C', syntaxComment: '#64748B', syntaxOperator: '#E2E8F0',
};

export const LIGHT_SYNTAX_DEFAULTS: SyntaxPaletteTokens = {
	syntaxKeyword: '#0284C7', syntaxControl: '#BE185D', syntaxType: '#0F766E', syntaxFn: '#B45309',
	syntaxString: '#15803D', syntaxNumber: '#C2410C', syntaxComment: '#64748B', syntaxOperator: '#334155',
};

export const HUD_THEME_PRESETS: Readonly<Record<HudThemeId, HudThemePreset>> = {
	OBSIDIAN_CYBER: {
		id: HUD_THEME_IDS.OBSIDIAN_CYBER, label: 'Obsidian Brass', polarity: 'DARK',
		bgCanvas: '#07090E', bgPanel: '#0C1018', bgSurface: '#131823', borderHairline: '#232B3B',
		textPrimary: '#F3EFE6', textMuted: '#989FA9', accentPrimary: '#38BDF8', accentSecondary: '#D4AF37',
		brassFrame: '#9A7D32', statusNominal: '#2EB872', statusWarning: '#E5A93B', statusDanger: '#E05252',
		gridLine: '#1E2D44', coreGradientColor: '#10243E', midGradientColor: '#0A1322', edgeGradientColor: '#05080D',
		...DARK_SYNTAX_DEFAULTS,
	},
	TITANIUM_NIGHT: {
		id: HUD_THEME_IDS.TITANIUM_NIGHT, label: 'Phosphor CRT', polarity: 'DARK',
		bgCanvas: '#060B09', bgPanel: '#0B1410', bgSurface: '#111F19', borderHairline: '#1D3329',
		textPrimary: '#E7F5EC', textMuted: '#88A697', accentPrimary: '#34D399', accentSecondary: '#FBBF24',
		brassFrame: '#228B64', statusNominal: '#34D399', statusWarning: '#FBBF24', statusDanger: '#F87171',
		gridLine: '#1A382C', coreGradientColor: '#0E2E23', midGradientColor: '#081913', edgeGradientColor: '#040907',
		...DARK_SYNTAX_DEFAULTS, syntaxKeyword: '#34D399', syntaxFn: '#FBBF24',
	},
	VOID_AMBER: {
		id: HUD_THEME_IDS.VOID_AMBER, label: 'Stealth Cobalt', polarity: 'DARK',
		bgCanvas: '#070B14', bgPanel: '#0C1220', bgSurface: '#141D30', borderHairline: '#24324E',
		textPrimary: '#ECF2FC', textMuted: '#8FA2C2', accentPrimary: '#22D3EE', accentSecondary: '#F59E0B',
		brassFrame: '#4C749E', statusNominal: '#10B981', statusWarning: '#F59E0B', statusDanger: '#EF4444',
		gridLine: '#1D3152', coreGradientColor: '#132A4A', midGradientColor: '#0B1628', edgeGradientColor: '#050911',
		...DARK_SYNTAX_DEFAULTS, syntaxKeyword: '#22D3EE', syntaxFn: '#F59E0B',
	},
	CLINICAL_LAB: {
		id: HUD_THEME_IDS.CLINICAL_LAB, label: 'Alabaster Lab', polarity: 'LIGHT',
		bgCanvas: '#F0F5FA', bgPanel: '#FFFFFF', bgSurface: '#E6EEF6', borderHairline: '#BCCCDC',
		textPrimary: '#0F172A', textMuted: '#475569', accentPrimary: '#0284C7', accentSecondary: '#D97706',
		brassFrame: '#64748B', statusNominal: '#059669', statusWarning: '#B45309', statusDanger: '#DC2626',
		gridLine: '#94A3B8', coreGradientColor: '#FFFFFF', midGradientColor: '#E8F1FA', edgeGradientColor: '#D5E3F2',
		...LIGHT_SYNTAX_DEFAULTS,
	},
	PAPER_ARCHITECT: {
		id: HUD_THEME_IDS.PAPER_ARCHITECT, label: 'Archival Vellum', polarity: 'LIGHT',
		bgCanvas: '#F4EFE6', bgPanel: '#FBF8F3', bgSurface: '#EAE2D3', borderHairline: '#C8B99E',
		textPrimary: '#1E1A14', textMuted: '#5E5548', accentPrimary: '#8C621C', accentSecondary: '#0369A1',
		brassFrame: '#B8954F', statusNominal: '#166534', statusWarning: '#B45309', statusDanger: '#B91C1C',
		gridLine: '#A8987D', coreGradientColor: '#FFFDF8', midGradientColor: '#F3ECE0', edgeGradientColor: '#E3D8C4',
		...LIGHT_SYNTAX_DEFAULTS, syntaxKeyword: '#8C621C', syntaxFn: '#0369A1',
	},
	DAYLIGHT_SOLAR: {
		id: HUD_THEME_IDS.DAYLIGHT_SOLAR, label: 'Daylight Blueprint', polarity: 'LIGHT',
		bgCanvas: '#1E5B94', bgPanel: '#F4F9FF', bgSurface: '#DCEBFE', borderHairline: '#8AB8E6',
		textPrimary: '#0F2544', textMuted: '#3E5B84', accentPrimary: '#0284C7', accentSecondary: '#EAB308',
		brassFrame: '#3B82F6', statusNominal: '#047857', statusWarning: '#C2410C', statusDanger: '#DC2626',
		gridLine: '#93C5FD', coreGradientColor: '#E8F3FF', midGradientColor: '#CFE5FC', edgeGradientColor: '#B4D4F7',
		...LIGHT_SYNTAX_DEFAULTS,
	},
} as const;

export const COMMUNITY_SHOWCASE_PRESETS = [
	{ slug: 'tokyo-phosphor', name: 'Tokyo Phosphor', authorHandle: 'oblx', polarity: 'DARK' as const, favoritesCount: 42, appliesCount: 128, baseId: HUD_THEME_IDS.OBSIDIAN_CYBER, accentPrimary: '#7AA2F7', accentSecondary: '#BB9AF7', bgCanvas: '#090D16', bgPanel: '#101524' },
	{ slug: 'amber-avionics', name: 'Amber Avionics MFD', authorHandle: 'analyst_dev', polarity: 'DARK' as const, favoritesCount: 31, appliesCount: 94, baseId: HUD_THEME_IDS.VOID_AMBER, accentPrimary: '#FFB000', accentSecondary: '#38BDF8', bgCanvas: '#0B0905', bgPanel: '#141008' },
	{ slug: 'gruvbox-foundry', name: 'Gruvbox Foundry', authorHandle: 'auditor_dev', polarity: 'DARK' as const, favoritesCount: 27, appliesCount: 76, baseId: HUD_THEME_IDS.TITANIUM_NIGHT, accentPrimary: '#8EC07C', accentSecondary: '#FABD2F', bgCanvas: '#1D2021', bgPanel: '#282828' },
	{ slug: 'swiss-drafting', name: 'Swiss Drafting Paper', authorHandle: 'viewer_dev', polarity: 'LIGHT' as const, favoritesCount: 19, appliesCount: 53, baseId: HUD_THEME_IDS.PAPER_ARCHITECT, accentPrimary: '#D9381E', accentSecondary: '#1D4ED8', bgCanvas: '#F7F5F0', bgPanel: '#FFFFFF' },
] as const;
