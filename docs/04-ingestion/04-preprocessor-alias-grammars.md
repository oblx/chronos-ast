# 04-04 // C/C++ Preprocessor Expander, Alias Propagator & Declarative Grammars

> **Author:** `Oblx <code@oblx.dev>` | **Parent Index:** [`../00-index.md`](../00-index.md) | **Domain:** `src/core/ast/preprocessor.expander.ts`, `src/core/graph/alias.propagator.ts`, `src/config/grammars.registry.ts`

---

## 1. C/C++ Preprocessor & Macro Expander (`src/core/ast/preprocessor.expander.ts`)

Built on the Chronos Polyglot AST & Graph Comprehension Architecture's single-pass bounded token-stream expander, Chronos expands C/C++ macros and conditional compilation directives prior to CST/AST symbol extraction without invoking an external compiler:

* **Macro Environment & Depth Guard:** Parses object-like `#define NAME value` and function-like `#define NAME(p1, p2) body` declarations into a typed `Map<string, MacroDefinition>`. Recursive or cyclic macro chains are bounded by `MAX_MACRO_EXPANSION_DEPTH` (`16`) in `src/config/constants.ts`, guaranteeing constant-time termination without hanging worker threads.
* **Shunting-Yard Conditional Compilation (`#if` / `#ifdef` / `#ifndef` / `#elif` / `#else` / `#endif`):** Evaluates `defined(SYM)`, logical negation, conjunction, disjunction, equality, and relational integer comparisons against configured workspace defines. When a symbol is undefined in the active profile, the evaluator defaults to **inactive-branch preserve** mode so platform-specific routines inside `#ifdef _WIN32` or `#ifdef __linux__` remain indexed rather than dropped.
* **Metamodel Binding:** Emits `DEFINES` references for `#define` declarations alongside `USES` (object-like expansion) and `CALLS` (function-like invocation) references from the invocation line to the macro definition, feeding `SourceSpanViewer.svelte` with zero schema changes.

---

## 2. Bounded Inter-Procedural Alias & Call-Chain Resolver (`src/core/graph/alias.propagator.ts`)

Immediately after Pass-2 cross-file import resolution in `src/core/metamodel/references/resolver/reference.resolver.ts`, Chronos executes an Andersen-style linear-time worklist subset propagation (`propagateInterProceduralAliases`):

* **Constructor & Factory Return Binding:** When a variable initialization (`SETS` + `CALLS`) invokes a class constructor or a factory function with a `TYPED` return target, the variable's alias set is seeded with the resolved class or interface entity ID.
* **Monotonic Alias Propagation:** When an alias assignment (`SETS` + `USES`) occurs between variables or fields, the worklist copies the source entity's resolved target types into the dependent entity's alias set until fixed-point convergence bounded by `MAX_ALIAS_WORKLIST_PASSES` (`16`).
* **Chained Member Resolution:** Multi-hop receiver expressions (`app.services.auth.verify()`) are resolved hop-by-hop across `DEFINES` and `TYPED` edges on each intermediate class or interface, materializing concrete `CALLS` edges in the metamodel graph.

---

## 3. Keyword-Block & Declarative Grammar Registry (`src/config/grammars.registry.ts`)

Chronos drives `scanSourceWithGrammar` in `src/core/ast/scanner/lexical_scanner.ts` from declarative Data-as-Code language tables in `src/config/grammars.registry.ts` across three `BLOCK_DELIMITERS` modes:

| Delimiter Mode | Scope Resolution Rule | Target Languages |
| :--- | :--- | :--- |
| **`BRACES`** | Balanced `{` and `}` lexical depth counter | TypeScript, Svelte, JavaScript, Rust, C, C++, Go |
| **`INDENTATION`** | Off-side significant-whitespace column stack | Python, indentation DSLs |
| **`KEYWORD_PAIRS`** | Matched opener (`function`, `subroutine`, `module`, `package body`, `begin`, `if`, `do`, `def`) and closer (`end`, `end function`, `end subroutine`, `endif`, `enddo`) tokens | Lua, Ruby, Fortran, Ada, SQL / PL-pgSQL |
