/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.8.0 Security Registry: u32 CAPABILITY_BITS, Chronos RBAC nodes/groups, Restricted Guest Demo Mask (0x000001C1), OAuth flows, and DEVMODE accounts.
 */

export const CAPABILITY_BITS = {
	WORKSPACE_READ: 0x00000001, WORKSPACE_CREATE: 0x00000002, WORKSPACE_INDEX_LOCAL: 0x00000004, WORKSPACE_INGEST_ARCHIVE: 0x00000008,
	WORKSPACE_INGEST_REMOTE: 0x00000010, WORKSPACE_DELETE: 0x00000020, METAMODEL_QUERY: 0x00000040, SOURCE_SPAN_VIEW: 0x00000080,
	CFG_STEPPER_EXEC: 0x00000100, CODECHECK_RUN: 0x00000200, COMPARE_DIFF_EXEC: 0x00000400, EXPORT_ARTIFACTS: 0x00000800,
	ANNOTATION_READ: 0x00001000, ANNOTATION_WRITE: 0x00002000, DEVIATION_SIGN_OFF: 0x00004000, RULE_PROFILE_MUTATE: 0x00008000,
	AUDIT_LOG_READ: 0x00010000, MEMGRAPH_BOLT_QUERY: 0x00020000, AI_BRIDGE_INVOKE: 0x00040000, MCP_SERVER_BIND: 0x00080000,
	WATCHER_DAEMON_CONTROL: 0x00100000, VAULT_SECRET_USE: 0x00200000, VAULT_SECRET_WRITE: 0x00400000, SYNC_PUSH: 0x00800000,
	SYNC_PULL: 0x01000000, SYNC_CONFLICT_OVERRIDE: 0x02000000, COLLAB_OVERRIDE: 0x02000000, SESSION_REVOKE_OWN: 0x04000000, SESSION_REVOKE_ANY: 0x08000000,
	ADMIN_WIRE_OBSERVE: 0x10000000, USER_ROLE_ASSIGN: 0x10000000, AUTH_SOURCE_CONFIG: 0x20000000, PEPPER_KEY_ROTATE: 0x40000000, SYSTEM_LOCKDOWN: 0x80000000,
} as const;
export type CapabilityKey = keyof typeof CAPABILITY_BITS;
export type CapabilityMask = number;

export const CHRONOS_RBAC_NODES: Readonly<Record<CapabilityKey, string>> = {
	WORKSPACE_READ: 'chronos.workspace.read', WORKSPACE_CREATE: 'chronos.workspace.create',
	WORKSPACE_INDEX_LOCAL: 'chronos.workspace.index', WORKSPACE_INGEST_ARCHIVE: 'chronos.workspace.ingest.archive',
	WORKSPACE_INGEST_REMOTE: 'chronos.workspace.ingest.remote', WORKSPACE_DELETE: 'chronos.workspace.delete',
	METAMODEL_QUERY: 'chronos.metamodel.query', SOURCE_SPAN_VIEW: 'chronos.source.view',
	CFG_STEPPER_EXEC: 'chronos.cfg.stepper', CODECHECK_RUN: 'chronos.codecheck.run',
	COMPARE_DIFF_EXEC: 'chronos.compare.diff', EXPORT_ARTIFACTS: 'chronos.export.artifacts',
	ANNOTATION_READ: 'chronos.annotation.read', ANNOTATION_WRITE: 'chronos.annotation.write',
	DEVIATION_SIGN_OFF: 'chronos.deviation.signoff', RULE_PROFILE_MUTATE: 'chronos.rules.mutate',
	AUDIT_LOG_READ: 'chronos.audit.read', MEMGRAPH_BOLT_QUERY: 'chronos.memgraph.query',
	AI_BRIDGE_INVOKE: 'chronos.ai.invoke', MCP_SERVER_BIND: 'chronos.mcp.bind',
	WATCHER_DAEMON_CONTROL: 'chronos.watcher.control', VAULT_SECRET_USE: 'chronos.vault.use',
	VAULT_SECRET_WRITE: 'chronos.vault.write', SYNC_PUSH: 'chronos.collab.realtime',
	SYNC_PULL: 'chronos.collab.join', SYNC_CONFLICT_OVERRIDE: 'chronos.collab.override', COLLAB_OVERRIDE: 'chronos.collab.override',
	SESSION_REVOKE_OWN: 'chronos.session.revoke.own', SESSION_REVOKE_ANY: 'chronos.session.revoke.any',
	ADMIN_WIRE_OBSERVE: 'chronos.admin.wire.observe', USER_ROLE_ASSIGN: 'chronos.admin.rbac', AUTH_SOURCE_CONFIG: 'chronos.admin.oauth',
	PEPPER_KEY_ROTATE: 'chronos.admin.pepper', SYSTEM_LOCKDOWN: 'chronos.admin.lockdown',
} as const;

