---
name: mcp-server-dev
description: Zero-dependency JSON-RPC 2.0 Model Context Protocol (MCP) server construction across dual stdio + Streamable HTTP transports, RBAC capability filtering, live Twin browser-intent driving, and self-analysis verification.
---

# MCP Server Engineering Guide (`v1.9.3`)

> **Author:** `Oblx <code@oblx.dev>` | **Transports:** [`references/01-transports-and-auth.md`](./references/01-transports-and-auth.md) | **Schemas:** [`references/02-tools-resources-schemas.md`](./references/02-tools-resources-schemas.md)

---

## 1. Dual-Spine MCP, Manifest Discovery & Autonomous Agent Loop

1. **Public Capability Manifest (`GET /api/mcp/manifest`):** Unauthenticated machine-readable JSON manifest exposing transports, tool schemas, resource URI templates, `u32` capability bits, CLI token command (`bun run mcp:token`), and supported webhook events (`manifest.mcp.ts`).
2. **Forensic Metamodel MCP (`POST /api/mcp` + stdio):** Read/audit spine executing `initialize`, `tools/list`, `tools/call`, `resources/list`, and `resources/read` inside `serverDagKernel` (`src/server/mcp/forensic.mcp.ts`).
3. **Twin Event-Driving MCP (`POST /api/mcp/twin`):** Privileged realtime control plane (`src/server/mcp/twin_client.mcp.ts`) driving live WebSocket browser clients via `HUD_EVENTS.TWIN_DISPATCH_INTENT` and verifying execution with `HUD_EVENTS.TWIN_CLIENT_ACK`.
4. **Signed Workflow Webhooks (`src/plugins/exporters/webhook.bridge.ts`):** Async HMAC-SHA256 outbound event dispatcher (`X-Chronos-Signature: sha256=...`) closing the autonomous agent CI loop.

$$\text{TwinAllowed}(p, t) \iff \text{HasCap}(p, \text{b28} \land \text{b25}) \land \left(W(p) \ge W(t) \lor \text{uid}(p) = 1\right)$$

---

## 2. Hard Engineering Rules

* Zero external SDK dependencies: implement pure JSON-RPC `2.0` request framing, method routing, and structured `content` + `structuredContent` envelopes directly in TypeScript under `<= 150` LoC per module and `<= 42` LoC per function.
* Authenticate every HTTP MCP call through `resolveRequestPrincipal` supporting `Bearer chr_live_*` PATs, Bearer JWT sessions, or Guest fallback, filtering `tools/list` and `resources/list` to the principal's resolved `u32` capability mask.
* Deny unauthorized Twin MCP calls with JSON-RPC error `-32003` (`Forbidden`) and record tamper-evident SHA-256 hash-chained `audit_log` entries for both accepted and rejected dispatches.
* Always route Twin intents through the client `clientDagKernel` and return non-empty trace correlation IDs via `chronos_twin_capture_wire_trace`.
