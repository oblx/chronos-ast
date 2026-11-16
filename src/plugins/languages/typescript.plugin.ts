/**
 * @author Oblx <code@oblx.dev>
 * @description TypeScript/Svelte language plugin bound via createGrammarLanguageParser to TYPESCRIPT_GRAMMAR_SPEC.
 */
import { TYPESCRIPT_GRAMMAR_SPEC } from '@config/registries/grammars.registry';
import { createGrammarLanguageParser } from '@core/ast/scanner/lexical_scanner';

export { TYPESCRIPT_GRAMMAR_SPEC };
export const parseTypeScriptSource = createGrammarLanguageParser(TYPESCRIPT_GRAMMAR_SPEC);
