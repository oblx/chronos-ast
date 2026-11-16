# Contributing to Chronos

> **Author & Maintainer:** `Oblx <code@oblx.dev>` | **SSOT:** [`README.md`](./README.md) & [`docs/00-index.md`](./docs/00-index.md)

## 1. Engineering Invariants & Clean Onion Architecture

All contributions must pass `bun run verify` and preserve the 7-ring Clean Onion dependency direction (`src/{config, core, server, workers, lib, plugins, client}`):

| Constraint | Enforced Threshold | Verification Gate |
| :--- | :--- | :--- |
| **Indentation** | Tabs (`\t`) exclusively across source and test files | Repository review & invariant auditor |
| **File & Function Size** | Source files `<= 150` LoC; functions `<= 42` LoC; folders `<= 10` direct files | `runCodebaseInvariantAudit()` |
| **Documentation Sync** | `docs/**/*.md <= 100` LoC, `0` fenced code blocks, balanced LaTeX MathML | `runCodebaseInvariantAudit()` |
| **Barrel Discipline** | Every directory under `src/` must export an `index.ts` barrel | `missingBarrelViolations === []` |
| **Humble-View HUD** | `.svelte` files may only import `@config/*` or `@client/*` (zero `fetch()`) | `forbiddenSvelteImports === []` |
| **Zero-Secret Hygiene** | Zero `.sqlite`, `.env*`, literal credentials, or staging URLs | `runRepoHygieneAudit()` |

## 2. Local Setup & Verification Workflow

1. Install dependencies with `bun install --frozen-lockfile`.
2. Copy `.env.example` to `.env` only when supplying optional OAuth or external deployment overrides; default local runs require zero external keys.
3. Run `bun run verify` (`bun test` + TypeScript check + production Vite bundle + invariant & repo-hygiene audit).
4. Run `bun run bench` and `bun run qa:report` before submitting pull requests affecting AST scanning, graph layouts, MCP transports, or HUD rendering.
5. For autonomous AI coding loops, inspect `GET /api/mcp/manifest` and mint scoped credentials with `bun run mcp:token`.
