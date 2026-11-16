# 04-05 // Git Smart HTTP v2 Packfile Ingestor & Automated PR Publisher

> **Author:** `Oblx <code@oblx.dev>` | **Version:** `1.9.0` | **Parent:** [`../00-index.md`](../00-index.md)

---

## 1. Zero-Shell Git Smart HTTP v2 Packfile Negotiation

The remote ingestion pipeline (`src/plugins/ingestors/git.ingestor.ts` and `src/server/http/git.route.ts`) fetches and unpacks remote Git repositories directly in memory without spawning external `git` shell processes or writing temporary working trees to disk.

$$|\text{Packfile}| \le 32\text{ MiB}, \quad |\text{Blob}| \le 2\text{ MiB}, \quad N_{\text{files}} \le 400$$

* **Ref Discovery & Shallow Negotiation:** Queries `info/refs?service=git-upload-pack` over HTTPS after passing the 4-stage SSRF guard (`src/core/security/guards/net.guard.ts`), then negotiates a `depth 1` shallow packfile via `git-upload-pack` pkt-line framing.
* **Binary Packfile v2 Parser:** Verifies the `PACK` magic signature (`0x5041434b`) and version `2`, inflates zlib object streams (`OBJ_COMMIT`, `OBJ_TREE`, `OBJ_BLOB`, `OBJ_OFS_DELTA`, `OBJ_REF_DELTA`), and reconstructs the repository file tree in memory.
* **Vault-Backed Credential Injection:** Optional Personal Access Tokens (PATs) are resolved server-side from the write-only AEAD AES-256-GCM vault (`src/core/security/vault.crypto.ts`) by `secretId` and scrubbed from all logs and error responses.

| Guardrail Parameter | Enforced Limit | Enforcement Module |
| :--- | :--- | :--- |
| **Packfile Stream Cap** | `32 MiB` (`33,554,432` bytes) | `GIT_INGESTION_LIMITS.MAX_PACKFILE_BYTES` |
| **Single Blob Unpack Cap** | `2 MiB` (`2,097,152` bytes) | `GIT_INGESTION_LIMITS.MAX_UNPACKED_BLOB_BYTES` |
| **Indexed Source File Cap** | `400` source files per snapshot | `GIT_INGESTION_LIMITS.MAX_SOURCE_FILES` |

---

## 2. Automated Architectural Pull Request Publisher & SARIF Bridge

When architectural violations (`CHR-001`..`CHR-017`) or signed deviation records require upstream remediation, the Git PR Publisher (`src/core/git/git.pr_publisher.ts`) synthesizes a deterministic Pull Request deliverable bundle (`POST /api/projects/git-pr`).

$$\Delta_{\text{PR}} = (\text{Branch}_{\text{fix}}, \text{Commit}_{\text{SHA-256}}, \text{Diff}_{\text{unified}}, \text{SARIF}_{2.1.0})$$

* **Deterministic Patch Synthesis:** Generates a canonical unified diff header, remediation checklist, and SHA-256 commit digest summarizing all blocker/critical diagnostics and signed `Atn` deviation tickets.
* **Bi-Directional SARIF 2.1.0 & CI Export (`src/plugins/exporters/sarif.adapter.ts`):** Converts workspace CodeCheck findings into OASIS SARIF 2.1.0 JSON runs with exact physical line/column locations, rule metadata, and cyclomatic/coupling telemetry.
* **Gamification Integration (`GIT_FORGE_OPERATOR`):** Rewards operators across the `Packfile Ingestor`, `Pull Request Publisher`, and `SARIF Bridge Marshal` leveled achievement cards.
