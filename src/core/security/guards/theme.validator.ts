/**
 * @author Oblx <code@oblx.dev>
 * @description Strict CSS token & theme payload validator preventing stored CSS injection across connected multiplayer operators (v2.5.0).
 */
import { DARK_SYNTAX_DEFAULTS, HUD_THEME_PRESETS, LIGHT_SYNTAX_DEFAULTS } from '@config/themes/presets.registry';

export interface ValidatedThemeTokens {
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
	readonly syntaxKeyword: string;
	readonly syntaxControl: string;
	readonly syntaxType: string;
	readonly syntaxFn: string;
	readonly syntaxString: string;
	readonly syntaxNumber: string;
	readonly syntaxComment: string;
	readonly syntaxOperator: string;
	readonly minorGridPx?: number;
	readonly crosshairOpacity?: number;
	readonly bloomIntensity?: number;
}

export interface ThemeValidationResult {
	readonly valid: boolean;
	readonly error?: string;
	readonly name?: string;
	readonly slug?: string;
	readonly polarity?: 'DARK' | 'LIGHT';
	readonly tokens?: ValidatedThemeTokens;
}

const COLOR_KEYS: ReadonlyArray<keyof ValidatedThemeTokens> = [
	'bgCanvas', 'bgPanel', 'bgSurface', 'borderHairline', 'textPrimary', 'textMuted',
	'accentPrimary', 'accentSecondary', 'brassFrame', 'statusNominal', 'statusWarning', 'statusDanger',
	'gridLine', 'coreGradientColor', 'midGradientColor', 'edgeGradientColor',
	'syntaxKeyword', 'syntaxControl', 'syntaxType', 'syntaxFn', 'syntaxString', 'syntaxNumber', 'syntaxComment', 'syntaxOperator',
];

const NUMERIC_BOUNDS: Readonly<Record<string, { readonly min: number; readonly max: number }>> = {
	minorGridPx: { min: 8, max: 64 },
	crosshairOpacity: { min: 0, max: 1 },
	bloomIntensity: { min: 0, max: 1 },
};

const ALLOWED_TOKEN_KEYS = new Set<string>([...COLOR_KEYS, ...Object.keys(NUMERIC_BOUNDS)]);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6,8}$/;
const FORBIDDEN_CSS_RE = /[;{}<>]|url\s*\(|expression\s*\(|javascript:|@import/i;

export function hasCssInjectionVector(input: string): boolean {
	return FORBIDDEN_CSS_RE.test(input);
}

export function validateThemeTokensObject(
	rawTokens: unknown,
	polarity: 'DARK' | 'LIGHT' = 'DARK'
): { readonly valid: boolean; readonly error?: string; readonly tokens?: ValidatedThemeTokens } {
	if (!rawTokens || typeof rawTokens !== 'object' || Array.isArray(rawTokens)) {
		return { valid: false, error: 'Theme tokens must be a plain JSON object.' };
	}
	const record = rawTokens as Record<string, unknown>;
	for (const key of Object.keys(record)) {
		if (!ALLOWED_TOKEN_KEYS.has(key)) {
			return { valid: false, error: `Unknown or disallowed theme token key: ${key}` };
		}
		const val = record[key];
		if (typeof val === 'string' && hasCssInjectionVector(val)) {
			return { valid: false, error: `CSS injection vector rejected in token '${key}'.` };
		}
	}
	const base = polarity === 'LIGHT' ? HUD_THEME_PRESETS.CLINICAL_LAB : HUD_THEME_PRESETS.OBSIDIAN_CYBER;
	const synBase = polarity === 'LIGHT' ? LIGHT_SYNTAX_DEFAULTS : DARK_SYNTAX_DEFAULTS;
	const merged: Record<string, string | number> = { ...base, ...synBase };

	for (const cKey of COLOR_KEYS) {
		const rawVal = record[cKey];
		if (rawVal === undefined) continue;
		if (typeof rawVal !== 'string' || !HEX_COLOR_RE.test(rawVal.trim())) {
			return { valid: false, error: `Token '${cKey}' must match strict hex grammar ^#[0-9a-fA-F]{6,8}$.` };
		}
		merged[cKey] = rawVal.trim().toUpperCase();
	}

	for (const [nKey, range] of Object.entries(NUMERIC_BOUNDS)) {
		const rawNum = record[nKey];
		if (rawNum === undefined) continue;
		const num = Number(rawNum);
		if (!Number.isFinite(num) || num < range.min || num > range.max) {
			return { valid: false, error: `Numeric token '${nKey}' must be within [${range.min}, ${range.max}].` };
		}
		merged[nKey] = num;
	}
	return { valid: true, tokens: merged as unknown as ValidatedThemeTokens };
}

export function validateCustomThemePayload(payload: unknown): ThemeValidationResult {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return { valid: false, error: 'Invalid theme payload body.' };
	}
	const body = payload as Record<string, unknown>;
	const rawName = String(body.name ?? '').trim();
	if (rawName.length < 2 || rawName.length > 48 || hasCssInjectionVector(rawName)) {
		return { valid: false, error: 'Theme name must be 2..48 safe characters without CSS delimiters.' };
	}
	const polarity = body.polarity === 'LIGHT' ? 'LIGHT' : body.polarity === 'DARK' ? 'DARK' : null;
	if (!polarity) return { valid: false, error: 'Theme polarity must be DARK or LIGHT.' };
	const slug = String(body.slug ?? rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 40);
	if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { valid: false, error: 'Theme slug must be alphanumeric kebab-case.' };

	let parsedTokens: unknown = body.tokens ?? body.tokensJson;
	if (typeof parsedTokens === 'string') {
		if (hasCssInjectionVector(parsedTokens)) return { valid: false, error: 'CSS injection tokens rejected in tokensJson.' };
		try { parsedTokens = JSON.parse(parsedTokens); } catch { return { valid: false, error: 'Invalid tokensJson syntax.' }; }
	}
	const tokenRes = validateThemeTokensObject(parsedTokens, polarity);
	if (!tokenRes.valid || !tokenRes.tokens) return { valid: false, error: tokenRes.error };
	return { valid: true, name: rawName, slug, polarity, tokens: tokenRes.tokens };
}
