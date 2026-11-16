# 01-02 // Architecture Decision Records (`ADR-001` – `ADR-007`)

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Status:** `ACCEPTED`

---

## ADR-001: Pure Bun + Svelte 5 Runes + Ogygia Island Boundary

* **Context:** React virtual DOM diffing and Node.js legacy polyfills introduce memory overhead and frame jitter on dense architectural graphs.
* **Decision:** Build the entire runtime on Bun with Svelte 5 fine-grained reactive runes (`state`, `derived`) wrapped in Ogygia island hydration boundaries (`src/lib/ogygia/`).

## ADR-002: Dual-Storage Parity (`bun:sqlite` + Browser IndexedDB)

* **Context:** Engineers require both server-grade relational querying and zero-latency offline workspace switching in the browser.
* **Decision:** Maintain identical relational schemas across `bun:sqlite` (`src/lib/db/sqlite/schema/tables.ts`) and browser IndexedDB (`src/lib/db/indexeddb/repository/workspace.idb.ts`).

## ADR-003: Scope-Stack CST/AST Scanner & Nearest-Scope Shadowing Resolver

* **Context:** Naive line-based regex scanners flatten class/module scopes and create false-positive `CALLS` edges when multiple classes define identically named methods.
* **Decision:** Track hierarchical `ScopeStackFrame` boundaries (`qualifiedName`, `kind`, `lineEnd`) in `lexical_scanner.ts` and resolve target symbols from the innermost enclosing scope outward in `reference.resolver.ts`.

## ADR-004: Zero-Dependency Binary PKZIP Extractor

* **Context:** External archive libraries often pull in Node `Buffer` or `stream` polyfills.
* **Decision:** Parse PKZIP local file headers directly via standard `DataView` and `Uint8Array` using `PKZIP_CONSTANTS` in `src/config/constants.ts`, inflating raw `DEFLATE` streams via native `Bun.inflateSync` or `DecompressionStream`.

## ADR-005: Graph-Derived Hitz & Montazeri `LCOM4`

* **Context:** Approximating cohesion via `Ce - Ca` misclassifies stable orchestrators as uncohesive.
* **Decision:** Compute true `LCOM4` (`src/core/metrics/stability.engine.ts`) as the connected components of a class or module's methods linked by shared state (`SETS`, `USES`) or internal `CALLS`.

## ADR-006: Optional AI Provider Bridge (`provider_url` & `provider_bearer`)

* **Context:** Hardcoding proprietary LLM SDKs violates clean hexagonal boundaries.
* **Decision:** Isolate optional AI telemetry inside `src/lib/ai/provider/` configured solely via optional `provider_url` and `provider_bearer` tokens.

## ADR-007: Memgraph Hexagonal Secondary Adapter (`SQLITE_LOCAL` | `MEMGRAPH_BOLT`)

* **Context:** Deep 6-to-12 hop transitive impact queries and Brandes Betweenness Centrality across massive monorepos benefit from an in-memory property graph engine without sacrificing SQLite offline primacy.
* **Decision:** Keep `bun:sqlite` as the canonical SSOT and integrate Memgraph (`src/plugins/exporters/memgraph.exporter.ts`) as an optional secondary adapter toggled in the HUD (`GRAPH ENGINE: SQLITE_LOCAL | MEMGRAPH_BOLT`).
