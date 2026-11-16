/**
 * @author Oblx <code@oblx.dev>
 * @description Unit tests for Chronos v2.4.0 pure-TS LaTeX-to-MathML compiler and balanced delimiter auditor.
 */
import { describe, expect, test } from 'bun:test';
import { compileLatexToMathml, hasBalancedLatexDelimiters, splitLatexMarkdownSegments } from '@core/math/latex.mathml';

describe('Pure-TS LaTeX-to-MathML Engine', () => {
	test('compiles fractions, roots, Greek symbols, and subscripts into valid MathML', () => {
		const mml = compileLatexToMathml('V = (N_1 + N_2) \\cdot \\log_2(\\eta_1 + \\eta_2)', true);
		expect(mml).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">');
		expect(mml).toContain('<msub>');
		expect(mml).toContain('η');
		expect(mml).toContain('·');

		const frac = compileLatexToMathml('I = \\frac{C_e}{C_a + C_e}');
		expect(frac).toContain('<mfrac>');
		expect(frac).toContain('display="inline"');
	});

	test('splits inline and block math segments and verifies delimiter balance', () => {
		const segs = splitLatexMarkdownSegments('Metric $v(G)$ equals:\n$$v(G) = E - N + 2P$$');
		expect(segs.some((s) => s.kind === 'inline' && s.content === 'v(G)')).toBe(true);
		expect(segs.some((s) => s.kind === 'block' && s.content.includes('2P'))).toBe(true);
		expect(hasBalancedLatexDelimiters('Good $a + b$ and $$x^2$$')).toBe(true);
		expect(hasBalancedLatexDelimiters('Broken $a + b')).toBe(false);
		expect(hasBalancedLatexDelimiters('Unclosed $$a + b')).toBe(false);
	});
});
