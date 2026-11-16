/**
 * @author Oblx <code@oblx.dev>
 * @description Normalized u32 Drizzle ORM tables for Community Theme Marketplace, User Theme Favorites, and User Preferences (v2.5.0).
 */
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const communityThemes = sqliteTable('community_themes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull(),
	name: text('name').notNull(),
	authorUserId: integer('author_user_id').notNull().default(1),
	authorHandle: text('author_handle').notNull().default('oblx'),
	polarity: text('polarity').$type<'DARK' | 'LIGHT'>().notNull().default('DARK'),
	tokensJson: text('tokens_json').notNull(),
	favoritesCount: integer('favorites_count').notNull().default(0),
	appliesCount: integer('applies_count').notNull().default(0),
	isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
}, (t) => [
	uniqueIndex('comm_theme_slug_idx').on(t.slug),
	index('comm_theme_author_idx').on(t.authorUserId),
	index('comm_theme_fav_idx').on(t.favoritesCount),
	index('comm_theme_apply_idx').on(t.appliesCount),
]);

export const userThemeFavorites = sqliteTable('user_theme_favorites', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	themeId: integer('theme_id').notNull().references(() => communityThemes.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at').notNull(),
}, (t) => [
	index('utf_user_idx').on(t.userId),
	index('utf_theme_idx').on(t.themeId),
	uniqueIndex('utf_user_theme_uniq_idx').on(t.userId, t.themeId),
]);

export const userPreferences = sqliteTable('user_preferences', {
	userId: integer('user_id').primaryKey(),
	activeThemeId: integer('active_theme_id').notNull().default(1).references(() => communityThemes.id),
	edgeDrawerMode: text('edge_drawer_mode').$type<'OVERLAY_HOVER' | 'DOCKED_RESIZE'>().notNull().default('OVERLAY_HOVER'),
	fontLigatures: integer('font_ligatures', { mode: 'boolean' }).notNull().default(true),
	codeFontSizePx: integer('code_font_size_px').notNull().default(13),
	tutorialCompleted: integer('tutorial_completed', { mode: 'boolean' }).notNull().default(false),
	updatedAt: integer('updated_at').notNull(),
});

export const systemConfigs = sqliteTable('system_configs', {
	configKey: text('config_key').primaryKey(),
	configValue: text('config_value').notNull(),
	updatedBy: text('updated_by').notNull().default('system'),
	updatedAt: integer('updated_at').notNull(),
});

export type DrizzleCommunityThemeRow = typeof communityThemes.$inferSelect;
export type DrizzleUserThemeFavoriteRow = typeof userThemeFavorites.$inferSelect;
export type DrizzleUserPreferencesRow = typeof userPreferences.$inferSelect;
export type DrizzleSystemConfigRow = typeof systemConfigs.$inferSelect;
