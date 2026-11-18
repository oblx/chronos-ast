# CHRONOS v1.9.7 // Perimeter Height Parity, Glitter Contextual Field Tome, Horizontal Bento Settings, SSG Docs & Forge-Agnostic Git

> Many slop to clean.

> **SSOT:** `@README.md = THE TRUTH` | **License:** `MIT` | **Author:** `Oblx <code@oblx.dev>` | **Master Docs Index:** [`docs/00-index.md`](./docs/00-index.md) | **Cheatsheet:** [`docs/00-vision/01-chronos-cheatsheet.md`](./docs/00-vision/01-chronos-cheatsheet.md)

Chronos `v1.9.7` is an MIT-licensed open-source static code analysis and forensic comprehension engine built on the **Chronos Polyglot AST & Graph Comprehension Architecture**, engineered on **Bun + TypeScript + Svelte 5 Runes + Tailwind CSS v4 + Drizzle SQLite + IndexedDB**. Its **7-Ring Clean Onion Topology (`src/{config, core, server, workers, lib, plugins, client}`)** and **11-Zone Zero-CLS Diegetic FUI Game-HUD** (`ViewportHUD.svelte`) pair the **Canonical 9-Projection Crown led by Interactive Full-Project Codemap (`Codemap`, `Butterfly`, `DFG`, `CFG`, `Treemap`, `DSM`, `UML`, `Mermaid`, `Source`)**, **3-Tier Semantic Zoom LOD (`Macro`, `Meso`, `Micro`) with Zero-Collision Port-Anchored Hop Splines & `Float32Array` Frustum Culling (`<= 350` DOM nodes)**, **Uniform `6.25rem` Top Perimeter Height Parity (`TOP_LEFT`, `Crown + ProjectTabDeck`, `TOP_RIGHT`)**, **Glitter-Signaled Contextual Field Tome (`help.context.svelte.ts`) Precompiled into Static SSG (`bun run build:tome`)**, **Horizontal Bento Settings Deck (`UiHorizontalDeck`)**, **Forge-Agnostic Git Smart HTTP v1/v2 Packfile Ingestion**, **Dual-Spine Forensic & Twin Event-Driving MCP Servers (`POST /api/mcp`, `POST /api/mcp/twin`, stdio)**, **8-Chronicle / 34-Chapter Architect's Field Tome (`F1` / `?`)**, **Evolutionary Sprint Archive (`docs/08-sprints/`)**, and **Brand-Agnostic Framework Blueprint (`docs/07-blueprint/01..03.md`)**.

---

## 1. Indexed Documentation Map (8 Chronicles · 34 Chapters · `docs/XX-*`)

All specifications reside in two-digit indexed markdown files (`<= 100` lines per document, zero fenced code blocks, balanced `$...$`/`$$...$$` LaTeX expressions, validated directly against `src/{config, core, server, workers, lib, plugins, client}`):

