# 00 // Chronos Documentation Index (SSOT — v1.9.3)

> **Author:** `Oblx <code@oblx.dev>` | **Root Truth:** [`../README.md`](../README.md) | **Cheatsheet:** [`00-vision/01-chronos-cheatsheet.md`](./00-vision/01-chronos-cheatsheet.md)

---

## 1. Indexed Documentation Hierarchy (8 Chronicles · 30 Chapters)

Every document in this directory is a two-digit indexed specification (`<= 100` lines, zero embedded source code, balanced LaTeX expressions, validated directly against `src/{config, core, server, workers, lib, plugins, client}`):

| Index | Category | Document Path | Architectural Domain |
| :--- | :--- | :--- | :--- |
| **`00-01`** | **Vision** | [`00-vision/01-chronos-cheatsheet.md`](./00-vision/01-chronos-cheatsheet.md) | 1-page executive cheatsheet: stack, metamodel, formulas, ports, and HUD (`v1.9.3`) |
| **`00-02`** | **Vision** | [`00-vision/02-manifesto-invariants.md`](./00-vision/02-manifesto-invariants.md) | McCarthy, McConnell, Fowler, Baer, Norman, Nishikado invariants |
| **`01-01`** | **Architecture** | [`01-architecture/01-hexagonal-dag-topology.md`](./01-architecture/01-hexagonal-dag-topology.md) | Clean Onion rings, 5-Operator Architecture Enforcement (`CHR-017`), `projects` & Worker Pool DAG |
| **`01-02`** | **Architecture** | [`01-architecture/02-adr-log.md`](./01-architecture/02-adr-log.md) | Architecture Decision Records (`ADR-001` through `ADR-007`, including Memgraph) |
| **`01-03`** | **Architecture** | [`01-architecture/03-mcp-metamodel-bridge.md`](./01-architecture/03-mcp-metamodel-bridge.md) | Zero-Dependency MCP Manifest, Dual-Spine HTTP/Stdio Bridges, CLI PAT & Webhooks (`v1.9.3`) |
| **`01-04`** | **Architecture** | [`01-architecture/04-security-rbac-vault.md`](./01-architecture/04-security-rbac-vault.md) | 5-Stage Server Wire DAG, `chronos.admin.wire.observe`, Chronos `u32` RBAC & AEAD Vault |
| **`02-01`** | **Metamodel** | [`02-metamodel/01-entity-reference-schema.md`](./docs/02-metamodel/01-entity-reference-schema.md) | Chronos Core Metamodel: 9 Entity Kinds, 10 Reference Kinds, `source_units` & FNV-1a |
| **`02-02`** | **Metamodel** | [`02-metamodel/02-sqlite-idb-parity.md`](./02-metamodel/02-sqlite-idb-parity.md) | Drizzle ORM (`bun:sqlite`), `projects`, `community_themes`, `user_preferences`, IndexedDB & Memgraph |
| **`02-03`** | **Metamodel** | [`02-metamodel/03-cfg-scc-schema.md`](./02-metamodel/03-cfg-scc-schema.md) | Intra-Procedural CFG, Cooper-Harvey-Kennedy Dominators & Tarjan `O(V + E)` SCCs |
| **`02-04`** | **Metamodel** | [`02-metamodel/04-codemap-compound-graph.md`](./02-metamodel/04-codemap-compound-graph.md) | Full-Project Codemap (Crown Slot 1), 3-Tier Semantic Zoom LOD & Frustum Culling |
| **`03-01`** | **Metrics** | [`03-metrics/01-mccabe-halstead-formulae.md`](./03-metrics/01-mccabe-halstead-formulae.md) | McCabe `v(G)`, Modified `v_mod(G)`, Halstead `V / D / E / B`, Oman `MI` |
| **`03-02`** | **Metrics** | [`03-metrics/02-coupling-cohesion-lcom4.md`](./03-metrics/02-coupling-cohesion-lcom4.md) | Martin Coupling (`Ca`, `Ce`, `I`), `LCOM4`, Brandes Centrality & `PercentChanged` Churn |
| **`03-03`** | **Metrics** | [`03-metrics/03-ck-main-sequence.md`](./03-metrics/03-ck-main-sequence.md) | Chidamber-Kemerer OO Suite (`WMC`, `DIT`, `NOC`, `CBO`, `RFC`), Main Sequence `D` & CodeCheck |
| **`03-04`** | **Metrics** | [`03-metrics/04-variable-lineage-his-profiles.md`](./03-metrics/04-variable-lineage-his-profiles.md) | Variable Tracker Data-Flow Graph (`DATA_FLOW`), Persistent Audit Annotations (`Atn`) & HIS Safety Profile |
| **`04-01`** | **Ingestion** | [`04-ingestion/01-lexical-ast-scanner.md`](./04-ingestion/01-lexical-ast-scanner.md) | Tree-Sitter CST/AST bridge, hierarchical scope stack, and shadowing resolver |
| **`04-02`** | **Ingestion** | [`04-ingestion/02-zip-remote-bundle-ingest.md`](./04-ingestion/02-zip-remote-bundle-ingest.md) | Hardened PKZIP extractor, Universal Git Packfile Ingestor, PR Publisher & SSRF Guard |
| **`04-03`** | **Ingestion** | [`04-ingestion/03-indentation-wasm-ports.md`](./04-ingestion/03-indentation-wasm-ports.md) | Off-side Python indentation scanner, WASM Tree-Sitter port & Snapshot Delta Differ |
| **`04-04`** | **Ingestion** | [`04-ingestion/04-preprocessor-alias-grammars.md`](./04-ingestion/04-preprocessor-alias-grammars.md) | C/C++ Preprocessor & Macro Expander, Andersen Alias Propagator & `KEYWORD_PAIRS` Registry |
| **`04-05`** | **Ingestion** | [`04-ingestion/05-git-pr-publisher-sarif.md`](./04-ingestion/05-git-pr-publisher-sarif.md) | Git Smart HTTP v2 Packfile Ingestor & Automated Architectural Pull Request Publisher |
| **`05-01`** | **HUD** | [`05-hud/01-theme-tokens-geometry.md`](./05-hud/01-theme-tokens-geometry.md) | 5-Tier Grid (`UWQHD`), Persistent Mini-Rails, `HudChamferButton`, Community Theme Studio & Ligatures |
| **`05-02`** | **HUD** | [`05-hud/02-vector-crt-radar-ergonomics.md`](./05-hud/02-vector-crt-radar-ergonomics.md) | Camera Physics (`MIN_AUTO_FIT_ZOOM=0.72`), Edge Clamping & `HudAiCommandDeck` (`v1.9.3`) |
| **`05-03`** | **HUD** | [`05-hud/03-ib-source-treemap-dsm.md`](./05-hud/03-ib-source-treemap-dsm.md) | Information Browser (IB), Syntax-Colored Source Viewer, Treemap, DSM & Architect's Field Tome (`?`) |
| **`05-04`** | **HUD** | [`05-hud/04-mermaid-themes-collab-privacy.md`](./05-hud/04-mermaid-themes-collab-privacy.md) | Mermaid Studio, Theme Marketplace, 60fps Multi-Scope Virtual Cursors & Sovereign Privacy |
| **`06-01`** | **Operations** | [`06-operations/01-cli-testing-benchmarks.md`](./06-operations/01-cli-testing-benchmarks.md) | Verification suites (`tests/unit`, `tests/integration`, `e2e`), `bun run verify`, CLI & benchmarks |
| **`06-02`** | **Operations** | [`06-operations/02-sarif-incremental-watch.md`](./06-operations/02-sarif-incremental-watch.md) | Bi-Directional SARIF 2.1.0 Bridge, `<50ms` Incremental Watcher & Bun 1.4 Runtime Guardrails |
| **`06-03`** | **Operations** | [`06-operations/03-compliance-vector-exports.md`](./06-operations/03-compliance-vector-exports.md) | Structured Deviation Templates, SVG/DOT Vector Exporters & HTML/CSV Compliance Reports |
| **`07-01`** | **Blueprint** | [`07-blueprint/01-clean-onion-topology.md`](./07-blueprint/01-clean-onion-topology.md) | Brand-Agnostic 7-Ring Clean Onion Topology, Humble-View Firewall & Invariant Auditor |
| **`07-02`** | **Blueprint** | [`07-blueprint/02-backend-dag-storage-security.md`](./07-blueprint/02-backend-dag-storage-security.md) | Brand-Agnostic 5-Stage Server Wire DAG, Dual-Parity Storage, AEAD Vault & Wire Observatory |
| **`07-03`** | **Blueprint** | [`07-blueprint/03-frontend-hud-camera-gamification.md`](./07-blueprint/03-frontend-hud-camera-gamification.md) | Brand-Agnostic 4-Stage Client Wire DAG, Humble-View HUD, Camera Sync & Gamification |

