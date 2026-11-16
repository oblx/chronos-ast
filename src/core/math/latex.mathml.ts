/**
 * @author Oblx <code@oblx.dev>
 * @description Pure TypeScript LaTeX tokenizer & AST-to-MathML compiler supporting fractions, roots, sums, subscripts/superscripts, Greek letters, and balanced delimiter auditing.
 */

export interface MathSegment { readonly kind: 'text' | 'inline' | 'block'; readonly content: string; }
interface Cursor { src: string; pos: number; }

const GREEK_MAP: Readonly<Record<string, string>> = {
	Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', Pi: 'Π', Gamma: 'Γ', Theta: 'Θ', Lambda: 'Λ',
	alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', eta: 'η', theta: 'θ',
	lambda: 'λ', mu: 'μ', nu: 'ν', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', psi: 'ψ', omega: 'ω',
	infty: '∞', emptyset: '∅',
};
const OP_MAP: Readonly<Record<string, string>> = {
	le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡',
	in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', to: '→', rightarrow: '→',
	leftarrow: '←', mapsto: '↦', times: '×', cdot: '·', pm: '±', mp: '∓', forall: '∀', exists: '∃', vert: '|',
};
const FN_NAMES = new Set(['ln', 'log', 'max', 'min', 'sin', 'cos', 'tan', 'lim', 'round', 'floor', 'ceil', 'mod', 'gcd']);
const BIG_OPS: Readonly<Record<string, string>> = { sum: '∑', prod: '∏', int: '∫', bigcup: '⋃', bigcap: '⋂' };

const escXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const skipWs = (c: Cursor): void => { while (c.pos < c.src.length && /\s/.test(c.src[c.pos]!)) c.pos++; };

function readBracedText(c: Cursor): string {
	skipWs(c);
	if (c.src[c.pos] !== '{') return c.src[c.pos++] ?? '';
	c.pos++;
	let depth = 1;
	const start = c.pos;
	while (c.pos < c.src.length && depth > 0) {
		const ch = c.src[c.pos++];
		if (ch === '{') depth++; else if (ch === '}') depth--;
	}
	return c.src.slice(start, Math.max(start, c.pos - 1));
}

function parseGroup(c: Cursor, stopAtBrace = false, block = false): string {
	const items: string[] = [];
	while (c.pos < c.src.length) {
		skipWs(c);
		if (c.pos >= c.src.length) break;
		const ch = c.src[c.pos]!;
		if (stopAtBrace && ch === '}') { c.pos++; break; }
		if (ch === '|' && items.length > 0 && items[items.length - 1] === '<mo>|</mo>') { items.push('<mo>|</mo>'); c.pos++; continue; }
		items.push(parseAtomWithScripts(c, block));
	}
	return items.length === 1 ? items[0]! : `<mrow>${items.join('')}</mrow>`;
}

function parseAtom(c: Cursor, block: boolean): { mml: string; isBigOp: boolean } {
	skipWs(c);
	if (c.pos >= c.src.length) return { mml: '<mrow/>', isBigOp: false };
	const ch = c.src[c.pos]!;
	if (ch === '{') { c.pos++; return { mml: parseGroup(c, true, block), isBigOp: false }; }
	if (ch === '\\') return parseCommand(c, block);
	if (/[0-9]/.test(ch)) {
		const m = c.src.slice(c.pos).match(/^\d+(?:\.\d+)?/);
		c.pos += m![0].length;
		return { mml: `<mn>${escXml(m![0])}</mn>`, isBigOp: false };
	}
	if (/[a-zA-Z]/.test(ch)) { c.pos++; return { mml: `<mi>${escXml(ch)}</mi>`, isBigOp: false }; }
	c.pos++;
	return { mml: `<mo>${escXml(ch)}</mo>`, isBigOp: false };
}

