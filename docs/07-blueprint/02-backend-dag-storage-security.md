# 07-02 // Backend DAG Dispatch, Dual-Parity Storage, Cryptographic Vault & Realtime Wire

> **Author:** `Oblx <code@oblx.dev>` | **Version:** `1.9.3` | **Parent:** [`../00-index.md`](../00-index.md)

---

## 1. Five-Stage Server Wire DAG & Dual-Parity Storage Architecture

The backend layer (`src/server/` and `src/lib/db/`) models every client request, collaborative awareness frame, and background indexing job as an immutable symbolic intent flowing through a 5-stage observable Directed Acyclic Graph (`src/server/http/server.kernel.ts`).

$$\text{HLC}(t_{\text{phys}}, c, \text{nodeId}) = \langle \max(t_{\text{wall}}, t_{\text{last}}), \; c + \mathbb{I}(t_{\text{wall}} \le t_{\text{last}}), \; \text{nodeId} \rangle$$

* **5-Stage Server Wire DAG (`src/server/http/server.kernel.ts`):** Executes `STAGE_1_WIRE_GUARD` (method/CSRF/rate-limit), `STAGE_2_AUTH_RBAC` (principal + `u32` mask resolution), `STAGE_3_SANITIZE` (prototype/HTML stripping), `STAGE_4_DOMAIN_COMMIT` (controller + SQLite WAL commit), and `STAGE_5_FANOUT_OBSERVE` (256-slot trace ring buffer + WebSocket fanout).
* **SQLite WAL & IndexedDB Mirror Parity (`src/lib/db/`):** Persists relational tables (`projects`, `entities`, `references`, `security`, `community_themes`, `user_preferences`, `gamification`) in `bun:sqlite` with Write-Ahead Logging (WAL) while mirroring workspace snapshots into browser IndexedDB for sub-millisecond offline restore.
* **Hybrid Logical Clock (HLC) Causal Reconciliation:** Orders offline client annotations and workspace mutations deterministically using monotonic HLC timestamps and SHA-256 hash-chained audit logs.

| Storage / Transport Tier | Primary Module | Concurrency & Integrity Mechanism |
| :--- | :--- | :--- |
| **Server Wire DAG Kernel** | `src/server/http/server.kernel.ts` | 5-stage trace pipeline + 256-slot telemetry ring buffer |
| **Dual-Spine MCP & Manifest** | `src/server/mcp/{forensic,twin_client,manifest}.mcp.ts` | Public capability manifest, PAT/JWT Forensic queries & RBAC Twin WS control |
| **Signed Webhook Bridge** | `src/plugins/exporters/webhook.bridge.ts` | `system_configs` + AEAD Vault HMAC-SHA256 async outbound workflow dispatcher |
| **Server Relational Store** | `src/lib/db/sqlite/index.ts` | `PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;` |
| **Browser Offline Mirror** | `src/lib/db/indexeddb/client.ts` | Transaction-safe object stores + quota fallback |
| **Realtime WebSocket Hub** | `src/server/ws/ws.hub.ts` | 100-client cap, 20Hz cursor throttle, 2–8 seat rooms, Twin ACK |

---

## 2. Defense-in-Depth Security, u32 RBAC & Write-Only AEAD Vault

All external inputs, credentials, and multi-user room actions pass through a zero-trust security pipeline (`src/core/security/`) before touching persistence or broadcast channels.

$$\text{Permitted}(p, \text{op}) \iff \left( (\text{Mask}_{\text{role}}(p) \lor \text{Mask}_{\text{grant}}(p)) \land \neg \text{Mask}_{\text{deny}}(p) \land \text{Bit}(\text{op}) \right) \neq 0$$

* **4-Stage Input Sanitization:** Enforces UTF-8 NFC normalization, control-character stripping, strict structural schema validation (`src/core/security/guards/form.validator.ts`), and context-aware output encoding.
* **Bitwise `u32` RBAC Engine & Wire Observatory (`src/core/security/rbac.bitmask.ts`):** Evaluates capability bits across `GUEST`, `VIEWER`, `ANALYST`, `AUDITOR`, `ADMIN`, and `ROOT` roles in $O(1)$ bitwise operations, gating live wire telemetry inspection behind bit 28 (`0x10000000`).
* **Write-Only AEAD AES-256-GCM Secret Vault (`src/core/security/vault.crypto.ts`):** Derives 256-bit keys via PBKDF2-HMAC-SHA256 (`100,000` iterations) and seals API tokens with random 96-bit nonces and 128-bit authentication tags so raw secrets are never returned to the client DOM.
