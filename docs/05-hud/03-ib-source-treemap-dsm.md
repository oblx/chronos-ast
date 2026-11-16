# 05-03 // Information Browser (IB), Source Span Viewer, Treemap & DSM HUD

> **Author:** `Oblx <code@oblx.dev>` | **Parent Index:** [`../00-index.md`](../00-index.md) | **Domain:** `src/client/components/{organisms,molecules}/`

---

## 1. Five Primary Viewport Modes (`HUD_VIEWS`)

`ViewportHUD.svelte` orchestrates five primary comprehension modes inside the central Ogygia island (`chronos-primary-viewport`):

| View Mode (`HUD_VIEWS`) | Primary Organism | Comprehension Capability |
| :--- | :--- | :--- |
| **`BUTTERFLY`** | `ButterflyGraph.svelte` | Chronos Polyglot AST & Graph callers/callees vector CRT graph with `RADAR // CRT-01` minimap |
| **`CONTROL_FLOW`** | `ControlFlowCanvas.svelte` + `SourceSpanViewer.svelte` | Split-pane intra-procedural basic-block CFG flowchart synchronized with line-gutter source viewer |
| **`TREEMAP`** | `TreemapCanvas.svelte` | Squarified architectural hotspot treemap sized by `LOC` or `HALSTEAD` and colored by `CYCLOMATIC`, `INSTABILITY`, or `VIOLATIONS` |
| **`DSM`** | `DsmMatrix.svelte` | Layered `N x N` Dependency Structure Matrix partitioned by `.arch` Clean Onion rings and Tarjan SCCs |
| **`INSPECTOR`** | `TelemetryTerminal.svelte` | Live source code editor, on-demand AST re-analysis, and optional OpenAI-compatible diagnostic stream |

---

## 2. Information Browser (`InformationBrowser.svelte`) & Source Span Viewer (`SourceSpanViewer.svelte`)

* **Chronos Information Browser (IB) Panel:** Docked in the right Bento edge, displaying hierarchical collapsible sections for **Metrics Summary** (`LOC`, `v(G)`, Halstead `V`, Instability `I`), **Chidamber-Kemerer OO Suite** (`WMC`, `DIT`, `NOC`, `CBO`, `RFC`, `LCOM4`, Main Sequence `D`), **Inbound References** (`Called By`, `Used By`, `Modified By`, `Overridden By`), and **Outbound References** (`Calls`, `Sets`, `Modifies`, `Uses`, `Typed`, `Imports`) with `file:line:col` jump buttons.
* **Synchronized Source Span Viewer:** Renders exact `source_units` file slices with line numbers, active CFG basic-block span highlighting, and inline reference kind badges (`SETS`, `MODIFIES`, `CALLS`, `TYPED`, `OVERRIDES`).

---

## 3. Tokenized Entity Filter Bar, CodeCheck Drawer & Project Compare Banner

* **Tokenized Query DSL (`EntityFilterBar.svelte`):** Supports instant compound queries including `kind:CLASS`, `wmc:gt:10`, `lcom:gt:1`, `dit:gt:2`, `scc:cyclic`, and `violations:gt:0`.
* **CodeCheck Governance Drawer (`CodeCheckDrawer.svelte`):** Filterable `CRITICAL / WARNING / INFO` violation list for `CHR-001` through `CHR-017` with one-click entity focus.
* **Project Compare Delta Banner (`CompareDeltaBanner.svelte`):** Allows pinning any workspace tab as a baseline snapshot and inspecting real-time `ADDED / MODIFIED / REMOVED` entity counts, complexity deltas, and newly formed cycles.

---

## 4. `docs/**/*.md` Architect's Field Tome, Sub-Step Spotlight & Idle Command Bay (`v1.8.0`)

* **Dual-Page Architect's Field Tome (`HelpCenterModal.svelte`, `HelpTomeSpread.svelte`, `help.engine.ts`, `help.registry.ts`):** Compiles all `24` `docs/**/*.md` specifications into an interactive **Architect's Field Tome** inside `HudModalShell` (`CHAMFER_OCTAGON`) with a `136px` Internal Left-Spine Chronicle Column (`00 Vision` .. `06 Ops`), Top Skill Tier Ribbons (`All`, `Beginner`, `Advanced`, `Expert`), a **Left Folio** (`6`-card `2x3` Paginated Chapter Grid + `px-5 py-3.5` corner-safe octagonal Native MathML Key Equation Pedestal), and a **Right Folio** (Core Takeaway Banner, `2`-Tabbed Specification Scroll, Interactive Drill Pedestal with `[ ⌖ Spotlight in HUD ]` & `[ ✓ Complete Sub-Step ]`, and corner-safe page-turn buttons).
* **Sub-Step UI Spotlight & Hover Mini-Tooltips:** Stepping through `§` sub-lessons (`Spotlight in HUD` or `Hover Tips`) locks a vector target frame onto the live `[data-help-target]` DOM zone, routes to the sub-step's HUD view, and floats an interactive mini-tooltip card beside the control.
* **Default `NO WORKSPACE OPEN` Command Bay & Realtime Event Bus (`workspace.controller.ts`):** Boots into an idle command bay whenever no workspace is persisted in IndexedDB, allows closing all workspace tabs back to idle, and broadcasts typed domain events (`WORKSPACE_HYDRATED`, `WORKSPACE_OPENED`, `WORKSPACE_CLOSED`, `WORKSPACE_SAVED`, `WORKSPACE_INDEXED`, `WORKSPACE_SWITCHED`) over `EventTarget` and `BroadcastChannel`.
