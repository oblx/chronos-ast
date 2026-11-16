# 07-03 // Frontend Tactical HUD, Camera Sync, Codemap & Gamification Blueprint

> **Author:** `Oblx <code@oblx.dev>` | **Version:** `1.9.3` | **Parent:** [`../00-index.md`](../00-index.md)

---

## 1. Humble-View 11-Zone Perimeter HUD & 4-Stage Client Wire DAG

The frontend presentation ring (`src/client/`) implements a zero-Cumulative-Layout-Shift (zero-CLS) Humble-View tactical Heads-Up Display (HUD) built with Svelte 5 Runes (`$state`, `$derived`, `$effect`) and Tailwind CSS v4 design tokens.

$$\text{SafeCorridor}(W, H) = [x_{\text{leftRail}}, \; W - x_{\text{rightRail}}] \times [y_{\text{topCrown}}, \; H - y_{\text{bottomDock}}]$$

* **4-Stage Observable Client Wire DAG (`src/client/state/dag/client.kernel.svelte.ts`):** Routes every UI intent, REST fetch, storage persistence, and inbound Twin WebSocket command through `STAGE_1_VALIDATE`, `STAGE_2_REDUCE`, `STAGE_3_EFFECT`, and `STAGE_4_TELEMETRY`, recording a 256-slot `WireTraceRecord` ring buffer and emitting correlated acknowledgments.
* **Fixed Perimeter Anchors & Polygon-Clipped Shells (`src/client/components/{atoms,zones}/`):** Clips octagonal substrates to their diagonal hull polygons, locks symmetric 2-row visor pods, and clamps unfolded edge drawers symmetrically (`max-h-[calc(100vh-320px)]`) with bevel-clear chamfer buttons.
* **Drawer-Aware Safe-Corridor Camera Stage (`HudInteractiveCanvasStage.svelte`):** Subtracts active open docked drawer widths inside `fitGraphToSafeCorridor()`, enforces `MIN_AUTO_FIT_ZOOM = 0.72` on `<= 16`-node subgraphs, and synchronizes shared camera controls across projections.

| HUD Architectural Layer | Directory Path | Key Responsibilities |
| :--- | :--- | :--- |
| **Client Wire DAG & Models** | `src/client/state/{dag,models}/` | `clientDagKernel` 4-stage pipeline, Humble-View domain facade |
| **Reactive State Wires** | `src/client/state/` | `hud.wire`, `navigation.sync`, `security.wire`, `gamification.wire`, `ws.client` |
| **Projection Organisms** | `src/client/components/organisms/projections/` | Codemap, Butterfly, DFG, CFG, Treemap, DSM, UML, Mermaid, Source lenses |

---

## 2. Cross-View Navigation Cursor & Cubic RPG Gamification Engine

Seamless cognitive continuity across projections and sustained operator engagement are governed by a shared navigation cursor (`src/client/state/navigation.sync.svelte.ts`) and a decoupled DAG gamification interceptor (`src/plugins/gamification/gamification.interceptor.ts`).

$$\text{XP}(L) = 100 \cdot (L - 1)^3, \quad L(\text{XP}) = \min\left(100, \; \left\lfloor \left(\frac{\text{XP}}{100}\right)^{1/3} \right\rfloor + 1\right)$$

* **Cross-View Camera & Entity Synchronization:** Preserves `selectedEntityId`, `activeFilePath`, `activeSourceLine`, normalized focal offset, and exact `Codemap` frustum coordinates (`codemapPanX`, `codemapPanY`, `codemapZoom`) when switching between any of the 9 projections.
* **9-Category / 27-Card Leveled Progression Matrix:** Maps every major subsystem (`Codemap`, `Cartography`, `Navigator`, `Sentinel`, `Modeling`, `Git Forge`, `Crypto`, `Squad`, `Studio`) to 3 leveled achievement cards (`Copper` $\to$ `Silver` $\to$ `Gold` $\to$ `Emerald` $\to$ `Holographic Obsidian`).
* **3-Column Snap Card Vault (`AchievementVaultModal.svelte`):** Renders achievement cards in a 2-row horizontal grid where each column spans `calc((100% - 32px) / 3)`, guaranteeing 3 full columns (6 cards) per page with zero horizontal clipping.
