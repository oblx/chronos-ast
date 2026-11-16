# 05-04 // Mermaid Studio, Theme Marketplace, Virtual Cursors & Sovereign Privacy

> **Author:** `Oblx <code@oblx.dev>` | **Version:** `1.9.0` | **Parent:** [`../00-index.md`](../00-index.md)

---

## 1. Interactive Mermaid Studio & WCAG Community Theme Marketplace

Crown Slot 8 (`MERMAID`, `src/client/components/organisms/projections/MermaidStudioCanvas.svelte`) and the Community Theme Studio (`src/client/components/modals/settings/ThemeMarketplacePanel.svelte`) provide live diagram authoring and mathematically audited visual customization.

$$L = 0.2126 R_{\text{lin}} + 0.7152 G_{\text{lin}} + 0.0722 B_{\text{lin}}, \quad CR = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05} \ge 4.5$$

* **Split-Pane Mermaid Studio (`38.2%` / `61.8%` Golden Ratio):** Pairs a live Mermaid DSL editor (`flowchart TD`, `classDiagram`, `sequenceDiagram`) with an interactive pan/zoom SVG blueprint stage that auto-generates DSL from the active focal entity's neighborhood.
* **WCAG AA Contrast Validator (`src/core/security/guards/theme.validator.ts`):** Audits every community theme submission across 18 CSS color variables and 8 syntax tokens, rejecting any palette whose text-to-background contrast ratio falls below $4.5:1$.
* **Polarity-Aware Surface Tokens:** Switching between Dark and Light polarity (`OBSIDIAN_CYBER`, `SOLAR_ FLARE`, `PAPER_ARCHITECT`, `EMERALD_MATRIX`) updates `--hud-bg`, `--hud-panel`, `--hud-surface`, and `--hud-border` atomically with zero layout shift.

| Subsystem | Server Endpoint | Client Component |
| :--- | :--- | :--- |
| **Mermaid Studio** | Local AST-to-Mermaid Compiler | `MermaidStudioCanvas.svelte` |
| **Theme Marketplace** | `GET/POST /api/themes`, `POST /api/themes/favorite` | `ThemeMarketplacePanel.svelte` |
| **Sovereign Privacy** | `GET /api/privacy/export-me`, `POST /api/privacy/erase-me` | `PrivacySovereigntyPanel.svelte` |

---

## 2. Multi-Scope 60fps Virtual Cursors, Social Hub & GDPR Sovereignty

The realtime collaboration layer (`src/server/ws/awareness.bus.ts` and `src/client/components/molecules/overlays/HudVirtualCursorsOverlay.svelte`) streams normalized peer coordinates across three distinct spatial coordinate scopes while enforcing strict user data sovereignty.

$$\vec{p}(t) = \vec{p}_0 + (\vec{p}_1 - \vec{p}_0) \cdot \min\left(1, \frac{t - t_0}{\Delta t_{\text{frame}}}\right)$$

* **Multi-Scope Cursor Projection:** Tags every cursor frame with `WORLD_CANVAS` (world-space coordinates transformed through local camera matrix), `MODAL_STAGE` (normalized `[0..1]` modal coordinates), or `HUD_PERIMETER` (zone-relative coordinates), interpolating motion at 60fps.
* **3-Column Social Hub (`CollabSocialModal.svelte`):** Integrates the Active Squad Cluster (2–8 seats), Operator Directory & Mutual Friend Graph (`/api/collab/friends`), and Live Collab Invites & Privileged Override (`/api/collab/override`).
* **Sovereign Privacy & Erasure (`src/server/routes/privacy.routes.ts`):** Provides one-click GDPR Art. 15 JSON/ZIP data portability export (`export-me`) and Art. 17 cryptographic erasure (`erase-me`) across SQLite and IndexedDB.
