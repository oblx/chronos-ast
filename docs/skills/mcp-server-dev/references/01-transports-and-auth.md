# 01 // MCP Transports, Principal Resolution & Twin Authorization

> **Parent Skill:** [`../SKILL.md`](../SKILL.md) | **Implementation:** `src/server/mcp/{mcp.auth,stdio.transport,twin_client.mcp}.ts`

---

## 1. Dual Transport Symmetry

* **Stdio NDJSON Transport (`stdio.transport.ts`):** Reads newline-delimited JSON-RPC `2.0` frames from `Bun.stdin` and writes single-line responses to `process.stdout`, never polluting `stdout` with diagnostic banners.
* **Streamable HTTP POST Transport (`POST /api/mcp`, `POST /api/mcp/twin`) & Discovery (`GET /api/mcp/manifest`):** Routes through `serverDagKernel.execute(...)` (`STAGE_1_WIRE_GUARD` through `STAGE_5_FANOUT_OBSERVE`), attaching `x-chronos-wire-trace` headers, while `GET /api/mcp/manifest` publishes machine-readable agent bootstrap metadata.

---

## 2. Authentication & Capability Bitmask Filtering

* **Forensic MCP Capability Gating:** `chronos_analyze_self` requires `WORKSPACE_INDEX_LOCAL`; `chronos_run_codecheck` requires `CODECHECK_EXEC`; `chronos_query_metamodel`, `chronos_inspect_entity`, and `chronos_trace_codemap_entry` require `METAMODEL_QUERY`.
* **PAT Verification (`chr_live_*`) & Headless Mint (`bun run mcp:token`):** Mints scoped PATs headlessly against SQLite via `mint_mcp_token.ts` or `/api/auth/pat`, resolving `Bearer chr_live_*` tokens via constant-time HMAC-SHA256 digest lookup and intersecting user role masks with the PAT's `scopedBitmask`.

---

## 3. Twin Control-Plane Safeguards

* **Dual Capability + Group Weight Lock:** Every Twin method rejects principals lacking `ADMIN_WIRE_OBSERVE` (`0x10000000`) or `COLLAB_OVERRIDE` (`0x02000000`), or possessing lower `resolveUserMaxGroupWeight` than the target WebSocket session's owner (JSON-RPC `-32003`).
* **Correlated WebSocket Loopback:** Dispatched `TWIN_DISPATCH_INTENT` frames embed a unique `correlationId`; live browser clients execute through `clientDagKernel.dispatch(...)` and transmit `TWIN_CLIENT_ACK` frames back to the server trace buffer.
