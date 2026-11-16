/**
 * @author Oblx <code@oblx.dev>
 * @description Shared Drizzle ORM SQLite & Offline IndexedDB schema with normalized u32 projects, project_members, and projectId FKs (v2.2.0).
 */
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { ProjectVisibility } from '@config/constants';
import {
	ANNOTATION_KINDS, ENTITY_KINDS, REFERENCE_KINDS,
	type AnnotationKind, type EntityKind, type ReferenceKind, type SupportedLanguage,
} from '@config/metamodel.constants';
import type { DeviationTemplateId } from '@config/registries/annotation.templates';

export { ANNOTATION_KINDS, ENTITY_KINDS, REFERENCE_KINDS, type AnnotationKind, type EntityKind, type ReferenceKind };
export * from './security.tables';
export * from './theme.tables';
export * from './gamification.tables';
export * from './collab.tables';

export const projects = sqliteTable('projects', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull(),
	shortCode: text('short_code').notNull(),
	projectIdentityKey: text('project_identity_key').notNull().default('core:chronos-core'),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	ownerId: integer('owner_id').notNull().default(1),
	visibility: text('visibility').$type<ProjectVisibility>().notNull().default('INTERNAL'),
	defaultBranch: text('default_branch').notNull().default('main'),
	indexedFilesCount: integer('indexed_files_count').notNull().default(0),
	entityCount: integer('entity_count').notNull().default(0),
	violationCount: integer('violation_count').notNull().default(0),
	snapshotRevision: integer('snapshot_revision').notNull().default(1),
	activeHlcTimestamp: text('active_hlc_timestamp').notNull().default(''),
	sourceMapJson: text('source_map_json').notNull().default('{}'),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
}, (t) => [uniqueIndex('project_slug_idx').on(t.slug), index('project_identity_idx').on(t.projectIdentityKey), index('project_owner_idx').on(t.ownerId), index('project_vis_idx').on(t.visibility)]);

export const projectMembers = sqliteTable('project_members', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	userId: integer('user_id').notNull(),
	groupId: integer('group_id').notNull().default(2),
	personalOverrideMask: integer('personal_override_mask').notNull().default(0),
	joinedAt: integer('joined_at').notNull(),
}, (t) => [uniqueIndex('proj_member_uniq_idx').on(t.projectId, t.userId), index('proj_member_user_idx').on(t.userId)]);

export const workspaces = sqliteTable('workspaces', {
	id: text('id').primaryKey(),
	ownerId: text('owner_id').notNull().default('guest'),
	name: text('name').notNull(),
	updatedAt: integer('updated_at').notNull(),
	indexedFilesCount: integer('indexed_files_count').notNull(),
	sourceMapJson: text('source_map_json').notNull(),
}, (table) => [index('workspace_name_idx').on(table.name), index('workspace_owner_idx').on(table.ownerId)]);

export const entities = sqliteTable('entities', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	projectId: integer('project_id').default(1).references(() => projects.id, { onDelete: 'cascade' }),
	uuid: text('uuid').notNull(),
	kind: text('kind').$type<EntityKind>().notNull(),
	name: text('name').notNull(),
	qualifiedName: text('qualified_name').notNull(),
	fileId: integer('file_id'),
	lineStart: integer('line_start').notNull(),
	colStart: integer('col_start').notNull(),
	lineEnd: integer('line_end').notNull(),
	colEnd: integer('col_end').notNull(),
	checksum: text('checksum').notNull(),
}, (t) => [uniqueIndex('entity_uuid_idx').on(t.uuid), index('entity_qualified_name_idx').on(t.qualifiedName), index('entity_kind_idx').on(t.kind), index('entity_proj_idx').on(t.projectId)]);

export const references = sqliteTable('references', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	projectId: integer('project_id').default(1).references(() => projects.id, { onDelete: 'cascade' }),
	kind: text('kind').$type<ReferenceKind>().notNull(),
	sourceEntityId: integer('source_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
	targetEntityId: integer('target_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
	line: integer('line').notNull(),
	column: integer('column').notNull(),
}, (t) => [index('ref_source_idx').on(t.sourceEntityId), index('ref_target_idx').on(t.targetEntityId), index('ref_kind_idx').on(t.kind)]);

export const metrics = sqliteTable('metrics', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	projectId: integer('project_id').default(1).references(() => projects.id, { onDelete: 'cascade' }),
	entityId: integer('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
	loc: integer('loc').notNull(),
	cyclomaticComplexity: integer('cyclomatic_complexity').notNull(),
	halsteadVolume: integer('halstead_volume').notNull(),
	afferentCoupling: integer('afferent_coupling').notNull(),
	efferentCoupling: integer('efferent_coupling').notNull(),
	instability: integer('instability').notNull(),
}, (table) => [uniqueIndex('entity_metric_idx').on(table.entityId)]);

export const sourceUnits = sqliteTable('source_units', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	projectId: integer('project_id').default(1).references(() => projects.id, { onDelete: 'cascade' }),
	fileId: integer('file_id').notNull(),
	filePath: text('file_path').notNull(),
	language: text('language').$type<SupportedLanguage>().notNull(),
	lineCount: integer('line_count').notNull(),
	content: text('content').notNull(),
}, (table) => [uniqueIndex('source_unit_path_idx').on(table.filePath)]);

export const annotations = sqliteTable('annotations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	projectId: integer('project_id').default(1).references(() => projects.id, { onDelete: 'cascade' }),
	entityKind: text('entity_kind').$type<EntityKind>().notNull(),
	qualifiedName: text('qualified_name').notNull(),
	tagKind: text('tag_kind').$type<AnnotationKind>().notNull(),
	ruleCode: text('rule_code'),
	templateId: text('template_id').$type<DeviationTemplateId | null>(),
	reviewer: text('reviewer'),
	ticketId: text('ticket_id'),
	expiresAt: integer('expires_at'),
	note: text('note').notNull(),
	author: text('author').notNull(),
	createdAt: integer('created_at').notNull(),
}, (table) => [index('annotation_qname_idx').on(table.entityKind, table.qualifiedName)]);

export type DrizzleProjectRow = typeof projects.$inferSelect;
export type DrizzleProjectMemberRow = typeof projectMembers.$inferSelect;
export type DrizzleWorkspaceRow = typeof workspaces.$inferSelect;
export type DrizzleEntityRow = typeof entities.$inferSelect;
export type DrizzleReferenceRow = typeof references.$inferSelect;
export type DrizzleMetricRow = typeof metrics.$inferSelect;
export type DrizzleSourceUnitRow = typeof sourceUnits.$inferSelect;
export type DrizzleAnnotationRow = typeof annotations.$inferSelect;
