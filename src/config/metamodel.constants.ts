/**
 * @author Oblx <code@oblx.dev>
 * @description Canonical Metamodel 9 Entity / 10 Reference enums, Annotation kinds, CFG block/edge kinds, scanner modes, and language maps.
 */
import { PKZIP_CONSTANTS } from './constants';

export { PKZIP_CONSTANTS };

export const ENTITY_KINDS = {
	PROJECT: 'PROJECT',
	MODULE: 'MODULE',
	FILE: 'FILE',
	NAMESPACE: 'NAMESPACE',
	CLASS: 'CLASS',
	INTERFACE: 'INTERFACE',
	FUNCTION: 'FUNCTION',
	METHOD: 'METHOD',
	VARIABLE: 'VARIABLE',
} as const;
export type EntityKind = (typeof ENTITY_KINDS)[keyof typeof ENTITY_KINDS];

export const REFERENCE_KINDS = {
	CALLS: 'CALLS',
	DEFINES: 'DEFINES',
	SETS: 'SETS',
	USES: 'USES',
	INHERITS: 'INHERITS',
	IMPORTS: 'IMPORTS',
	IMPLEMENTS: 'IMPLEMENTS',
	MODIFIES: 'MODIFIES',
	TYPED: 'TYPED',
	OVERRIDES: 'OVERRIDES',
} as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[keyof typeof REFERENCE_KINDS];

export const ANNOTATION_KINDS = {
	NOTE: 'NOTE',
	SUPPRESS_RULE: 'SUPPRESS_RULE',
	HOTSPOT_PIN: 'HOTSPOT_PIN',
} as const;
export type AnnotationKind = (typeof ANNOTATION_KINDS)[keyof typeof ANNOTATION_KINDS];

export const CFG_BLOCK_KINDS = {
	ENTRY: 'ENTRY',
	SEQUENTIAL: 'SEQUENTIAL',
	BRANCH_DECISION: 'BRANCH_DECISION',
	LOOP_HEADER: 'LOOP_HEADER',
	TRY_CATCH: 'TRY_CATCH',
	RETURN_EXIT: 'RETURN_EXIT',
	THROW_EXIT: 'THROW_EXIT',
	UNREACHABLE: 'UNREACHABLE',
} as const;
export type CfgBlockKind = (typeof CFG_BLOCK_KINDS)[keyof typeof CFG_BLOCK_KINDS];

export const CFG_EDGE_KINDS = {
	FALLTHROUGH: 'FALLTHROUGH',
	TRUE_BRANCH: 'TRUE_BRANCH',
	FALSE_BRANCH: 'FALSE_BRANCH',
	LOOP_BACK: 'LOOP_BACK',
	EXCEPTION: 'EXCEPTION',
} as const;
export type CfgEdgeKind = (typeof CFG_EDGE_KINDS)[keyof typeof CFG_EDGE_KINDS];

export const BLOCK_DELIMITERS = {
	BRACES: 'BRACES',
	INDENTATION: 'INDENTATION',
	KEYWORD_PAIRS: 'KEYWORD_PAIRS',
} as const;
export type BlockDelimiterMode = (typeof BLOCK_DELIMITERS)[keyof typeof BLOCK_DELIMITERS];

export const SCANNER_MODES = { FAST_LEXICAL: 'FAST_LEXICAL', WASM_CST: 'WASM_CST' } as const;
export type ScannerMode = (typeof SCANNER_MODES)[keyof typeof SCANNER_MODES];

export const AST_NODE_TYPES = {
	PROGRAM: 'PROGRAM', MODULE: 'MODULE', CLASS_DECLARATION: 'CLASS_DECLARATION',
	INTERFACE_DECLARATION: 'INTERFACE_DECLARATION', FUNCTION_DECLARATION: 'FUNCTION_DECLARATION',
	METHOD_DEFINITION: 'METHOD_DEFINITION', VARIABLE_DECLARATION: 'VARIABLE_DECLARATION',
	IMPORT_STATEMENT: 'IMPORT_STATEMENT', CALL_EXPRESSION: 'CALL_EXPRESSION',
	ASSIGNMENT_EXPRESSION: 'ASSIGNMENT_EXPRESSION', MEMBER_EXPRESSION: 'MEMBER_EXPRESSION',
	BLOCK: 'BLOCK', IF_STATEMENT: 'IF_STATEMENT', FOR_STATEMENT: 'FOR_STATEMENT',
	WHILE_STATEMENT: 'WHILE_STATEMENT', DO_WHILE_STATEMENT: 'DO_WHILE_STATEMENT',
	CASE_CLAUSE: 'CASE_CLAUSE', CATCH_CLAUSE: 'CATCH_CLAUSE',
	CONDITIONAL_EXPRESSION: 'CONDITIONAL_EXPRESSION', LOGICAL_AND: 'LOGICAL_AND',
	LOGICAL_OR: 'LOGICAL_OR', RETURN_STATEMENT: 'RETURN_STATEMENT', IDENTIFIER: 'IDENTIFIER',
} as const;
export type AstNodeType = (typeof AST_NODE_TYPES)[keyof typeof AST_NODE_TYPES];