function parseCommand(c: Cursor, block: boolean): { mml: string; isBigOp: boolean } {
	c.pos++;
	const m = c.src.slice(c.pos).match(/^[a-zA-Z]+/);
	if (!m) { const sym = c.src[c.pos++] ?? ''; return { mml: `<mo>${escXml(sym)}</mo>`, isBigOp: false }; }
	const cmd = m[0];
	c.pos += cmd.length;
	if (cmd === 'frac') return { mml: `<mfrac>${parseAtom(c, block).mml}${parseAtom(c, block).mml}</mfrac>`, isBigOp: false };
	if (cmd === 'sqrt') return { mml: `<msqrt>${parseAtom(c, block).mml}</msqrt>`, isBigOp: false };
	if (cmd === 'text' || cmd === 'mathrm') return { mml: `<mtext>${escXml(readBracedText(c))}</mtext>`, isBigOp: false };
	if (cmd === 'left' || cmd === 'right') {
		skipWs(c);
		const d = c.src[c.pos] === '\\' ? (c.src.slice(c.pos).match(/^\\[a-zA-Z|]+/)?.[0] ?? '.') : (c.src[c.pos] ?? '.');
		c.pos += d.length;
		const clean = d === '.' ? '' : d.replace(/^\\/, '').replace('vert', '|');
		return { mml: clean ? `<mo>${escXml(clean)}</mo>` : '<mrow/>', isBigOp: false };
	}
	if (BIG_OPS[cmd]) return { mml: `<mo movablelimits="true">${BIG_OPS[cmd]}</mo>`, isBigOp: true };
	if (GREEK_MAP[cmd]) return { mml: `<mi>${GREEK_MAP[cmd]}</mi>`, isBigOp: false };
	if (OP_MAP[cmd]) return { mml: `<mo>${escXml(OP_MAP[cmd])}</mo>`, isBigOp: false };
	if (FN_NAMES.has(cmd)) return { mml: `<mi mathvariant="normal">${escXml(cmd)}</mi>`, isBigOp: false };
	return { mml: `<mi>${escXml(cmd)}</mi>`, isBigOp: false };
}

function parseAtomWithScripts(c: Cursor, block: boolean): string {
	const base = parseAtom(c, block);
	let sub: string | null = null, sup: string | null = null;
	for (let i = 0; i < 2; i++) {
		skipWs(c);
		const next = c.src[c.pos];
		if (next === '_' && sub === null) { c.pos++; sub = parseAtom(c, block).mml; }
		else if (next === '^' && sup === null) { c.pos++; sup = parseAtom(c, block).mml; }
		else break;
	}
	if (sub && sup) return base.isBigOp && block ? `<munderover>${base.mml}${sub}${sup}</munderover>` : `<msubsup>${base.mml}${sub}${sup}</msubsup>`;
	if (sub) return base.isBigOp && block ? `<munder>${base.mml}${sub}</munder>` : `<msub>${base.mml}${sub}</msub>`;
	if (sup) return base.isBigOp && block ? `<mover>${base.mml}${sup}</mover>` : `<msup>${base.mml}${sup}</msup>`;
	return base.mml;
}

export function compileLatexToMathml(latex = '', displayMode = false): string {
	const trimmed = String(latex ?? '').trim();
	if (!trimmed) return '<math xmlns="http://www.w3.org/1998/Math/MathML"></math>';
	return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${displayMode ? 'block' : 'inline'}">${parseGroup({ src: trimmed, pos: 0 }, false, displayMode)}</math>`;
}

export function splitLatexMarkdownSegments(rawText = ''): readonly MathSegment[] {
	const text = String(rawText ?? '');
	const out: MathSegment[] = [], re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
	let lastIdx = 0, match: RegExpExecArray | null;
	while ((match = re.exec(text)) !== null) {
		if (match.index > 0 && text[match.index - 1] === '\\') continue;
		if (match.index > lastIdx) out.push({ kind: 'text', content: text.slice(lastIdx, match.index) });
		if (match[1] !== undefined) out.push({ kind: 'block', content: match[1].trim() });
		else if (match[2] !== undefined) out.push({ kind: 'inline', content: match[2].trim() });
		lastIdx = re.lastIndex;
	}
	if (lastIdx < text.length) out.push({ kind: 'text', content: text.slice(lastIdx) });
	return out.length > 0 ? out : [{ kind: 'text', content: text }];
}

export function hasBalancedLatexDelimiters(markdown = ''): boolean {
	const stripped = String(markdown ?? '').replace(/`[^`]*`/g, '').replace(/\\\$/g, '');
	if ((stripped.match(/\$\$/g) ?? []).length % 2 !== 0) return false;
	return (stripped.replace(/\$\$/g, '').match(/\$/g) ?? []).length % 2 === 0;
}
