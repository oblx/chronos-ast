/**
 * @author Oblx <code@oblx.dev>
 * @description Micro-benchmark for pure functional AST Cyclomatic & Halstead reductions.
 */
import { buildComplexityAstFromSource } from '../src/core/ast/tree_sitter_bridge';
import { evaluateTotalCyclomaticComplexity } from '../src/core/metrics/complexity.engine';
import { calculateHalsteadFromSource } from '../src/core/metrics/halstead.engine';

const BENCH_ITERATIONS = 300;
const SOURCE_SAMPLE = `
export function computeMatrixFold(grid: number[][]): number {
	let acc = 0;
	for (let r = 0; r < grid.length; r++) {
		for (let c = 0; c < grid[r].length; c++) {
			if (grid[r][c] > 0 && (r % 2 === 0 || c % 3 === 0)) {
				acc += grid[r][c];
			}
		}
	}
	return acc;
}
`;

const startNs = Bun.nanoseconds();
const ast = buildComplexityAstFromSource(SOURCE_SAMPLE);
for (let i = 0; i < BENCH_ITERATIONS; i++) {
	evaluateTotalCyclomaticComplexity(ast);
	calculateHalsteadFromSource(SOURCE_SAMPLE, ast);
}
const elapsedMs = (Bun.nanoseconds() - startNs) / 1_000_000;
console.log(
	`[CHRONOS BENCH] metric_reduction.bench.ts: ${BENCH_ITERATIONS} metric folds in ${elapsedMs.toFixed(2)} ms`
);
