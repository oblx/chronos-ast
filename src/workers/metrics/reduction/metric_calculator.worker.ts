/**
 * @author Oblx <code@oblx.dev>
 * @description Deep-tree Bun Worker pipeline for pure functional metric reductions.
 */
import { buildComplexityAstFromSource } from '@core/ast/tree_sitter_bridge';
import { evaluateTotalCyclomaticComplexity } from '@core/metrics/complexity.engine';
import { calculateHalsteadFromSource } from '@core/metrics/halstead.engine';
import {
	createWorkerSuccessResponse,
	type WorkerRequestEnvelope,
	type WorkerResponseEnvelope,
} from '../../protocol/envelope/message_contract';

export function executeMetricsJob(
	request: WorkerRequestEnvelope
): WorkerResponseEnvelope {
	const startNs = typeof Bun !== 'undefined' ? Bun.nanoseconds() : 0;
	const astRoot = buildComplexityAstFromSource(request.sourceCode);
	const complexity = evaluateTotalCyclomaticComplexity(astRoot);
	const halstead = calculateHalsteadFromSource(request.sourceCode, astRoot);
	return createWorkerSuccessResponse(request, startNs, {
		complexity,
		halstead,
	});
}
