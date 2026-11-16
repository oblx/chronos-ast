/**
 * @author Oblx <code@oblx.dev>
 * @description Types and budgets for the Reproducible 4-Stage Chronos QA Harness.
 */

export interface QaStageResult {
	readonly stage: 'STAGE_1_INVARIANTS' | 'STAGE_2_TESTS' | 'STAGE_3_BUILD' | 'STAGE_4_CHROMIUM_E2E';
	readonly passed: boolean;
	readonly durationMs: number;
	readonly summary: string;
	readonly details?: unknown;
}

export interface QaChromiumCheckResult {
	readonly passed: boolean;
	readonly executablePath: string;
	readonly consoleErrors: readonly string[];
	readonly pageErrors: readonly string[];
	readonly durationMs: number;
	readonly verifiedSteps: readonly string[];
}

export interface QaReport {
	readonly version: string;
	readonly timestamp: string;
	readonly passed: boolean;
	readonly durationMs: number;
	readonly ephemeralUrl: string;
	readonly stages: readonly QaStageResult[];
}
