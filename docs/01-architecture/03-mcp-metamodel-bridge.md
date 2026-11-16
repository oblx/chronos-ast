# 01-03 // Zero-Dependency MCP Metamodel Server & Read-Before-Set Dominance (`CHR-016`)

> **Author:** `Oblx <code@oblx.dev>` | **Parent Index:** [`../00-index.md`](../00-index.md) | **Domain:** `src/server/mcp/`, `src/workers/mcp.server.ts`, `src/core/metrics/codecheck.engine.ts`

---

## 1. Dual-Spine MCP Bridge, Manifest Discovery & Webhook Loop (`v1.9.3`)

`src/server/mcp/` and `src/workers/mcp.server.ts` implement zero-dependency JSON-RPC `2.0` MCP servers over both `stdio` and Streamable HTTP (`POST /api/mcp`, `POST /api/mcp/twin`), paired with public discovery (`GET /api/mcp/manifest`), headless `bun run mcp:token` CLI PAT minting (`src/workers/cli/mint_mcp_token.ts`), and HMAC-SHA256 signed workflow webhooks (`src/plugins/exporters/webhook.bridge.ts`):

| Spine & Endpoint | Tools & Resources (`initialize`, `tools/*`, `resources/*`) | Security & Returned Structured Payload |
| :--- | :--- | :--- |
| **Capability Manifest (`GET /api/mcp/manifest`)** | Public unauthenticated agent bootstrap document (`manifest.mcp.ts`) | Exposes `version`, `license`, transports, tool JSON Schemas, resource URI templates, `capabilityBits`, `webhookEvents` |
| **Forensic MCP (`POST /api/mcp` + stdio)** | `chronos_analyze_self`, `chronos_query_metamodel`, `chronos_inspect_entity`, `chronos_trace_codemap_entry`, `chronos_run_codecheck` + `chronos://project/{id}/{manifest,hotspots,cycles,codecheck}` | Filtered by `WORKSPACE_INDEX_LOCAL`, `METAMODEL_QUERY`, `CODECHECK_EXEC`; supports self-analysis into `'chronos-self'` |
| **Twin MCP (`POST /api/mcp/twin`)** | `chronos_twin_list_sessions`, `chronos_twin_dispatch_intent`, `chronos_twin_capture_wire_trace` | Gated by `ADMIN_WIRE_OBSERVE` (`b28`) + `COLLAB_OVERRIDE` (`b25`) + group weight check (`-32003` Forbidden + SHA-256 audit) |
| **Signed Webhook Bridge (`webhook.bridge.ts`)** | `PROJECT_INDEXED`, `CODECHECK_REGRESSION`, `PR_PUBLISHED`, `TWIN_INTENT_EXECUTED` | Reads `system_configs` + AEAD `secrets_vault`, enforces SSRF guard (`allowLoopback` opt-in), signs `X-Chronos-Signature: sha256=...` |

---

## 2. Read-Before-Set CFG Dominance Rule (`CHR-016` // `UNINITIALIZED_VARIABLE_READ`)

`src/core/metrics/codecheck.engine.ts` and `src/config/rules.registry.ts` combine Sprint 2 Cooper-Harvey-Kennedy Dominators (`immediateDominatorId`) with Sprint 6 Use-Def Lineage to enforce rule `CHR-016` (`UNINITIALIZED_VARIABLE_READ`):

* **Dominator Path Verification (`isBlockDominatedBy`):** For every reachable CFG basic block within a `FUNCTION` or `METHOD` that reads a member field (`this.field` / `self.field`) or an uninitialized local declaration (`let x;`), the evaluator walks the immediate dominator chain from the read block back toward `ENTRY`.
* **Violation Trigger:** If no basic block containing an initialization (`SETS` / assignment `=`) of that symbol dominates the read block (or precedes it in the same basic block), `CHR-016` emits a `CRITICAL` violation pinpointing the exact line where uninitialized state can be read.

---

## 3. Bun 1.4 SQLite WAL Lifecycle & Statement Finalization (`connection.ts`)

`src/lib/db/sqlite/client/connection.ts` enforces deterministic WAL cleanup across rapid workspace switches (`POST /api/metamodel/workspaces` and `REINDEX_WORKSPACE`):

* **`SQLITE_FCNTL_PERSIST_WAL = 0`:** Invokes `sqlite.fileControl(10, 0)` on handle creation so WAL files never linger after connection close.
* **Statement Finalization (`closeChronosDb`):** Explicitly calls `.finalize()` on every tracked prepared statement (`prepareTracked`), executes `PRAGMA wal_checkpoint(TRUNCATE);`, and invokes `sqlite.close(false)` to prevent `SQLITE_BUSY` contention.
