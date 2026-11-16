# 02-03 // Control Flow Graph (CFG), Dominators & Tarjan SCC Schema

> **Author:** `Oblx <code@oblx.dev>` | **Parent Index:** [`../00-index.md`](../00-index.md) | **Domain:** `src/core/ast/cfg.builder.ts`, `src/core/graph/{dominators,scc.tarjan,dsm.matrix}.ts`

---

## 1. Intra-Procedural Control Flow Graph (`CFG_BLOCK_KINDS` & `CFG_EDGE_KINDS`)

Chronos constructs deterministic basic-block Control Flow Graphs for every callable entity (`FUNCTION` and `METHOD`) via `src/core/ast/cfg.builder.ts` using tokens defined in `src/config/metamodel.constants.ts`:

| Basic Block Kind | Edge Transitions | Semantic Role |
| :--- | :--- | :--- |
| **`ENTRY`** | Outbound `FALLTHROUGH` | Function prologue and parameter initialization header |
| **`SEQUENTIAL`** | Outbound `FALLTHROUGH` | Contiguous straight-line statements without branching |
| **`BRANCH_DECISION`** | Outbound `TRUE_BRANCH`, `FALSE_BRANCH` | Conditional predicate (`if`, `else if`, `elif`, `switch`, `match`, `case`) |
| **`LOOP_HEADER`** | Outbound `TRUE_BRANCH`, inbound `LOOP_BACK` | Iteration header (`for`, `while`, `loop`) forming back-edges |
| **`TRY_CATCH`** | Outbound `FALLTHROUGH`, `EXCEPTION_EDGE` | Exception handler region (`try`, `catch`, `except`) |
| **`RETURN_EXIT`** | Terminal node (zero outbound edges) | Unconditional procedure return statement |
| **`THROW_EXIT`** | Terminal node (zero outbound edges) | Unconditional exception raise or panic statement |
| **`UNREACHABLE`** | Zero inbound reachable edges | Dead basic block following an unconditional terminator in the same lexical scope |

---

## 2. Cooper-Harvey-Kennedy Dominator Tree & Dead-Block Detection

`src/core/graph/dominators.ts` implements the Cooper-Harvey-Kennedy iterative fixed-point algorithm over reverse post-order (RPO) basic blocks:

* **Dominance Relation:** A block `d` dominates a block `n` if every path from the `ENTRY` block to `n` must traverse `d`. Every reachable non-entry block resolves a unique Immediate Dominator (`immediateDominatorId`).
* **Unreachable Dead-Code Identification:** Blocks that cannot be reached from `ENTRY` during RPO traversal or that follow an unconditional `RETURN_EXIT` or `THROW_EXIT` within the same lexical brace/indentation depth are marked `isReachable = false` and trigger CodeCheck governance rule `CHR-006` (`CFG_UNREACHABLE`).
* **Cyclomatic Verification:** The CFG reducer verifies McCabe complexity via `v(G) = 1 + d`, where `d` counts reachable decision, loop header, and exception branch blocks.

---

## 3. Tarjan `O(V + E)` Strongly Connected Components & Virtual `.arch` Layers

`src/core/graph/scc.tarjan.ts` and `src/core/graph/dsm.matrix.ts` partition the workspace call and import graph into Strongly Connected Components and Clean Onion layers:

* **Tarjan SCC Condensation:** Single-pass depth-first traversal maintaining `index` and `lowlink` invariants identifies every multi-node cycle and self-loop (`cyclicClusters` and `cyclicEntityIds`) in linear `O(V + E)` time (`< 25ms` across `5,000` entities).
* **Layered Dependency Structure Matrix (DSM):** Entities are sorted by Virtual Architecture ring (`src/config/architecture.schema.ts`: `RING_0_CONFIG` through `RING_4_CLIENT_HUD`) and topological SCC rank. Dependencies appearing above the main diagonal (`rowIdx < colIdx`) represent cyclic feedback loops; dependencies violating `allowedOutboundLayerIds` trigger `CHR-011` (`LAYER_VIOLATION`).
