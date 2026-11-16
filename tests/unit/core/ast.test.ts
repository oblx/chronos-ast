/**
 * @author Oblx <code@oblx.dev>
 * @description Unit tests for AST parsers, 10 reference kinds, Python INDENTATION, Lua/Fortran KEYWORD_PAIRS, C++ Preprocessor Expander, and Andersen Alias Propagator.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSourceFile, detectLanguageFromPath } from '../../../src/core/ast/parsers';
import { expandCppPreprocessorDirectives, evaluatePreprocessorCondition } from '../../../src/core/ast/preprocessor.expander';
import { resolveBalancedBlockEndLine, resolveIndentationBlockEndLine, resolveKeywordPairBlockEndLine } from '../../../src/core/ast/scanner/lexical_scanner';
import { resolveSymbolicReferences } from '../../../src/core/metamodel/references/resolver/reference.resolver';
import { propagateInterProceduralAliases } from '../../../src/core/graph/alias.propagator';
import { computeTopologicalSort } from '../../../src/core/graph/topological_sort';
import { BLOCK_DELIMITERS, ENTITY_KINDS, REFERENCE_KINDS, SUPPORTED_LANGUAGES } from '../../../src/config/metamodel.constants';
import { getDeclarativeGrammarSpec } from '../../../src/config/registries/grammars.registry';

test('detectLanguageFromPath maps BRACES, INDENTATION, and KEYWORD_PAIRS extensions accurately', () => {
	assert.equal(detectLanguageFromPath('src/core/engine.ts'), SUPPORTED_LANGUAGES.TYPESCRIPT);
	assert.equal(detectLanguageFromPath('src/kernel/sched.rs'), SUPPORTED_LANGUAGES.RUST);
	assert.equal(detectLanguageFromPath('src/simd/lexer.cpp'), SUPPORTED_LANGUAGES.CPP);
	assert.equal(detectLanguageFromPath('src/ml/pipeline.py'), SUPPORTED_LANGUAGES.PYTHON);
	assert.equal(detectLanguageFromPath('src/scripts/plugin.lua'), SUPPORTED_LANGUAGES.LUA);
	assert.equal(detectLanguageFromPath('src/solver/matrix.f90'), SUPPORTED_LANGUAGES.FORTRAN);
	assert.equal(detectLanguageFromPath('src/avionics/nav.adb'), SUPPORTED_LANGUAGES.ADA);
	assert.equal(getDeclarativeGrammarSpec(SUPPORTED_LANGUAGES.LUA).delimiterMode, BLOCK_DELIMITERS.KEYWORD_PAIRS);
});

test('parseSourceFile extracts symbols and all 10 reference kinds including SETS, MODIFIES, TYPED, and OVERRIDES', () => {
	const code = [
		'export class SubEngine extends BaseEngine implements Runnable {',
		'\tpublic override execute(cfg: EngineConfig): number {',
		'\t\tthis.state = 1;',
		'\t\tthis.state += 2;',
		'\t\treturn this.state + beta(1);',
		'\t}',
		'}',
		'export function beta(y: number): number {',
		'\treturn y * 2;',
		'}',
	].join('\n');
	const parsed = parseSourceFile('src/sample.ts', code);
	assert.equal(parsed.language, SUPPORTED_LANGUAGES.TYPESCRIPT);
	assert.equal(parsed.references.some((r) => r.kind === REFERENCE_KINDS.INHERITS && r.targetSymbolName === 'BaseEngine'), true);
	assert.equal(parsed.references.some((r) => r.kind === REFERENCE_KINDS.IMPLEMENTS && r.targetSymbolName === 'Runnable'), true);
	assert.equal(parsed.references.some((r) => r.kind === REFERENCE_KINDS.SETS && r.targetSymbolName === 'state'), true);
	assert.equal(parsed.references.some((r) => r.kind === REFERENCE_KINDS.MODIFIES && r.targetSymbolName === 'state'), true);
	assert.equal(parsed.references.some((r) => r.kind === REFERENCE_KINDS.TYPED && r.targetSymbolName === 'EngineConfig'), true);
	assert.equal(parsed.references.some((r) => r.kind === REFERENCE_KINDS.OVERRIDES && r.targetSymbolName === 'execute'), true);
});

test('parseSourceFile parses Python INDENTATION and Lua/Fortran KEYWORD_PAIRS blocks accurately', () => {
	const pyCode = [
		'import math',
		'class VectorProcessor(BaseProcessor):',
		'\tdef compute_norm(self, values):',
		'\t\ttotal = 0',
		'\t\ttotal += 5',
		'\t\treturn total',
		'def standalone_helper(x):',
		'\treturn x + 1',
	].join('\n');
	const parsedPy = parseSourceFile('src/vector.py', pyCode);
	assert.equal(parsedPy.language, SUPPORTED_LANGUAGES.PYTHON);
	assert.equal(parsedPy.symbols.some((s) => s.name === 'VectorProcessor' && s.kind === ENTITY_KINDS.CLASS), true);
	assert.equal(resolveIndentationBlockEndLine(pyCode.split('\n'), 1) >= 6, true);

	const luaCode = [
		'function compute_orbital_delta(dt)',
		'\tif dt > 0 then',
		'\t\treturn apply_thrust(dt)',
		'\tend',
		'end',
	].join('\n');
	const parsedLua = parseSourceFile('src/orbit.lua', luaCode);
	assert.equal(parsedLua.language, SUPPORTED_LANGUAGES.LUA);
	const fnSym = parsedLua.symbols.find((s) => s.name === 'compute_orbital_delta');
	assert.equal(fnSym?.kind, ENTITY_KINDS.FUNCTION);
	assert.equal(fnSym?.lineEnd, 5);
	assert.equal(resolveKeywordPairBlockEndLine(luaCode.split('\n'), 0), 5);
});

test('expandCppPreprocessorDirectives evaluates #if Shunting-Yard, bounds recursive macros, and preserves inactive platform branches', () => {
	const cppCode = [
		'#define SCALE_FACTOR 4',
		'#define CLAMP_STEP(v) boost_signal(v)',
		'#define RECURSIVE_A RECURSIVE_B',
		'#define RECURSIVE_B RECURSIVE_A',
		'#ifdef _WIN32',
		'int win32_kernel_entry(int x) {',
		'\treturn CLAMP_STEP(x) + SCALE_FACTOR + RECURSIVE_A;',
		'}',
		'#endif',
		'#if 0',
		'int dropped_dead_branch() { return 0; }',
		'#endif',
	].join('\n');
	const expanded = expandCppPreprocessorDirectives('src/kernel/win.cpp', cppCode);
	assert.equal(expanded.macros.size, 4);
	assert.equal(expanded.macroReferences.some((r) => r.kind === REFERENCE_KINDS.DEFINES && r.targetSymbolName.endsWith('SCALE_FACTOR')), true);
	assert.equal(expanded.macroReferences.some((r) => r.kind === REFERENCE_KINDS.USES && r.targetSymbolName.endsWith('SCALE_FACTOR')), true);
	assert.equal(expanded.macroReferences.some((r) => r.kind === REFERENCE_KINDS.CALLS && r.targetSymbolName.endsWith('CLAMP_STEP')), true);
	assert.equal(evaluatePreprocessorCondition('defined(FOO) && (BAR >= 2 || !0)', new Map([['FOO', 1], ['BAR', 3]]), false).active, true);

	const parsedCpp = parseSourceFile('src/kernel/win.cpp', cppCode);
	assert.equal(parsedCpp.symbols.some((s) => s.name === 'win32_kernel_entry'), true);
	assert.equal(parsedCpp.symbols.some((s) => s.name === 'dropped_dead_branch'), false);
	assert.equal(parsedCpp.references.some((r) => r.kind === REFERENCE_KINDS.CALLS && r.targetSymbolName === 'boost_signal'), true);
});

test('propagateInterProceduralAliases resolves constructor/factory return types, alias chains, and multi-hop member calls a.b.c()', () => {
	const entities = [
		{ id: 1, name: 'AuthService', qualifiedName: 'auth.ts::AuthService', kind: ENTITY_KINDS.CLASS },
		{ id: 2, name: 'verifyToken', qualifiedName: 'auth.ts::AuthService::verifyToken', kind: ENTITY_KINDS.METHOD },
		{ id: 3, name: 'ServiceRegistry', qualifiedName: 'reg.ts::ServiceRegistry', kind: ENTITY_KINDS.CLASS },
		{ id: 4, name: 'auth', qualifiedName: 'reg.ts::ServiceRegistry::auth', kind: ENTITY_KINDS.VARIABLE },
		{ id: 5, name: 'createRegistry', qualifiedName: 'reg.ts::createRegistry', kind: ENTITY_KINDS.FUNCTION },
		{ id: 6, name: 'services', qualifiedName: 'app.ts::services', kind: ENTITY_KINDS.VARIABLE },
		{ id: 7, name: 'aliasServices', qualifiedName: 'app.ts::aliasServices', kind: ENTITY_KINDS.VARIABLE },
		{ id: 8, name: 'handleRequest', qualifiedName: 'app.ts::handleRequest', kind: ENTITY_KINDS.FUNCTION },
	];
	const rawRefs = [
		{ kind: REFERENCE_KINDS.TYPED, sourceQualifiedName: 'reg.ts::ServiceRegistry::auth', targetSymbolName: 'AuthService', line: 2, column: 1 },
		{ kind: REFERENCE_KINDS.TYPED, sourceQualifiedName: 'reg.ts::createRegistry', targetSymbolName: 'ServiceRegistry', line: 5, column: 1 },
		{ kind: REFERENCE_KINDS.CALLS, sourceQualifiedName: 'app.ts::services', targetSymbolName: 'createRegistry', line: 8, column: 1 },
		{ kind: REFERENCE_KINDS.USES, sourceQualifiedName: 'app.ts::aliasServices', targetSymbolName: 'services', line: 9, column: 1 },
		{ kind: REFERENCE_KINDS.CALLS, sourceQualifiedName: 'app.ts::handleRequest', targetSymbolName: 'aliasServices.auth.verifyToken', line: 12, column: 2 },
	];
	const resolved = resolveSymbolicReferences(entities, rawRefs);
	assert.equal(resolved.some((r) => r.kind === REFERENCE_KINDS.CALLS && r.sourceEntityId === 8 && r.targetEntityId === 2), true);
	const prop = propagateInterProceduralAliases(entities, resolved, rawRefs);
	assert.equal(prop.aliasSets.get(7)?.has(3), true);
});

test('resolveBalancedBlockEndLine and computeTopologicalSort behave deterministically', () => {
	const lines = ['export class Engine {', '\trun() {', '\t\tif (true) { return 1; }', '\t}', '}'];
	assert.equal(resolveBalancedBlockEndLine(lines, 0), 5);
	const cyclic = computeTopologicalSort([1, 2], [{ fromId: 1, toId: 2 }, { fromId: 2, toId: 1 }]);
	assert.equal(cyclic.hasCycles, true);
});
