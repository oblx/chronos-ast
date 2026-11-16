# 06-02 // Bi-Directional SARIF 2.1.0 Bridge, Incremental Watch & Bun 1.4 Guardrails

> **Author:** `Oblx <code@oblx.dev>` | **Parent Index:** [`../00-index.md`](../00-index.md) | **Domain:** `src/plugins/exporters/sarif.adapter.ts`, `src/workers/watcher.worker.ts`

---

## 1. Bi-Directional OASIS SARIF 2.1.0 Interoperability (`sarif.adapter.ts`)

`src/plugins/exporters/sarif.adapter.ts` bridges Chronos with external static-analysis pipelines (ESLint, Clippy, Semgrep, TypeScript `tsc`, and GitHub Code Scanning):

* **Outbound SARIF 2.1.0 Export (`exportSarif210Report`):** Serializes active `CHR-001 .. CHR-015` violations and rule metadata into OASIS SARIF `2.1.0` JSON with `physicalLocation.artifactLocation.uri` and `region.startLine` coordinates.
* **Inbound SARIF 2.1.0 Ingestion (`importSarif210Diagnostics`):** Parses external SARIF `2.1.0` logs, resolves each diagnostic coordinate `(uri, startLine)` onto the most specific enclosing Chronos `GraphEntityNode`, and merges findings directly into `CodeCheckDrawer.svelte` with tool provenance badges (`sourceTool`).

---

## 2. Debounced Incremental File-Watch Daemon (`watcher.worker.ts`)

`src/workers/watcher.worker.ts` implements sub-`50ms` single-file re-analysis (`reindexSingleFileIncremental` and `createDebouncedIncrementalWatcher`):

* **Debounced Mutation Window:** Coalesces rapid file saves within `HIS_SAFETY_THRESHOLDS.DEBOUNCE_WATCH_MS` (`16ms`) before dispatching to the worker pool.
* **Sub-`50ms` Incremental Budget (`HIS_SAFETY_THRESHOLDS.INCREMENTAL_BUDGET_MS = 50`):** Recomputes AST symbols, 10-kind references, McCabe/Halstead/Martin metrics, and `source_units` while preserving all `(entityKind, qualifiedName)` rows in the `annotations` table.

---

## 3. Bun 1.4 Runtime Guardrails (`wasm_treesitter.plugin.ts`, `connection.ts`, `ws.hub.ts`)

* **Singleton `WebAssembly.Module` Cache (`singletonWasmModuleCache`):** Compiles each language `.wasm` binary at most once per process into a module-level `Map<SupportedLanguage, WebAssembly.Module>`, preventing repeated JavaScriptCore WASM heap allocations.
* **SQLite Planner & Concurrency PRAGMAs:** Executes `PRAGMA busy_timeout = 3000` and `PRAGMA temp_store = MEMORY` on `createChronosDb()`, plus `PRAGMA optimize` right before `PRAGMA wal_checkpoint(TRUNCATE)` on `closeChronosDb()`, paired with `.worker-<BUN_TEST_WORKER_ID>` parallel isolation.
* **WebSocket Backpressure Protection:** Checks `ws.getBufferedAmount() > WS_CONFIG.MAX_BUFFERED_BYTES` (`131072`) to drop volatile `WS_REMOTE_CURSOR` frames for saturated peers while preserving critical annotations and lockdown frames.
