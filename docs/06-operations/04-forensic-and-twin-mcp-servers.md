# 06-04 // Forensic & Twin Event-Driving MCP Servers (HTTP + Stdio)

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/server/mcp/`, `src/workers/mcp.server.ts`, `src/client/state/twin.executor.ts`

---

## 1. Zero-Dependency MCP Discovery & Forensic Inspection Spine

Chronos exposes JSON-RPC `2.0` Model Context Protocol (MCP) endpoints over HTTP (`/api/mcp`, `/api/mcp/twin`) and local headless `stdio`:

* **Autonomous Discovery Manifest (`GET /api/mcp/manifest`):** Advertises tools, schema metadata, required `u32` capability bits, and PAT provisioning flows (`bun run mcp:token`) to autonomous engineering agents.
* **Forensic MCP Tools (`forensic.mcp.ts`):** Supports workspace listing, entity/metric queries, CodeCheck rule audits, Tarjan cycle reports, SARIF 2.1.0 ingestion, and scoped PAT minting (`chr_live_*`).
* **HMAC-SHA256 Workflow Webhook Bridge (`webhook.bridge.ts`):** Emits signed outbound events when indexing, cycle audits, or CodeCheck evaluations complete, verified against `net.guard.ts`.

---

## 2. Twin Event-Driving Browser Control & Weight-Enforced RBAC

* **Multi-Tenant Authorization Guard:** Every Twin MCP invocation requires `ADMIN_WIRE_OBSERVE | COLLAB_OVERRIDE` plus strict privilege ordering $W_{\text{actor}} \ge W_{\text{target}}$ (`JSON-RPC -32003` on violation).
* **Live Browser Intent Execution (`twin.executor.ts`):** Routes remote Twin directives over `ws:project:<id>` WebSockets into the Svelte 5 HUD (`switch_projection`, `select_entity`, `open_project`), returning `TWIN_CLIENT_ACK` telemetry frames.
* **Tamper-Evident Audit Chain:** Every granted or denied MCP action appends a SHA-256 chained `audit_log` entry guaranteeing end-to-end forensic accountability.