| Index | Category & Document | Architectural Scope |
| :--- | :--- | :--- |
| **`00`** | [**`docs/00-index.md`**](./docs/00-index.md) | Master SSOT Documentation Index, Seven-Folder Source Map & `docs/skills/` (`v1.9.7`) |
| **`00-01`** | [`docs/00-vision/01-chronos-cheatsheet.md`](./docs/00-vision/01-chronos-cheatsheet.md) | **1-Page Tactical Cheatsheet** (Stack, Metamodel, LaTeX Formulas, Thresholds, Git Ports) |
| **`00-02`** | [`docs/00-vision/02-manifesto-invariants.md`](./docs/00-vision/02-manifesto-invariants.md) | Architectural Manifesto, Anti-Magic Registry & Line-of-Code Invariants |
| **`01-01`** | [`docs/01-architecture/01-hexagonal-dag-topology.md`](./docs/01-architecture/01-hexagonal-dag-topology.md) | Clean Onion Rings, 5-Operator Architecture Enforcement (`CHR-017`) & Worker Pool DAG |
| **`01-02`** | [`docs/01-architecture/02-adr-log.md`](./docs/01-architecture/02-adr-log.md) | Architecture Decision Records (`ADR-001` through `ADR-007`) |
| **`01-03`** | [`docs/01-architecture/03-mcp-metamodel-bridge.md`](./docs/01-architecture/03-mcp-metamodel-bridge.md) | Zero-Dependency MCP Manifest, Dual-Spine HTTP/Stdio Bridges, CLI PAT & Webhooks |
| **`01-04`** | [`docs/01-architecture/04-security-rbac-vault.md`](./docs/01-architecture/04-security-rbac-vault.md) | **Production Security & Observable Wire DAG**: Repo Hygiene, `chronos.admin.wire.observe`, AEAD Vault, `u32` RBAC |
| **`01-05`** | [`docs/01-architecture/05-micro-frontend-ui-framework.md`](./docs/01-architecture/05-micro-frontend-ui-framework.md) | **Zero-Domain UI Framework (`@chronos-ui/svelte`)**: `UiUtilityIconButton`, `UiHorizontalDeck` & Spotlight Engine |
| **`01-06`** | [`docs/01-architecture/06-dual-spine-observable-dag.md`](./docs/01-architecture/06-dual-spine-observable-dag.md) | **Dual-Spine Observable Wire DAG**: Client/Server Trace Rings, Wire Observatory & Contextual Help Signal |
| **`02-01`** | [`docs/02-metamodel/01-entity-reference-schema.md`](./docs/02-metamodel/01-entity-reference-schema.md) | Chronos Core Metamodel: 9 Entity Kinds, 10 Reference Kinds (`MODIFIES`, `TYPED`, `OVERRIDES`) & `source_units` |
| **`02-02`** | [`docs/02-metamodel/02-sqlite-idb-parity.md`](./docs/02-metamodel/02-sqlite-idb-parity.md) | Drizzle SQLite SSOT (`projects`, `user_friendships`, `collab_invites`), IndexedDB Mirror & Memgraph |
| **`02-03`** | [`docs/02-metamodel/03-cfg-scc-schema.md`](./docs/02-metamodel/03-cfg-scc-schema.md) | Intra-Procedural CFG, Cooper-Harvey-Kennedy Dominators & Tarjan `O(V + E)` SCCs |
| **`02-04`** | [`docs/02-metamodel/04-codemap-compound-graph.md`](./docs/02-metamodel/04-codemap-compound-graph.md) | **Full-Project Codemap (Crown Slot 1)**: Genesis Entry Detector, 3-Tier Semantic Zoom LOD & Frustum Culling |
| **`03-01`** | [`docs/03-metrics/01-mccabe-halstead-formulae.md`](./docs/03-metrics/01-mccabe-halstead-formulae.md) | McCabe `v(G)`, Modified `v_mod(G)`, Halstead `V / D / E / B` & Oman `MI` (LaTeX/MathML) |
| **`03-02`** | [`docs/03-metrics/02-coupling-cohesion-lcom4.md`](./docs/03-metrics/02-coupling-cohesion-lcom4.md) | Martin Coupling (`Ca`, `Ce`, `I`), `LCOM4`, Brandes Centrality & `PercentChanged` Churn |
| **`03-03`** | [`docs/03-metrics/03-ck-main-sequence.md`](./docs/03-metrics/03-ck-main-sequence.md) | Chidamber-Kemerer OO Suite (`WMC`, `DIT`, `NOC`, `CBO`, `RFC`), Main Sequence `D` & CodeCheck |
| **`03-04`** | [`docs/03-metrics/04-variable-lineage-his-profiles.md`](./docs/03-metrics/04-variable-lineage-his-profiles.md) | Variable Tracker Data-Flow Graph (`DATA_FLOW`), Persistent Audit Annotations (`Atn`) & HIS Safety Profile |
| **`04-01`** | [`docs/04-ingestion/01-lexical-ast-scanner.md`](./docs/04-ingestion/01-lexical-ast-scanner.md) | CST/AST Complexity Bridge, Hierarchical Scope Stack & Shadowing Resolver |
| **`04-02`** | [`docs/04-ingestion/02-zip-remote-bundle-ingest.md`](./docs/04-ingestion/02-zip-remote-bundle-ingest.md) | Hardened `.ZIP` Extractor, Universal Git Smart HTTP v2 Packfile Ingestor, PR Publisher & SSRF Guard |
| **`04-03`** | [`docs/04-ingestion/03-indentation-wasm-ports.md`](./docs/04-ingestion/03-indentation-wasm-ports.md) | Python Off-Side Indentation Scanner, Singleton WASM Tree-Sitter Port & Snapshot Differ |
| **`04-04`** | [`docs/04-ingestion/04-preprocessor-alias-grammars.md`](./docs/04-ingestion/04-preprocessor-alias-grammars.md) | C/C++ Preprocessor & Macro Expander, Andersen Alias Propagator & `KEYWORD_PAIRS` Grammar Registry |
| **`04-05`** | [`docs/04-ingestion/05-git-pr-publisher-sarif.md`](./docs/04-ingestion/05-git-pr-publisher-sarif.md) | **Git Smart HTTP v2 Packfile Ingestor** & Automated Architectural Pull Request Publisher |
| **`04-06`** | [`docs/04-ingestion/06-forge-agnostic-git-protocol.md`](./docs/04-ingestion/06-forge-agnostic-git-protocol.md) | **Forge-Agnostic Git Protocol**: GitHub, GitLab, Bitbucket, Codeberg, Forgejo, SourceHut & Self-Hosted HTTPS |
| **`05-01`** | [`docs/05-hud/01-theme-tokens-geometry.md`](./docs/05-hud/01-theme-tokens-geometry.md) | True SVG Vector Chamfers (`135°` Carets, `TOP_CAP_CHAMFER`), `--hud-center-corridor-w`, Webfonts & Themes |
| **`05-02`** | [`docs/05-hud/02-vector-crt-radar-ergonomics.md`](./docs/05-hud/02-vector-crt-radar-ergonomics.md) | Universal Camera Centering (`MIN_AUTO_FIT_ZOOM=0.72`), Edge Clamping & Telemetry (`v1.9.7`) |
| **`05-03`** | [`docs/05-hud/03-ib-source-treemap-dsm.md`](./docs/05-hud/03-ib-source-treemap-dsm.md) | Cushion Treemap, SCC DSM, 4-Stage DFG, Syntax-Colored Source Lenses & Architect's Field Tome (`?`) |
| **`05-04`** | [`docs/05-hud/04-mermaid-themes-collab-privacy.md`](./docs/05-hud/04-mermaid-themes-collab-privacy.md) | **Mermaid Studio, WCAG Theme Marketplace**, Multi-Scope 60fps Virtual Cursors & Sovereign Privacy |
| **`06-01`** | [`docs/06-operations/01-cli-testing-benchmarks.md`](./docs/06-operations/01-cli-testing-benchmarks.md) | Automated Test Pyramid (`unit`, `integration`, `e2e`), Headless CLI, `bun run verify` & Benchmarks |
| **`06-02`** | [`docs/06-operations/02-sarif-incremental-watch.md`](./docs/06-operations/02-sarif-incremental-watch.md) | Bi-Directional SARIF 2.1.0 Bridge, `<50ms` Incremental Watcher & Bun 1.4 Runtime Guardrails |
| **`06-03`** | [`docs/06-operations/03-compliance-vector-exports.md`](./docs/06-operations/03-compliance-vector-exports.md) | Structured Deviation Templates, SVG/DOT/Mermaid Vector Exporters & HTML/CSV Compliance Reports |
| **`06-04`** | [`docs/06-operations/04-forensic-and-twin-mcp-servers.md`](./docs/06-operations/04-forensic-and-twin-mcp-servers.md) | **Forensic & Twin MCP Servers**: HTTP + `stdio` JSON-RPC 2.0, Capability Discovery & Privilege Ordering |
| **`07-01`** | [`docs/07-blueprint/01-clean-onion-topology.md`](./docs/07-blueprint/01-clean-onion-topology.md) | **Brand-Agnostic Blueprint I**: 7-Ring Clean Onion Topology, Humble-View Firewall & Invariant Auditor |
| **`07-02`** | [`docs/07-blueprint/02-backend-dag-storage-security.md`](./docs/07-blueprint/02-backend-dag-storage-security.md) | **Brand-Agnostic Blueprint II**: 5-Stage Server Wire DAG, Dual-Parity Storage, AEAD Vault & Wire Observatory |
| **`07-03`** | [`docs/07-blueprint/03-frontend-hud-camera-gamification.md`](./docs/07-blueprint/03-frontend-hud-camera-gamification.md) | **Brand-Agnostic Blueprint III**: 4-Stage Client Wire DAG, Humble-View HUD, Camera Sync & Gamification |

