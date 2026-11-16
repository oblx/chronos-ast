/**
 * @author Oblx <code@oblx.dev>
 * @description Bounded C/C++ preprocessor & macro expander with Shunting-Yard conditional evaluation and inactive-branch preservation.
 */
import { MAX_MACRO_EXPANSION_DEPTH } from '@config/constants';
import { ENTITY_KINDS, LEXICAL_CONSTANTS, REFERENCE_KINDS } from '@config/metamodel.constants';
import type { ExtractedReference, ExtractedSymbol } from './parsers';

export interface MacroDefinition {
	readonly name: string;
	readonly qualifiedName: string;
	readonly isFunctionLike: boolean;
	readonly params: readonly string[];
	readonly body: string;
	readonly line: number;
}

export interface PreprocessorExpansionResult {
	readonly expandedSource: string;
	readonly macros: ReadonlyMap<string, MacroDefinition>;
	readonly macroSymbols: readonly ExtractedSymbol[];
	readonly macroReferences: readonly ExtractedReference[];
}

const DEFINE_REGEX = /^#\s*define\s+([A-Za-z_]\w*)(?:\(([^)]*)\))?(?:\s+(.*))?$/;
const CONDITIONAL_REGEX = /^#\s*(ifdef|ifndef|if|elif|else|endif)\b(.*)$/;
const OP_PRECEDENCE: Readonly<Record<string, number>> = { '||': 1, '&&': 2, '==': 3, '!=': 3, '>=': 4, '<=': 4, '>': 4, '<': 4, '!': 5 };

function applyBinaryOrUnaryOp(op: string, stack: number[]): void {
	if (op === '!') { stack.push(stack.pop() ? 0 : 1); return; }
	const [b, a] = [stack.pop() ?? 0, stack.pop() ?? 0];
	const map: Record<string, boolean> = { '||': Boolean(a || b), '&&': Boolean(a && b), '==': a === b, '!=': a !== b, '>=': a >= b, '<=': a <= b, '>': a > b, '<': a < b };
	stack.push(map[op] ? 1 : 0);
}

export function evaluatePreprocessorCondition(
	rawExpr: string,
	definedMacros: ReadonlyMap<string, string | number>,
	inactiveBranchPreserve = true
): { readonly active: boolean; readonly hasUndefinedSymbol: boolean } {
	let hasUndefinedSymbol = false;
	const normalized = rawExpr
		.replace(/defined\s*\(\s*([A-Za-z_]\w*)\s*\)|defined\s+([A-Za-z_]\w*)/g, (_m, s1, s2) => {
			const sym = (s1 ?? s2) as string;
			if (!definedMacros.has(sym)) hasUndefinedSymbol = true;
			return definedMacros.has(sym) ? '1' : '0';
		})
		.replace(/\b([A-Za-z_]\w*)\b/g, (sym) => {
			if (!definedMacros.has(sym)) { hasUndefinedSymbol = true; return '0'; }
			const val = Number(definedMacros.get(sym));
			return Number.isFinite(val) ? String(val) : '1';
		});
	const tokens = normalized.match(/&&|\|\||==|!=|>=|<=|[!()<>]|\d+/g) ?? ['0'];
	const [values, ops]: [number[], string[]] = [[], []];
	for (const tok of tokens) {
		if (/^\d+$/.test(tok)) values.push(Number(tok));
		else if (tok === '(') ops.push(tok);
		else if (tok === ')') {
			while (ops.length && ops[ops.length - 1] !== '(') applyBinaryOrUnaryOp(ops.pop()!, values);
			ops.pop();
		} else if (OP_PRECEDENCE[tok]) {
			while (ops.length && (OP_PRECEDENCE[ops[ops.length - 1]!] ?? 0) >= OP_PRECEDENCE[tok] && tok !== '!') applyBinaryOrUnaryOp(ops.pop()!, values);
			ops.push(tok);
		}
	}
	while (ops.length) applyBinaryOrUnaryOp(ops.pop()!, values);
	return { active: (values.pop() ?? 0) !== 0 || (inactiveBranchPreserve && hasUndefinedSymbol), hasUndefinedSymbol };
}

