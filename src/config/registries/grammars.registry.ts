/**
 * @author Oblx <code@oblx.dev>
 * @description Declarative Data-as-Code polyglot grammar registry (BRACES, INDENTATION, KEYWORD_PAIRS) built on the Chronos Polyglot AST Architecture.
 */
import {
	BLOCK_DELIMITERS,
	ENTITY_KINDS,
	SUPPORTED_LANGUAGES,
	type BlockDelimiterMode,
	type EntityKind,
	type SupportedLanguage,
} from '../metamodel.constants';

export interface SymbolGrammarRule {
	readonly regex: RegExp;
	readonly kind: EntityKind;
	readonly updatesScope: boolean;
}

export interface LanguageGrammarSpec {
	readonly delimiterMode?: BlockDelimiterMode;
	readonly keywordOpenRegex?: RegExp;
	readonly keywordCloseRegex?: RegExp;
	readonly commentPrefixes?: readonly string[];
	readonly symbolRules: readonly SymbolGrammarRule[];
	readonly callRegex: RegExp;
	readonly importRegex?: RegExp;
}

export const KEYWORD_BLOCK_PATTERNS = {
	DEFAULT_OPENER: /\b(?:function|subroutine|module|package\s+body|procedure|begin|if|do|def|class)\b/i,
	DEFAULT_CLOSER: /\b(?:end(?:\s+(?:function|subroutine|module|procedure|if|do|loop|case|[A-Za-z_]\w*))?|endif|enddo)\b/i,
} as const;

export const TYPESCRIPT_GRAMMAR_SPEC: LanguageGrammarSpec = {
	delimiterMode: BLOCK_DELIMITERS.BRACES,
	symbolRules: [
		{ regex: /\bclass\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.CLASS, updatesScope: true },
		{ regex: /\binterface\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.INTERFACE, updatesScope: false },
		{ regex: /\bfunction\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.FUNCTION, updatesScope: true },
		{ regex: /^(?:(?:public|private|protected|static|readonly|override|async)\s+)+([A-Za-z_]\w*)\s*\(/, kind: ENTITY_KINDS.METHOD, updatesScope: true },
		{ regex: /\b(?:export\s+)?(?:const|let)\s+([A-Za-z_]\w*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_]\w*)\s*(?::[^=]+)?=>/, kind: ENTITY_KINDS.FUNCTION, updatesScope: true },
		{ regex: /\b(?:export\s+)?(?:const|let)\s+([A-Za-z_]\w*)\s*[:=]/, kind: ENTITY_KINDS.VARIABLE, updatesScope: false },
	],
	importRegex: /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/,
	callRegex: /\b([a-zA-Z_]\w*)\s*\(/g,
};

export const RUST_GRAMMAR_SPEC: LanguageGrammarSpec = {
	delimiterMode: BLOCK_DELIMITERS.BRACES,
	symbolRules: [
		{ regex: /\b(?:pub\s+)?struct\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.CLASS, updatesScope: true },
		{ regex: /\b(?:pub\s+)?trait\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.INTERFACE, updatesScope: true },
		{ regex: /\b(?:pub\s+)?fn\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.FUNCTION, updatesScope: true },
		{ regex: /\b(?:pub\s+)?mod\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.MODULE, updatesScope: true },
	],
	callRegex: /\b([a-z_]\w*)\s*\(/g,
};

export const CPP_GRAMMAR_SPEC: LanguageGrammarSpec = {
	delimiterMode: BLOCK_DELIMITERS.BRACES,
	symbolRules: [
		{ regex: /\bnamespace\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.NAMESPACE, updatesScope: true },
		{ regex: /\bclass\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.CLASS, updatesScope: true },
		{ regex: /\bstruct\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.CLASS, updatesScope: true },
		{ regex: /\b(?:void|int|bool|double|auto|std::\w+)\s+([A-Za-z_]\w*)\s*\(/, kind: ENTITY_KINDS.FUNCTION, updatesScope: true },
	],
	callRegex: /\b([A-Za-z_]\w*)\s*\(/g,
};

export const PYTHON_GRAMMAR_SPEC: LanguageGrammarSpec = {
	delimiterMode: BLOCK_DELIMITERS.INDENTATION,
	symbolRules: [
		{ regex: /^class\s+([A-Za-z_]\w*)/, kind: ENTITY_KINDS.CLASS, updatesScope: true },
		{ regex: /^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/, kind: ENTITY_KINDS.FUNCTION, updatesScope: true },
		{ regex: /^([A-Z][A-Z0-9_]+)\s*[:=]/, kind: ENTITY_KINDS.VARIABLE, updatesScope: false },
	],
	importRegex: /^(?:from\s+([A-Za-z0-9_.]+)\s+import\s+([A-Za-z0-9_,\s]+)|import\s+([A-Za-z0-9_,\s]+))/,
	callRegex: /\b([a-zA-Z_]\w*)\s*\(/g,
};

export const KEYWORD_PAIR_SHARED_SPEC: LanguageGrammarSpec = {
	delimiterMode: BLOCK_DELIMITERS.KEYWORD_PAIRS,
	keywordOpenRegex: KEYWORD_BLOCK_PATTERNS.DEFAULT_OPENER,
	keywordCloseRegex: KEYWORD_BLOCK_PATTERNS.DEFAULT_CLOSER,
	commentPrefixes: ['--', '#', '!', '//', '/*'],
	symbolRules: [
		{ regex: /\b(?:module|package\s+body|package)\s+([A-Za-z_]\w*)/i, kind: ENTITY_KINDS.MODULE, updatesScope: true },
		{ regex: /\bclass\s+([A-Za-z_]\w*)/i, kind: ENTITY_KINDS.CLASS, updatesScope: true },
		{ regex: /\b(?:local\s+)?(?:function|subroutine|procedure|def)\s+(?:[A-Za-z_]\w*[:.])?([A-Za-z_]\w*)/i, kind: ENTITY_KINDS.FUNCTION, updatesScope: true },
	],
	callRegex: /\b([A-Za-z_]\w*)\s*\(/g,
};

export const DECLARATIVE_GRAMMARS_REGISTRY: Readonly<Record<SupportedLanguage, LanguageGrammarSpec>> = {
	[SUPPORTED_LANGUAGES.TYPESCRIPT]: TYPESCRIPT_GRAMMAR_SPEC,
	[SUPPORTED_LANGUAGES.SVELTE]: TYPESCRIPT_GRAMMAR_SPEC,
	[SUPPORTED_LANGUAGES.RUST]: RUST_GRAMMAR_SPEC,
	[SUPPORTED_LANGUAGES.CPP]: CPP_GRAMMAR_SPEC,
	[SUPPORTED_LANGUAGES.PYTHON]: PYTHON_GRAMMAR_SPEC,
	[SUPPORTED_LANGUAGES.LUA]: KEYWORD_PAIR_SHARED_SPEC,
	[SUPPORTED_LANGUAGES.RUBY]: KEYWORD_PAIR_SHARED_SPEC,
	[SUPPORTED_LANGUAGES.FORTRAN]: KEYWORD_PAIR_SHARED_SPEC,
	[SUPPORTED_LANGUAGES.ADA]: KEYWORD_PAIR_SHARED_SPEC,
	[SUPPORTED_LANGUAGES.SQL]: KEYWORD_PAIR_SHARED_SPEC,
};

export function getDeclarativeGrammarSpec(language: SupportedLanguage): LanguageGrammarSpec {
	return DECLARATIVE_GRAMMARS_REGISTRY[language] ?? TYPESCRIPT_GRAMMAR_SPEC;
}
