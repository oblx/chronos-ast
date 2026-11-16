# 04-03 // Indentation Scope Scanner, Python Plugin & WASM Tree-Sitter Port

> **Author:** `Oblx <code@oblx.dev>` | **Parent Index:** [`../00-index.md`](../00-index.md) | **Domain:** `src/core/ast/scanner/lexical_scanner.ts`, `src/plugins/languages/{python,wasm_treesitter}.plugin.ts`

---

## 1. Dual Block-Delimiter Lexical Architecture (`BRACE` vs. `INDENTATION`)

`src/core/ast/scanner/lexical_scanner.ts` supports two deterministic block-boundary algorithms governed by `BLOCK_DELIMITERS` in `src/config/metamodel.constants.ts`:

* **Brace-Balanced Mode (`BLOCK_DELIMITERS.BRACE`):** Used by TypeScript, Svelte, Rust, and C++ grammars (`resolveBalancedBlockEndLine`). Tracks lexical brace depth across multi-line signatures, arrow closures, and nested blocks while ignoring comment lines.
* **Off-Side Indentation Mode (`BLOCK_DELIMITERS.INDENTATION`):** Used by Python (`resolveIndentationBlockEndLine`). Computes the leading column width of a header ending with `:` (expanding tabs by `LEXICAL_CONSTANTS.TAB_WIDTH_SPACES`) and scans forward until encountering a non-empty, non-comment statement with indentation less than or equal to the header column.

---

## 2. Python Grammar Plugin (`src/plugins/languages/python.plugin.ts`)

`parsePythonSource` provides first-class static analysis for `.py` source units (`SUPPORTED_LANGUAGES.PYTHON`):

* **Symbol Extraction:** Extracts `MODULE` file containers, `CLASS` hierarchies (`class Name(Base):`), `METHOD` definitions (`def method(self, ...):`), and standalone `FUNCTION` definitions (`async def` / `def`).
* **Reference Extraction:** Emits `IMPORTS` (`import` and `from ... import`), `INHERITS` (base class list), `CALLS`, `SETS`, `MODIFIES`, `USES`, and `TYPED` parameter annotations, feeding the same two-pass cross-file symbol resolver (`src/core/metamodel/references/resolver/reference.resolver.ts`) and CFG builder as brace-delimited languages.

---

## 3. Zero-Node WASM Tree-Sitter Hexagonal Port (`src/plugins/languages/wasm_treesitter.plugin.ts`)

To preserve strict browser/Bun runtime purity without Node.js polyfills (`fs`, `path`, `buffer`, `events`), `wasm_treesitter.plugin.ts` defines the `AstScannerPort` hexagonal interface:

* **Browser-Native WebAssembly Instantiation:** Loads `.wasm` grammar binaries exclusively through native `fetch(wasmUrl)` and `WebAssembly.instantiate(bytes, {})`.
* **Graceful Dual-Mode Fallback (`SCANNER_MODES`):** Operates in `SCANNER_MODES.WASM_TREESITTER` when a compiled `.wasm` binary is reachable and automatically falls back to `SCANNER_MODES.FAST_LEXICAL` (`parseSourceFile`) in offline or static SPA environments without throwing runtime errors.
* **Snapshot Delta Differ (`src/core/metamodel/snapshot.differ.ts`):** Compares any two indexed workspaces (`diffWorkspaceSnapshots`) across all supported languages to report `ADDED`, `REMOVED`, and `MODIFIED` entities, net complexity deltas, and newly formed Tarjan SCC cycles.