function expandLineTokensBounded(line: string, lineNum: number, fileQualified: string, macros: ReadonlyMap<string, MacroDefinition>, macroReferences: ExtractedReference[]): string {
	let current = line;
	const recordedInLine = new Set<string>();
	for (let depth = 0; depth < MAX_MACRO_EXPANSION_DEPTH; depth++) {
		let changed = false;
		for (const [name, def] of macros) {
			if (def.isFunctionLike) {
				const fnRe = new RegExp(`\\b${name}\\s*\\(([^)]*)\\)`, 'g');
				if (!fnRe.test(current)) continue;
				current = current.replace(fnRe, (_m, rawArgs: string) => {
					changed = true;
					if (!recordedInLine.has(name)) { recordedInLine.add(name); macroReferences.push({ kind: REFERENCE_KINDS.CALLS, sourceQualifiedName: fileQualified, targetSymbolName: def.qualifiedName, line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN }); }
					const args = rawArgs.split(',').map((a) => a.trim());
					return def.params.reduce((acc, p, idx) => acc.replace(new RegExp(`\\b${p}\\b`, 'g'), args[idx] ?? p), def.body);
				});
			} else {
				const objRe = new RegExp(`\\b${name}\\b`, 'g');
				if (!objRe.test(current)) continue;
				changed = true;
				if (!recordedInLine.has(name)) { recordedInLine.add(name); macroReferences.push({ kind: REFERENCE_KINDS.USES, sourceQualifiedName: fileQualified, targetSymbolName: def.qualifiedName, line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN }); }
				current = current.replace(objRe, def.body || name);
			}
		}
		if (!changed) break;
	}
	return current;
}

export function expandCppPreprocessorDirectives(
	filePath: string,
	sourceCode: string,
	workspaceDefines: Readonly<Record<string, string | number>> = {},
	inactiveBranchPreserve = true
): PreprocessorExpansionResult {
	const fileQualified = filePath.replace(/^\.\//, '');
	const definedEnv = new Map<string, string | number>(Object.entries(workspaceDefines));
	const macros = new Map<string, MacroDefinition>();
	const macroSymbols: ExtractedSymbol[] = [];
	const macroReferences: ExtractedReference[] = [];
	const branchStack: boolean[] = [true];
	const expandedLines = sourceCode.split(/\r?\n/).map((rawLine, idx) => {
		const trimmed = rawLine.trim();
		const lineNum = idx + LEXICAL_CONSTANTS.FIRST_LINE;
		const cond = trimmed.match(CONDITIONAL_REGEX);
		if (cond) {
			const [dir, expr, parentOk] = [cond[1]!, (cond[2] ?? '').trim(), branchStack.slice(0, -1).every(Boolean)];
			if (dir === 'ifdef') branchStack.push(definedEnv.has(expr) || inactiveBranchPreserve);
			else if (dir === 'ifndef') branchStack.push(!definedEnv.has(expr) || inactiveBranchPreserve);
			else if (dir === 'if') branchStack.push(evaluatePreprocessorCondition(expr, definedEnv, inactiveBranchPreserve).active);
			else if (dir === 'elif' && branchStack.length > 1) branchStack[branchStack.length - 1] = parentOk && evaluatePreprocessorCondition(expr, definedEnv, inactiveBranchPreserve).active;
			else if (dir === 'else' && branchStack.length > 1) branchStack[branchStack.length - 1] = parentOk && (!branchStack[branchStack.length - 1] || inactiveBranchPreserve);
			else if (dir === 'endif' && branchStack.length > 1) branchStack.pop();
			return '';
		}
		if (!branchStack.every(Boolean)) return '';
		const def = trimmed.match(DEFINE_REGEX);
		if (def?.[1]) {
			const [name, isFn, body] = [def[1], def[2] !== undefined, (def[3] ?? '1').trim()];
			const params = isFn ? def[2]!.split(',').map((p) => p.trim()).filter(Boolean) : [];
			const qName = `${fileQualified}${LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR}${name}`;
			definedEnv.set(name, body);
			macros.set(name, { name, qualifiedName: qName, isFunctionLike: isFn, params, body, line: lineNum });
			macroSymbols.push({ kind: isFn ? ENTITY_KINDS.FUNCTION : ENTITY_KINDS.VARIABLE, name, qualifiedName: qName, lineStart: lineNum, colStart: LEXICAL_CONSTANTS.FIRST_COLUMN, lineEnd: lineNum, colEnd: LEXICAL_CONSTANTS.FIRST_COLUMN, sourceSlice: rawLine });
			macroReferences.push({ kind: REFERENCE_KINDS.DEFINES, sourceQualifiedName: fileQualified, targetSymbolName: qName, line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN });
			return '';
		}
		return expandLineTokensBounded(rawLine, lineNum, fileQualified, macros, macroReferences);
	});
	return { expandedSource: expandedLines.join('\n'), macros, macroSymbols, macroReferences };
}
