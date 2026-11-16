/**
 * @author Oblx <code@oblx.dev>
 * @description Modular SQLite DDL scripts for core metamodel, u32 projects & project_members, Multi-Source OAuth, and Chronos RBAC tables.
 */

export const METAMODEL_DDL = `
CREATE TABLE IF NOT EXISTS projects (
	id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, short_code TEXT NOT NULL,
	project_identity_key TEXT NOT NULL DEFAULT 'core:chronos-core',
	name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', owner_id INTEGER NOT NULL DEFAULT 1,
	visibility TEXT NOT NULL DEFAULT 'INTERNAL', default_branch TEXT NOT NULL DEFAULT 'main',
	indexed_files_count INTEGER NOT NULL DEFAULT 0, entity_count INTEGER NOT NULL DEFAULT 0,
	violation_count INTEGER NOT NULL DEFAULT 0, snapshot_revision INTEGER NOT NULL DEFAULT 1,
	active_hlc_timestamp TEXT NOT NULL DEFAULT '',
	source_map_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS project_identity_idx ON projects(project_identity_key);
CREATE INDEX IF NOT EXISTS project_owner_idx ON projects(owner_id);
CREATE INDEX IF NOT EXISTS project_vis_idx ON projects(visibility);
INSERT OR IGNORE INTO projects (id, slug, short_code, project_identity_key, name, description, owner_id, visibility, default_branch, indexed_files_count, entity_count, violation_count, snapshot_revision, active_hlc_timestamp, source_map_json, created_at, updated_at)
VALUES (1, 'chronos-core', 'CHR-CORE', 'core:chronos-core', 'Chronos Core Workspace', 'Primary Chronos Metamodel & HUD Engine', 1, 'INTERNAL', 'main', 11, 135, 0, 1, '', '{}', 1700000000000, 1700000000000);

CREATE TABLE IF NOT EXISTS project_members (
	id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	user_id INTEGER NOT NULL, group_id INTEGER NOT NULL DEFAULT 2, personal_override_mask INTEGER NOT NULL DEFAULT 0, joined_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS proj_member_uniq_idx ON project_members(project_id, user_id);
CREATE INDEX IF NOT EXISTS proj_member_user_idx ON project_members(user_id);

CREATE TABLE IF NOT EXISTS workspaces (
	id TEXT PRIMARY KEY, owner_id TEXT NOT NULL DEFAULT 'guest', name TEXT NOT NULL,
	updated_at INTEGER NOT NULL, indexed_files_count INTEGER NOT NULL, source_map_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS workspace_name_idx ON workspaces(name);
CREATE INDEX IF NOT EXISTS workspace_owner_idx ON workspaces(owner_id);

CREATE TABLE IF NOT EXISTS entities (
	id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER DEFAULT 1 REFERENCES projects(id) ON DELETE CASCADE,
	uuid TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, name TEXT NOT NULL, qualified_name TEXT NOT NULL, file_id INTEGER,
	line_start INTEGER NOT NULL, col_start INTEGER NOT NULL, line_end INTEGER NOT NULL, col_end INTEGER NOT NULL, checksum TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS entity_qualified_name_idx ON entities(qualified_name);
CREATE INDEX IF NOT EXISTS entity_kind_idx ON entities(kind);
CREATE INDEX IF NOT EXISTS entity_proj_idx ON entities(project_id);

CREATE TABLE IF NOT EXISTS "references" (
	id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER DEFAULT 1 REFERENCES projects(id) ON DELETE CASCADE,
	kind TEXT NOT NULL, source_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
	target_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE, line INTEGER NOT NULL, "column" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ref_source_idx ON "references"(source_entity_id);
CREATE INDEX IF NOT EXISTS ref_target_idx ON "references"(target_entity_id);
CREATE INDEX IF NOT EXISTS ref_kind_idx ON "references"(kind);

CREATE TABLE IF NOT EXISTS metrics (
	id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER DEFAULT 1 REFERENCES projects(id) ON DELETE CASCADE,
	entity_id INTEGER NOT NULL UNIQUE REFERENCES entities(id) ON DELETE CASCADE,
	loc INTEGER NOT NULL, cyclomatic_complexity INTEGER NOT NULL, halstead_volume INTEGER NOT NULL,
	afferent_coupling INTEGER NOT NULL, efferent_coupling INTEGER NOT NULL, instability INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS source_units (
	id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER DEFAULT 1 REFERENCES projects(id) ON DELETE CASCADE,
	file_id INTEGER NOT NULL, file_path TEXT NOT NULL UNIQUE, language TEXT NOT NULL, line_count INTEGER NOT NULL, content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS annotations (
	id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER DEFAULT 1 REFERENCES projects(id) ON DELETE CASCADE,
	entity_kind TEXT NOT NULL, qualified_name TEXT NOT NULL, tag_kind TEXT NOT NULL, rule_code TEXT,
	template_id TEXT, reviewer TEXT, ticket_id TEXT, expires_at INTEGER, note TEXT NOT NULL, author TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS annotation_qname_idx ON annotations(entity_kind, qualified_name);
`;

