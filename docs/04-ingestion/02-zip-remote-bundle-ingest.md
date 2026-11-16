# 04-02 // Multi-Source Ingestion: PKZIP, Remote URL & Bundles

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/core/metamodel/workspace/ingestion/`, `src/core/metamodel/workspace/manager/`

---

## 1. Universal Workspace Ingestion Pathways

Chronos is not limited to analyzing its own repository; any external codebase or snapshot can be ingested through four pathways in `WorkspaceImportModal.svelte` and `src/core/api/router.ts`:

| Ingestion Mode | Operation Constant | Input Payload | Target Service |
| :--- | :--- | :--- | :--- |
| **1. Binary `.ZIP` Upload** | `WORKSPACE_OPERATIONS.IMPORT_FILES` | PKZIP archive (`STORE` or `DEFLATE`) | `zip.extractor.ts` (`extractSourceFilesFromZip`) |
| **2. Remote URL Fetch** | `WORKSPACE_OPERATIONS.IMPORT_URL` | HTTPS URL to `.json`, `.zip`, or raw source | `remote.fetcher.ts` (`ingestFromRemoteUrl`) |
| **3. Multi-File Picker** | `WORKSPACE_OPERATIONS.IMPORT_FILES` | Multiple `.ts`, `.rs`, `.cpp`, `.svelte` files | `workspace.manager.ts` (`createWorkspaceFromSources`) |
| **4. Bundle JSON Paste** | `WORKSPACE_OPERATIONS.IMPORT` | Serialized `SerializedWorkspaceBundle` JSON | `workspace.serializer.ts` (`deserializeWorkspaceBundle`) |

---

## 2. Anti-Magic PKZIP Binary Extractor (`zip.extractor.ts`)

All PKZIP header signatures, compression method codes (`METHOD_STORE`, `METHOD_DEFLATE`), and header byte offsets (`OFFSET_VERSION`, `OFFSET_METHOD`, `OFFSET_COMPRESSED_SIZE`, `OFFSET_UNCOMPRESSED_SIZE`, `OFFSET_NAME_LEN`, `OFFSET_EXTRA_LEN`) reside strictly in `PKZIP_CONSTANTS` inside `src/config/constants.ts`:

* **Decompression:** Uncompressed entries (`METHOD_STORE`) are sliced directly; raw deflate entries (`METHOD_DEFLATE`) are inflated via `Bun.inflateSync` or the Web `DecompressionStream` API.
* **Path Filtering:** Automatically strips top-level archive wrapper directories, ignores `PKZIP_CONSTANTS.IGNORED_PATH_SEGMENTS`, and filters extensions against `FILE_EXTENSIONS_MAP`.
* **Synthetic Archive Generator:** `buildSyntheticZipArchive` constructs standards-compliant binary PKZIP archives for deterministic round-trip testing and sample project loading.

---

## 3. Remote URL Normalization (`remote.fetcher.ts`)

* **GitHub Blob Rewrite:** Automatically converts GitHub web blob URLs into raw content stream URLs before fetching.
* **Format Auto-Detection:** Dispatches `.zip` payloads to `extractSourceFilesFromZip`, Chronos `.json` bundles to `deserializeWorkspaceBundle`, and raw source files directly to the AST indexer.
