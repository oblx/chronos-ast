/**
 * @author Oblx <code@oblx.dev>
 * @description Micro-benchmark for Chronos multi-language AST parser throughput.
 */
import { parseSourceFile } from '../src/core/ast/parsers';

const BENCH_ITERATIONS = 250;
const SAMPLE_TS_SOURCE = `
export class TelemetryAggregator {
	public evaluate(samples: number[]): number {
		let sum = 0;
		for (let i = 0; i < samples.length; i++) {
			if (samples[i] > 10 && samples[i] < 1000) {
				sum += samples[i];
			}
		}
		return sum;
	}
}
`;

const startNs = Bun.nanoseconds();
let totalSymbols = 0;
for (let i = 0; i < BENCH_ITERATIONS; i++) {
	const res = parseSourceFile('src/bench/aggregator.ts', SAMPLE_TS_SOURCE);
	totalSymbols += res.symbols.length;
}
const elapsedMs = (Bun.nanoseconds() - startNs) / 1_000_000;
console.log(
	`[CHRONOS BENCH] parser.bench.ts: ${BENCH_ITERATIONS} parses (${totalSymbols} symbols) in ${elapsedMs.toFixed(2)} ms`
);
