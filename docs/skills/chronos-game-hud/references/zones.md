# 11-Zone Clockwise Game-HUD Topology

> Reference specification for `src/config/hud.tokens.ts` and `src/client/state/hud.wire.svelte.ts`.

| Order | Zone Key | Screen Anchor & Role | Fold Vector (`transform`) |
| :--- | :--- | :--- | :--- |
| `01` | `TOP_LEFT` | Workspace Identity & Auditor Rank Crest | Diagonal Up-Left (`-100%, -100%`) |
| `02` | `TOP_CENTER` | Sculpted Trapezoidal Projection Crest & Search Trigger | Vertical Up (`0, -100%`) |
| `03` | `TOP_RIGHT` | Engine Badge, `3x3` Alert LED Matrix & Quick Triggers | Diagonal Up-Right (`+100%, -100%`) |
| `04` | `RIGHT_EDGE` | Tier 1–3 Entity Verdict, IB Relations & CodeCheck Drawer | Horizontal Right (`+100%, 0`) |
| `05` | `BOTTOM_RIGHT` | Tactical Radar (`CRT-01`), Zoom Readout & Re-Center | Diagonal Down-Right (`+100%, +100%`) |
| `06` | `BOTTOM_CENTER` | Two-Tier Action Dock (Stations Bar + Mode Strip) | Vertical Down (`0, +100%`) |
| `07` | `BOTTOM_LEFT` | Compact 3-Line Live Event & Watcher Ticker | Diagonal Down-Left (`-100%, +100%`) |
| `08` | `LEFT_EDGE` | Collapsible Entity & Virtual Architecture Explorer | Horizontal Left (`-100%, 0`) |
| `09` | `WORLD_CANVAS` | Full-Bleed `100vw x 100vh` Interactive Graph/Tree World | Subtle Scale (`0.985`) on Modal Open |
| `10` | `APP_BACKGROUND` | Atmospheric Substrate with Radial Vignette & Grid | Static Base Layer (`z-0`) |
| `11` | `APP_MODAL` | Blurred Glass Veil, Double-Hairline Frame & Starburst | Center Scale + Fade (`0.97 -> 1.0`) |
