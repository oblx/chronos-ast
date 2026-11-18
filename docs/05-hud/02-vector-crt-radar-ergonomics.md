# 05-02 // Multi-Modal Camera Physics, `HudContextMenu`, `ProjectTabDeck`, `HudAiCommandDeck` & Studio UML

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/client/state/viewport.camera.svelte.ts`, `src/client/components/{zones/ProjectTabDeck,zones/HudAiCommandDeck,molecules/HudContextMenu,organisms/ButterflyGraph}.svelte`

---

## 1. Canonical 9-Slot Crown, Symmetric Clamping & Telemetry Readout (`v1.9.7`)

* **Octagonal Polygon Substrate Clip (`HudChamferFrame.svelte`):** Clips inner substrate fills strictly inside the 45-degree octagonal border polygon so zero 90-degree background corners bleed past diagonal strokes.
* **Symmetric `TOP_RIGHT` & `320px` Drawer Clearance (`HudLeftEdgeZone.svelte`, `HudRightEdgeZone.svelte`):** Clamps both unfolded edge drawers vertically at `top-1/2` (`max-h-[calc(100vh-320px)]`) with `12px` rail spacing so drawers never overlap `TOP_*` zones or `BOTTOM_LEFT` `LIVE STREAM`.
* **Chamfered `grid-cols-6` Hotbar & Concise Telemetry (`HudAiCommandDeck.svelte`):** Renders compact `READY · @<symbol> · <N>E · <S> SCC` telemetry beside `/hotspots`, `/cycles`, and `Thread [^]` inside `BOTTOM_CENTER` (`px-4 py-2`), eliminating horizontal text truncation at `1440x900`.

---

## 2. Legible Auto-Fit Zoom Floor, Safe Corridor & 30s HUD Tour (`v1.9.7`)

* **Drawer-Aware Safe Corridor & Small-Subgraph Zoom Floor (`viewport.camera.svelte.ts`, `CAMERA_PHYSICS_TOKENS`):** Subtracts active open docked edge drawer widths inside `fitGraphToSafeCorridor()` and enforces `MIN_AUTO_FIT_ZOOM = 0.72` whenever an active subgraph contains `<= 16` nodes, keeping manual wheel/button zoom-out unlocked down to `0.15x`.
* **30-Second Progressive HUD Unfolding (`HudGuestTutorialQuest.svelte`, `HUD_REVEAL_ZONE`):** Starts with `WORLD_CANVAS` only (`Step 1/5`) and progressively unfolds perimeter zones via `HUD_REVEAL_ZONE` + particle bursts with `Skip Tour [Esc]`.

---

## 3. Multi-Modal Camera Physics (`viewport.camera.svelte.ts`) & Tactical Context Menu (`HudContextMenu.svelte`)

| Input Modality | Gesture / Trigger | Deterministic Camera & HUD Response |
| :--- | :--- | :--- |
| **Mouse Wheel / Trackpad Pinch** | Scroll / `Ctrl + Wheel` | Cursor-anchored focal zoom (`computeFocalPointZoom`, `0.15x` to `4.0x`, keeping `worldPt` invariant under cursor) |
| **Left / Middle / Right Drag** | Drag canvas or `Right-Drag` anywhere (`>= 5px`) | Smooth 2D pan (`panX`, `panY`); `Shift + Left-Drag` draws a dashed marquee selection box |
| **Double-Click / Keyboard** | Double-click node vs. canvas / `[F]` or `[0]` | Node double-click locks Focal Target at `125%` zoom; canvas double-click or `[F]`/`[0]` resets safe corridor |
| **Right-Click / Touch Long-Press** | Stationary right-click (`< 5px`) or `450ms` touch | Opens `HudContextMenu.svelte` (`Lock Focal`, `Trace DFG`, `Inspect CFG`, `Send @Entity to AI Chat`, `Fit Corridor`) |
| **Two-Finger Touch Gesture** | Simultaneous 2-finger pinch + pan | Zooms and translates simultaneously around the dynamic touch midpoint |
