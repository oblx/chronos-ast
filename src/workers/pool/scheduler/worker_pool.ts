/**
 * @author Oblx <code@oblx.dev>
 * @description Multi-threaded worker pool scheduler coordinating AST indexing and metric jobs.
 */
import { PARSER_WORKER_CHANNELS } from '@config/constants';
import { ENV_DEFAULTS } from '@config/env.schema';
import {
	createWorkerRequest,
	type WorkerResponseEnvelope,
} from '../../protocol/envelope/message_contract';
import { executeIndexerJob } from '../../indexer/pipeline/ast_indexer.worker';
import { executeMetricsJob } from '../../metrics/reduction/metric_calculator.worker';

export class ChronosWorkerPoolScheduler {
	public readonly poolSize: number;

	public constructor(poolSize: number = ENV_DEFAULTS.WORKER_THREAD_POOL_SIZE) {
		this.poolSize = Math.max(1, poolSize);
	}

	public dispatchIndexFile(
		filePath: string,
		sourceCode: string
	): WorkerResponseEnvelope {
		const req = createWorkerRequest(
			PARSER_WORKER_CHANNELS.INDEX_FILE,
			filePath,
			sourceCode
		);
		return executeIndexerJob(req);
	}

	public dispatchCalculateMetrics(
		filePath: string,
		sourceCode: string
	): WorkerResponseEnvelope {
		const req = createWorkerRequest(
			PARSER_WORKER_CHANNELS.CALCULATE_METRICS,
			filePath,
			sourceCode
		);
		return executeMetricsJob(req);
	}
}
