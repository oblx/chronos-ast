# 06-03 // Structured Deviation Templates, Vector Graph Exports & Compliance Reports (`v1.0.0`)

> **Author:** `Oblx <code@oblx.dev>` | **Parent Index:** [`../00-index.md`](../00-index.md) | **Domain:** `src/config/annotation.templates.ts`, `src/plugins/exporters/{vector_graph,compliance_report}.exporter.ts`

---

## 1. Structured Deviation Approval Templates (`annotation.templates.ts`)

`src/config/annotation.templates.ts` and the `annotations` table (`src/lib/db/sqlite/schema/tables.ts`) standardize rule suppressions (`ANNOTATION_KINDS.SUPPRESS_RULE`) into auditable compliance records with `templateId`, `reviewer`, `rationale`, `ticketId`, and `expiresAt`:

| Deviation Template ID | Validity Window | Required Approval Role | Governed CodeCheck Rules |
| :--- | :--- | :--- | :--- |
| **`ARCHITECTURAL_WAIVER`** | `90` days | Principal Architect | `CHR-012` (`SCC_CYCLE`), `CHR-013` (`MAIN_SEQ_PAIN`), `CHR-014` (`LAYER_VIOLATION`) |
| **`HIS_COMPLEXITY_EXEMPTION`** | `60` days | Safety Lead | `CHR-001..004`, `CHR-006` (`CFG_UNREACHABLE`), `CHR-016` (`UNINITIALIZED_VARIABLE_READ`) |
| **`LEGACY_FREEZE`** | `180` days | Engineering Director | Wildcard `*` across frozen legacy modules |

---

## 2. Deterministic Vector SVG & Graphviz DOT Exporters (`vector_graph.exporter.ts`)

`src/plugins/exporters/vector_graph.exporter.ts` exports pure-string vector diagrams directly from the active HUD view (`BUTTERFLY`, `CONTROL_FLOW`, or `DATA_FLOW`) without DOM serialization dependencies:

* **Theme-Aware SVG (`exportVectorSvgGraph`):** Generates standalone `<svg>` documents styled with the active `HUD_THEME_PRESETS` palette (`OBSIDIAN_CYBER`, `AMBER_VECTREX`, `PHOSPHOR_GREEN`, `SWISS_PAPER`, `BAUHAUS_DRAFT`, `SOLAR_PARCHMENT`).
* **Graphviz DOT (`exportGraphvizDotGraph`):** Emits canonical `digraph Chronos_<VIEW>` definitions with `rankdir=LR`, basic-block transitions for `CONTROL_FLOW`, use-def hop edges for `DATA_FLOW`, and `Ca / Ce` edges for `BUTTERFLY`.

---

## 3. Offline HTML & CSV Compliance Audit Reports (`compliance_report.exporter.ts`)

`src/plugins/exporters/compliance_report.exporter.ts` pairs active unsuppressed `CHR-001 .. CHR-016` violations with signed `annotations` deviation trails:

* **Self-Contained HTML Audit Report (`exportComplianceHtmlReport`):** Produces a single-file offline HTML document summarizing workspace health, HIS safety thresholds (`CYCLOMATIC_STRICT_MAX`), active violations, and signed deviation approvals.
* **RFC-4180 CSV Compliance Export (`exportComplianceCsvReport`):** Emits escaped CSV rows (`VIOLATION` and `DEVIATION_ATN`) for direct import into enterprise GRC and safety-certification spreadsheets.
