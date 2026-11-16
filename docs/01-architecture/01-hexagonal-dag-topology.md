# 01-01 // Hexagonal Clean Onion, 5-Operator Architecture Rules & Worker Pool DAG

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/config/architecture.schema.ts`, `src/core/`, `src/workers/`, `src/plugins/`

---

## 1. Clean Onion Dependency Direction & Automatic Grouping Modes

Dependencies point strictly inward toward `src/config/` and `src/core/`, while `ARCH_GROUPING_MODES` (`src/config/architecture.schema.ts`) supports four automatic and declarative virtual tree projections:

* **`CUSTOM_RULES` (`.arch`):** Maps entities into the five canonical Clean Onion rings (`RING_0_CONFIG` through `RING_4_CLIENT_HUD` plus `EXTERNAL_WORKSPACE`).
* **`DIRECTORY`:** Groups entities by physical repository directory hierarchy.
* **`LANGUAGE` (`BY_LANGUAGE`):** Partitions polyglot workspaces by detected language (`TYPESCRIPT`, `RUST`, `CPP`, `PYTHON`, `LUA`, `RUBY`, `FORTRAN`, `ADA`, `SQL`).
* **`CALENDAR_RECENCY` (`BY_CALENDAR_RECENCY`):** Partitions entities into temporal recency buckets (`TODAY`, `THIS_WEEK`, `THIS_MONTH`, `THIS_QUARTER`, `EARLIER`).

| Ring | Layer Name | Directories | Allowed Outbound Dependencies |
| :--- | :--- | :--- | :--- |
| **Ring 0** | **Configuration & Constants** | `src/config/` | None (Leaf registry) |
| **Ring 1** | **Domain Core & Calculators** | `src/core/ast/`, `src/core/graph/`, `src/core/metrics/` | Ring 0 (`src/config/`) |
| **Ring 2** | **Metamodel & Persistence Ports** | `src/core/metamodel/`, `src/lib/db/` | Rings 0–1 |
| **Ring 3** | **Workers & Secondary Plugins** | `src/workers/`, `src/plugins/` | Rings 0–2 |
| **Ring 4** | **Tactical HUD & API Boundary** | `src/client/`, `src/core/api/` | Rings 0–3 |

---

## 2. 5-Operator Architecture Rule Enforcement (`CHR-017`)

Built on the Chronos Polyglot AST & Graph Comprehension Architecture's dependency check operators, `evaluateArchDependencyOperatorEdge` (`src/config/architecture.schema.ts`) and `evaluateWorkspaceCodeCheck` (`CHR-017` in `src/core/metrics/codecheck.engine.ts`) enforce five explicit relational operators across virtual architecture nodes:

1. **`NO_CIRCULAR_CHILDREN`:** Prohibits mutual or Tarjan SCC cycles among children within the same architecture layer.
2. **`CAN_ONLY_DEPEND_ON`:** Restricts a source layer's outbound dependencies exclusively to an allowlisted target layer set.
3. **`CAN_ONLY_BE_DEPENDED_ON_BY`:** Restricts inbound references targeting a layer exclusively to approved consumer layers.
4. **`CANNOT_DEPEND_ON`:** Prohibits transitive or direct outbound dependencies toward forbidden target layers.
5. **`CANNOT_DIRECTLY_DEPEND_ON`:** Prohibits immediate 1-hop references between two layers while permitting indirect inversion-of-control ports.

---

## 3. Deterministic Five-Stage Analysis DAG & Multi-Project Collaboration

When a project workspace is indexed (`src/core/metamodel/workspace.indexer.ts` and `src/core/api/project.routes.ts`), execution proceeds through an acyclic five-stage pipeline:

1. **Stage 1 — Source Ingestion:** Collects `SourceFileUnit` entries from preset sources, uploaded `.zip` archives (`zip.extractor.ts`), remote URLs (`remote.fetcher.ts`), or raw file uploads.
2. **Stage 2 — Worker Pool AST Dispatch:** `ChronosWorkerPoolScheduler` (`src/workers/pool/scheduler/worker_pool.ts`) dispatches `INDEX_FILE` envelopes to `ast_indexer.worker.ts`, producing scoped symbols, raw references, and a `ComplexityNode` CST/AST tree.
3. **Stage 3 — Scoped Symbolic & Alias Resolution:** `resolveSymbolicReferences` (`src/core/metamodel/references/resolver/reference.resolver.ts`) and `propagateInterProceduralAliases` (`src/core/graph/alias.propagator.ts`) resolve 10 reference kinds and chained member calls.
4. **Stage 4 — Worker Pool Metric Reduction:** `ChronosWorkerPoolScheduler` dispatches `CALCULATE_METRICS` envelopes to `metric_calculator.worker.ts` to compute `LOC`, McCabe `v(G)`, Halstead `V`, and Martin Coupling (`Ca`, `Ce`, `I`).
5. **Stage 5 — Topological Sort, `projects` Persistence & WebSocket Room Sync:** `computeTopologicalSort` (`src/core/graph/topological_sort.ts`) detects dependency cycles via Kahn's algorithm, persists the snapshot to SQLite (`projects`, `project_members`) + IndexedDB (`v6`), and broadcasts live collaborator updates across `ws:project:<id>` topics (`ws.hub.ts`).
