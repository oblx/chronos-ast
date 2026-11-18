# 04-06 // Forge-Agnostic Git Smart HTTP v1/v2 & Packfile Ingestor

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/plugins/ingestors/git.url.ts`, `src/plugins/ingestors/git.ingestor.ts`, `src/plugins/ingestors/git_pack.parser.ts`

---

## 1. Multi-Forge URL Canonicalization & Smart HTTP Negotiation

Chronos parses arbitrary HTTPS repository endpoints across public SaaS forges and self-hosted Git servers without native `git` CLI binaries:

* **Supported Forges & Hosts:** GitHub, GitLab (nested subgroups), Bitbucket, Codeberg, Forgejo, Gitea, SourceHut (`git.sr.ht/~user/repo`), and custom self-hosted HTTPS origins with explicit ports or deep group paths.
* **SSRF-Safe Remote Normalization (`parseRemoteGitUrl`):** Strips trailing `.git` suffixes cleanly, validates `https:` origin constraints via `net.guard.ts`, and preserves branch/tag `ref` selection.
* **Smart HTTP v2-to-v1 Fallback:** Probes `/info/refs?service=git-upload-pack` with `Git-Protocol: version=2` headers (`ls-refs` + `fetch`), transparently falling back to Smart HTTP v1 `want` pkt-line negotiation when legacy remotes return capability ads directly.

---

## 2. Pure-TypeScript PACKv2 Inflation & Delta Reconstruction

* **Streaming `PACK` Parser (`git_pack.parser.ts`):** Inflates zlib-compressed `commit`, `tree`, `blob`, `OFS_DELTA`, and `REF_DELTA` objects using pure Web/Bun `DecompressionStream` (`deflate`).
* **Iterative Git Delta Reconstruction:** Applies Git copy-and-insert instructions across $N$ packed objects so reconstructed source files of length $L$ verify against expected SHA-1 object headers with $O(L)$ linear memory.
* **Bounded AST Snapshot Materialization:** Filters binary files and oversized artifacts before routing clean `SourceFileUnit[]` arrays straight into the Chronos polyglot scope-stack indexer and SQLite/IDB storage.
