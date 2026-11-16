# 03-04 // Variable Lineage Tracker (DFG), Audit Annotations & HIS Safety Profile

> **Author:** `Oblx <code@oblx.dev>` | **Parent Index:** [`../00-index.md`](../00-index.md) | **Domain:** `src/core/graph/variable_tracker.ts`, `src/config/constants.ts`

---

## 1. Variable Tracker & Data-Flow Graph (`VIEW_MODES.DATA_FLOW`)

`src/core/graph/variable_tracker.ts` slices the 10-kind symbolic reference graph into a focused breadth-first use-def lineage (`traceVariableDataFlow`) answering where state originates, mutates, and propagates across module boundaries:

| Lineage Stage (`DataFlowStage`) | Reference Kind | Forensic Semantics |
| :--- | :--- | :--- |
| **`BIRTH_DEFINES`** | `DEFINES` | Lexical birth and declaration container of the symbol or state field |
| **`INITIAL_SETS`** | `SETS` | Direct state initialization or overwrite (`this.field = ...` or `self.field = ...`) |
| **`MUTATION_MODIFIES`** | `MODIFIES` | In-place mutation (`+=`, `-=`, `++`, `--`, `.push()`, `.pop()`, `.splice()`, `.set()`, `.delete()`) |
| **`READ_USES`** | `USES` | State read access without mutation (`this.field` or `self.field`) |
| **`PROPAGATION_CALLS`** | `CALLS` | Downstream or upstream callable invocation propagating the state across procedures |

Each lineage report also emits a parameterized Memgraph Cypher path query (`cypherTaintQuery`) for multi-hop taint verification across external Bolt endpoints.

---

## 2. Persistent Audit Annotations (`Atn` // `annotations` Table)

To ensure forensic review notes and rule suppressions survive full and incremental workspace re-indexing, `annotations` rows in `src/lib/db/sqlite/schema/tables.ts` and `src/lib/db/indexeddb/mirror/idb.mirror.ts` are anchored by natural symbol identity `(entityKind, qualifiedName)` rather than transient integer primary keys:

* **`ANNOTATION_KINDS.NOTE`:** Timestamped architectural review comment pinned to the entity inside `InformationBrowser.svelte`.
* **`ANNOTATION_KINDS.SUPPRESS_RULE`:** Scoped false-positive suppression for a specific CodeCheck rule code (for example `CFG_UNREACHABLE`, `MCCABE_WARN`, or wildcard `*`), honored automatically by `evaluateWorkspaceCodeCheck` (`suppressedCount`).
* **`ANNOTATION_KINDS.HOTSPOT_PIN`:** Explicit auditor escalation bookmark persisted across SQLite and IndexedDB.

---

## 3. HIS (Herstellerinitiative Software) Safety Metric Profile (`HIS_SAFETY_THRESHOLDS`)

`src/config/constants.ts` defines the `HIS_SAFETY_THRESHOLDS` profile selectable inside `CodeCheckDrawer.svelte`:

* **Strict Cyclomatic Cap (`CYCLOMATIC_STRICT_MAX = 10`):** Enforces tighter branching budgets for safety-critical modules.
* **Control-Flow Hygiene (`KNOTS_MAX = 0`, `GOTO_STATEMENTS_MAX = 0`, `COUNT_PATH_MAX = 80`):** Prohibits unstructured control jumps and combinatorial path explosion.
* **Call & Nesting Depth (`NESTING_DEPTH_MAX = 4`, `CALL_LEVELS_MAX = 5`):** Bounds lexical nesting depth and transitive call-chain depth.