export const SECURITY_DDL = `
CREATE TABLE IF NOT EXISTS rbac_groups (
	id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
	weight INTEGER NOT NULL DEFAULT 0, parent_group_id INTEGER, default_mask INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS rbac_group_weight_idx ON rbac_groups(weight);
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY, uid INTEGER NOT NULL DEFAULT 1, username TEXT NOT NULL UNIQUE, slug TEXT NOT NULL DEFAULT 'operator', email TEXT,
	display_name TEXT NOT NULL DEFAULT 'Operator', avatar_url TEXT, primary_group_id INTEGER NOT NULL DEFAULT 3, time_logged_sec INTEGER NOT NULL DEFAULT 0,
	last_login_at INTEGER NOT NULL DEFAULT 0, principal_kind TEXT NOT NULL, role_id TEXT NOT NULL, grant_mask INTEGER NOT NULL DEFAULT 0, deny_mask INTEGER NOT NULL DEFAULT 0, device_pub_key_jwk TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS user_uid_idx ON users(uid);
CREATE INDEX IF NOT EXISTS user_slug_idx ON users(slug);
CREATE INDEX IF NOT EXISTS user_primary_group_idx ON users(primary_group_id);
CREATE TABLE IF NOT EXISTS user_auth_identities (
	id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, user_key TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	auth_flow TEXT NOT NULL, provider_subject TEXT NOT NULL, credential_hash TEXT, salt TEXT, pepper_version INTEGER NOT NULL DEFAULT 0, scoped_mask INTEGER NOT NULL DEFAULT -1, last_used_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS uai_user_idx ON user_auth_identities(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uai_flow_subject_idx ON user_auth_identities(auth_flow, provider_subject);
CREATE TABLE IF NOT EXISTS rbac_user_groups (
	id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, group_id INTEGER NOT NULL REFERENCES rbac_groups(id) ON DELETE CASCADE, expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS rug_user_idx ON rbac_user_groups(user_id);
CREATE INDEX IF NOT EXISTS rug_group_idx ON rbac_user_groups(group_id);
CREATE TABLE IF NOT EXISTS rbac_permission_nodes (
	id INTEGER PRIMARY KEY AUTOINCREMENT, holder_kind TEXT NOT NULL, holder_id INTEGER NOT NULL,
	node_key TEXT NOT NULL, bit_index INTEGER NOT NULL, value INTEGER NOT NULL DEFAULT 1, workspace_context_id INTEGER, expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS rpn_holder_idx ON rbac_permission_nodes(holder_kind, holder_id);
CREATE INDEX IF NOT EXISTS rpn_node_idx ON rbac_permission_nodes(node_key);
CREATE TABLE IF NOT EXISTS credentials (
	id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, auth_source TEXT NOT NULL, identifier TEXT NOT NULL, salt_hex TEXT,
	password_hash TEXT, pepper_version INTEGER NOT NULL DEFAULT 1, public_key_cose TEXT, sign_count INTEGER NOT NULL DEFAULT 0, token_prefix TEXT, scoped_bitmask INTEGER NOT NULL DEFAULT -1, expires_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cred_user_idx ON credentials(user_id);
CREATE INDEX IF NOT EXISTS cred_ident_idx ON credentials(auth_source, identifier);
CREATE TABLE IF NOT EXISTS sessions (
	sid TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, family_id TEXT NOT NULL, generation INTEGER NOT NULL DEFAULT 1,
	refresh_digest TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sess_family_idx ON sessions(family_id);
CREATE INDEX IF NOT EXISTS sess_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS secrets_vault (
	id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, label TEXT NOT NULL, provider_kind TEXT NOT NULL,
	ciphertext_b64 TEXT NOT NULL, iv_b64 TEXT NOT NULL, last_four_chars TEXT NOT NULL, key_version INTEGER NOT NULL DEFAULT 1, rotated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_owner_idx ON secrets_vault(owner_id);
CREATE TABLE IF NOT EXISTS sync_operations (
	op_id TEXT PRIMARY KEY, project_id INTEGER NOT NULL DEFAULT 1, hlc_physical_ms INTEGER NOT NULL, hlc_logical_counter INTEGER NOT NULL,
	principal_id TEXT NOT NULL, entity_qualified_name TEXT NOT NULL, op_kind TEXT NOT NULL, payload_json TEXT NOT NULL, entry_hash TEXT NOT NULL, conflict_flag INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_hlc_idx ON sync_operations(hlc_physical_ms, hlc_logical_counter);
CREATE TABLE IF NOT EXISTS audit_log (
	seq INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, event_kind TEXT NOT NULL, severity TEXT NOT NULL, detail TEXT NOT NULL, prev_hash TEXT NOT NULL, row_hash TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS user_friendships (
	id INTEGER PRIMARY KEY AUTOINCREMENT, user_low_id INTEGER NOT NULL, user_high_id INTEGER NOT NULL, initiator_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uf_pair_uniq_idx ON user_friendships(user_low_id, user_high_id);
CREATE INDEX IF NOT EXISTS uf_low_idx ON user_friendships(user_low_id);
CREATE INDEX IF NOT EXISTS uf_high_idx ON user_friendships(user_high_id);
CREATE TABLE IF NOT EXISTS collab_invites (
	id INTEGER PRIMARY KEY AUTOINCREMENT, from_user_id INTEGER NOT NULL, to_user_id INTEGER NOT NULL, scope_kind TEXT NOT NULL DEFAULT 'WORKSPACE',
	project_id INTEGER NOT NULL DEFAULT 1, cluster_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', override_by_user_id INTEGER, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ci_to_user_idx ON collab_invites(to_user_id, status);
`;
