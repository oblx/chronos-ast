# Security Policy & Zero-Trust Posture

> **Security Contact:** `Oblx <code@oblx.dev>` | **Architecture Reference:** [`docs/01-architecture/04-security-rbac-vault.md`](./docs/01-architecture/04-security-rbac-vault.md)

## 1. Supported Versions

| Version Series | Status | Security Posture |
| :--- | :--- | :--- |
| `1.9.x` | Supported | Dual-Spine Observable Wire DAG, AEAD Vault, `u32` RBAC, Tamper-Evident Audit Chain |
| `< 1.9.0` | End of Support | Upgrade to `1.9.3` or later |

## 2. Cryptographic & Access-Control Guarantees

* **Authentication:** Local operator credentials use Argon2id hashing paired with versioned server peppers (`CHRONOS_AUTH_PEPPER_V1` / `V2`), constant-time verification, and rotating refresh tokens with replay-family revocation.
* **Authorization (`u32` RBAC):** Capabilities resolve deterministically via `$M_{\mathrm{eff}} = ((\text{Role} \cup \text{Allow}) \setminus \text{Deny}) \cap \text{PAT\_Scope}$`.
* **Write-Only AEAD Vault (`secrets_vault`):** Stored secrets use HKDF-SHA256 + AES-256-GCM bound via AAD (`ownerId:secretId:keyVersion`). Plaintext secret values are never returned over REST, WebSocket, or MCP endpoints.
* **Signed Outbound Webhooks (`webhook.bridge.ts`):** Webhook deliveries redact sensitive payload tokens, enforce SSRF CIDR blocking (loopback strictly opt-in for local development via `CHRONOS_ALLOW_LOCAL_WEBHOOK=true`), and sign payloads using `HMAC-SHA256` in `X-Chronos-Signature`.

## 3. Responsible Vulnerability Reporting

Please report suspected vulnerabilities privately to `code@oblx.dev` with reproduction steps, affected endpoint or module, and impact summary. Do not open public issues with exploit payloads, credentials, or unredacted session artifacts.
