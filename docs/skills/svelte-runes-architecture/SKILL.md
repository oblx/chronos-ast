---
name: svelte-runes-architecture
description: Svelte 5 Runes architecture, snippet composition, and proxy-overhead rules for Chronos UI modules.
---

# Svelte 5 Runes Architecture

> Curated from upstream Svelte AI skills for Chronos `v2.3.0` UI components.

## 1. Mandatory Runes & Snippets

* Always declare reactive component state with `$state`, computed values with `$derived` / `$derived.by`, side effects with `$effect`, and inputs with `$props`.
* Use Svelte 5 Snippets (`{#snippet ...}` and `{@render ...}`) for composable modal shells and zone drawers.
* Never use legacy `$:` reactive statements, `export let` props, `createEventDispatcher`, or legacy `<slot>` elements.

## 2. Large AST Array Performance & Lifecycle Teardown

* Store large collections (`tabs`, `baselineSnapshot`, `auditAnnotations`, `sarifViolations`, `remoteProjects`, `roster`, `annotations`, `sessions`, `vaultSecrets`, `conflictEntities`) in `$state.raw()` to eliminate unnecessary deep proxy wrapping.
* Derive compact UI projections (`activeEntity`, `filteredEntities`, `ckMetrics`) at component boundaries using pure `@core/*` selectors.
* Always return cleanup callbacks from `onMount` / `$effect` detaching `ResizeObserver`, timers (`cam.destroy()`), `window` listeners, and WebSocket clients (`wsClient.disconnect()`).

## 3. Component Isolation & File Budgets

* Enforce `<= 150` lines per `.svelte` or `.ts` file and `<= 42` lines per function.
* Components import only config tokens from `@config/*`, reactive state from `@client/state/{hud,security,ws.client,viewport.camera}.svelte.ts`, and direct child components—never reach across sibling zones.
