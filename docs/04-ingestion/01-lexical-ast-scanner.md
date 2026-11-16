# 04-01 // CST/AST Bridge, Scope Stack & Shadowing Resolver

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/core/ast/`, `src/core/metamodel/references/resolver/`

---

## 1. Two-Tier CST/AST Extraction Architecture

Chronos separates control-flow tree construction from declarative polyglot symbol extraction:

1. **Incremental CST/AST Complexity Bridge (`src/core/ast/tree_sitter_bridge.ts`):** Tokenizes source lines into `ParsedLineToken` records and constructs a hierarchical `ComplexityNode` tree rooted at `AST_NODE_TYPES.PROGRAM`, tracking nested `BLOCK` scopes and branching predicates.
2. **Scope-Stack Lexical Scanner (`src/core/ast/scanner/lexical_scanner.ts`):** Executes declarative language grammar plugins (`src/plugins/languages/{typescript,rust,cpp}.plugin.ts`) while maintaining a live `ScopeStackFrame` stack (`qualifiedName`, `kind`, `lineEnd`).

---

## 2. Hierarchical Scope Stack & Heritage Extraction

Rather than assigning all symbols in a file to a flat scope, `scanSourceWithGrammar` pushes a new `ScopeStackFrame` whenever a `CLASS`, `NAMESPACE`, `FUNCTION`, or `METHOD` opens and pops frames automatically once the current line exceeds `frame.lineEnd`:

* **Contextual Method Promotion:** Functions declared inside an active `CLASS` frame are automatically promoted to `ENTITY_KINDS.METHOD` and scoped as `file::Class::method`.
* **Heritage & Contract Edges:** `extends` clauses emit `REFERENCE_KINDS.INHERITS` and `implements` clauses emit `REFERENCE_KINDS.IMPLEMENTS`.
* **State Access Edges:** Member assignments (`this.field = ...`, `self.field = ...`) emit `REFERENCE_KINDS.SETS`, while member reads emit `REFERENCE_KINDS.USES`.

---

## 3. Nearest-Scope Symbol Shadowing Resolution (`reference.resolver.ts`)

When resolving a `CALLS`, `USES`, or `SETS` reference originating from `sourceQualifiedName` (`a/b.ts::ClassB::run`) toward `targetSymbolName` (`helper`), `resolveScopedTargetId` walks up the lexical scope chain from innermost to outermost before falling back to global short names:

1. **Exact Qualified Match:** Checks `byQualifiedName.get(targetSymbolName)`.
2. **Enclosing Method/Class Scope:** Checks `a/b.ts::ClassB::run::helper`, then `a/b.ts::ClassB::helper`.
3. **Enclosing File Scope:** Checks `a/b.ts::helper`.
4. **Workspace Export Fallback:** Resolves against workspace-wide exported symbols only if no enclosing scope defines `helper`.
