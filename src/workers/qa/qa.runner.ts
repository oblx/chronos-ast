/**
 * @author Oblx <code@oblx.dev>
 * @description Reproducible 4-stage QA pipeline CLI (`bun run qa:report`) emitting structured JSON verdicts.
 */
import { APP_METADATA } from '@config/constants';
import { runCodebaseInvariantAudit } from '../auditor/invariant.auditor';
import { runChromiumSmokeCheck } from './qa.chromium';
import { startEphemeralQaServer } from './qa.ephemeral';
import { disposeSingletonQaHarness } from './qa.singleton';
import type { QaReport, QaStageResult } from './qa.types';

const STAGE_TIMEOUT_MS = 15_000;

async function runStageCommand(stage: QaStageResult['stage'], cmd: string[], timeoutMs = STAGE_TIMEOUT_MS): Promise<QaStageResult> {
	const t0 = performance.now();
	const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
	let timedOut = false;
	const timer = setTimeout(() => { timedOut = true; try { proc.kill(); } catch {} }, timeoutMs);
	const exitCode = await proc.exited;
	clearTimeout(timer);
	const [outText, errText] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	const durationMs = Math.round(performance.now() - t0);
	const outTail = outText.trim().split('\n').slice(-4).join(' | ');
	const errTail = errText.trim().split('\n').slice(-4).join(' | ');
	return {
		stage,
		passed: !timedOut && exitCode === 0,
		durationMs,
		summary: timedOut ? `Timed out after ${timeoutMs}ms` : exitCode === 0 ? (outTail || 'OK') : (errTail || outTail || `Exit ${exitCode}`),
	};
}

export async function runFullQaReport(): Promise<QaReport> {
	const t0 = performance.now();
	const stages: QaStageResult[] = [];

	const invT0 = performance.now();
	const audit = await runCodebaseInvariantAudit();
	stages.push({
		stage: 'STAGE_1_INVARIANTS', passed: audit.passed, durationMs: Math.round(performance.now() - invT0),
		summary: `Checked ${audit.checkedSourceFiles} source files and ${audit.checkedDocFiles} docs`, details: audit.passed ? undefined : audit,
	});

	stages.push(await runStageCommand('STAGE_2_TESTS', ['bun', 'test']));
	stages.push(await runStageCommand('STAGE_3_BUILD', ['bun', 'run', 'build']));

	const runtime = await startEphemeralQaServer();
	try {
		const e2eT0 = performance.now();
		const chromeRes = await Promise.race([
			runChromiumSmokeCheck(runtime.baseUrl, STAGE_TIMEOUT_MS),
			new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`STAGE_4_CHROMIUM_E2E timed out after ${STAGE_TIMEOUT_MS}ms`)), STAGE_TIMEOUT_MS)),
		]);
		stages.push({
			stage: 'STAGE_4_CHROMIUM_E2E', passed: chromeRes.passed, durationMs: Math.round(performance.now() - e2eT0),
			summary: `Chromium checks: ${chromeRes.verifiedSteps.join(', ')} (errors=${chromeRes.consoleErrors.length + chromeRes.pageErrors.length})`,
			details: chromeRes,
		});
		return {
			version: APP_METADATA.VERSION, timestamp: new Date().toISOString(),
			passed: stages.every((s) => s.passed), durationMs: Math.round(performance.now() - t0),
			ephemeralUrl: runtime.baseUrl, stages,
		};
	} finally {
		await disposeSingletonQaHarness();
		runtime.stop();
	}
}

if (import.meta.main) {
	const report = await runFullQaReport();
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	process.exit(report.passed ? 0 : 1);
}
