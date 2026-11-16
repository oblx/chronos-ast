/**
 * @author Oblx <code@oblx.dev>
 * @description Unit tests for McCarthy pure functional Cyclomatic, Halstead, and Stability engines.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { AST_NODE_TYPES } from '../../../src/config/metamodel.constants';
import {
	calculateCyclomaticMetrics,
	evaluateTotalCyclomaticComplexity,
	type ComplexityNode,
} from '../../../src/core/metrics/complexity.engine';
import { calculateHalsteadFromSource } from '../../../src/core/metrics/halstead.engine';
import {
	calculateLcom4,
	calculatePackageStability,
} from '../../../src/core/metrics/stability.engine';

test('calculateCyclomaticMetrics folds branching predicates and block depth', () => {
	const tree: ComplexityNode = {
		type: AST_NODE_TYPES.PROGRAM,
		children: [
			{
				type: AST_NODE_TYPES.BLOCK,
				children: [
					{ type: AST_NODE_TYPES.IF_STATEMENT, children: [] },
					{
						type: AST_NODE_TYPES.BLOCK,
						children: [
							{ type: AST_NODE_TYPES.FOR_STATEMENT, children: [] },
							{ type: AST_NODE_TYPES.LOGICAL_AND, children: [] },
						],
					},
				],
			},
		],
	};

	const raw = calculateCyclomaticMetrics(tree);
	assert.equal(raw.cyclomaticComplexity, 3);
	assert.equal(raw.nestingDepthMax, 2);

	const total = evaluateTotalCyclomaticComplexity(tree);
	assert.equal(total.cyclomaticComplexity, 4);
});

test('calculateHalsteadFromSource computes deterministic volume and difficulty', () => {
	const sample = `export function add(a: number, b: number): number { if (a > 0) { return a + b; } return b; }`;
	const hal = calculateHalsteadFromSource(sample);
	assert.equal(hal.volume > 20, true);
	assert.equal(hal.difficulty > 1, true);
	assert.equal(hal.effort >= hal.volume, true);
});

test('calculatePackageStability and calculateLcom4 compute coupling & cohesion', () => {
	const stability = calculatePackageStability(3, 7);
	assert.equal(stability.instabilityScaled, 700);
	assert.equal(stability.instabilityRatio, 0.7);

	const cohesive = calculateLcom4([
		{ methodName: 'm1', accessedFields: ['stateA'], calledMethods: [] },
		{ methodName: 'm2', accessedFields: ['stateA'], calledMethods: [] },
	]);
	assert.equal(cohesive, 1);

	const split = calculateLcom4([
		{ methodName: 'm1', accessedFields: ['stateA'], calledMethods: [] },
		{ methodName: 'm2', accessedFields: ['stateB'], calledMethods: [] },
	]);
	assert.equal(split, 2);
});
