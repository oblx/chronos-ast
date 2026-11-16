/**
 * @author Oblx <code@oblx.dev>
 * @description Deep-tree worker message protocol contracts for multi-threaded Bun worker pools.
 */
import { PARSER_WORKER_CHANNELS, type WorkerChannel } from '@config/constants';
import type { FileParseAnalysis } from '@core/ast/parsers';
import type { HalsteadMetricsResult } from '@core/metrics/halstead.engine';
import type { MetricReductionResult } from '@core/metrics/complexity.engine';

export interface WorkerRequestEnvelope {
	readonly requestId: string;
	readonly channel: WorkerChannel;
	readonly filePath: string;
	readonly sourceCode: string;
}

export interface WorkerResponseEnvelope {
	readonly requestId: string;
	readonly channel: WorkerChannel;
	readonly durationMicros: number;
	readonly analysis?: FileParseAnalysis;
	readonly complexity?: MetricReductionResult;
	readonly halstead?: HalsteadMetricsResult;
	readonly errorMessage?: string;
}

export function createWorkerRequest(
	channel: WorkerChannel,
	filePath: string,
	sourceCode: string
): WorkerRequestEnvelope {
	return {
		requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		channel,
		filePath,
		sourceCode,
	};
}

export function createWorkerSuccessResponse(
	request: WorkerRequestEnvelope,
	startedAtNs: number,
	payload: Omit<
		WorkerResponseEnvelope,
		'requestId' | 'channel' | 'durationMicros'
	>
): WorkerResponseEnvelope {
	const elapsedNs =
		typeof Bun !== 'undefined' ? Bun.nanoseconds() - startedAtNs : 1000;
	return {
		requestId: request.requestId,
		channel: PARSER_WORKER_CHANNELS.COMPLETION_REPORT,
		durationMicros: Math.max(1, Math.round(elapsedNs / 1000)),
		...payload,
	};
}
