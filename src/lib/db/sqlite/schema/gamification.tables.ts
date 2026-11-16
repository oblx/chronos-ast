/**
 * @author Oblx <code@oblx.dev>
 * @description Drizzle ORM SQLite tables for Cubic XP Gamification rules, user profiles, and leveled cards.
 */
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const gamificationXpRules = sqliteTable('gamification_xp_rules', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	eventKind: text('event_kind').notNull(),
	category: text('category').notNull().default('AST_CARTOGRAPHER'),
	baseXp: integer('base_xp').notNull().default(25),
	cooldownSec: integer('cooldown_sec').notNull().default(0),
	dailyCapCount: integer('daily_cap_count').notNull().default(100),
	enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
	label: text('label').notNull().default(''),
	updatedAt: integer('updated_at').notNull(),
}, (t) => [
	uniqueIndex('xp_rule_event_uniq_idx').on(t.eventKind),
	index('xp_rule_cat_idx').on(t.category),
]);

export const userGamificationProfiles = sqliteTable('user_gamification_profiles', {
	userId: text('user_id').primaryKey(),
	totalXp: integer('total_xp').notNull().default(0),
	currentLevel: integer('current_level').notNull().default(1),
	curvePreset: text('curve_preset').notNull().default('MEDIUM_FAST'),
	updatedAt: integer('updated_at').notNull(),
}, (t) => [
	index('ugp_level_idx').on(t.currentLevel),
	index('ugp_xp_idx').on(t.totalXp),
]);

export const userAchievementCards = sqliteTable('user_achievement_cards', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	cardId: text('card_id').notNull(),
	cardLevel: integer('card_level').notNull().default(1),
	currentProgress: integer('current_progress').notNull().default(0),
	unlockedAt: integer('unlocked_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
}, (t) => [
	uniqueIndex('uac_user_card_uniq_idx').on(t.userId, t.cardId),
	index('uac_user_idx').on(t.userId),
	index('uac_level_idx').on(t.cardLevel),
]);

export type DrizzleGamificationRuleRow = typeof gamificationXpRules.$inferSelect;
export type DrizzleUserGamificationProfileRow = typeof userGamificationProfiles.$inferSelect;
export type DrizzleUserAchievementCardRow = typeof userAchievementCards.$inferSelect;
