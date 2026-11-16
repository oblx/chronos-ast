---
name: bun-loop-verification
description: Bounded Patch/Factory verification loop covering TypeScript checks, Bun tests, LoC ceilings, and bundle purity.
---

# Bun Loop Verification Protocol

> Curated from Bun verification loop workflows for Chronos `v2.3.0`.

## 1. Bounded Verification Cycle

* Prepare explicit configuration and component contracts before editing (`HUD_ZONES`, `HUD_EVENTS`, `hud.wire`, `security.wire`).
* Apply clean modular edits across `src/config/`, `src/client/state/`, and `src/client/components/`.
* Execute `bun run verify` (`tsc --noEmit`, `bun test`, `bun run build`), `bun run bench`, and inspect both Guest and authenticated `oblx` browser views via Playwright CLI.

## 2. Mandatory Structural Oracles

* Every TypeScript and Svelte source file must stay strictly `<= 150` lines; every function `<= 42` lines; every documentation file `<= 100` lines.
* Client bundle output in `dist/assets/` must contain zero React imports and zero Node.js polyfills (`node:stream`, `node:crypto`, `buffer`).

## 3. Root-Cause Remediation

* Fix systemic layout, state-sync, WS backpressure, or contrast defects in shared shell/wire modules rather than patching individual views piecemeal.
