/**
 * @author Oblx <code@oblx.dev>
 * @description Shared multi-language test fixture corpus for forensic comprehension verification.
 */
import type { SourceFileUnit } from '../../src/core/metamodel/workspace.sources';

export const POLYGLOT_FIXTURE_CORPUS: readonly SourceFileUnit[] = [
	{
		path: 'src/core/engine/base_processor.ts',
		code: [
			'export interface ProcessorContract {',
			'\tprocessItem(value: number): number;',
			'}',
			'export class BaseProcessor implements ProcessorContract {',
			'\tpublic processItem(value: number): number {',
			'\t\tconst baseFactor: number = 2;',
			'\t\treturn value * baseFactor;',
			'\t}',
			'}',
		].join('\n'),
	},
	{
		path: 'src/core/engine/advanced_processor.ts',
		code: [
			"import { BaseProcessor, ProcessorContract } from './base_processor';",
			"import { verifyCycleB } from './cycle_b';",
			'export class AdvancedProcessor extends BaseProcessor {',
			'\tpublic override processItem(input: ProcessorContract): number {',
			'\t\tlet accumulator = 10;',
			'\t\taccumulator += 5;',
			'\t\tif (accumulator > 12) {',
			'\t\t\treturn verifyCycleB(accumulator);',
			'\t\t\taccumulator += 99;',
			'\t\t}',
			'\t\twhile (accumulator < 20) {',
			'\t\t\taccumulator++;',
			'\t\t}',
			'\t\treturn accumulator;',
			'\t}',
			'}',
		].join('\n'),
	},
	{
		path: 'src/core/engine/cycle_b.ts',
		code: [
			"import { AdvancedProcessor } from './advanced_processor';",
			'export function verifyCycleB(seed: number): number {',
			'\tconst proc = new AdvancedProcessor();',
			'\treturn proc ? seed + 1 : seed;',
			'}',
		].join('\n'),
	},
	{
		path: 'src/plugins/languages/sample_script.py',
		code: [
			'import math',
			'',
			'class TelemetryAggregator(BaseCollector):',
			'\tdef compute_window(self, samples):',
			'\t\ttotal = 0',
			'\t\tfor item in samples:',
			'\t\t\tif item > 0:',
			'\t\t\t\ttotal += item',
			'\t\treturn total',
			'',
			'def run_pipeline(data):',
			'\tagg = TelemetryAggregator()',
			'\treturn agg.compute_window(data)',
		].join('\n'),
	},
] as const;
