---
name: chronos-game-hud
description: Enforces the 11-zone clockwise Tactical Game-HUD, 3-tier progressive disclosure, and composable double-hairline modals.
---

# Chronos Tactical Game-HUD Specification

> Authoritative UI constitution for Chronos `v2.3.0` (`docs/skills/chronos-game-hud/`).

## 1. 11-Zone Clockwise Perimeter Topology

* Partition the viewport strictly into the 11 named `HUD_ZONES` defined in `references/zones.md` across 5 responsive tiers (`PHONE` to `UWQHD 5120×1440`).
* Keep `TOP_CENTER` (`ProjectTabDeck` + 7-slot Crown) and `BOTTOM_CENTER` (`132px`, 6-slot Hotbar + `HudAiCommandDeck` with `12px` gutters) non-clipping and properly aligned.
* Triggering `HUD_TOGGLE_STEALTH` (`Tab` or `Z`) folds all 8 perimeter zones out simultaneously along their clockwise radial/axial fold vectors.

## 2. Three-Tier Progressive Disclosure

* **Tier 1 (Glanceable Verdict):** Default view shows only the primary health grade, active projection name, or compact `3x3` severity LED matrix.
* **Tier 2 (Grouped Summary):** Hover or single click reveals categorized counts (`Coupling`, `Complexity`, `Cohesion`, `Calls`).
* **Tier 3 (Forensic Drill-Down):** Explicit expand or modal action reveals full metric grids, CFG blocks, or deviation sign-off forms.

## 3. Composable Stroked Vector Modal Kit

* All dialogs (`AuthLobbyModal`, `StationsModal`, `InstantSearchModal`, `HelpCenterModal`, `WorkspaceImportModal`, `DeviationSignOffModal`) compose `HudModalShell`, `HudModalHeader`, `HudModalGrid`, `HudModalItemRow`, and `HudModalFooter`.
* Every modal enforces translucent backdrop blur, continuous `<svg>` vector chamfer stroke, radial starburst backdrop rays, `>= 11px` floor, outside-click dismissal, and `Escape` close.
