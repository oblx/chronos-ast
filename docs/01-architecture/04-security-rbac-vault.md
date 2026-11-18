# 01-04 // Production Security, Multi-Source OAuth, Chronos RBAC & Realtime WebSockets

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/config/security.constants.ts`, `src/core/security/`, `src/plugins/auth/`, `src/workers/ws.hub.ts`

---

## 1. Normalized `u32` Identity Schema, Multi-Source OAuth & `Remember Me` Session Sync (`v1.8.0`)

Chronos `v1.8.0` separates principal identity (`users.uid` `u32`, `0` for Demo Guest) from multi-provider authentication factors (`user_auth_identities`) using pure **Web Crypto (`crypto.subtle`)** and **`Bun.password`**:

* **First-Paint `Chronos Lobby` & `Remember Me` (`rememberMe`) Persistence:** Unauthenticated visitors enter a centered First-Paint `Chronos Lobby` (`AUTH_LOBBY`, `z-50`) with all `8` perimeter HUD zones folded. Ticking `[x] Remember Me (30 Days)` persists a rotating `__Host-chronos_rt` cookie (`Max-Age=2592000`) and signed IndexedDB session record (`chronos_hud_session_v2`) so subsequent reloads auto-restore the operator's `11`-zone HUD without showing the lobby; leaving it unticked scopes credentials strictly to `sessionStorage`.
* **Local Argon2id + Pepper (`local.auth.ts`):** Hashes `HMAC-SHA256(pepper, salt || password)` via Argon2id (`memoryCost: 65536`, `timeCost: 3`) with constant-time dummy verification and sliding-window rate limiting.
* **GitHub & Google OAuth2 PKCE (`github.auth.ts`, `google.auth.ts`):** Zero-SDK OAuth2 PKCE adapters linking `(authFlow, providerSubject)` into `user_auth_identities` alongside `FIDO2 WebAuthn` (`webauthn.auth.ts`), `OIDC` (`oidc.auth.ts`), and `Scoped PATs` (`pat.auth.ts`).
* **DEVMODE Operator Seeding (`seed.operator.ts`):** When `DEVMODE=true`, idempotently seeds `oblx` (`uid=1`, `password: "nopenope"`, `email: "code@oblx.dev"`, `primaryGroup: "admin"`, `0xFFFFFFFF`) plus `analyst_dev`, `auditor_dev`, and `viewer_dev` quick-switch personas.

---

## 2. Chronos Hierarchical `u32` RBAC (`>>> 0`)

`compileEffectiveUserMask` (`src/core/security/chronos.rbac.ts`) traverses `rbac_user_groups` and `parentGroupId` inheritance ordered by `weight` (`0 -> 100`), applying `GROUP` then `USER` permission nodes (`workspaceContextId`, `expiresAt`):

| Group (`primaryGroup`) | Weight | Default `u32` Hex Mask | Operational Scope |
| :--- | :--- | :--- | :--- |
| `guest` | `0` | `0x000001C1` | Demo sample workspace read, graph navigation, source span view, CFG stepper |
| `viewer` | `10` | `0x01001DC1` | Inherits `guest` + CodeCheck run, annotation read, HLC sync pull |
| `analyst` | `50` | `0x059E3FFF` | Inherits `viewer` + workspace create/index/ingest, UML/SARIF export, AI/MCP bridges, sync push |
| `auditor` | `75` | `0x1701DFFF` | Inherits `viewer` + deviation sign-off, rule profile edit, audit chain read, `chronos.collab.override`, `chronos.admin.wire.observe` |
| `admin` / `root` (`oblx`) | `100` / `1000` | `0xFFFFFFFF` | Full governance including `RBAC_ADMIN_GRANT`, `COLLAB_OVERRIDE`, `ADMIN_WIRE_OBSERVE` (`0x10000000`), `VAULT_ROTATE_KEK`, and `SYSTEM_LOCKDOWN` |

---

## 3. 5-Stage Observable Server Wire DAG, Twin MCP Lock & Hygiene Audit (`v1.9.7`)

* **Strict RBAC DOM Omission & Live Wire Observatory (`chronos.admin.wire.observe`):** UI panels never render `<Lock>` placeholders for unauthorized capabilities; `HudTopBarZones`, `HudBottomDockZones`, and `StationsModal` render Wire Tap and `WireObservatoryModal.svelte` only when `securityWire.can(CAPABILITY_BITS.ADMIN_WIRE_OBSERVE)`.
* **Twin MCP Control Plane Guard (`POST /api/mcp/twin`):** Requires `ADMIN_WIRE_OBSERVE` (`0x10000000`) + `COLLAB_OVERRIDE` (`0x02000000`) and `actorWeight >= targetWeight`, returning JSON-RPC `-32003` and appending SHA-256 `audit_log` entries on every dispatch or denial.
* **5-Stage Observable Server Wire DAG (`server.kernel.ts`):**
  * *Stage 1 (`STAGE_1_WIRE_GUARD`):* Validates HTTP method, CSRF header (`x-chronos-csrf`), and rate limits (`http.middleware.ts`).
  * *Stage 2 (`STAGE_2_AUTH_RBAC`):* Resolves principal UID and `u32` capability mask across JWT, `chr_live_*` PATs (via HTTP or `bun run mcp:token`), and Guest fallback.
  * *Stage 3 (`STAGE_3_SANITIZE`):* `sanitizeInboundPayload` strips `__proto__`/`constructor`/`prototype`, HTML tags, and control characters.
  * *Stage 4 (`STAGE_4_DOMAIN_COMMIT`):* Executes the controller, Forensic/Twin MCP handlers, and persists SQLite WAL / HLC mutations.
  * *Stage 5 (`STAGE_5_FANOUT_OBSERVE`):* Appends a 256-slot `ServerWireTraceRecord`, attaches `x-chronos-wire-trace`, and fans out `SERVER_EVENT_COMMITTED` / `TWIN_DISPATCH_INTENT` / HMAC-SHA256 webhooks.
* **Repository Hygiene Auditor (`repo_hygiene.auditor.ts`) & SSRF Webhook Guard (`net.guard.ts`):** Blocks unignored `.sqlite`/`.env*` artifacts, literal credentials, or staging URLs on every test run, and preserves private/metadata CIDR blocking (`169.254.169.254`, `10.0.0.0/8`) even when local loopback webhooks are explicitly opted in.
