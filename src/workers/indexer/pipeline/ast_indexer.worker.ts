/**
 * @author Oblx <code@oblx.dev>
 * @description Deep-tree Bun Worker pipeline for incremental AST indexing.
 */
import { parseSourceFile } from '@core/ast/parsers';
import { evaluateTotalCyclomaticComplexity } from '@core/metrics/complexity.engine';
import { calculateHalsteadFromSource } from '@core/metrics/halstead.engine';
import {
	createWorkerSuccessResponse,
	type WorkerRequestEnvelope,
	type WorkerResponseEnvelope,
} from '../../protocol/envelope/message_contract';

export function executeIndexerJob(
	request: WorkerRequestEnvelope
): WorkerResponseEnvelope {
	const startNs = typeof Bun !== 'undefined' ? Bun.nanoseconds() : 0;
	const analysis = parseSourceFile(request.filePath, request.sourceCode);
	const complexity = evaluateTotalCyclomaticComplexity(analysis.astRoot);
	const halstead = calculateHalsteadFromSource(
		request.sourceCode,
		analysis.astRoot
	);
	return createWorkerSuccessResponse(request, startNs, {
		analysis,
		complexity,
		halstead,
	});
}
