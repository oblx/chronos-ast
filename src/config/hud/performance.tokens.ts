/**
 * @author Oblx <code@oblx.dev>
 * @description Performance profiles and hardware bounds for 7" Orange Pi Zero (512MB RAM, Mali-400 GPU, 800x480 / 1024x600).
 */

export const PERFORMANCE_PROFILES = {
	DESKTOP_WQHD: 'DESKTOP_WQHD',
	BALANCED: 'BALANCED',
	SBC_512MB: 'SBC_512MB',
} as const;
export type PerformanceProfileId = (typeof PERFORMANCE_PROFILES)[keyof typeof PERFORMANCE_PROFILES];

export const SBC_512MB_PROFILE = {
	id: PERFORMANCE_PROFILES.SBC_512MB,
	name: 'Low-Memory 512MB SBC Profile',
	maxVisibleDomNodes: 350,
	sqliteCachePages: -4000,
	sqlitePragmaCache: 'PRAGMA cache_size = -4000;',
	sqlitePragmaTempStore: 'PRAGMA temp_store = MEMORY;',
	backdropFilterEnabled: false,
	multiPassShadowsEnabled: false,
	fpsThrottle: 30,
	canvasDirtyThresholdMs: 32,
	maxCachedSnapshots: 1,
} as const;

export const STANDARD_PERFORMANCE_PROFILE = {
	id: PERFORMANCE_PROFILES.DESKTOP_WQHD,
	name: 'Standard Desktop/WQHD Profile',
	maxVisibleDomNodes: 2500,
	sqliteCachePages: -20000,
	sqlitePragmaCache: 'PRAGMA cache_size = -20000;',
	sqlitePragmaTempStore: 'PRAGMA temp_store = MEMORY;',
	backdropFilterEnabled: true,
	multiPassShadowsEnabled: true,
	fpsThrottle: 60,
	canvasDirtyThresholdMs: 16,
	maxCachedSnapshots: 8,
} as const;

let manualSbcOverride: boolean | null = null;

export function setManualSbcOverride(enabled: boolean | null): void {
	manualSbcOverride = enabled;
}

export function detectIsSbcLowSpec(): boolean {
	if (manualSbcOverride !== null) return manualSbcOverride;
	if (typeof navigator !== 'undefined') {
		const devMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
		if (devMem !== undefined && devMem <= 1) return true;
	}
	if (typeof window !== 'undefined') {
		const isSmallScreen = window.innerWidth <= 1024 && window.innerHeight <= 640;
		if (isSmallScreen) return true;
	}
	return false;
}

export function getActivePerformanceProfile(): typeof SBC_512MB_PROFILE | typeof STANDARD_PERFORMANCE_PROFILE {
	return detectIsSbcLowSpec() ? SBC_512MB_PROFILE : STANDARD_PERFORMANCE_PROFILE;
}
