/**
 * @author Oblx <code@oblx.dev>
 * @description DaisyUI-inspired semantic CSS token definitions driven by data-ui-theme, data-ui-polarity, and data-ui-corners.
 */

export const UI_SEMANTIC_CSS_VARS = {
	PRIMARY: '--ui-primary',
	PRIMARY_CONTENT: '--ui-primary-content',
	SECONDARY: '--ui-secondary',
	SECONDARY_CONTENT: '--ui-secondary-content',
	ACCENT: '--ui-accent',
	BASE_100: '--ui-base-100',
	BASE_200: '--ui-base-200',
	BASE_300: '--ui-base-300',
	BASE_CONTENT: '--ui-base-content',
	MUTED_CONTENT: '--ui-muted-content',
	INFO: '--ui-info',
	SUCCESS: '--ui-success',
	WARNING: '--ui-warning',
	ERROR: '--ui-error',
	CORNER_CUT: '--ui-corner-cut',
	FONT_SCALE: '--ui-font-scale',
	STROKE_W: '--ui-stroke-w',
} as const;

export const UI_ROOT_ATTRIBUTES = {
	THEME: 'data-ui-theme',
	POLARITY: 'data-ui-polarity',
	CORNERS: 'data-ui-corners',
} as const;

export type UiPolarity = 'dark' | 'light';
export type UiCornerMode = 'chamfer' | 'straight';

export interface UiSemanticPalette {
	readonly primary: string;
	readonly primaryContent: string;
	readonly secondary: string;
	readonly secondaryContent: string;
	readonly accent: string;
	readonly base100: string;
	readonly base200: string;
	readonly base300: string;
	readonly baseContent: string;
	readonly mutedContent: string;
	readonly info: string;
	readonly success: string;
	readonly warning: string;
	readonly error: string;
}

export function applyUiSemanticRootAttributes(opts: {
	readonly themeId: string;
	readonly polarity: UiPolarity;
	readonly corners: UiCornerMode;
	readonly fontScalePct?: number;
	readonly strokeWidthPx?: number;
	readonly cornerCutRem?: number;
}): void {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.setAttribute(UI_ROOT_ATTRIBUTES.THEME, opts.themeId);
	root.setAttribute(UI_ROOT_ATTRIBUTES.POLARITY, opts.polarity);
	root.setAttribute(UI_ROOT_ATTRIBUTES.CORNERS, opts.corners);
	if (opts.fontScalePct !== undefined) {
		root.style.setProperty(UI_SEMANTIC_CSS_VARS.FONT_SCALE, String(opts.fontScalePct / 100));
	}
	if (opts.strokeWidthPx !== undefined) {
		root.style.setProperty(UI_SEMANTIC_CSS_VARS.STROKE_W, `${opts.strokeWidthPx}px`);
	}
	if (opts.cornerCutRem !== undefined) {
		root.style.setProperty(UI_SEMANTIC_CSS_VARS.CORNER_CUT, `${opts.cornerCutRem}rem`);
	}
}
