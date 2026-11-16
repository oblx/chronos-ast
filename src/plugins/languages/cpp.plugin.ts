/**
 * @author Oblx <code@oblx.dev>
 * @description C++ language plugin combining the bounded C/C++ Preprocessor & Macro Expander with declarative CST/AST scanning.
 */
import { CPP_GRAMMAR_SPEC } from '@config/registries/grammars.registry';
import type { ExtractedReference, ExtractedSymbol } from '@core/ast/parsers';
import { expandCppPreprocessorDirectives } from '@core/ast/preprocessor.expander';
import { scanSourceWithGrammar } from '@core/ast/scanner/lexical_scanner';

export { CPP_GRAMMAR_SPEC };

export function parseCppSource(
	filePath: string,
	sourceCode: string,
	workspaceDefines: Readonly<Record<string, string | number>> = {}
): {
	readonly symbols: readonly ExtractedSymbol[];
	readonly references: readonly ExtractedReference[];
} {
	const preprocessed = expandCppPreprocessorDirectives(filePath, sourceCode, workspaceDefines);
	const scanned = scanSourceWithGrammar(filePath, preprocessed.expandedSource, CPP_GRAMMAR_SPEC);
	return {
		symbols: [...scanned.symbols, ...preprocessed.macroSymbols],
		references: [...scanned.references, ...preprocessed.macroReferences],
	};
}
