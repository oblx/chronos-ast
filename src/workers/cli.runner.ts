/**
 * @author Oblx <code@oblx.dev>
 * @description Headless CLI static analysis and CodeCheck governance runner inside src/workers/.
 */
import { RULE_SEVERITIES } from '@config/registries/rules.registry';
import { bootstrapDefaultWorkspace } from '@core/metamodel/workspace.indexer';
import { evaluateWorkspaceCodeCheck } from '@core/metrics/codecheck.engine';
import { computeTarjanScc } from '@core/graph/scc.tarjan';

export interface CliCheckSummary {
	readonly indexedFilesCount: number;
	readonly entityCount: number;
	readonly referenceCount: number;
	readonly cyclicClusterCount: number;
	readonly totalViolations: number;
	readonly blockerCount: number;
	readonly criticalCount: number;
	readonly exitCode: number;
}

export async function runHeadlessCliCheck(): Promise<CliCheckSummary> {
	const { snapshot } = await bootstrapDefaultWorkspace();
	const scc = computeTarjanScc(snapshot.nodes, snapshot.edges);
	const check = evaluateWorkspaceCodeCheck(snapshot.nodes, snapshot.edges, snapshot.sourceMap);
	const blockerCount = check.violations.filter((v) => v.severity === RULE_SEVERITIES.BLOCKER).length;
	const criticalCount = check.violations.filter((v) => v.severity === RULE_SEVERITIES.CRITICAL).length;

	return {
		indexedFilesCount: snapshot.indexedFilesCount,
		entityCount: snapshot.nodes.length,
		referenceCount: snapshot.edges.length,
		cyclicClusterCount: scc.cyclicClusters.length,
		totalViolations: check.violations.length,
		blockerCount,
		criticalCount,
		exitCode: blockerCount > 0 ? 3 : 0,
	};
}

if (typeof Bun !== 'undefined' && import.meta.main) {
	const summary = await runHeadlessCliCheck();
	console.log(JSON.stringify(summary, null, 2));
}