---

## 2. Canonical Seven-Folder Source Topology & Agent Skills

| Domain Folder | Responsibility | Key Modules |
| :--- | :--- | :--- |
| `src/config/` | Typed constants, metamodel enums, polyglot grammars, 5-tier HUD breakpoints, 6 themes + 9-category / 27-card registry | `constants.ts`, `security.constants.ts`, `hud.tokens.ts`, `gamification/gamification.registry.ts` |
| `src/core/` | AST/syntax highlighter, Codemap (`codemap/`), Studio projections (`projections/`), Git PR publisher, security guards | `graph/codemap/*.ts`, `graph/projections/*.ts`, `security/guards/*.ts`, `metrics/*.ts` |
| `src/server/` | 5-Stage Server Wire DAG, Forensic/Twin MCP + Manifest (`mcp/`), REST (`routes/`), WS (`ws/`) | `http/{router,server.kernel}.ts`, `mcp/{forensic,twin_client,manifest}.mcp.ts`, `ws/` |
| `src/workers/` | Background AST Pool, `<50ms` watcher, CLI PAT Mint (`cli/`), Repo Hygiene & Invariant Auditor, QA | `auditor/{invariant,repo_hygiene}.auditor.ts`, `cli/mint_mcp_token.ts`, `qa/qa.runner.ts` |
| `src/lib/` | Drizzle SQLite (`projects`, `system_configs`, `community_themes`, `user_preferences`, `security`), IDB | `db/sqlite/`, `db/seed.operator.ts`, `db/indexeddb/`, `ogygia/`, `utils/log.sanitizer.ts` |
| `src/plugins/` | Grammars, Auth adapters (`local`, `github`, `google`, `webauthn`, `oidc`, `pat`), Webhooks & Exporters | `auth/*.auth.ts`, `sanitizers/form.sanitizer.ts`, `exporters/{webhook.bridge,*}.ts` |
| `src/client/` | Humble-View Svelte 5 11-Zone HUD, 4-Stage Client Wire DAG (`client.kernel.svelte.ts`), View-Model Facade (`models/`) | `state/{dag,models,hud.wire,navigation.sync,security.wire}`, `components/{atoms,zones,modals,organisms,molecules}/` |
| `docs/skills/` | Curated agent engineering protocols (`bun-loop-verification`, `mcp-server-dev`, Zero-Trust UI/DAG patterns) | `mcp-server-dev/{SKILL,references/*}.md`, `bun-loop-verification/SKILL.md` |
