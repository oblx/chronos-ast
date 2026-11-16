# 06-01 // Verification Suites, Benchmarks & Operations

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `tests/`, `benches/`, `package.json`

---

## 1. Three-Tier Automated Test Pyramid (`bun test`)

Chronos enforces a strict Onion test pyramid across unit, integration, and end-to-end API/ingestion suites:

| Test Tier | Test File Path | Verified Invariants |
| :--- | :--- | :--- |
| **Unit — AST & DAG** | `tests/unit/core/ast.test.ts` | Language detection (`.ts`, `.rs`, `.cpp`), brace-balanced block slicing, `INHERITS`/`IMPLEMENTS`/`SETS` extraction, nearest-scope shadowing resolution, and Kahn's DAG cycle detection |
| **Unit — Metrics** | `tests/unit/metrics/metrics.test.ts` | McCabe `v(G)`, Modified `v_mod(G)`, Halstead `V / D / E / B`, Martin Instability `I`, and Hitz-Montazeri connected-component `LCOM4` |
| **Integration — DB & AI** | `tests/integration/database/metamodel.test.ts` | Drizzle SQLite persistence (`entities`, `references`, `metrics`), offline IndexedDB mirror parity, and optional `provider_url` / `provider_bearer` AI registry |
| **E2E — Ingest & Graph** | `tests/e2e/hud/api_flow.test.ts` | Full `/api/metamodel/*` lifecycle, binary `.ZIP` archive round-trip (`buildSyntheticZipArchive` -> `extractSourceFilesFromZip`), remote URL ingestion, Memgraph Cypher query/export, and workspace close |

---

## 2. Performance Microbenchmarks (`benches/`)

Three standalone microbenchmark suites validate throughput invariants via `bun run bench`:

1. **Parser Benchmark (`benches/parser.bench.ts`):** Measures lines-per-second throughput of `parseSourceFile` and `scanSourceWithGrammar`.
2. **Graph Traversal Benchmark (`benches/graph_traversal.bench.ts`):** Measures sub-millisecond latency of `buildButterflyProjection`, `buildDsmMatrix`, and `computeTopologicalSort`.
3. **Metric Reduction Benchmark (`benches/metric_reduction.bench.ts`):** Measures combined execution time of `calculateCyclomaticMetrics`, `calculateHalsteadFromSource`, and `calculateLcom4`.

---

## 3. NPM / Bun Operational Scripts (`package.json`)

* **`dev`:** Starts the Vite + Bun development server on port `3000`.
* **`build`:** Compiles the production bundle.
* **`test`:** Runs all unit, integration, and E2E suites via `bun test`.
* **`lint`:** Executes strict TypeScript 7 typechecking (`tsc --noEmit`).
* **`clean`:** Archives build artifacts into `.trash/` without destructive file deletion.
