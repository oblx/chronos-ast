# 01-05 // Standalone Micro-Frontend UI Framework (@chronos-ui/svelte)

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/ui/`

---

## 1. Zero-Domain Presentation Firewall & 8-Module Topology

`@chronos-ui/svelte` (`src/ui/`) isolates reusable, domain-agnostic FUI geometry, pointer mechanics, and reactive state machines from Chronos static-analysis logic:

* **Strict Dependency Firewall:** `src/ui/` is forbidden from importing `@core`, `@server`, `@plugins`, `@lib`, `@client`, `@config`, or `@workers`, enforced on every test run by `invariant.auditor.ts`.
* **Barrelled Package Structure (`src/ui/`):** Organized across `manifest.ts`, `tokens/`, `wire/`, `machines/`, `atoms/`, `molecules/`, `organisms/`, and `modals/` with `100%` barrel exports (`index.ts`).
* **3-Tier Intent Routing Matrix:** `createUiWireBroker` classifies symbolic UI actions into `TIER_0_LOCAL_UI`, `TIER_1_COALESCED_PERSIST`, and `TIER_2_REALTIME_CLUSTER` intents without coupling views to transport APIs.
* **Canonical Corner Geometry Formula:** Every chamfered polygon vertex inset of width $W$, height $H$, stroke inset $\delta$, and chamfer cut $c$ obeys $c \le \min(W, H) / 3$ with matching SVG and CSS polygon hulls.

---

## 2. Reusable Primitives, Utility Triggers & Bento Carousel Deck

* **`UiUtilityIconButton` (`src/ui/atoms/`):** Renders `2rem x 2rem` off-when-idle chamfered vector triggers that ignite `--hud-util-accent` borders on hover/focus/active and emit a 6-sparkle burst overlay when `glitterActive` toggles.
* **`UiHorizontalDeck` (`src/ui/molecules/`):** Implements a snap-scrolling horizontal Bento deck with `◄`/`►` step buttons, `[ArrowLeft]`/`[ArrowRight]` keyboard navigation, and zero vertical clipping (`overflow-y-hidden`).
* **`UiSpotlightVeil` (`src/ui/organisms/`):** Measures target rectangles cleanly in `@ui` without domain selectors and drives progressive onboarding and Tome highlight drills via `uiSpotlightMachine`.