export const SUPPORTED_LANGUAGES = {
	TYPESCRIPT: 'TYPESCRIPT', RUST: 'RUST', CPP: 'CPP', SVELTE: 'SVELTE', PYTHON: 'PYTHON',
	LUA: 'LUA', RUBY: 'RUBY', FORTRAN: 'FORTRAN', ADA: 'ADA', SQL: 'SQL',
} as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[keyof typeof SUPPORTED_LANGUAGES];

export const FILE_EXTENSIONS_MAP: Readonly<Record<string, SupportedLanguage>> = {
	'.ts': SUPPORTED_LANGUAGES.TYPESCRIPT, '.tsx': SUPPORTED_LANGUAGES.TYPESCRIPT,
	'.js': SUPPORTED_LANGUAGES.TYPESCRIPT, '.jsx': SUPPORTED_LANGUAGES.TYPESCRIPT,
	'.mjs': SUPPORTED_LANGUAGES.TYPESCRIPT, '.rs': SUPPORTED_LANGUAGES.RUST,
	'.go': SUPPORTED_LANGUAGES.RUST, '.cpp': SUPPORTED_LANGUAGES.CPP,
	'.cc': SUPPORTED_LANGUAGES.CPP, '.c': SUPPORTED_LANGUAGES.CPP,
	'.hpp': SUPPORTED_LANGUAGES.CPP, '.h': SUPPORTED_LANGUAGES.CPP,
	'.svelte': SUPPORTED_LANGUAGES.SVELTE, '.py': SUPPORTED_LANGUAGES.PYTHON,
	'.lua': SUPPORTED_LANGUAGES.LUA, '.rb': SUPPORTED_LANGUAGES.RUBY,
	'.f90': SUPPORTED_LANGUAGES.FORTRAN, '.f95': SUPPORTED_LANGUAGES.FORTRAN,
	'.adb': SUPPORTED_LANGUAGES.ADA, '.ads': SUPPORTED_LANGUAGES.ADA,
	'.sql': SUPPORTED_LANGUAGES.SQL,
} as const;

export const HALSTEAD_CONSTANTS = {
	BUGS_DIVISOR: 3000, DIFFICULTY_DIVISOR: 2, TIME_PROPORTIONALITY_S: 18,
	MIN_CYCLOMATIC_BASE: 1, MIN_LOG_VOCABULARY: 2, DIFFICULTY_DECIMALS: 2, BUGS_DECIMALS: 3,
} as const;

export const LEXICAL_CONSTANTS = {
	QUALIFIED_SEPARATOR: '::',
	PATH_SEPARATOR: '/',
	COMMENT_PREFIXES: ['//', '/*', '*', '#'] as const,
	CONTROL_FLOW_KEYWORDS: new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'match', 'fn', 'sizeof', 'new', 'typeof', 'def', 'elif', 'except']),
	FALLBACK_SLICE_SPAN: 24,
	FIRST_LINE: 1,
	FIRST_COLUMN: 1,
} as const;

export function extractFileScopePrefix(qualifiedName: string): string {
	return qualifiedName.split(LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR)[0] ?? qualifiedName;
}

export function isChildScopeOf(candidateQualified: string, parentQualified: string): boolean {
	return candidateQualified.startsWith(`${parentQualified}${LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR}`);
}

export function resolveEntitySourceSlice(
	qualifiedName: string,
	sourceMap: Readonly<Record<string, string>>,
	fallback = ''
): string {
	return sourceMap[qualifiedName] ?? sourceMap[extractFileScopePrefix(qualifiedName)] ?? fallback;
}

