/**
 * @author Oblx <code@oblx.dev>
 * @description Multi-paradigm CST/AST scope-stack scanner (BRACES, INDENTATION, KEYWORD_PAIRS) with 10-kind reference & alias extraction.
 */
import { KEYWORD_BLOCK_PATTERNS, type LanguageGrammarSpec, type SymbolGrammarRule } from '@config/registries/grammars.registry';
import { BLOCK_DELIMITERS, LEXICAL_CONSTANTS, type BlockDelimiterMode } from '@config/metamodel.constants';
import { ENTITY_KINDS, REFERENCE_KINDS, type EntityKind } from '@lib/db/schema';
import type { ExtractedReference, ExtractedSymbol } from '../parsers';

export type { LanguageGrammarSpec, SymbolGrammarRule };

interface ScopeStackFrame { readonly qualifiedName: string; readonly kind: EntityKind; readonly lineEnd: number; readonly baseClass?: string; }

const INHERITS_REGEX = /\b(?:extends\s+([A-Za-z_]\w*)|class\s+[A-Za-z_]\w*\s*\(\s*([A-Za-z_]\w*)\s*\))/;
const IMPLEMENTS_REGEX = /\bimplements\s+([A-Za-z_][\w,\s]*)/;
const MEMBER_SET_REGEX = /\b(?:this|self)\.([A-Za-z_]\w*)\s*=(?!=)/g;
const MODIFIES_REGEX = /\b(?:(?:this|self)\.)?([A-Za-z_]\w*)(?:\s*(?:\+=|-=|\*=|\/=|\+\+|--)|\.(?:push|pop|splice|set|delete)\s*\()/g;
const MEMBER_USE_REGEX = /\b(?:this|self)\.([A-Za-z_]\w*)(?!\s*(?:[=(]|\+=|-=|\*=|\/=|\+\+|--))/g;
const TYPED_ANNOTATION_REGEX = /(?::\s*(?:readonly\s+)?|->\s*)([A-Z][A-Za-z0-9_]*)/g;
const ALIAS_RHS_REGEX = /=\s*(?:new\s+([A-Za-z_]\w*)\s*\(|([A-Za-z_]\w*)\s*\(|(?:this\.|self\.)?([A-Za-z_]\w*)\s*;?$)/;
const CHAINED_CALL_REGEX = /\b([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\s*\(/g;

export function isCommentOrEmptyLine(trimmed: string, extraPrefixes?: readonly string[]): boolean {
	return !trimmed || (extraPrefixes ?? LEXICAL_CONSTANTS.COMMENT_PREFIXES).some((prefix) => trimmed.startsWith(prefix));
}

export function resolveIndentationBlockEndLine(lines: readonly string[], startIdx: number): number {
	const baseIndent = (lines[startIdx] ?? '').search(/\S/);
	if (baseIndent < 0) return startIdx + 1;
	let lastContentLine = startIdx + 1;
	for (let i = startIdx + 1; i < lines.length; i++) {
		const raw = lines[i] ?? '';
		if (isCommentOrEmptyLine(raw.trim())) continue;
		if (raw.search(/\S/) <= baseIndent) return lastContentLine;
		lastContentLine = i + 1;
	}
	return lastContentLine;
}

export function resolveKeywordPairBlockEndLine(
	lines: readonly string[],
	startIdx: number,
	openRegex: RegExp = KEYWORD_BLOCK_PATTERNS.DEFAULT_OPENER,
	closeRegex: RegExp = KEYWORD_BLOCK_PATTERNS.DEFAULT_CLOSER
): number {
	let depth = 0;
	for (let i = startIdx; i < lines.length; i++) {
		const trimmed = (lines[i] ?? '').trim();
		if (isCommentOrEmptyLine(trimmed, ['--', '#', '!', '//', '/*'])) continue;
		if (closeRegex.test(trimmed)) { if (--depth <= 0) return i + 1; continue; }
		if (openRegex.test(trimmed)) depth++;
		if (/\bend\b$/i.test(trimmed) && i > startIdx && --depth <= 0) return i + 1;
	}
	return Math.min(lines.length, startIdx + LEXICAL_CONSTANTS.FALLBACK_SLICE_SPAN);
}

export function resolveBalancedBlockEndLine(lines: readonly string[], startIdx: number, mode: BlockDelimiterMode = BLOCK_DELIMITERS.BRACES, openRegex?: RegExp, closeRegex?: RegExp): number {
	if (mode === BLOCK_DELIMITERS.INDENTATION) return resolveIndentationBlockEndLine(lines, startIdx);
	if (mode === BLOCK_DELIMITERS.KEYWORD_PAIRS) return resolveKeywordPairBlockEndLine(lines, startIdx, openRegex, closeRegex);
	let [depth, enteredBlock] = [0, false];
	for (let i = startIdx; i < lines.length; i++) {
		const line = lines[i] ?? '';
		for (let c = 0; c < line.length; c++) {
			if (line[c] === '{') { depth++; enteredBlock = true; }
			else if (line[c] === '}' && (depth--, enteredBlock && depth <= 0)) return i + 1;
		}
		if (!enteredBlock && (line.trim().endsWith(';') || (i === startIdx && line.includes('=>')))) return i + 1;
	}
	return Math.min(lines.length, startIdx + LEXICAL_CONSTANTS.FALLBACK_SLICE_SPAN);
}

function extractHeritageMutationAndTypeRefs(trimmed: string, lineNum: number, enclosingScope: string, references: ExtractedReference[]): string | undefined {
	const inheritMatch = trimmed.match(INHERITS_REGEX);
	const baseClass = inheritMatch?.[1] ?? inheritMatch?.[2];
	const pushRef = (kind: ExtractedReference['kind'], targetSymbolName: string) =>
		references.push({ kind, sourceQualifiedName: enclosingScope, targetSymbolName, line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN });
	if (baseClass) pushRef(REFERENCE_KINDS.INHERITS, baseClass);
	for (const contract of (trimmed.match(IMPLEMENTS_REGEX)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)) pushRef(REFERENCE_KINDS.IMPLEMENTS, contract);
	for (const m of trimmed.matchAll(MODIFIES_REGEX)) if (m[1] && !LEXICAL_CONSTANTS.CONTROL_FLOW_KEYWORDS.has(m[1])) pushRef(REFERENCE_KINDS.MODIFIES, m[1]);
	for (const m of trimmed.matchAll(MEMBER_SET_REGEX)) if (m[1]) pushRef(REFERENCE_KINDS.SETS, m[1]);
	for (const m of trimmed.matchAll(MEMBER_USE_REGEX)) if (m[1]) pushRef(REFERENCE_KINDS.USES, m[1]);
	for (const m of trimmed.matchAll(TYPED_ANNOTATION_REGEX)) if (m[1]) pushRef(REFERENCE_KINDS.TYPED, m[1]);
	return baseClass;
}

function extractLineSymbols(line: string, trimmed: string, idx: number, lines: readonly string[], grammar: LanguageGrammarSpec, symbols: ExtractedSymbol[], references: ExtractedReference[], scopeStack: ScopeStackFrame[]): void {
	const lineNum = idx + LEXICAL_CONSTANTS.FIRST_LINE;
	while (scopeStack.length > 1 && lineNum > scopeStack[scopeStack.length - 1]!.lineEnd) scopeStack.pop();
	const parentFrame = scopeStack[scopeStack.length - 1]!;
	for (const rule of grammar.symbolRules) {
		const symName = trimmed.match(rule.regex)?.[1];
		if (!symName || LEXICAL_CONSTANTS.CONTROL_FLOW_KEYWORDS.has(symName)) continue;
		const resolvedKind = parentFrame.kind === ENTITY_KINDS.CLASS && rule.kind === ENTITY_KINDS.FUNCTION ? ENTITY_KINDS.METHOD : rule.kind;
		const qName = `${parentFrame.qualifiedName}${LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR}${symName}`;
		const lineEnd = resolveBalancedBlockEndLine(lines, idx, grammar.delimiterMode ?? BLOCK_DELIMITERS.BRACES, grammar.keywordOpenRegex, grammar.keywordCloseRegex);
		symbols.push({ kind: resolvedKind, name: symName, qualifiedName: qName, lineStart: lineNum, colStart: Math.max(LEXICAL_CONSTANTS.FIRST_COLUMN, line.indexOf(symName) + 1), lineEnd, colEnd: LEXICAL_CONSTANTS.FIRST_COLUMN, sourceSlice: lines.slice(idx, lineEnd).join('\n') });
		references.push({ kind: REFERENCE_KINDS.DEFINES, sourceQualifiedName: parentFrame.qualifiedName, targetSymbolName: qName, line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN });
		const baseClass = extractHeritageMutationAndTypeRefs(trimmed, lineNum, qName, references);
		if (resolvedKind === ENTITY_KINDS.VARIABLE) {
			references.push({ kind: REFERENCE_KINDS.SETS, sourceQualifiedName: parentFrame.qualifiedName, targetSymbolName: qName, line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN });
			const rhs = trimmed.match(ALIAS_RHS_REGEX);
			if (rhs?.[1] || rhs?.[2]) references.push({ kind: REFERENCE_KINDS.CALLS, sourceQualifiedName: qName, targetSymbolName: (rhs[1] ?? rhs[2])!, line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN });
			else if (rhs?.[3]) references.push({ kind: REFERENCE_KINDS.USES, sourceQualifiedName: qName, targetSymbolName: rhs[3], line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN });
		}
		if (resolvedKind === ENTITY_KINDS.METHOD && (parentFrame.baseClass || /\boverride\b/.test(trimmed))) references.push({ kind: REFERENCE_KINDS.OVERRIDES, sourceQualifiedName: qName, targetSymbolName: symName, line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN });
		if (rule.updatesScope) scopeStack.push({ qualifiedName: qName, kind: resolvedKind, lineEnd, baseClass: baseClass ?? parentFrame.baseClass });
		break;
	}
}

export function scanSourceWithGrammar(filePath: string, sourceCode: string, grammar: LanguageGrammarSpec): { readonly symbols: readonly ExtractedSymbol[]; readonly references: readonly ExtractedReference[] } {
	const lines = sourceCode.split(/\r?\n/);
	const fileQualified = filePath.replace(/^\.\//, '');
	const maxLine = Math.max(LEXICAL_CONSTANTS.FIRST_LINE, lines.length);
	const symbols: ExtractedSymbol[] = [{ kind: ENTITY_KINDS.FILE, name: fileQualified.split(LEXICAL_CONSTANTS.PATH_SEPARATOR).pop() ?? fileQualified, qualifiedName: fileQualified, lineStart: LEXICAL_CONSTANTS.FIRST_LINE, colStart: LEXICAL_CONSTANTS.FIRST_COLUMN, lineEnd: maxLine, colEnd: LEXICAL_CONSTANTS.FIRST_COLUMN, sourceSlice: sourceCode }];
	const references: ExtractedReference[] = [];
	const scopeStack: ScopeStackFrame[] = [{ qualifiedName: fileQualified, kind: ENTITY_KINDS.FILE, lineEnd: maxLine }];
	lines.forEach((line, idx) => {
		const trimmed = line.trim();
		if (isCommentOrEmptyLine(trimmed, grammar.commentPrefixes)) return;
		const lineNum = idx + LEXICAL_CONSTANTS.FIRST_LINE;
		extractLineSymbols(line, trimmed, idx, lines, grammar, symbols, references, scopeStack);
		const activeScope = scopeStack[scopeStack.length - 1]!.qualifiedName;
		extractHeritageMutationAndTypeRefs(trimmed, lineNum, activeScope, references);
		const importMatch = grammar.importRegex ? trimmed.match(grammar.importRegex) : null;
		if (importMatch?.[1]) {
			for (const rawSpec of importMatch[1].split(',').map((s) => s.replace(/\btype\b/g, '').trim()).filter(Boolean)) {
				references.push({ kind: REFERENCE_KINDS.IMPORTS, sourceQualifiedName: fileQualified, targetSymbolName: rawSpec.split(/\s+as\s+/)[0]?.trim() ?? rawSpec, importModulePath: importMatch[2]?.trim(), line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN });
			}
		}
		for (const chainMatch of trimmed.matchAll(CHAINED_CALL_REGEX)) if (chainMatch[1] && !chainMatch[1].startsWith('this.') && !chainMatch[1].startsWith('self.')) references.push({ kind: REFERENCE_KINDS.CALLS, sourceQualifiedName: activeScope, targetSymbolName: chainMatch[1], line: lineNum, column: LEXICAL_CONSTANTS.FIRST_COLUMN });
		for (const callMatch of trimmed.matchAll(grammar.callRegex)) if (callMatch[1] && !LEXICAL_CONSTANTS.CONTROL_FLOW_KEYWORDS.has(callMatch[1])) references.push({ kind: REFERENCE_KINDS.CALLS, sourceQualifiedName: activeScope, targetSymbolName: callMatch[1], line: lineNum, column: Math.max(LEXICAL_CONSTANTS.FIRST_COLUMN, (callMatch.index ?? 0) + 1) });
	});
	return { symbols, references };
}

export function createGrammarLanguageParser(
	grammar: LanguageGrammarSpec,
	preprocessSource?: (sourceCode: string) => string
): (filePath: string, sourceCode: string) => { readonly symbols: readonly ExtractedSymbol[]; readonly references: readonly ExtractedReference[] } {
	return (filePath: string, sourceCode: string) =>
		scanSourceWithGrammar(filePath, preprocessSource ? preprocessSource(sourceCode) : sourceCode, grammar);
}

