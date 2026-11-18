/**
 * @author Oblx <code@oblx.dev>
 * @description Canonical css.gg-inspired 24x24 geometric vector icon registry (stroke-width="2", stroke-linecap="square", zero emojis).
 */

export const UI_ICON_NAMES = {
	BOLT: 'bolt',
	TARGET: 'target',
	DIAMOND: 'diamond',
	SUN: 'sun',
	MOON: 'moon',
	SLIDERS: 'sliders',
	HELP: 'help',
	CLOSE: 'close',
	CHEVRON_LEFT: 'chevron-left',
	CHEVRON_RIGHT: 'chevron-right',
	CHEVRON_UP: 'chevron-up',
	CHEVRON_DOWN: 'chevron-down',
	GRIP: 'grip',
	SHIELD: 'shield',
	TERMINAL: 'terminal',
	GIT_BRANCH: 'git-branch',
	GIT_PULL_REQUEST: 'git-pull-request',
	USERS: 'users',
	USER_ADD: 'user-add',
	SHARE: 'share',
	PLAY: 'play',
	PAUSE: 'pause',
	STEP_FORWARD: 'step-forward',
	SEARCH: 'search',
	LAYERS: 'layers',
	CODE: 'code',
	CHECK: 'check',
	ALERT: 'alert',
	BOOK: 'book',
	AWARD: 'award',
	EYE: 'eye',
	ACTIVITY: 'activity',
	USER: 'user',
} as const;

export const HUD_ICON_NAMES = UI_ICON_NAMES;
export type UiIconName = (typeof UI_ICON_NAMES)[keyof typeof UI_ICON_NAMES];
export type HudIconName = UiIconName;

export const UI_ICON_PATHS: Readonly<Record<UiIconName, readonly string[]>> = {
	bolt: ['M13 2L4 14h7l-1 8 9-12h-7l1-8z'],
	target: ['M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 2v3M12 19v3M2 12h3M19 12h3'],
	diamond: ['M12 2l10 10-10 10L2 12 12 2z'],
	sun: ['M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41'],
	moon: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
	sliders: ['M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'],
	help: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
	close: ['M6 6l12 12M18 6L6 18'],
	'chevron-left': ['M15 18l-6-6 6-6'],
	'chevron-right': ['M9 18l6-6-6-6'],
	'chevron-up': ['M18 15l-6-6-6 6'],
	'chevron-down': ['M6 9l6 6 6-6'],
	grip: ['M9 5h1v1H9zM14 5h1v1h-1zM9 11h1v1H9zM14 11h1v1h-1zM9 17h1v1H9zM14 17h1v1h-1z'],
	shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
	terminal: ['M4 17l6-6-6-6M12 19h8'],
	'git-branch': ['M6 3v12', 'M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M18 9a9 9 0 0 1-9 9'],
	'git-pull-request': ['M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M13 6h3a2 2 0 0 1 2 2v7', 'M6 9v12'],
	users: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
	'user-add': ['M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M20 8v6M23 11h-6'],
	share: ['M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98'],
	play: ['M5 3l14 9-14 9V3z'],
	pause: ['M6 4h4v16H6zM14 4h4v16h-4z'],
	'step-forward': ['M5 4l10 8-10 8V4z', 'M19 5v14'],
	search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
	layers: ['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
	code: ['M16 18l6-6-6-6M8 6l-6 6 6 6'],
	check: ['M20 6L9 17l-5-5'],
	alert: ['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'],
	book: ['M4 19.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
	award: ['M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M8.21 13.89L7 23l5-3 5 3-1.21-9.12'],
	eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
	activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
	user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
} as const;

export const HUD_ICON_PATHS = UI_ICON_PATHS;

export function resolveUiIconPaths(name: string): readonly string[] {
	const key = name.trim().toLowerCase() as UiIconName;
	return UI_ICON_PATHS[key] ?? UI_ICON_PATHS.diamond;
}

export const resolveHudIconPaths = resolveUiIconPaths;
