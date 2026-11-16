# 00-02 // Architectural Manifesto & Operational Invariants

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Status:** `ENFORCED`

---

## 1. Intellectual Lineage

1. **John McCarthy (Symbolic Purity):** Programs are recursive symbolic expressions. AST transformations, metric reductions, and graph projections operate as pure, stateless functions over immutable data structures.
2. **Steve McConnell (Construction Rigor):** Zero magic numbers, zero raw string literals, and bounded cognitive complexity. Every threshold, byte offset, route path, and token variant lives in `src/config/`.
3. **Martin Fowler (Hexagonal Domain Modeling):** Domain logic (`src/core/`) never depends on presentation (`src/client/`) or external transport adapters (`src/plugins/exporters/`).
4. **Ralph Baer (Interactive CRT Telemetry):** Vector phosphor scanlines, luminance bloom, and real-time television-grade visual feedback turn abstract software graphs into tangible instruments.
5. **Don Norman (Ecological Affordances):** Inbound callers (`Ca`), focal entities, and outbound callees (`Ce`) occupy invariant spatial zones with explicit directional signifiers.
6. **Tomohiro Nishikado (Arcade Vector Dynamics):** Animated trajectory pulses along dependency arcs and a live diegetic radar minimap (`RADAR // CRT-01`) provide continuous spatial orientation.

---

## 2. Hard Engineering Invariants

| Invariant | Rule | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Documentation Separation** | Docs ban triple-backtick code fences, allow balanced `$`/`$$` LaTeX MathML; code stays lean | Automated AST/LaTeX audit across `docs/**` and `src/**` |
| **Line of Code Caps** | `function <= 42` LoC, `docs <= 100` LoC, `code <= 150` LoC | Verified on every sprint via `wc -l` |
| **Indentation Discipline** | Hard tabs (`\t`) everywhere, never spaces | Enforced across all `.ts`, `.svelte`, `.json`, and `.md` files |
| **Anti-Magic Registry** | All numbers, offsets, signatures, and enums resolved from `src/config/` | `constants.ts`, `metamodel.constants.ts`, `hud.tokens.ts`, `env.schema.ts` |
| **Non-Destructive Cleanup** | `trash` over `rm` or `unlink` | Archived artifacts moved to `/.trash/` |
| **Six-Folder Topology** | Strictly `src/{config, client, core, lib, plugins, workers}` | Verified via directory tree audit |
