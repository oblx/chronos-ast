/**
 * @author Oblx <code@oblx.dev>
 * @description Language-agnostic AST parser orchestrator dispatching TypeScript, Svelte, Rust, C++, Python, and KEYWORD_PAIRS grammars.
 */
import { getDeclarativeGrammarSpec } from '@config/registries/grammars.registry';
import {
	FILE_EXTENSIONS_MAP,
	LEXICAL_CONSTANTS,
	SUPPORTED_LANGUAGES,
	type SupportedLanguage,
} from '@config/metamodel.constants';
import type { EntityKind, ReferenceKind } from '@lib/db/schema';
import type { ComplexityNode } from '@core/metrics/complexity.engine';
import { buildComplexityAstFromSource } from './tree_sitter_bridge';
import { isCommentOrEmptyLine, scanSourceWithGrammar } from './scanner/lexical_scanner';
import { parseTypeScriptSource } from '@plugins/languages/typescript.plugin';
import { parseRustSource } from '@plugins/languages/rust.plugin';
import { parseCppSource } from '@plugins/languages/cpp.plugin';
import { parsePythonSource } from '@plugins/languages/python.plugin';

export interface ExtractedSymbol {
	readonly kind: EntityKind;
	readonly name: string;
	readonly qualifiedName: string;
	readonly lineStart: number;
	readonly colStart: number;
	readonly lineEnd: number;
	readonly colEnd: number;
	readonly sourceSlice: string;
}

export interface ExtractedReference {
	readonly kind: ReferenceKind;
	readonly sourceQualifiedName: string;
	readonly targetSymbolName: string;
	readonly importModulePath?: string;
	readonly line: number;
	readonly column: number;
}

export interface FileParseAnalysis {
	readonly filePath: string;
	readonly language: SupportedLanguage;
	readonly loc: number;
	readonly commentLines: number;
	readonly astRoot: ComplexityNode;
	readonly symbols: readonly ExtractedSymbol[];
	readonly references: readonly ExtractedReference[];
}

const SPECIALIZED_DISPATCH_TABLE: Partial<
	Readonly<
		Record<
			SupportedLanguage,
			(
				filePath: string,
				sourceCode: string
			) => {
				readonly symbols: readonly ExtractedSymbol[];
				readonly references: readonly ExtractedReference[];
			}
		>
	>
> = {
	[SUPPORTED_LANGUAGES.TYPESCRIPT]: parseTypeScriptSource,
	[SUPPORTED_LANGUAGES.SVELTE]: parseTypeScriptSource,
	[SUPPORTED_LANGUAGES.RUST]: parseRustSource,
	[SUPPORTED_LANGUAGES.CPP]: parseCppSource,
	[SUPPORTED_LANGUAGES.PYTHON]: parsePythonSource,
};

export function detectLanguageFromPath(filePath: string): SupportedLanguage {
	const dotIndex = filePath.lastIndexOf('.');
	const ext = dotIndex >= 0 ? filePath.slice(dotIndex).toLowerCase() : '.ts';
	return FILE_EXTENSIONS_MAP[ext] ?? SUPPORTED_LANGUAGES.TYPESCRIPT;
}

export function countNonEmptyLines(sourceCode: string): number {
	return Math.max(
		LEXICAL_CONSTANTS.FIRST_LINE,
		sourceCode.split(/\r?\n/).filter((l) => l.trim().length > 0).length
	);
}

export function parseSourceFile(
	filePath: string,
	sourceCode: string
): FileParseAnalysis {
	const language = detectLanguageFromPath(filePath);
	const grammar = getDeclarativeGrammarSpec(language);
	const lines = sourceCode.split(/\r?\n/);
	const loc = countNonEmptyLines(sourceCode);
	const commentLines = lines.filter((l) => {
		const trimmed = l.trim();
		return Boolean(trimmed) && isCommentOrEmptyLine(trimmed, grammar.commentPrefixes);
	}).length;

	const astRoot = buildComplexityAstFromSource(sourceCode);
	const specializedFn = SPECIALIZED_DISPATCH_TABLE[language];
	const pluginResult = specializedFn
		? specializedFn(filePath, sourceCode)
		: scanSourceWithGrammar(filePath, sourceCode, grammar);

	return {
		filePath,
		language,
		loc,
		commentLines,
		astRoot,
		symbols: pluginResult.symbols,
		references: pluginResult.references,
	};
}
