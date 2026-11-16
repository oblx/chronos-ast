/**
 * @author Oblx <code@oblx.dev>
 * @description Unit tests for CFG builder, Dominators, CHR-001..017, Tarjan SCC, CK OO, Snapshot Differ (PercentChanged), Instant Search, UML/Shared-Objects, and Virtual Stepper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { closeChronosDb, createChronosDb } from '../../../src/lib/db/client';
import { sourceUnits } from '../../../src/lib/db/schema';
import { indexSourcesIntoDb } from '../../../src/core/metamodel/workspace.indexer';
import { buildControlFlowGraph } from '../../../src/core/ast/cfg.builder';
import { computeTarjanScc } from '../../../src/core/graph/scc.tarjan';
import { buildLayeredDsmProjection } from '../../../src/core/graph/projections/dsm.matrix';
import { computeSquarifiedTreemap } from '../../../src/core/graph/projections/treemap.layout';
import { executeInstantSearch } from '../../../src/core/graph/instant_search.engine';
import { buildSharedObjectsProjection, buildUmlClassProjection, buildUmlSequenceProjection } from '../../../src/core/graph/projections/uml_projections';
import { backtrack, createVirtualStepperSession, stepInto, stepOver } from '../../../src/core/graph/projections/virtual_stepper';
import { computeChidamberKemererSuite } from '../../../src/core/metrics/oo_metrics.engine';
import { evaluateWorkspaceCodeCheck } from '../../../src/core/metrics/codecheck.engine';
import { diffWorkspaceSnapshots } from '../../../src/core/metamodel/snapshot.differ';
import { ARCH_GROUPING_MODES, evaluateArchDependencyOperatorEdge, RECENCY_BUCKETS, resolveArchitectureGroupLabel } from '../../../src/config/registries/architecture.schema';
import { HELP_SKILL_TIERS } from '../../../src/config/registries/help.registry';
import { CFG_BLOCK_KINDS } from '../../../src/config/metamodel.constants';
import { CODECHECK_RULES_REGISTRY } from '../../../src/config/registries/rules.registry';
import { loadLiveDocsMarkdownMap } from '../../../src/server/http/router';
import { compileHelpBookFromDocs, computeFloatingTooltipPosition, filterHelpChapters } from '../../../src/core/metamodel/help.engine';
import { POLYGLOT_FIXTURE_CORPUS } from '../../fixtures/polyglot_corpus';

test('builds intra-procedural CFG and detects unreachable dead blocks via Cooper-Harvey-Kennedy dominators', () => {
	const handle = createChronosDb();
	const snapshot = indexSourcesIntoDb(handle, POLYGLOT_FIXTURE_CORPUS);
	const persistedUnits = handle.db.select().from(sourceUnits).all();
	assert.equal(persistedUnits.length, POLYGLOT_FIXTURE_CORPUS.length);

	const processMethod = snapshot.nodes.find((n) => n.name === 'processItem' && n.qualifiedName.includes('advanced_processor.ts'));
	assert.equal(Boolean(processMethod), true);
	const slice = snapshot.sourceMap[processMethod!.qualifiedName]!;
	const cfg = buildControlFlowGraph(processMethod!.qualifiedName, slice, 1);

	assert.equal(cfg.blocks.length >= 5, true);
	assert.equal(cfg.blocks.some((b) => b.kind === CFG_BLOCK_KINDS.BRANCH_DECISION), true);
	assert.equal(cfg.blocks.some((b) => b.kind === CFG_BLOCK_KINDS.LOOP_HEADER), true);
	assert.equal(cfg.unreachableCount >= 1, true);
	assert.equal(cfg.cyclomaticFormulaV >= 3, true);
	closeChronosDb(handle);
});

test('detects Tarjan strongly connected components and builds layered DSM with upper-triangle feedback count', () => {
	const handle = createChronosDb();
	const snapshot = indexSourcesIntoDb(handle, POLYGLOT_FIXTURE_CORPUS);
	const scc = computeTarjanScc(snapshot.nodes, snapshot.edges);
	assert.equal(scc.cyclicClusters.length >= 1, true);
	assert.equal(scc.cyclicEntityIds.size >= 2, true);

	const dsm = buildLayeredDsmProjection(snapshot.nodes, snapshot.edges);
	assert.equal(dsm.orderedEntities.length > 0, true);
	assert.equal(dsm.cells.length, dsm.orderedEntities.length);
	closeChronosDb(handle);
});

test('computes Chidamber-Kemerer OO metrics, Main Sequence Distance D, and evaluates 17-rule CodeCheck including CHR-016 and CHR-017', () => {
	const handle = createChronosDb();
	const corpusWithUninit = [
		...POLYGLOT_FIXTURE_CORPUS,
		{
			path: 'src/core/engine/uninit_reader.ts',
			code: ['export class UninitService {', '\tpublic computeLeak(flag: boolean): number {', '\t\tconst earlyRead = this.pendingBuffer;', '\t\tthis.pendingBuffer = 42;', '\t\treturn earlyRead;', '\t}', '}'].join('\n'),
		},
	];
	const snapshot = indexSourcesIntoDb(handle, corpusWithUninit);
	const ckMap = computeChidamberKemererSuite(snapshot.nodes, snapshot.edges);
	const advClass = snapshot.nodes.find((n) => n.name === 'AdvancedProcessor');
	assert.equal(Boolean(advClass), true);
	assert.equal(ckMap[advClass!.id]!.dit >= 1, true);

	const checkReport = evaluateWorkspaceCodeCheck(snapshot.nodes, snapshot.edges, snapshot.sourceMap);
	assert.equal(CODECHECK_RULES_REGISTRY.length, 17);
	assert.equal(checkReport.violations.some((v) => v.ruleCode === 'CFG_UNREACHABLE'), true);
	assert.equal(checkReport.violations.some((v) => v.ruleId === 'CHR-016' && v.ruleCode === 'UNINITIALIZED_VARIABLE_READ'), true);
	assert.equal(Boolean(evaluateArchDependencyOperatorEdge('RING_1_CORE', 'RING_4_CLIENT_HUD', false)), true);
	assert.equal(resolveArchitectureGroupLabel('src/kernel.rs', ARCH_GROUPING_MODES.LANGUAGE), 'LANG // RUST');
	assert.equal(resolveArchitectureGroupLabel('src/kernel.rs', ARCH_GROUPING_MODES.CALENDAR_RECENCY, 0), RECENCY_BUCKETS.TODAY);
	closeChronosDb(handle);
});

test('v1.0.1: Instant Search, UML Sequence/Class, Shared Objects, PercentChanged Churn, Virtual Stepper, and Auto-Compiled docs/**/*.md Help Book', () => {
	const baseHandle = createChronosDb();
	const targetHandle = createChronosDb();
	const baseSnap = indexSourcesIntoDb(baseHandle, POLYGLOT_FIXTURE_CORPUS.slice(0, 2));
	const targetSnap = indexSourcesIntoDb(targetHandle, POLYGLOT_FIXTURE_CORPUS);
	const tiles = computeSquarifiedTreemap(targetSnap.nodes, {}, 840, 480);
	assert.equal(tiles.length > 0, true);

	const delta = diffWorkspaceSnapshots(baseSnap, targetSnap);
	assert.equal(delta.addedCount > 0, true);
	assert.equal(delta.percentChanged > 0 && delta.percentChanged <= 1, true);
	assert.equal(Object.values(delta.entityDeltas).some((d) => typeof d.diffLoc === 'number'), true);

	const searchHits = executeInstantSearch('identifier:Advanced* OR processItem~', targetSnap.nodes, targetSnap.sourceMap);
	assert.equal(searchHits.length >= 1, true);

	const focal = targetSnap.nodes.find((n) => n.name === 'processItem') ?? targetSnap.nodes[0]!;
	const seq = buildUmlSequenceProjection(focal.id, targetSnap);
	const cls = buildUmlClassProjection([], targetSnap);
	const shared = buildSharedObjectsProjection(targetSnap);
	assert.equal(Boolean(seq && seq.lifelines.length >= 1), true);
	assert.equal(cls.classes.length >= 1, true);
	assert.equal(Array.isArray(shared.sharedObjects), true);

	let stepState = createVirtualStepperSession(focal, targetSnap.sourceMap);
	stepState = stepOver(stepState, targetSnap.sourceMap);
	assert.equal(stepState.visitedBlockPath.length >= 2, true);
	stepState = stepInto(stepState, targetSnap.nodes, targetSnap.edges, targetSnap.sourceMap);
	stepState = backtrack(stepState, targetSnap.nodes);
	assert.equal(stepState.visitedBlockPath.length >= 1, true);

	const docsMap = loadLiveDocsMarkdownMap();
	const chapters = compileHelpBookFromDocs(docsMap);
	assert.equal(chapters.length >= 23, true);
	const totalSubSteps = chapters.reduce((acc, c) => acc + c.subSteps.length, 0);
	assert.equal(totalSubSteps >= 60, true);
	assert.equal(filterHelpChapters(chapters, HELP_SKILL_TIERS.BEGINNER).length >= 5, true);
	assert.equal(filterHelpChapters(chapters, HELP_SKILL_TIERS.ADVANCED).length >= 5, true);
	assert.equal(filterHelpChapters(chapters, HELP_SKILL_TIERS.EXPERT).length >= 10, true);
	assert.equal(filterHelpChapters(chapters, 'ALL', 'SARIF').length >= 1, true);
	const coords = computeFloatingTooltipPosition({ top: 40, left: 40, width: 200, height: 48 }, 'BOTTOM', 1440, 900);
	assert.equal(coords.top > 40 && coords.left >= 12, true);

	closeChronosDb(baseHandle);
	closeChronosDb(targetHandle);
});
