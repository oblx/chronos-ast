# 03-02 // Coupling, Instability, LCOM4, Centrality & Version Churn

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/core/metrics/stability.engine.ts`, `src/core/metamodel/snapshot.differ.ts`, `src/plugins/exporters/memgraph.exporter.ts`

---

## 1. Robert C. Martin Package Coupling & Instability

For every entity $u$ in the directed dependency graph $G = (V, E)$:

$$I = \frac{C_e}{C_a + C_e}$$

| Metric | Symbol | Formula | Architectural Interpretation |
| :--- | :--- | :--- | :--- |
| **Afferent Coupling** | $C_a$ | Inbound reference count targeting $u$ | Responsibility: external dependents relying on $u$ |
| **Efferent Coupling** | $C_e$ | Outbound reference count originating from $u$ | Dependence: external targets required by $u$ |
| **Instability** | $I$ | $I = \frac{C_e}{C_a + C_e}$ | Range $0.00$ (stable) to $1.00$ (unstable) |
| **Scaled Instability** | `instabilityScaled` | $\text{round}(I \cdot 1000)$ | Integer storage format in SQLite `metrics.instability` |

* When $C_a + C_e = 0$, $I$ evaluates to $0$.
* **Thresholds (`HUD_CONFIG.METRIC_THRESHOLDS`):** Warning at `0.70`, Critical at `0.90`.

---

## 2. Hitz & Montazeri Lack of Cohesion in Methods (`LCOM4`)

`calculateLcom4` and `computeEntityLcom4FromGraph` (`src/core/metrics/stability.engine.ts`) model internal cohesion as the number of connected components in an undirected graph $G_c = (M, E_c)$:

* **Vertices ($M$):** Child callable entities (`FUNCTION`, `METHOD`) scoped within the container entity.
* **Undirected Edges ($E_c$):** Two methods $m_a$ and $m_b$ are connected if both access a common attribute (`SETS`, `MODIFIES`, `USES`) or call one another (`CALLS`).

| `LCOM4` Score | Architectural Meaning | Recommended Refactoring |
| :--- | :--- | :--- |
| `1` | Single cohesive component | None (ideal single responsibility) |
| `2 .. 3` | Warning (`LCOM_WARNING = 2`) | Inspect disjoint method clusters |
| $\ge 4$ | Critical (`LCOM_CRITICAL = 4`) | Split class or module along connected component boundaries |

---

## 3. Brandes Betweenness Centrality (`memgraph.exporter.ts`)

While $C_a$ and $C_e$ measure immediate 1-hop fan-in and fan-out, Brandes Betweenness Centrality $C_B(v) = \sum_{s \neq v \neq t} \frac{\sigma_{st}(v)}{\sigma_{st}}$ exposes hidden architectural choke points across shortest directed dependency paths.

---

## 4. Chronos Project Compare Churn (`PercentChanged` & `Diff` Deltas)

$$\text{PercentChanged} = \frac{\text{addedLines} + \text{removedLines} + 2 \cdot \text{changedLines}}{\max(1, \text{currentLines} + \text{previousLines})}$$

* **`Diff`-Prefixed Metric Deltas:** Emits `diffLoc`, `diffCyclomatic`, and `diffInstability` alongside `COMPARE_STATUS` tags (`ADDED`, `REMOVED`, `MODIFIED`, `UNCHANGED`) driving **Changes Treemap** overlays.
