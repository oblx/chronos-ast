/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-dependency linear-time polyglot lexical tokenizer emitting semantic syntax spans for TS/JS/Svelte, Rust, C/C++, Python, SQL, Mermaid, JSON, and Markdown (v2.5.0).
 */

export const SYNTAX_TOKEN_KINDS = {
	KEYWORD: 'KEYWORD',
	CONTROL: 'CONTROL',
	TYPE: 'TYPE',
	FUNCTION: 'FUNCTION',
	STRING: 'STRING',
	NUMBER: 'NUMBER',
	COMMENT: 'COMMENT',
	OPERATOR: 'OPERATOR',
	PROPERTY: 'PROPERTY',
	DIRECTIVE: 'DIRECTIVE',
	PLAIN: 'PLAIN',
} as const;
export type SyntaxTokenKind = (typeof SYNTAX_TOKEN_KINDS)[keyof typeof SYNTAX_TOKEN_KINDS];

export interface SyntaxTokenSpan {
	readonly kind: SyntaxTokenKind;
	readonly text: string;
	readonly cssColorVar: string;
}

const TOKEN_COLOR_VARS: Readonly<Record<SyntaxTokenKind, string>> = {
	KEYWORD: 'var(--syntax-keyword)',
	CONTROL: 'var(--syntax-control)',
	TYPE: 'var(--syntax-type)',
	FUNCTION: 'var(--syntax-fn)',
	STRING: 'var(--syntax-string)',
	NUMBER: 'var(--syntax-number)',
	COMMENT: 'var(--syntax-comment)',
	OPERATOR: 'var(--syntax-operator)',
	PROPERTY: 'var(--hud-accent-secondary)',
	DIRECTIVE: 'var(--syntax-control)',
	PLAIN: 'var(--hud-text)',
};
export function syntaxTokenCssVar(kind: SyntaxTokenKind): string { return TOKEN_COLOR_VARS[kind]; }

const CONTROL_WORDS = new Set([
	'if', 'else', 'elif', 'for', 'while', 'do', 'switch', 'case', 'default', 'break',
	'continue', 'return', 'yield', 'try', 'catch', 'finally', 'throw', 'match', 'await', 'loop',
]);

const KEYWORD_WORDS = new Set([
	'function', 'const', 'let', 'var', 'class', 'interface', 'type', 'enum', 'struct', 'impl', 'trait',
	'fn', 'pub', 'mod', 'use', 'crate', 'mut', 'ref', 'def', 'lambda', 'import', 'export', 'from', 'as',
	'async', 'static', 'readonly', 'private', 'protected', 'public', 'extends', 'implements', 'new', 'this',
	'super', 'self', 'true', 'false', 'null', 'undefined', 'None', 'True', 'False', 'SELECT', 'FROM',
	'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'JOIN', 'CREATE', 'TABLE', 'INDEX', 'PRIMARY', 'KEY',
	'flowchart', 'sequenceDiagram', 'classDiagram', 'subgraph', 'participant', 'end', 'TD', 'LR',
]);

const TYPE_WORDS = new Set([
	'string', 'number', 'boolean', 'void', 'any', 'unknown', 'never', 'object', 'Promise', 'Record',
	'Readonly', 'ReadonlyArray', 'Map', 'Set', 'Uint8Array', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64',
	'usize', 'f32', 'f64', 'bool', 'str', 'String', 'Vec', 'Option', 'Result', 'int', 'float', 'double',
	'char', 'size_t', 'INTEGER', 'TEXT', 'REAL', 'BLOB',
]);

const MASTER_TOKEN_RE = /(\/\/.*$|#.*$|--.*$|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(@[A-Za-z_][A-Za-z0-9_-]*|\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|(===|!==|=>|->|::|\.\.\.|<=|>=|==|!=|&&|\|\||[+\-*/%=<>!&|^~?:;,.()[\]{}])/g;

function classifyIdentifier(word: string, nextSlice: string): SyntaxTokenKind {
	if (CONTROL_WORDS.has(word)) return SYNTAX_TOKEN_KINDS.CONTROL;
	if (KEYWORD_WORDS.has(word)) return SYNTAX_TOKEN_KINDS.KEYWORD;
	if (TYPE_WORDS.has(word) || (/^[A-Z][A-Za-z0-9_]*$/.test(word) && !/^[A-Z0-9_]+$/.test(word))) {
		return SYNTAX_TOKEN_KINDS.TYPE;
	}
	if (/^\s*\(/.test(nextSlice)) return SYNTAX_TOKEN_KINDS.FUNCTION;
	if (/^\s*:[^:]/.test(nextSlice)) return SYNTAX_TOKEN_KINDS.PROPERTY;
	return SYNTAX_TOKEN_KINDS.PLAIN;
}

export function tokenizeCodeLine(line: string): readonly SyntaxTokenSpan[] {
	if (!line) return [{ kind: SYNTAX_TOKEN_KINDS.PLAIN, text: ' ', cssColorVar: TOKEN_COLOR_VARS.PLAIN }];
	const spans: SyntaxTokenSpan[] = [];
	let lastIdx = 0;
	MASTER_TOKEN_RE.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = MASTER_TOKEN_RE.exec(line)) !== null) {
		if (match.index > lastIdx) {
			spans.push({ kind: SYNTAX_TOKEN_KINDS.PLAIN, text: line.slice(lastIdx, match.index), cssColorVar: TOKEN_COLOR_VARS.PLAIN });
		}
		const full = match[0]!;
		let kind: SyntaxTokenKind = SYNTAX_TOKEN_KINDS.PLAIN;
		if (match[1] !== undefined) {
			kind = full.startsWith('#include') || full.startsWith('#define') || full.startsWith('#if') ? SYNTAX_TOKEN_KINDS.DIRECTIVE : SYNTAX_TOKEN_KINDS.COMMENT;
		} else if (match[2] !== undefined) {
			kind = SYNTAX_TOKEN_KINDS.STRING;
		} else if (match[3] !== undefined) {
			kind = full.startsWith('@') ? SYNTAX_TOKEN_KINDS.DIRECTIVE : SYNTAX_TOKEN_KINDS.NUMBER;
		} else if (match[4] !== undefined) {
			kind = classifyIdentifier(full, line.slice(match.index + full.length, match.index + full.length + 6));
		} else if (match[5] !== undefined) {
			kind = SYNTAX_TOKEN_KINDS.OPERATOR;
		}
		spans.push({ kind, text: full, cssColorVar: TOKEN_COLOR_VARS[kind] });
		lastIdx = match.index + full.length;
	}
	if (lastIdx < line.length) {
		spans.push({ kind: SYNTAX_TOKEN_KINDS.PLAIN, text: line.slice(lastIdx), cssColorVar: TOKEN_COLOR_VARS.PLAIN });
	}
	return spans;
}
