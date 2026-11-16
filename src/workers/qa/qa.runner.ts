/**
 * @author Oblx <code@oblx.dev>
 * @description Reproducible 4-stage QA pipeline CLI (`bun run qa:report`) emitting structured JSON verdicts.
 */
import { APP_METADATA } from '@config/constants';
import { runCodebaseInvariantAudit } from '../auditor/invariant.auditor';
import { runChromiumSmokeCheck } from './qa.chromium';
import { startEphemeralQaServer } from './qa.ephemeral';
import type { QaReport, QaStageResult } from './qa.types';

function runStageCommand(stage: QaStageResult['stage'], cmd: string[]): QaStageResult {
	const t0 = performance.now();
	const res = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' });
	const durationMs = Math.round(performance.now() - t0);
	const outTail = new TextDecoder().decode(res.stdout).trim().split('\n').slice(-4).join(' | ');
	const errTail = new TextDecoder().decode(res.stderr).trim().split('\n').slice(-4).join(' | ');
	return {
		stage,
		passed: res.exitCode === 0,
		durationMs,
		summary: res.exitCode === 0 ? (outTail || 'OK') : (errTail || outTail || `Exit ${res.exitCode}`),
	};
}

export async function runFullQaReport(): Promise<QaReport> {
	const t0 = performance.now();
	const stages: QaStageResult[] = [];

	const invT0 = performance.now();
	const audit = await runCodebaseInvariantAudit();
	stages.push({
		stage: 'STAGE_1_INVARIANTS',
		passed: audit.passed,
		durationMs: Math.round(performance.now() - invT0),
		summary: `Checked ${audit.checkedSourceFiles} source files and ${audit.checkedDocFiles} docs`,
		details: audit.passed ? undefined : audit,
	});

	stages.push(runStageCommand('STAGE_2_TESTS', ['bun', 'test']));
	stages.push(runStageCommand('STAGE_3_BUILD', ['bun', 'run', 'build']));

	const runtime = await startEphemeralQaServer();
	try {
		const e2eT0 = performance.now();
		const chromeRes = await runChromiumSmokeCheck(runtime.baseUrl, 20_000);
		stages.push({
			stage: 'STAGE_4_CHROMIUM_E2E',
			passed: chromeRes.passed,
			durationMs: Math.round(performance.now() - e2eT0),
			summary: `Chromium checks: ${chromeRes.verifiedSteps.join(', ')} (errors=${chromeRes.consoleErrors.length + chromeRes.pageErrors.length})`,
			details: chromeRes,
		});
		return {
			version: APP_METADATA.VERSION,
			timestamp: new Date().toISOString(),
			passed: stages.every((s) => s.passed),
			durationMs: Math.round(performance.now() - t0),
			ephemeralUrl: runtime.baseUrl,
			stages,
		};
	} finally {
		runtime.stop();
	}
}

if (import.meta.main) {
	const report = await runFullQaReport();
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	process.exit(report.passed ? 0 : 1);
}
