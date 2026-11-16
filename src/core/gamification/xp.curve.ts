/**
 * @author Oblx <code@oblx.dev>
 * @description Canonical Chronos Cubic Experience Curve Engine (Levels 1 to 100, 1M Cumulative XP).
 */

export const XP_CURVE_PRESETS = {
	MEDIUM_FAST: 'MEDIUM_FAST',
	MEDIUM_SLOW: 'MEDIUM_SLOW',
} as const;
export type XpCurvePreset = (typeof XP_CURVE_PRESETS)[keyof typeof XP_CURVE_PRESETS];

export const MAX_GAMIFICATION_LEVEL = 100 as const;
export const MIN_GAMIFICATION_LEVEL = 1 as const;
export const MAX_LEVEL_XP_MEDIUM_FAST = 1_000_000 as const;
export const MAX_LEVEL_XP_MEDIUM_SLOW = 1_059_860 as const;

export interface GamificationLevelProgress {
	readonly level: number;
	readonly currentLevel: number;
	readonly totalXp: number;
	readonly currentLevelBaseXp: number;
	readonly nextLevelTargetXp: number;
	readonly currentLevelXp: number;
	readonly xpForNextLevel: number;
	readonly levelProgressRatio: number;
	readonly ratio: number;
	readonly rankTitle: string;
	readonly curvePreset: XpCurvePreset;
}

const MEDIUM_FAST_TABLE: readonly number[] = Array.from({ length: 101 }, (_, n) => (n <= 1 ? 0 : Math.round(n * n * n)));

const MEDIUM_SLOW_TABLE: readonly number[] = Array.from({ length: 101 }, (_, n) => {
	if (n <= 1) return 0;
	return Math.floor(1.2 * n * n * n - 15 * n * n + 100 * n - 140);
});

export function getRankTitle(level: number): string {
	if (level >= 100) return 'Living Obelisk // SSS+';
	if (level >= 75) return 'Grand Archon';
	if (level >= 50) return 'Master Sentinel';
	if (level >= 25) return 'Principal Architect';
	if (level >= 10) return 'Journeyman Navigator';
	return 'Apprentice Cartographer';
}

export function calculateXpForLevel(level: number, preset: XpCurvePreset = XP_CURVE_PRESETS.MEDIUM_FAST): number {
	const clamped = Math.max(MIN_GAMIFICATION_LEVEL, Math.min(MAX_GAMIFICATION_LEVEL, Math.floor(level)));
	const table = preset === XP_CURVE_PRESETS.MEDIUM_SLOW ? MEDIUM_SLOW_TABLE : MEDIUM_FAST_TABLE;
	return table[clamped] ?? 0;
}

export function calculateLevelFromXp(rawXp: number, preset: XpCurvePreset = XP_CURVE_PRESETS.MEDIUM_FAST): GamificationLevelProgress {
	const totalXp = Math.max(0, Math.floor(rawXp));
	const table = preset === XP_CURVE_PRESETS.MEDIUM_SLOW ? MEDIUM_SLOW_TABLE : MEDIUM_FAST_TABLE;
	const maxThreshold = table[MAX_GAMIFICATION_LEVEL]!;

	if (totalXp >= maxThreshold) {
		return {
			level: MAX_GAMIFICATION_LEVEL,
			currentLevel: MAX_GAMIFICATION_LEVEL,
			totalXp,
			currentLevelBaseXp: maxThreshold,
			nextLevelTargetXp: maxThreshold,
			currentLevelXp: 0,
			xpForNextLevel: 1,
			levelProgressRatio: 1.0,
			ratio: 1.0,
			rankTitle: getRankTitle(MAX_GAMIFICATION_LEVEL),
			curvePreset: preset,
		};
	}

	let low = MIN_GAMIFICATION_LEVEL;
	let high = MAX_GAMIFICATION_LEVEL;
	let level: number = MIN_GAMIFICATION_LEVEL;

	while (low <= high) {
		const mid = (low + high) >> 1;
		if (table[mid]! <= totalXp) {
			level = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	const base = table[level]!;
	const target = table[level + 1] ?? base;
	const span = target - base;
	const ratio = span > 0 ? Number(((totalXp - base) / span).toFixed(4)) : 1.0;

	return {
		level,
		currentLevel: level,
		totalXp,
		currentLevelBaseXp: base,
		nextLevelTargetXp: target,
		currentLevelXp: totalXp - base,
		xpForNextLevel: Math.max(1, span),
		levelProgressRatio: Math.max(0, Math.min(1, ratio)),
		ratio: Math.max(0, Math.min(1, ratio)),
		rankTitle: getRankTitle(level),
		curvePreset: preset,
	};
}
