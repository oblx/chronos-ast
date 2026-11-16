# 02-04 // Full-Project Codemap, 3-Tier Semantic Zoom LOD & Frustum Culling

> **Author:** `Oblx <code@oblx.dev>` | **Version:** `1.9.0` | **Parent:** [`../00-index.md`](../00-index.md)

---

## 1. Automatic Genesis Entry-Point Detection & Topological Rings

The Full-Project Codemap (`CODEMAP`, Crown Slot 1) provides a macro-to-micro compound architecture lens spanning the entire analyzed repository from its root bootstrap files down to individual leaf symbols.

$$\text{Score}(v) = 50 \cdot \mathbb{I}(C_a(v) = 0 \land C_e(v) > 0) + \min(40, 8 \cdot C_e(v)) + \sum_{k} w_k \cdot \mathbb{I}(k \in \text{Name}(v))$$

* **Genesis Entry Detector (`src/core/graph/codemap/entry.detector.ts`):** Ranks `FILE`, `MODULE`, and `FUNCTION` entities with zero inbound `IMPORTS` or `CALLS` ($C_a = 0, C_e > 0$) alongside bootstrap lexical markers (`server`, `main`, `index`, `app`, `cli`, `boot`, `dispatch`, `router`), tagging Tier-0 roots with `⚡ GENESIS ROOT` and `⚡ ENTRY` beacons.
* **Compound Architecture Hulls (`src/core/graph/codemap/codemap.projection.ts`):** Executes a breadth-first topological traversal from all Genesis Entry Points across `IMPORTS`, `CALLS`, `INHERITS`, `IMPLEMENTS`, and `DEFINES` edges to nest Depth Rings ($\text{Ring } 0 \to \text{Ring } N$) $\supset$ Directory/Module Clusters $\supset$ File Containers $\supset$ Class, Function, and Variable Symbols.
* **Entry-Point Travel Spine (`traceCodemapEntryPath`):** Clicking `[ ⚡ Trace from Entry Point ]` highlights the shortest directed execution spine (`Hop 0 [Entry] -> Hop 1 -> ... -> Target`) from the nearest Genesis Entry Point to the active focal entity.

| Ring / Layer | Structural Unit | Visual Signifier | Primary Telemetry |
| :--- | :--- | :--- | :--- |
| **Tier 0 (`Ring 0`)** | Genesis Root Cluster | Emerald border + `⚡ ENTRY` badge | Fan-out $C_e$, file count, total LOC |
| **Tier $1..N$ (`Ring k`)** | Downstream Module Hull | Chamfered package bounding box | Aggregate cross-module highway splines |
| **Cyclic SCC Hull** | Tarjan Feedback Cluster | Pulsing crimson dashed perimeter | Strongly connected cycle isolation |

---

## 2. Three-Tier Semantic Zoom LOD & Float32Array Frustum Culling

To sustain 60fps pan/zoom across repositories exceeding 5,000 entities without DOM bloat, the Codemap pairs a 3-tier semantic Level-of-Detail (LOD) state machine with a flat `Float32Array` spatial bounding-box index (`src/core/graph/codemap/frustum.culler.ts`).

$$w_{\text{highway}}(e) = \max\left(1.5, \min\left(6.5, 1.6 \cdot \log_2(|E_{\text{cluster}}(e)| + 1)\right)\right)$$

* **Macro LOD ($\text{zoom} < 0.45$):** Renders directory/package compound hulls, `⚡ ENTRY` beacons, aggregate cross-module highway splines with logarithmic stroke thickness, and Tarjan SCC cycle rings while omitting fine-grained symbol labels.
* **Meso LOD ($0.45 \le \text{zoom} < 1.05$):** Reveals individual `FILE` cartridges inside each package hull displaying file health grade (`A`–`D`), LOC, maximum McCabe $v(G)$, and file-to-file dependency splines.
* **Micro LOD ($\text{zoom} \ge 1.05$):** Unfolds child `CLASS`, `FUNCTION`, and `VARIABLE` pills nested inside each file container with one-click cross-view handoff (`→ Butterfly`, `→ CFG`, `→ Source`).
* **Cross-View Camera & Cursor Sync (`src/client/state/navigation.sync.svelte.ts`):** Maintains `ProjectNavigationCursor` across all 9 workspace projections so switching between `Codemap`, `Butterfly`, `CFG`, and `Source` preserves `selectedEntityId`, normalized camera focus, and active travel trails.
