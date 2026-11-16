/**
 * @author Oblx <code@oblx.dev>
 * @description Drizzle ORM SQLite tables for Normalized u32 Identity, Multi-Source Auth Identities, Chronos RBAC (Groups, UserGroups, PermissionNodes), Sessions, AEAD Vault, HLC Sync, and Audit Chain.
 */
import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const rbacGroups = sqliteTable('rbac_groups', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	displayName: text('display_name').notNull(),
	weight: integer('weight').notNull().default(0),
	parentGroupId: integer('parent_group_id'),
	defaultMask: integer('default_mask').notNull().default(0),
}, (t) => [uniqueIndex('rbac_group_name_idx').on(t.name), index('rbac_group_weight_idx').on(t.weight)]);

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	uid: integer('uid').notNull().default(1),
	username: text('username').notNull(),
	slug: text('slug').notNull().default('operator'),
	email: text('email'),
	displayName: text('display_name').notNull().default('Operator'),
	avatarUrl: text('avatar_url'),
	primaryGroupId: integer('primary_group_id').notNull().default(3),
	timeLoggedSec: integer('time_logged_sec').notNull().default(0),
	lastLoginAt: integer('last_login_at').notNull().default(0),
	principalKind: text('principal_kind').notNull(),
	roleId: text('role_id').notNull(),
	grantMask: integer('grant_mask').notNull().default(0),
	denyMask: integer('deny_mask').notNull().default(0),
	devicePubKeyJwk: text('device_pub_key_jwk'),
	createdAt: integer('created_at').notNull(),
}, (t) => [
	uniqueIndex('user_username_idx').on(t.username),
	index('user_uid_idx').on(t.uid),
	index('user_slug_idx').on(t.slug),
	index('user_primary_group_idx').on(t.primaryGroupId),
]);

export const userAuthIdentities = sqliteTable('user_auth_identities', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	userKey: text('user_key').notNull().references(() => users.id, { onDelete: 'cascade' }),
	authFlow: text('auth_flow').notNull(),
	providerSubject: text('provider_subject').notNull(),
	credentialHash: text('credential_hash'),
	salt: text('salt'),
	pepperVersion: integer('pepper_version').notNull().default(0),
	scopedMask: integer('scoped_mask').notNull().default(-1),
	lastUsedAt: integer('last_used_at').notNull(),
}, (t) => [
	index('uai_user_idx').on(t.userId),
	uniqueIndex('uai_flow_subject_idx').on(t.authFlow, t.providerSubject),
]);

export const rbacUserGroups = sqliteTable('rbac_user_groups', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	groupId: integer('group_id').notNull().references(() => rbacGroups.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at'),
}, (t) => [index('rug_user_idx').on(t.userId), index('rug_group_idx').on(t.groupId)]);

export const rbacPermissionNodes = sqliteTable('rbac_permission_nodes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	holderKind: text('holder_kind').notNull(),
	holderId: integer('holder_id').notNull(),
	nodeKey: text('node_key').notNull(),
	bitIndex: integer('bit_index').notNull(),
	value: integer('value').notNull().default(1),
	workspaceContextId: integer('workspace_context_id'),
	expiresAt: integer('expires_at'),
}, (t) => [index('rpn_holder_idx').on(t.holderKind, t.holderId), index('rpn_node_idx').on(t.nodeKey)]);

export const credentials = sqliteTable('credentials', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	authSource: text('auth_source').notNull(),
	identifier: text('identifier').notNull(),
	saltHex: text('salt_hex'),
	passwordHash: text('password_hash'),
	pepperVersion: integer('pepper_version').notNull().default(1),
	publicKeyCose: text('public_key_cose'),
	signCount: integer('sign_count').notNull().default(0),
	tokenPrefix: text('token_prefix'),
	scopedBitmask: integer('scoped_bitmask').notNull().default(-1),
	expiresAt: integer('expires_at'),
	createdAt: integer('created_at').notNull(),
}, (t) => [index('cred_user_idx').on(t.userId), index('cred_ident_idx').on(t.authSource, t.identifier)]);

export const sessions = sqliteTable('sessions', {
	sid: text('sid').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	familyId: text('family_id').notNull(),
	generation: integer('generation').notNull().default(1),
	refreshDigest: text('refresh_digest').notNull(),
	revoked: integer('revoked').notNull().default(0),
	expiresAt: integer('expires_at').notNull(),
	createdAt: integer('created_at').notNull(),
}, (t) => [index('sess_family_idx').on(t.familyId), index('sess_user_idx').on(t.userId)]);

export const secretsVault = sqliteTable('secrets_vault', {
	id: text('id').primaryKey(),
	ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	label: text('label').notNull(),
	providerKind: text('provider_kind').notNull(),
	ciphertextB64: text('ciphertext_b64').notNull(),
	ivB64: text('iv_b64').notNull(),
	lastFourChars: text('last_four_chars').notNull(),
	keyVersion: integer('key_version').notNull().default(1),
	rotatedAt: integer('rotated_at').notNull(),
}, (t) => [index('vault_owner_idx').on(t.ownerId)]);

export const syncOperations = sqliteTable('sync_operations', {
	opId: text('op_id').primaryKey(),
	projectId: integer('project_id').notNull().default(1),
	hlcPhysicalMs: integer('hlc_physical_ms').notNull(),
	hlcLogicalCounter: integer('hlc_logical_counter').notNull(),
	principalId: text('principal_id').notNull(),
	entityQualifiedName: text('entity_qualified_name').notNull(),
	opKind: text('op_kind').notNull(),
	payloadJson: text('payload_json').notNull(),
	entryHash: text('entry_hash').notNull(),
	conflictFlag: integer('conflict_flag').notNull().default(0),
	createdAt: integer('created_at').notNull(),
}, (t) => [index('sync_hlc_idx').on(t.hlcPhysicalMs, t.hlcLogicalCounter), index('sync_proj_idx').on(t.projectId)]);

export const auditLog = sqliteTable('audit_log', {
	seq: integer('seq').primaryKey({ autoIncrement: true }),
	actorId: text('actor_id').notNull(),
	eventKind: text('event_kind').notNull(),
	severity: text('severity').notNull(),
	detail: text('detail').notNull(),
	prevHash: text('prev_hash').notNull(),
	rowHash: text('row_hash').notNull(),
	createdAt: integer('created_at').notNull(),
});
