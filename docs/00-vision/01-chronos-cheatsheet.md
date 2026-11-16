# 00-01 // Chronos Tactical Cheatsheet

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Status:** `SSOT_VALIDATED`

---

## 1. Identity & Runtime Stack

* **Mission:** MIT-licensed open-source static code analysis and architectural comprehension engine built on the Chronos Polyglot AST & Graph Comprehension Architecture (`v1.9.3`).
* **Runtime & UI:** Pure Bun + TypeScript 7 + Svelte 5 Runes + Ogygia Island Hydration (`src/lib/ogygia/`). Zero React, zero Node.js runtime polyfills.
* **Agent & Persistence Triad:**
	* **Autonomous Agent Bridge:** Machine-readable discovery (`GET /api/mcp/manifest`), headless `bun run mcp:token`, HMAC-SHA256 webhooks (`webhook.bridge.ts`).
	* **Primary SSOT:** `bun:sqlite` + Drizzle ORM (`src/lib/db/sqlite/schema/tables.ts`).
	* **Offline Client Mirror:** Browser IndexedDB (`src/lib/db/indexeddb/repository/workspace.idb.ts`).
	* **Optional Graph Secondary Port:** Memgraph Cypher & MAGE adapter (`src/plugins/exporters/memgraph.exporter.ts`).

---

## 2. Metamodel Taxonomy (`src/config/metamodel.constants.ts`)

* **9 Entity Kinds (`ENTITY_KINDS`):** `PROJECT`, `MODULE`, `FILE`, `NAMESPACE`, `CLASS`, `INTERFACE`, `FUNCTION`, `METHOD`, `VARIABLE`.
* **7 Reference Kinds (`REFERENCE_KINDS`):** `CALLS`, `DEFINES`, `SETS`, `USES`, `INHERITS`, `IMPORTS`, `IMPLEMENTS`.
* **Identity & Incremental Hashing:** Deterministic FNV-1a 32-bit hex checksums (`src/core/metamodel/entities/factory/entity.factory.ts`) skip unchanged AST subtrees.

---

## 3. Mathematical Engines & Thresholds (`src/core/metrics/` & `src/config/constants.ts`)

| Metric | Mathematical Formula | Warning Threshold | Critical Threshold |
| :--- | :--- | :--- | :--- |
| **Lines of Code (`LOC`)** | Count of non-blank, non-comment physical lines | `500` | `1500` |
| **Cyclomatic ($v(G)$)** | $v(G) = E - N + 2P = 1 + \text{branch\_predicates}$ | `10` | `25` |
| **Modified Cyclomatic ($v_{\text{mod}}(G)$)** | Collapses multi-arm `switch` / `match` blocks into $+1$ | `10` | `25` |
| **Halstead Volume ($V$)** | $V = (N_1 + N_2) \cdot \log_2(\eta_1 + \eta_2)$ | `800` | `2400` |
| **Maintainability Index ($MI$)** | $\max(0, \min(100, \frac{(171 - 5.2\ln(V) - 0.23v(G) - 16.2\ln(\text{LOC})) \cdot 100}{171}))$ | `< 65` | `< 40` |
| **Instability ($I$)** | $I = \frac{C_e}{C_a + C_e}$ (stored scaled $\times 1000$ in SQLite) | `0.70` | `0.90` |
| **Lack of Cohesion (`LCOM4`)** | Connected components of methods sharing state (`SETS`/`USES`) or `CALLS` | `2` | `4` |
| **Betweenness Centrality** | Shortest-path bridge score across directed entity dependencies | — | Top-5 Bottlenecks |

---

## 4. Universal Workspace Ingestion & Export Formats

* **Ingestion Vectors (`WORKSPACE_OPERATIONS`):**
	1. **Git Protocol (`INGEST_GIT`):** Native Smart HTTP v2 shallow `PACK` v2 unpacker + Tier-1 Forge archive fast-path (`src/core/metamodel/workspace/ingestion/git.ingestor.ts`).
	2. **`.ZIP` Binary Archive (`IMPORT_FILES`):** Native PKZIP extractor (`STORE` and raw `DEFLATE`) governed by `PKZIP_CONSTANTS`.
	3. **Remote URL (`IMPORT_URL`):** Fetches exported `.json` bundles or archives (`src/core/metamodel/workspace/ingestion/remote.fetcher.ts`).
	4. **Preset Workspaces (`OPEN`):** Idempotent upsert workspaces (`src/core/metamodel/project.identity.ts`).
* **Exporters (`EXPORT_FORMATS`):** `WORKSPACE_BUNDLE`, `SONARQUBE`, `CYTOSCAPE`, `MEMGRAPH_CYPHER`, `MERMAID_FLOWCHART`.