export interface CapabilityDescriptor {
	readonly bit: number; readonly mask: number; readonly key: CapabilityKey; readonly label: string; readonly nodeKey: string;
}

export const CAPABILITY_REGISTER: readonly CapabilityDescriptor[] = (Object.keys(CAPABILITY_BITS) as CapabilityKey[])
	.filter((key) => key !== 'COLLAB_OVERRIDE' && key !== 'USER_ROLE_ASSIGN')
	.map((key, bit) => ({
		bit, mask: CAPABILITY_BITS[key] >>> 0, key, label: key.toLowerCase().replace(/_/g, ' '), nodeKey: CHRONOS_RBAC_NODES[key],
	}));

export const MUTATION_MASK = (
	CAPABILITY_BITS.WORKSPACE_CREATE | CAPABILITY_BITS.WORKSPACE_INDEX_LOCAL | CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE |
	CAPABILITY_BITS.WORKSPACE_INGEST_REMOTE | CAPABILITY_BITS.WORKSPACE_DELETE | CAPABILITY_BITS.ANNOTATION_WRITE |
	CAPABILITY_BITS.DEVIATION_SIGN_OFF | CAPABILITY_BITS.RULE_PROFILE_MUTATE | CAPABILITY_BITS.WATCHER_DAEMON_CONTROL |
	CAPABILITY_BITS.VAULT_SECRET_WRITE | CAPABILITY_BITS.SYNC_PUSH | CAPABILITY_BITS.SYNC_CONFLICT_OVERRIDE |
	CAPABILITY_BITS.USER_ROLE_ASSIGN | CAPABILITY_BITS.AUTH_SOURCE_CONFIG | CAPABILITY_BITS.PEPPER_KEY_ROTATE
) >>> 0;

export const ROLE_IDS = {
	GUEST: 'ROLE_GUEST', VIEWER: 'ROLE_VIEWER', ANALYST: 'ROLE_ANALYST', AUDITOR: 'ROLE_AUDITOR', ADMIN: 'ROLE_ADMIN',
} as const;
export type RoleId = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];

export const ROLE_MASKS: Readonly<Record<RoleId, number>> = {
	ROLE_GUEST: 0x000001c1 >>> 0, ROLE_VIEWER: 0x01001dc1 >>> 0, ROLE_ANALYST: 0x05fe3fff >>> 0,
	ROLE_AUDITOR: 0x1701dfff >>> 0, ROLE_ADMIN: 0xffffffff >>> 0,
} as const;

export const CHRONOS_RBAC_GROUPS = [
	{ id: 1, name: 'guest', roleId: ROLE_IDS.GUEST, displayName: 'Demo Guest', weight: 0, parentGroupId: null, defaultMask: ROLE_MASKS.ROLE_GUEST },
	{ id: 2, name: 'viewer', roleId: ROLE_IDS.VIEWER, displayName: 'Read-Only Viewer', weight: 10, parentGroupId: 1, defaultMask: ROLE_MASKS.ROLE_VIEWER },
	{ id: 3, name: 'analyst', roleId: ROLE_IDS.ANALYST, displayName: 'Architecture Analyst', weight: 50, parentGroupId: 2, defaultMask: ROLE_MASKS.ROLE_ANALYST },
	{ id: 4, name: 'auditor', roleId: ROLE_IDS.AUDITOR, displayName: 'Compliance Auditor', weight: 75, parentGroupId: 2, defaultMask: ROLE_MASKS.ROLE_AUDITOR },
	{ id: 5, name: 'admin', roleId: ROLE_IDS.ADMIN, displayName: 'Sovereign Administrator', weight: 100, parentGroupId: 3, defaultMask: ROLE_MASKS.ROLE_ADMIN },
	{ id: 6, name: 'root', roleId: ROLE_IDS.ADMIN, displayName: 'Root Principal', weight: 1000, parentGroupId: 5, defaultMask: ROLE_MASKS.ROLE_ADMIN },
] as const;

