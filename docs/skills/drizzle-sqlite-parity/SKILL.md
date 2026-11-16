---
name: drizzle-sqlite-parity
description: Drizzle ORM bun:sqlite SSOT persistence, IndexedDB mirror parity, and Bun 1.4 WAL lifecycle discipline.
---

# Drizzle SQLite & IndexedDB Parity

> Curated from Drizzle ORM SQLite skills for Chronos `v2.3.0`.

## 1. Single Source of Truth Schema

* Keep canonical relational tables (`projects`, `project_members`, `entities`, `references`, `metrics`, `source_units`, `workspaces`, `annotations`, `users`, `sessions`) defined in `src/lib/db/sqlite/schema/{tables,security.tables}.ts`.
* Never introduce duplicate schema definitions or unvalidated ad-hoc SQL strings outside `src/lib/db/sqlite/`.

## 2. Atomic IndexedDB Mirroring & Quota Resilience

* Persist workspace mutations cleanly in `bun:sqlite` on the server and mirror snapshots atomically into `chronos_offline_metamodel_db` (v6) on the client so static SPA mode operates identically offline.
* Catch `QuotaExceededError` / transaction aborts in `idb.mirror.ts`, emit `'chronos:idb-warning'` for HUD `LIVE STREAM` telemetry, and continue seamlessly on `memoryMirrorStore`.

## 3. Bun 1.4 WAL & Planner PRAGMA Lifecycle

* Open connections with `PRAGMA busy_timeout = 3000` and `PRAGMA temp_store = MEMORY`, disable `SQLITE_FCNTL_PERSIST_WAL` (`0`), finalize all prepared statements, run `PRAGMA optimize;` before `PRAGMA wal_checkpoint(TRUNCATE);`, and close cleanly.
