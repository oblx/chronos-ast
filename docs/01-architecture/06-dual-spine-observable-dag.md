# 01-06 // Dual-Spine Observable Event DAG & Contextual Telemetry

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/client/state/dag/`, `src/server/http/server.kernel.ts`

---

## 1. Symmetric Dual-Spine Execution Pipeline

Every user action and server mutation traverses an observable symbolic intent pipeline across client and server boundaries:

* **Client Wire DAG (`clientDagKernel`):** Executes `STAGE_1_INTENT_EMIT` through `STAGE_4_TELEMETRY`, maintaining a `256`-slot ring buffer of `ClientWireTraceRecord` events (`OPEN_CONTEXTUAL_HELP`, `HELP_CONTEXT_SHIFTED`, `VIEW_SWITCH`, `HUD_TOGGLE_DRAWER_FLOAT`).
* **Server Wire DAG (`server.kernel.ts`):** Enforces `STAGE_1_WIRE_GUARD` (CSRF + rate limit), `STAGE_2_AUTH_RBAC` (`u32` capability mask resolution), `STAGE_3_SANITIZE` (prototype-pollution scrub), `STAGE_4_DOMAIN_COMMIT`, and `STAGE_5_FANOUT_OBSERVE`.
* **Header Traceability:** Matched server spans attach `x-chronos-wire-trace` headers and stream `SERVER_EVENT_COMMITTED` frames to authorized `chronos.admin.wire.observe` subscribers.
* **Bounded Ring Overhead:** With ring capacity $R = 256$ and batch window $\Delta t$, amortized trace recording stays strictly $O(1)$ per dispatch with bounded heap memory.

---

## 2. Live Wire Observatory & Contextual Help Signal Routing

* **RBAC-Gated Wire Observatory (`WireObservatoryModal.svelte`):** Only renders when `securityWire.can(CAPABILITY_BITS.ADMIN_WIRE_OBSERVE)` holds; otherwise DOM nodes are completely omitted.
* **Contextual Help Router (`help.context.svelte.ts`):** Watches active view, open modal, and edge drawer tabs, emitting `HELP_CONTEXT_SHIFTED` when the pedagogical chapter shifts and firing a `2.4s` glitter burst on the `TOP_RIGHT` Tome icon.
* **Hotbar & Keyboard Parity:** Pressing `F1`, `?`, or clicking the Help trigger dispatches `OPEN_CONTEXTUAL_HELP` directly into `HelpCenterModal`, landing on the exact matching Tome chapter and step.
