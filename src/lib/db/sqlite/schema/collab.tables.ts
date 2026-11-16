/**
 * @author Oblx <code@oblx.dev>
 * @description Drizzle ORM SQLite tables for Social Graph Friendships (user_friendships) and Multi-Scope Collaboration Invites (collab_invites) (v1.7.1).
 */
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const FRIENDSHIP_STATUSES = {
	PENDING: 'PENDING',
	ACCEPTED: 'ACCEPTED',
	DECLINED: 'DECLINED',
	BLOCKED: 'BLOCKED',
} as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[keyof typeof FRIENDSHIP_STATUSES];

export const COLLAB_SCOPES = {
	WORKSPACE: 'WORKSPACE',
	FULL_APP: 'FULL_APP',
} as const;
export type CollabScopeKind = (typeof COLLAB_SCOPES)[keyof typeof COLLAB_SCOPES];

export const COLLAB_INVITE_STATUSES = {
	PENDING: 'PENDING',
	ACCEPTED: 'ACCEPTED',
	DECLINED: 'DECLINED',
	OVERRIDDEN: 'OVERRIDDEN',
	EXPIRED: 'EXPIRED',
} as const;
export type CollabInviteStatus = (typeof COLLAB_INVITE_STATUSES)[keyof typeof COLLAB_INVITE_STATUSES];

export const userFriendships = sqliteTable('user_friendships', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userLowId: integer('user_low_id').notNull(),
	userHighId: integer('user_high_id').notNull(),
	initiatorUserId: integer('initiator_user_id').notNull(),
	status: text('status').$type<FriendshipStatus>().notNull().default(FRIENDSHIP_STATUSES.PENDING),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
}, (t) => [
	uniqueIndex('uf_pair_uniq_idx').on(t.userLowId, t.userHighId),
	index('uf_low_idx').on(t.userLowId),
	index('uf_high_idx').on(t.userHighId),
]);

export const collabInvites = sqliteTable('collab_invites', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	fromUserId: integer('from_user_id').notNull(),
	toUserId: integer('to_user_id').notNull(),
	scopeKind: text('scope_kind').$type<CollabScopeKind>().notNull().default(COLLAB_SCOPES.WORKSPACE),
	projectId: integer('project_id').notNull().default(1),
	clusterId: text('cluster_id').notNull(),
	status: text('status').$type<CollabInviteStatus>().notNull().default(COLLAB_INVITE_STATUSES.PENDING),
	overrideByUserId: integer('override_by_user_id'),
	expiresAt: integer('expires_at').notNull(),
	createdAt: integer('created_at').notNull(),
}, (t) => [
	index('ci_to_user_idx').on(t.toUserId, t.status),
	index('ci_from_user_idx').on(t.fromUserId),
	index('ci_cluster_idx').on(t.clusterId),
]);

export type DrizzleFriendshipRow = typeof userFriendships.$inferSelect;
export type DrizzleCollabInviteRow = typeof collabInvites.$inferSelect;
