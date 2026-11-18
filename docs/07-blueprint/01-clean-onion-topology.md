# 07-01 // Clean Onion Topology, Barrel Discipline & Invariant Auditor

> **Author:** `Oblx <code@oblx.dev>` | **Version:** `1.9.7` | **Parent:** [`../00-index.md`](../00-index.md)

---

## 1. Seven-Ring Clean Onion Architecture & Acyclic Dependency Law

This specification defines a reusable, brand-agnostic fullstack TypeScript and Svelte 5 architectural blueprint governed by seven strict Clean Onion source rings (`src/{config, core, server, workers, lib, plugins, client}`).

$$R(\text{config}) = 0 < R(\text{core}) = 1 < R(\text{lib}) = 2 < R(\text{plugins}) = 3 < R(\text{server}) = 4 \le R(\text{workers}) = 4 < R(\text{client}) = 5$$

* **Zero Inward-Ring Violations & Humble-View Presentation Firewall:** Any module in ring $R(u)$ may only import from ring $R(v)$ where $R(v) \le R(u)$. Furthermore, presentation components (`src/client/components/**/*.svelte`) are restricted to importing child components, `svelte`/`lucide-svelte`, `@config/*`, and `@client/state/*` (`forbiddenSvelteImports`).
* **100% Barrel Discipline (`index.ts`):** Every directory across `src/` exposes a deterministic `index.ts` barrel export so consumers import bounded module contracts rather than deep internal file paths.
* **Strict Directory Fan-Out Cap (`MAX_FILES_PER_FOLDER = 10`):** No directory in `src/`, `docs/`, `tests/`, or `benches/` may contain more than 10 direct child files; whenever a domain grows beyond 10 files, it is partitioned into cohesive sub-packages.

| Onion Ring | Path Prefix | Allowed Dependencies | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Ring 0 — Config** | `src/config/` | None (Leaf SSOT) | Typed constants, design tokens, schemas, rule registries |
| **Ring 1 — Core** | `src/core/` | `config` | Pure graph algorithms, AST parsers, metrics, cryptographic primitives |
| **Ring 2 — Lib** | `src/lib/` | `config`, `core` | Drizzle SQLite repositories, IndexedDB mirrors, SSR islands |
| **Ring 3 — Plugins** | `src/plugins/` | `config`, `core`, `lib` | Auth adapters, Git packfile ingestors, sanitizers, SARIF/SVG exporters |
| **Ring 4 — Server** | `src/server/` | `config`, `core`, `lib`, `plugins` | 5-Stage Server Wire DAG, HTTP router, REST route handlers, MCP discovery/control, WebSockets |
| **Ring 4 — Workers** | `src/workers/` | `config`, `core`, `lib`, `plugins` | Background AST worker pool, incremental watcher, CLI token minter, invariant & hygiene auditors |
| **Ring 5 — Client** | `src/client/` | `config`, `core`, `lib`, `plugins` (via `state/`) | 4-Stage Client Wire DAG, reactive Svelte 5 runes stores, Humble-View HUD |

---

## 2. Mechanical Construction Invariants & Self-Auditing Verification Gate

Every file in the repository is continuously verified by an automated static invariant auditor (`src/workers/auditor/invariant.auditor.ts`) executed inside the unit and E2E test suites prior to production bundling.

$$\forall f \in \text{SourceFiles}: \quad \text{LoC}(f) \le 150, \quad \max_{m \in f} \text{LoC}(m) \le 42, \quad \text{Spaces}_{\text{indent}}(f) = 0$$

* **Indentation, Humble-View & Complexity Budgets:** Enforces tabs-only indentation (`\t`), `<= 150` lines per source file (`.ts`, `.svelte`), `<= 42` lines per function, `<= 100` lines per documentation markdown file, and zero direct `@core`/`@lib`/`@plugins`/`fetch()` calls in `.svelte` files.
* **Zero Hardcoded Magic Literals & Repository Hygiene (`repo_hygiene.auditor.ts`):** Prohibits hardcoded version strings, raw hex colors outside theme registries, external brand leaks, unignored `.sqlite`/`.env*` runtime files, literal credentials, or staging URLs across source and documentation files.
* **Deterministic Build & Test Pipeline:** Pairs static typechecking (`tsc --noEmit`), unit/integration suites (`bun test`), micro-benchmarks, and headless browser geometry assertions into a single zero-regression gate.
