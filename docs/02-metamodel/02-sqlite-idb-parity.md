# 02-02 // SQLite, IndexedDB & Memgraph Storage Parity (`v1.8.0`)

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/lib/db/`, `src/core/api/project.routes.ts`, `src/plugins/exporters/memgraph.exporter.ts`

---

## 1. Canonical Normalized `u32` Relational Tables (`src/lib/db/sqlite/schema/{tables,security.tables}.ts`)

`bun:sqlite` opens with `WAL`, `foreign_keys = ON`, `synchronous = NORMAL`, `trusted_schema = OFF`, `cell_size_check = ON`, `busy_timeout = 3000`, and `temp_store = MEMORY`, runs `PRAGMA optimize` before `wal_checkpoint(TRUNCATE)` on close, and syncs with browser IndexedDB (`chronos_offline_metamodel_db` v6):

| Table / Object Store | Primary Key | Indexed Columns | Stored Attributes |
| :--- | :--- | :--- | :--- |
| `projects` | `id` (`u32` int) | `slug` (unique), `ownerId`, `visibility` | `shortCode` (`<=12` chars), `name`, `description`, `defaultBranch`, `indexedFilesCount`, `entityCount`, `sourceMapJson` |
| `project_members` | `id` (`u32` int) | `(projectId, userId)` (unique), `userId` | `groupId` (FK -> `rbac_groups.id`), `personalOverrideMask` (`u32`), `joinedAt` |
| `workspaces` | `id` (text) | `name`, `ownerId` | `updatedAt`, `indexedFilesCount`, `sourceMapJson` |
| `entities` | `id` (integer) | `uuid`, `qualifiedName`, `kind`, `projectId` | `projectId` (FK -> `projects.id`), `name`, `fileId`, `lineStart`, `colStart`, `lineEnd`, `colEnd`, `checksum` |
| `references` | `id` (integer) | `sourceEntityId`, `targetEntityId`, `kind` | `projectId`, `line`, `column` (foreign keys cascade on entity or project delete) |
| `metrics` | `id` (integer) | `entityId` (unique) | `projectId`, `loc`, `cyclomaticComplexity`, `halsteadVolume`, `afferentCoupling`, `efferentCoupling`, `instability` |
| `users`, `user_auth_identities`, `sessions` | `id` / `sid` | `uid`, `username`, `(authFlow, providerSubject)` | `primaryGroupId`, `roleId`, `grantMask`, `denyMask`, `scopedMask`, `generation`, `revoked` |
| `secrets_vault`, `sync_operations`, `audit_log` | `id` / `opId` / `seq` | `ownerId`, `hlcPhysicalMs`, `projectId` | `ciphertextB64`, `ivB64`, `lastFourChars`, `entryHash`, `conflictFlag`, `prevHash`, `rowHash` |

---

## 2. Contextual Project RBAC & Resilient IndexedDB Mirror (`src/lib/db/indexeddb/`)

* **Contextual `project_members` Inheritance:** Switching `projectId` (`ProjectTabDeck.svelte`) invokes `compileEffectiveUserMask` (`src/core/security/chronos.rbac.ts`) binding `project_members.groupId` and `personalOverrideMask` alongside contextual `rbac_permission_nodes`.
* **Quota-Resilient Mirroring (`idb.mirror.ts`):** When browser storage throws `QuotaExceededError` or `tx.onabort` under private browsing, `idb.mirror.ts` degrades cleanly onto `memoryMirrorStore` and dispatches `'chronos:idb-warning'` to surface telemetry in the HUD `LIVE STREAM` without halting analysis.

---

## 3. Memgraph Property Graph Secondary Port (`src/plugins/exporters/memgraph.exporter.ts`)

While SQLite + IndexedDB remain the single source of truth, Memgraph serves as an optional read-through and Cypher analysis adapter:

* **Bulk `UNWIND` Cypher Sync:** Maps `entities` rows to `:Entity` nodes and `references` rows to `:RELATES` directed edges with `{kind, line}` properties.
* **Multi-Hop Transitive Pathfinding (`1..12` Hops):** Computes upstream impact chains and downstream taint propagation across module boundaries, highlighting complexity hotspots (`cyclomatic >= 15`).
* **Brandes Betweenness Centrality:** Identifies architectural bridge bottlenecks across all shortest dependency paths when the HUD toggle is switched to `GRAPH ENGINE: MEMGRAPH_BOLT`.
