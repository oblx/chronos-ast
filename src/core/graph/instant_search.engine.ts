/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos Instant Search query engine supporting field prefixes (string:, identifier:, comment:), wildcards (*, ?), Levenshtein fuzzy (~), and boolean operators.
 */
import { FUZZY_MAX_EDIT_DISTANCE, LEVENSHTEIN_UNBOUNDED_DISTANCE, SEARCH_FIELD_PREFIXES } from '@config/constants';
import { LEXICAL_CONSTANTS, resolveEntitySourceSlice } from '@config/metamodel.constants';
import type { GraphEntityNode } from './graph_traversal';

export type InstantSearchField = 'ANY' | 'STRING' | 'IDENTIFIER' | 'COMMENT';

export interface InstantSearchHit {
	readonly entityId: number;
	readonly entityName: string;
	readonly qualifiedName: string;
	readonly matchedField: InstantSearchField;
	readonly line: number;
	readonly snippet: string;
}

interface ParsedSearchClause {
	readonly field: InstantSearchField;
	readonly pattern: string;
	readonly isFuzzy: boolean;
	readonly isNegated: boolean;
	readonly connectWithOr: boolean;
}

export function computeLevenshteinDistance(a: string, b: string): number {
	const [s1, s2] = [a.toLowerCase(), b.toLowerCase()];
	if (s1 === s2) return 0;
	if (Math.abs(s1.length - s2.length) > FUZZY_MAX_EDIT_DISTANCE + 1) return LEVENSHTEIN_UNBOUNDED_DISTANCE;
	const dp: number[] = Array.from({ length: s2.length + 1 }, (_, i) => i);
	for (let i = 1; i <= s1.length; i++) {
		let prev = dp[0]!;
		dp[0] = i;
		for (let j = 1; j <= s2.length; j++) {
			const temp = dp[j]!;
			dp[j] = s1[i - 1] === s2[j - 1] ? prev : 1 + Math.min(prev, dp[j]!, dp[j - 1]!);
			prev = temp;
		}
	}
	return dp[s2.length] ?? LEVENSHTEIN_UNBOUNDED_DISTANCE;
}

function parseInstantSearchQuery(rawQuery: string): readonly ParsedSearchClause[] {
	const rawTokens = rawQuery.trim().split(/\s+/).filter(Boolean);
	const clauses: ParsedSearchClause[] = [];
	let [negateNext, orNext] = [false, false];
	for (const tok of rawTokens) {
		const upper = tok.toUpperCase();
		if (upper === 'AND') continue;
		if (upper === 'OR') { orNext = true; continue; }
		if (upper === 'NOT' || tok.startsWith('-')) {
			if (upper === 'NOT') { negateNext = true; continue; }
		}
		const cleanTok = tok.replace(/^-/, '');
		let field: InstantSearchField = 'ANY';
		let body = cleanTok;
		if (cleanTok.toLowerCase().startsWith(SEARCH_FIELD_PREFIXES.STRING)) { field = 'STRING'; body = cleanTok.slice(SEARCH_FIELD_PREFIXES.STRING.length); }
		else if (cleanTok.toLowerCase().startsWith(SEARCH_FIELD_PREFIXES.IDENTIFIER)) { field = 'IDENTIFIER'; body = cleanTok.slice(SEARCH_FIELD_PREFIXES.IDENTIFIER.length); }
		else if (cleanTok.toLowerCase().startsWith(SEARCH_FIELD_PREFIXES.COMMENT)) { field = 'COMMENT'; body = cleanTok.slice(SEARCH_FIELD_PREFIXES.COMMENT.length); }
		const isFuzzy = body.endsWith('~');
		clauses.push({
			field,
			pattern: (isFuzzy ? body.slice(0, -1) : body).toLowerCase(),
			isFuzzy,
			isNegated: negateNext || tok.startsWith('-'),
			connectWithOr: orNext,
		});
		negateNext = false;
		orNext = false;
	}
	return clauses;
}

