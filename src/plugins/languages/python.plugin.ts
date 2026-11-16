/**
 * @author Oblx <code@oblx.dev>
 * @description Python significant-whitespace language plugin bound via createGrammarLanguageParser to PYTHON_GRAMMAR_SPEC.
 */
import { PYTHON_GRAMMAR_SPEC, TYPESCRIPT_GRAMMAR_SPEC } from '@config/registries/grammars.registry';
import { createGrammarLanguageParser } from '@core/ast/scanner/lexical_scanner';

export { PYTHON_GRAMMAR_SPEC };

export const parsePythonSource = createGrammarLanguageParser(
	{ ...PYTHON_GRAMMAR_SPEC, importRegex: TYPESCRIPT_GRAMMAR_SPEC.importRegex },
	(sourceCode: string) =>
		sourceCode.replace(
			/^from\s+([A-Za-z0-9_.]+)\s+import\s+(.+)$/gm,
			(_m, modPath: string, symbols: string) => `import { ${symbols} } from '${modPath.replace(/\./g, '/')}'`
		)
);
