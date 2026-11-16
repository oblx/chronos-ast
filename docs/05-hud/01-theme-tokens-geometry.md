# 05-01 // 5-Tier Responsive Grid (`UWQHD`), Detachable Edge Docks, Stroked Chassis & Themes

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/config/themes/presets.registry.ts`, `src/config/hud.tokens.ts`, `src/config/hud.surfaces.ts`, `src/config/hud.events.ts`

---

## 1. Five-Tier Responsive Grid (`HUD_BREAKPOINTS` incl. `UWQHD 5120×1440`) & Detachable Docks (`v1.8.0`)

`HUD_BREAKPOINTS` (`src/config/hud.tokens.ts`) and `resolveHudBreakpoint(widthPx)` govern five responsive viewport tiers:

* **`PHONE` (`< 768px`):** `100vw` slide-over drawers (`44px` collapsed rail).
* **`TABLET` (`768px – 1199px`):** `248px` expanded / `48px` collapsed rail; single-line non-wrapping short labels; `MAX_VISIBLE_PROJECT_TABS = 3`.
* **`DESKTOP` (`1200px – 1919px`):** `288px` expanded / `48px` collapsed rail; optional drag-to-float docks; `MAX_VISIBLE_PROJECT_TABS = 4`.
* **`WQHD` (`1920px – 3439px`):** `336px` expanded / `52px` collapsed rail; magnetic snap-to-rail guides (`SNAP_THRESHOLD_PX = 24px`).
* **`UWQHD` (`>= 3440px`, Target `5120×1440`):** `360px` expanded / `56px` collapsed rail; `.hud-uwqhd-corridor` (`max-w-[2560px]` inner bounding rail); `MAX_VISIBLE_PROJECT_TABS = 6`; full **Free-Floating Movable Dock Mode** (`DOCKED_RAIL` vs. `FLOATING_PANEL`) on `LEFT_EDGE` and `RIGHT_EDGE` with `Reset Dock Layout` in `SettingsAppearanceCols.svelte`.

---

## 2. Parallel Corner-Safe Vector Chamfers (`CHAMFER_PROFILES`), Webfonts & Theme Studio (`v1.8.0`)

* **Parallel `<svg>` Polygon Buttons (`HudChamferButton.svelte`, `CHAMFER_PROFILES`):** Zero CSS `clip-path` border slicing; every button observes its box via `ResizeObserver`, enforces concentric inner-padding clearance (`>= 8px`, `childCutPx = max(5, parentChamferPx - 6)`), and matches its parent corner via `CORNER_TOP_LEFT`, `CORNER_BOTTOM_LEFT`, `CORNER_TOP_RIGHT`, `CORNER_BOTTOM_RIGHT`, `RIGHT_END_CAP`, `LEFT_END_CAP`, `CHAMFER_OCTAGON`, or `INTERIOR_CHAMFER`.
* **Angled Octagonal Modal Shell (`HudModalShell.svelte`, `HudModalHeader.svelte`):** Wraps every HUD modal (`Chronos Lobby`, `Stations`, `Help`, `Settings`, `CollabSocialModal`) in `HudChamferFrame` (`CHAMFER_OCTAGON`, `chamferPx = 16`, dual-phosphor stroke, `3px` inner bezel, `135°` carets, starburst rays, `128°` sheen) with `14px` top/right close button clearance.
* **Explicit Webfont Loading (`index.html`, `src/client/app.html`):** Loads `Cormorant Garamond`, `Fira Code`, `IBM Plex Mono`, and `Plus Jakarta Sans` from Google Fonts (`security.constants.ts` CSP allowlists `fonts.googleapis.com` and `fonts.gstatic.com`), eliminating silent system monospace fallback.
* **Corridor Width Lock & Compact Overflow Drawer (`ViewportHUD.svelte`, `HudCompactOverflowDrawer.svelte`):** `--hud-center-corridor-w` (`.hud-center-corridor-w`) enforces deterministic alignment between `TOP_CENTER` and `BOTTOM_CENTER`; viewports `< 1024px` consolidate header controls into `HudCompactOverflowDrawer`.
* **Vertically Centered Edge Rails & Custom Themes:** `LEFT_EDGE` and `RIGHT_EDGE` size intrinsically (`height: auto`, `max-height: calc(100vh - 300px)`) and anchor at `top: 50%` (`translate3d(x, -50%, 0)`) in both mini-rail and unfolded drawer states; `community_themes` & `theme.validator.ts` power the Community Marketplace alongside `6` built-in themes.

---

## 3. Stroked Vector Chassis (`HudChamferFrame`) & 5-Layer Substrate (`WorldAtmosphere`)

| Layer / Token | Mechanism & Material Spec (`HULL_TOKENS` / `SUBSTRATE_DEFAULTS`) | Target Components |
| :--- | :--- | :--- |
| `Layer 0: Radial Illumination` | Center-lit radial gradient (`coreGradientColor` -> `midGradientColor` -> `edgeGradientColor`, `bloomIntensity: 0.85`) | `WorldAtmosphere.svelte` |
| `Layer 1: 1×/5×5 Grid + '+'` | `20px` minor grid (`0.14`), `100px` (`5×5`) major grid (`0.32`), and `5px` `+` crosshairs (`0.60`) in secondary phosphor | `WorldAtmosphere.svelte`, `SettingsAppearanceCols.svelte` |
| `Layer 2: Hex & Star-Dust` | `36px` interlocking honeycomb mesh (`0.12`) + coordinate star-dust specks (`starDustDensity: 0.45`) | `WorldAtmosphere.svelte` |
| `Layer 3: Polar Rings & Ticks` | Concentric `220/440/680px` range arcs, cardinal axes, and `000°–315°` ticks with `±4px` damped cursor parallax | `WorldAtmosphere.svelte` |
| `Layer 4: Inset Frame & CRT` | `12px` inset viewport frame + `0.08` CRT scanlines + `0.45` vignette (`HUD_SET_SUBSTRATE_CONFIG`) | `WorldAtmosphere.svelte` |
| `Z1_WORLD_ENTITY` | Shared `HudEntityCartridge.svelte` 4-layer SVG cartridge (`45°` top-right chamfer, `3px` spine, `data-entity-id`, double-click focus) | `ButterflyGraph`, `ControlFlowCanvas` |
| `Z2_PERIMETER_DOCK` | `ResizeObserver` `1:1` pixel-chamfered 3-pass `<svg>` chassis (`HudChamferFrame`), `3px` inset bezel, `5` `/////` shoulder chevrons & `>=11px` floor | `HudTopBarZones`, `ProjectTabDeck`, `HudLeftEdgeZone`, `HudRightEdgeZone`, `HudBottomDockZones`, `HudAiCommandDeck` |
