---
name: tailwindcss-v4-tokens
description: CSS-first Tailwind CSS v4 @theme tokens, 6-theme data-hud-theme variables, and GPU-only fold animations.
---

# Tailwind CSS v4 Token Pipeline

> Curated from Tailwind CSS v4 CSS-first token standards for Chronos `v2.3.0`.

## 1. Zero Arbitrary Literals in Markup

* Declare all palette surfaces, antique brass/accent highlights, hairline widths, font stacks (`--font-display`, `--font-sans`, `--font-mono`), blur radii, and easing curves inside `@theme` and `[data-hud-theme]` blocks in `src/client/app.css`.
* Never hardcode hex colors or magic pixel geometry directly in `.svelte` templates when a semantic CSS variable or config token applies.

## 2. Compositor-Only Fold Transitions

* Animate perimeter zone folding and modal transitions exclusively with `transform` and `opacity` using `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-hud-fold`).
* Respect `@media (prefers-reduced-motion: reduce)` by collapsing transition durations to instant settling.

## 3. Dual-Polarity Contrast Integrity

* Support all 6 tactical themes (3 dark: Obsidian Brass, Phosphor CRT, Stealth Cobalt; 3 light: Archival Vellum, Daylight Blueprint, Alabaster Lab) via a single `data-hud-theme` attribute on the root HUD container.
* Maintain WCAG AA contrast ratios across every dark and light theme without `!important` inversion overrides.
