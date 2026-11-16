/**
 * @author Oblx <code@oblx.dev>
 * @description Integration tests for bun:sqlite WAL/statement finalization, WASM cache, Variable Tracker DFG, Deviation Templates, SARIF, MCP Server, and SVG/DOT/Compliance exports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVIATION_TEMPLATE_IDS } from '../../../src/config/registries/annotation.templates';
import { HUD_VIEWS } from '../../../src/config/constants';
import { resolveParallelTestDbUri } from '../../../src/config/env.schema';
import { ANNOTATION_KINDS, SUPPORTED_LANGUAGES } from '../../../src/config/metamodel.constants';
import { closeChronosDb, createChronosDb } from '../../../src/lib/db/client';
import { indexSourcesIntoDb } from '../../../src/core/metamodel/workspace.indexer';
import { traceVariableDataFlow } from '../../../src/core/graph/variable_tracker';
import { evaluateWorkspaceCodeCheck } from '../../../src/core/metrics/codecheck.engine';
import { createAstScannerAdapter, getCachedWasmModule } from '../../../src/plugins/languages/wasm_treesitter.plugin';
import { exportSarif210Report, importSarif210Diagnostics } from '../../../src/plugins/exporters/sarif.adapter';
import { exportGraphvizDotGraph, exportVectorSvgGraph } from '../../../src/plugins/exporters/vector_graph.exporter';
import { exportComplianceCsvReport, exportComplianceHtmlReport } from '../../../src/plugins/exporters/compliance_report.exporter';
import { attachAuditAnnotation, reindexSingleFileIncremental } from '../../../src/workers/watcher.worker';
import { handleMcpJsonRpcRequest, MCP_TOOL_NAMES } from '../../../src/workers/mcp.server';
import { loadAllTabsFromIndexedDb, saveTabToIndexedDb } from '../../../src/lib/db/indexeddb/repository/workspace.idb';
import { deserializeWorkspaceBundle, serializeWorkspaceBundle } from '../../../src/core/metamodel/workspace/serialization/bundle.serializer';
import { createChronosAiRegistry } from '../../../src/lib/ai/provider/client/ai.bridge';

test('resolveParallelTestDbUri isolates SQLite paths and closeChronosDb finalizes tracked statements cleanly', () => {
	assert.equal(resolveParallelTestDbUri(':memory:', { BUN_TEST_WORKER_ID: '4' }), ':memory:');
	assert.equal(resolveParallelTestDbUri('file:./tmp/test.sqlite', { BUN_TEST_WORKER_ID: '7' }), 'file:./tmp/test.sqlite.worker-7');
	const handle = createChronosDb(':memory:');
	const stmt = handle.prepareTracked('SELECT COUNT(*) AS cnt FROM entities');
	assert.equal(Boolean(stmt.get()), true);
	assert.equal(handle.trackedStatements.length, 1);
	closeChronosDb(handle);
	assert.equal(handle.trackedStatements.length, 0);
});

test('AstScannerPort caches compiled WebAssembly.Module once per language and spawns lightweight Worker instances', async () => {
	const minimalWasmHeader = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]).buffer;
	const scanner = createAstScannerAdapter();
	assert.equal(await scanner.loadGrammarWasm(SUPPORTED_LANGUAGES.TYPESCRIPT, minimalWasmHeader), true);
	const cachedRef1 = getCachedWasmModule(SUPPORTED_LANGUAGES.TYPESCRIPT);
	assert.equal(await scanner.loadGrammarWasm(SUPPORTED_LANGUAGES.TYPESCRIPT, minimalWasmHeader), true);
	assert.equal(cachedRef1, getCachedWasmModule(SUPPORTED_LANGUAGES.TYPESCRIPT));
	assert.equal(Boolean(scanner.createWorkerInstance(SUPPORTED_LANGUAGES.TYPESCRIPT)), true);
});

test('indexSourcesIntoDb persists entities, references, metrics, and mirrors to IndexedDB', async () => {
	const handle = createChronosDb(':memory:');
	const snapshot = indexSourcesIntoDb(handle, [
		{ path: 'src/core/alpha.ts', code: `export function computeAlpha(v: number): number {\n\tif (v > 10) {\n\t\treturn computeBeta(v);\n\t}\n\treturn v;\n}` },
		{ path: 'src/core/beta.ts', code: `export function computeBeta(x: number): number {\n\treturn x * 2;\n}` },
	]);
	assert.equal(snapshot.indexedFilesCount, 2);
	await saveTabToIndexedDb({ id: 'ws-test-offline', name: 'Offline Test Workspace', updatedAt: Date.now(), isDirty: false, snapshot });
	const loadedTabs = await loadAllTabsFromIndexedDb();
	assert.equal(loadedTabs.some((t) => t.id === 'ws-test-offline'), true);
	const restored = deserializeWorkspaceBundle(JSON.stringify(serializeWorkspaceBundle('ws-test-offline', 'Offline Test Workspace', snapshot)));
	assert.equal(restored.snapshot.nodes.length, snapshot.nodes.length);
	closeChronosDb(handle);
});

test('Sprints 6–9: Variable Tracker DFG, Structured Deviation Templates, SARIF 2.1.0, MCP JSON-RPC 2.0 Server, SVG/DOT & Compliance Exports', () => {
	const handle = createChronosDb(':memory:');
	const initialSources = [
		{
			path: 'src/core/state_engine.ts',
			code: [
				'export class StateEngine {',
				'\tpublic mutateCounter(seed: number): number {',
				'\t\tthis.counter = seed;',
				'\t\tthis.counter += 5;',
				'\t\treturn this.counter;',
				'\t\tthis.counter += 99;',
				'\t}',
				'}',
			].join('\n'),
		},
	];
	const snap1 = indexSourcesIntoDb(handle, initialSources);
	const mutateNode = snap1.nodes.find((n) => n.name === 'mutateCounter')!;
	const dfg = traceVariableDataFlow(mutateNode.id, snap1.nodes, snap1.edges);
	assert.equal((dfg?.steps.length ?? 0) >= 1, true);

	const checkBefore = evaluateWorkspaceCodeCheck(snap1.nodes, snap1.edges, snap1.sourceMap);
	const pinnedAtn = attachAuditAnnotation(handle, {
		entityKind: mutateNode.kind,
		qualifiedName: mutateNode.qualifiedName,
		tagKind: ANNOTATION_KINDS.SUPPRESS_RULE,
		ruleCode: 'CFG_UNREACHABLE',
		templateId: DEVIATION_TEMPLATE_IDS.HIS_COMPLEXITY_EXEMPTION,
		ticketId: 'HIS-WAIVER-42',
		note: 'Intentional dead-block fixture under forensic audit',
	});
	assert.equal(pinnedAtn.templateId, DEVIATION_TEMPLATE_IDS.HIS_COMPLEXITY_EXEMPTION);
	assert.equal(pinnedAtn.ticketId, 'HIS-WAIVER-42');

	const checkAfter = evaluateWorkspaceCodeCheck(snap1.nodes, snap1.edges, snap1.sourceMap, [pinnedAtn]);
	assert.equal(checkAfter.suppressedCount >= 1, true);

	const sarifDoc = exportSarif210Report(checkBefore.violations);
	assert.equal(importSarif210Diagnostics(JSON.stringify(sarifDoc), snap1.nodes).length, checkBefore.violations.length);

	const mcpList = handleMcpJsonRpcRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, snap1, [pinnedAtn]);
	assert.equal((mcpList.result as { tools: unknown[] }).tools.length, 5);
	for (const toolName of Object.values(MCP_TOOL_NAMES)) {
		const callRes = handleMcpJsonRpcRequest({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: toolName, arguments: { entityId: mutateNode.id } } }, snap1, [pinnedAtn]);
		assert.equal(Boolean(callRes.result), true);
	}

	assert.equal(exportVectorSvgGraph(HUD_VIEWS.CONTROL_FLOW, mutateNode, snap1.nodes, snap1.edges, snap1.sourceMap[mutateNode.qualifiedName]).includes('<svg'), true);
	assert.equal(exportGraphvizDotGraph(HUD_VIEWS.DATA_FLOW, mutateNode, snap1.nodes, snap1.edges).includes('digraph Chronos_DATA_FLOW'), true);
	assert.equal(exportComplianceHtmlReport('Audit WS', checkAfter.violations, [pinnedAtn]).includes('HIS-WAIVER-42'), true);
	assert.equal(exportComplianceCsvReport(checkAfter.violations, [pinnedAtn]).includes('DEVIATION_ATN'), true);

	const watchResult = reindexSingleFileIncremental(handle, initialSources, 'src/core/state_engine.ts', initialSources[0]!.code.replace('+= 5', '+= 10'));
	assert.equal(watchResult.withinBudget, true);
	assert.equal(watchResult.preservedAnnotationCount, 1);
	closeChronosDb(handle);
});

test('createChronosAiRegistry initializes optional native fetch AI provider', () => {
	const configured = createChronosAiRegistry({ provider_url: 'https://api.example.com/v1/chat/completions', provider_bearer: 'tok_secret_123' });
	assert.equal(configured.status.isConfigured, true);
});