export const PRINCIPAL_KINDS = { GUEST: 'GUEST', USER: 'USER', SERVICE_PAT: 'SERVICE_PAT' } as const;
export type PrincipalKind = (typeof PRINCIPAL_KINDS)[keyof typeof PRINCIPAL_KINDS];

export interface PrincipalPostureMeta {
	readonly kind: PrincipalKind; readonly badgePrefix: string; readonly demoTag: string;
	readonly syncBadge: string; readonly ctaLabel: string; readonly accentVar: string;
	readonly borderClass: string; readonly textClass: string;
}

export const PRINCIPAL_POSTURE_META: Readonly<Record<PrincipalKind, PrincipalPostureMeta>> = {
	GUEST: { kind: PRINCIPAL_KINDS.GUEST, badgePrefix: 'GUEST SANDBOX', demoTag: 'DEMO MODE', syncBadge: 'LOCAL ONLY', ctaLabel: 'Unlock Full Studio ->', accentVar: 'var(--hud-accent-secondary)', borderClass: 'border-[var(--hud-accent-secondary)]', textClass: 'text-[var(--hud-accent-secondary)]' },
	USER: { kind: PRINCIPAL_KINDS.USER, badgePrefix: 'OP //', demoTag: 'VERIFIED', syncBadge: 'SYNC', ctaLabel: 'Identity Lobby', accentVar: 'var(--hud-accent-primary)', borderClass: 'border-[var(--hud-accent-primary)]', textClass: 'text-[var(--hud-accent-primary)]' },
	SERVICE_PAT: { kind: PRINCIPAL_KINDS.SERVICE_PAT, badgePrefix: 'PAT //', demoTag: 'SCOPED TOKEN', syncBadge: 'SYNC', ctaLabel: 'Identity Lobby', accentVar: 'var(--hud-accent-primary)', borderClass: 'border-[var(--hud-accent-primary)]', textClass: 'text-[var(--hud-accent-primary)]' },
} as const;

export const SEEDED_OPERATOR_CONFIG = {
	USER_ID: '1', UID: 1, USERNAME: 'oblx', LEGACY_USERNAME: 'architect', EMAIL: 'code@oblx.dev', DISPLAY_NAME: 'Oblx Sovereign Admin',
	DEFAULT_PASSWORD: 'nopenope', LEGACY_PASSWORD: 'chronos-architect-v2',
	ONLINE_ROLE_ID: ROLE_IDS.ADMIN, ONLINE_MASK: ROLE_MASKS.ROLE_ADMIN, OFFLINE_ROLE_ID: ROLE_IDS.ADMIN, OFFLINE_MASK: ROLE_MASKS.ROLE_ADMIN,
	DEV_ACCOUNTS: [
		{ uid: 1, username: 'oblx', password: 'nopenope', email: 'code@oblx.dev', displayName: 'Oblx Admin', groupName: 'admin', groupId: 5, roleId: ROLE_IDS.ADMIN, mask: ROLE_MASKS.ROLE_ADMIN },
		{ uid: 2, username: 'analyst_dev', password: 'dev-analyst-password', email: 'analyst@oblx.dev', displayName: 'Dev Analyst', groupName: 'analyst', groupId: 3, roleId: ROLE_IDS.ANALYST, mask: ROLE_MASKS.ROLE_ANALYST },
		{ uid: 3, username: 'auditor_dev', password: 'dev-auditor-password', email: 'auditor@oblx.dev', displayName: 'Dev Auditor', groupName: 'auditor', groupId: 4, roleId: ROLE_IDS.AUDITOR, mask: ROLE_MASKS.ROLE_AUDITOR },
		{ uid: 4, username: 'viewer_dev', password: 'dev-viewer-password', email: 'viewer@oblx.dev', displayName: 'Dev Viewer', groupName: 'viewer', groupId: 2, roleId: ROLE_IDS.VIEWER, mask: ROLE_MASKS.ROLE_VIEWER },
	] as const,
} as const;

export const AUTH_SOURCES = {
	LOCAL_PASSWORD: 'LOCAL_PASSWORD', GITHUB_OAUTH2: 'GITHUB_OAUTH2', GOOGLE_OAUTH2: 'GOOGLE_OAUTH2',
	WEBAUTHN_PASSKEY: 'WEBAUTHN_PASSKEY', OIDC_OAUTH2_PKCE: 'OIDC_OAUTH2_PKCE', PAT_API_TOKEN: 'PAT_API_TOKEN',
} as const;
export type AuthSourceKind = (typeof AUTH_SOURCES)[keyof typeof AUTH_SOURCES];

