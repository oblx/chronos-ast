# 02 // MCP Tools, Resources & Twin Intent Schemas

> **Parent Skill:** [`../SKILL.md`](../SKILL.md) | **Implementation:** `src/server/mcp/{mcp.types,forensic.tools,forensic.resources,twin_client.mcp}.ts`

---

## 1. Forensic Metamodel Tools (`POST /api/mcp`)

| Tool Name | Required Arguments | Structured Response Payload |
| :--- | :--- | :--- |
| **`chronos_analyze_self`** | Optional `rootDir` (`src`) | Re-indexes `src/**/*.ts`, persists `'chronos-self'` project, returns file count, entity count, Tarjan SCC cycles, worker microseconds |
| **`chronos_query_metamodel`** | Optional `kind`, `namePattern`, `limit` | Filtered AST entity slice + graph edge summary (`<= 100` entries) |
| **`chronos_inspect_entity`** | `entityId` or `qualifiedName` or `name` | Full entity record, Chidamber-Kemerer OO metrics, source slice, and CodeCheck flags |
| **`chronos_trace_codemap_entry`** | Optional `entityId`, `qualifiedName` | Detected Genesis entry points and exact BFS Hop-0..Hop-N Codemap travel spine |
| **`chronos_run_codecheck`** | Optional `useHisSafetyProfile` | Active violations (`CHR-001 .. CHR-017`), suppressed count, compliance score |

---

## 2. Forensic MCP Resource URIs (`resources/list` & `resources/read`)

| URI Pattern | Returned JSON MIME Resource (`application/json`) |
| :--- | :--- |
| **`chronos://project/{projectId}/manifest`** | Project metadata, indexed file count, entity count, Tarjan SCC summary, Genesis entry points |
| **`chronos://project/{projectId}/hotspots`** | Top 15 complexity hotspots ranked by cyclomatic complexity `v(G)` and Halstead volume |
| **`chronos://project/{projectId}/cycles`** | Tarjan SCC strongly connected clusters and topological cycle verdict |
| **`chronos://project/{projectId}/codecheck`** | Summary violation counts grouped by severity and rule code |

---

## 3. Twin Event-Driving Tools (`POST /api/mcp/twin`)

* **`chronos_twin_list_sessions`:** Lists connected WebSocket clients (`clientId`, `username`, `roleBadge`, `workspaceId`, `activeProjection`, `viewportTier`, `cameraZoom`, `focalEntityId`).
* **`chronos_twin_dispatch_intent`:** Targets `'ALL'`, `clientId`, or `username` with typed `SWITCH_PROJECT`, `SWITCH_PROJECTION`, `SELECT_ENTITY`, `SET_THEME`, `TOGGLE_DRAWER`, `CAMERA_FIT`, `OPEN_MODAL`, or `CLOSE_MODAL`.
* **`chronos_twin_capture_wire_trace`:** Returns correlated recent `serverDagKernel` and `TWIN_CLIENT_ACK` telemetry records (`limit <= 128`).

---

## 4. Capability Manifest (`GET /api/mcp/manifest`) & Signed Webhooks

* **Manifest Envelope (`manifest.mcp.ts`):** Unauthenticated JSON response exposing `version`, `license`, `transports`, `authSchemes`, `forensicTools`, `twinTools`, `resourceTemplates`, `capabilityBits`, and `webhookEvents`.
* **Signed Workflow Events (`webhook.bridge.ts`):** Emits `PROJECT_INDEXED`, `CODECHECK_REGRESSION`, `PR_PUBLISHED`, and `TWIN_INTENT_EXECUTED` signed with HMAC-SHA256 (`X-Chronos-Signature: sha256=...`, `X-Chronos-Event`, `X-Chronos-Delivery-Id`).