function matchesTokenPattern(candidate: string, clause: ParsedSearchClause): boolean {
	const lower = candidate.toLowerCase();
	if (clause.pattern.includes('*') || clause.pattern.includes('?')) {
		const escaped = clause.pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
		return new RegExp(`^${escaped}$`, 'i').test(lower) || new RegExp(escaped, 'i').test(lower);
	}
	if (clause.isFuzzy) {
		const words = lower.match(/[a-z0-9_]+/g) ?? [lower];
		return words.some((w) => computeLevenshteinDistance(w, clause.pattern) <= FUZZY_MAX_EDIT_DISTANCE);
	}
	return lower.includes(clause.pattern);
}

function evaluateClauseAgainstSource(node: GraphEntityNode, sourceText: string, clause: ParsedSearchClause): { readonly matched: boolean; readonly line: number; readonly snippet: string; readonly field: InstantSearchField } {
	const lines = sourceText.split(/\r?\n/);
	if (clause.field === 'IDENTIFIER' || clause.field === 'ANY') {
		if (matchesTokenPattern(node.name, clause) || matchesTokenPattern(node.qualifiedName, clause)) {
			return { matched: true, line: 1, snippet: lines[0]?.trim() ?? node.qualifiedName, field: 'IDENTIFIER' };
		}
	}
	for (let i = 0; i < lines.length; i++) {
		const trimmed = (lines[i] ?? '').trim();
		if (!trimmed) continue;
		const isComment = LEXICAL_CONSTANTS.COMMENT_PREFIXES.some((p) => trimmed.startsWith(p)) || trimmed.includes('//');
		if (clause.field === 'COMMENT' && isComment && matchesTokenPattern(trimmed, clause)) {
			return { matched: true, line: i + 1, snippet: trimmed, field: 'COMMENT' };
		}
		if (clause.field === 'STRING') {
			const strLiterals = Array.from(trimmed.matchAll(/['"`]([^'"`]*)['"`]/g)).map((m) => m[1] ?? '');
			if (strLiterals.some((s) => matchesTokenPattern(s, clause))) return { matched: true, line: i + 1, snippet: trimmed, field: 'STRING' };
		}
		if ((clause.field === 'IDENTIFIER' || clause.field === 'ANY') && !isComment && matchesTokenPattern(trimmed, clause)) {
			return { matched: true, line: i + 1, snippet: trimmed, field: clause.field === 'ANY' ? 'IDENTIFIER' : clause.field };
		}
	}
	return { matched: false, line: 1, snippet: '', field: clause.field };
}

export function executeInstantSearch(
	rawQuery: string,
	nodes: readonly GraphEntityNode[],
	sourceMap: Readonly<Record<string, string>>
): readonly InstantSearchHit[] {
	const clauses = parseInstantSearchQuery(rawQuery);
	if (clauses.length === 0) return [];
	const hits: InstantSearchHit[] = [];
	for (const node of nodes) {
		const src = resolveEntitySourceSlice(node.qualifiedName, sourceMap, node.name);
		let [overallMatch, bestLine, bestSnippet, bestField]: [boolean, number, string, InstantSearchField] = [true, 1, node.qualifiedName, 'ANY'];
		for (let i = 0; i < clauses.length; i++) {
			const c = clauses[i]!;
			const res = evaluateClauseAgainstSource(node, src, c);
			const effective = c.isNegated ? !res.matched : res.matched;
			if (res.matched && !c.isNegated) { bestLine = res.line; bestSnippet = res.snippet; bestField = res.field; }
			overallMatch = i === 0 ? effective : c.connectWithOr ? overallMatch || effective : overallMatch && effective;
		}
		if (overallMatch) hits.push({ entityId: node.id, entityName: node.name, qualifiedName: node.qualifiedName, matchedField: bestField, line: bestLine, snippet: bestSnippet });
	}
	return hits;
}