---

## 2. `@chronos-ui/svelte` Micro-Frontend, Perimeter Parity, Contextual Tome SSG & Production Pipeline (`v1.9.7`)

* **Standalone Zero-Domain Presentation Micro-Frontend (`src/ui/` · `@chronos-ui/svelte`):** Extracted into an 8-module barrelled hierarchy (`tokens/`, `wire/`, `machines/`, `atoms/`, `molecules/`, `organisms/`, `modals/`, `manifest.ts`) guarded by a strict zero-domain firewall in `invariant.auditor.ts` and a 3-Tier Intent Routing Matrix (`TIER_0_LOCAL_UI`, `TIER_1_COALESCED_PERSIST`, `TIER_2_REALTIME_CLUSTER`).
* **Edge-Rail Dotted Grip Drag/Float Mechanics (`use:uiDrawerGrip`, `HudLeftEdgeZone.svelte`, `HudRightEdgeZone.svelte`):** Replaces text `"FLOAT"`/`"PIN"` buttons with a single chamfered Dotted Grip (`grip` 24×24 vector icon). Clicking (`< 5px`) dispatches `HUD_TOGGLE_DRAWER_FLOAT`; dragging (`>= 5px`) slides the folded mini-rail vertically within the safe corridor (`HUD_MOVE_EDGE_RAIL`) or detaches the unfolded drawer into 2D floating mode (`HUD_MOVE_FLOATING_DRAWER`).
* **Global 4-Corner Chamfer Completeness & Persistent Card Vault (`HudInteractiveCanvasStage.svelte`, `AchievementVaultModal.svelte`):** Wraps the outer `WORLD_CANVAS` stage, the Card Vault Rank Strip, and all 27 Achievement Cards in `CHAMFER_OCTAGON` `HudChamferFrame` geometry; keeps `[data-testid="vault-card-progression-strip"]` permanently mounted across tab/card switches (`VAULT_SELECT_CARD`) with near-monochrome `.ui-vault-card-idle` to vibrant `.ui-vault-card-active` filter transitions.
* **ELK-Inspired Aspect-Ratio Codemap & Pluggable Multi-Source Ingestion (`codemap.layout.ts`, `src/plugins/ingestors/`):** Packs tall rings into multi-column sub-grids (`MAX_RING_COL_HEIGHT = 440`, `worldWidth / worldHeight >= 1.4`) so `fitGraphToSafeCorridor` auto-fits at `>= 60%` zoom with inverse square-root counter-scaled labels, `IN`/`OUT` boundary ports, unclipped `Entry:` pills, and unified `POST /api/projects/ingest` across Public GitHub/Git Pack, `.ZIP`, Local Self-Analysis, and SARIF 2.1.0 adapters.
