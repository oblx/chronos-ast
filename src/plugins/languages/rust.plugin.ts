/**
 * @author Oblx <code@oblx.dev>
 * @description Rust/Go language plugin bound via createGrammarLanguageParser to RUST_GRAMMAR_SPEC.
 */
import { RUST_GRAMMAR_SPEC } from '@config/registries/grammars.registry';
import { createGrammarLanguageParser } from '@core/ast/scanner/lexical_scanner';

export { RUST_GRAMMAR_SPEC };
export const parseRustSource = createGrammarLanguageParser(RUST_GRAMMAR_SPEC);