export const SYNC_POSTURES = {
	VERIFIED: 'VERIFIED', OFFLINE_QUEUED: 'OFFLINE_QUEUED', OFFLINE_VERIFIED: 'OFFLINE_VERIFIED', LOCKDOWN: 'LOCKDOWN', REPLAY_ALERT: 'REPLAY_ALERT',
} as const;
export type SyncPosture = (typeof SYNC_POSTURES)[keyof typeof SYNC_POSTURES];

export const CRYPTO_CONSTANTS = {
	ARGON2_MEMORY_COST: 65536, ARGON2_TIME_COST: 3, SALT_BYTES: 16, PEPPER_BYTES: 32,
	PEPPER_DEV_FALLBACK: 'chronos-dev-pepper-v1-do-not-use-in-prod-32b',
	KEK_DEV_FALLBACK: 'chronos-dev-master-kek-32bytes-!!', SESSION_DEV_FALLBACK: 'chronos-dev-session-hmac-secret-!',
	HKDF_SALT: 'chronos-hkdf-salt-v2', HKDF_INFO_PREFIX: 'vault-aead-dek-v',
	AES_GCM_IV_BYTES: 12, ACCESS_TOKEN_TTL_SEC: 900, REFRESH_TOKEN_TTL_SEC: 2592000,
	CHALLENGE_TTL_MS: 60000, PKCE_VERIFIER_BYTES: 96, PAT_PREFIX: 'chr_live_', PAT_PREFIX_LEN: 12,
	AUDIT_GENESIS_HASH: '0000000000000000000000000000000000000000000000000000000000000000',
	DUMMY_ARGON2_HASH: '$argon2id$v=19$m=65536,t=3,p=1$Y2hyb25vc2R1bW15c2FsdA$pR4k1mZ0q9G8vC6W5tN3xY7bL2hQ4wE8rT0uI6oP2sA',
} as const;

export const HTTP_SECURITY_CONSTANTS = {
	REFRESH_COOKIE_NAME: '__Host-chronos_rt', OAUTH_COOKIE_NAME: '__Host-chronos_oauth', CSRF_HEADER: 'x-chronos-csrf',
	RATE_LIMIT_MAX_ATTEMPTS: 5, RATE_LIMIT_WINDOW_MS: 60000,
	CSP_POLICY: "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
	RESPONSE_HEADERS: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' } as const,
	MAX_REDIRECT_HOPS: 3,
} as const;

export const CLUSTER_SEAT_CAPS: Readonly<Record<RoleId, number>> = { ROLE_GUEST: 2, ROLE_VIEWER: 2, ROLE_ANALYST: 4, ROLE_AUDITOR: 6, ROLE_ADMIN: 8 } as const;
export function resolveClusterSeatCap(roleId: string): number { return CLUSTER_SEAT_CAPS[roleId as RoleId] ?? CLUSTER_SEAT_CAPS.ROLE_VIEWER; }

export const PKZIP_BOMB_LIMITS = { MAX_ARCHIVE_COMPRESSED_BYTES: 25 * 1024 * 1024, MAX_ARCHIVE_UNCOMPRESSED_BYTES: 128 * 1024 * 1024, MAX_COMPRESSION_RATIO: 100, MAX_ARCHIVE_ENTRIES: 5000 } as const;
export const VAULT_PROVIDER_KINDS = { GITHUB_PAT: 'GITHUB_PAT', GITLAB_PAT: 'GITLAB_PAT', GITEA_PAT: 'GITEA_PAT', OPENAI_API_KEY: 'OPENAI_API_KEY', ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY', CUSTOM_TOKEN: 'CUSTOM_TOKEN' } as const;
export type VaultProviderKind = (typeof VAULT_PROVIDER_KINDS)[keyof typeof VAULT_PROVIDER_KINDS];

export const HLC_SYNC_CONSTANTS = { OP_KINDS: { WORKSPACE_UPSERT: 'WORKSPACE_UPSERT', ANNOTATION_ADD: 'ANNOTATION_ADD', RULE_PROFILE_SET: 'RULE_PROFILE_SET' } as const, MAX_CLOCK_DRIFT_MS: 60000, IDB_SECURITY_DB: 'chronos_security_v2' } as const;
