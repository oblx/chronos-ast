/**
 * @author Oblx <code@oblx.dev>
 * @description SQLite DDL script for Community Theme Marketplace, User Theme Favorites, and User Preferences tables (v2.5.0).
 */

export const THEME_DDL = `
CREATE TABLE IF NOT EXISTS community_themes (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	author_user_id INTEGER NOT NULL DEFAULT 1,
	author_handle TEXT NOT NULL DEFAULT 'oblx',
	polarity TEXT NOT NULL DEFAULT 'DARK',
	tokens_json TEXT NOT NULL,
	favorites_count INTEGER NOT NULL DEFAULT 0,
	applies_count INTEGER NOT NULL DEFAULT 0,
	is_built_in INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comm_theme_author_idx ON community_themes(author_user_id);
CREATE INDEX IF NOT EXISTS comm_theme_fav_idx ON community_themes(favorites_count);
CREATE INDEX IF NOT EXISTS comm_theme_apply_idx ON community_themes(applies_count);

CREATE TABLE IF NOT EXISTS user_theme_favorites (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	theme_id INTEGER NOT NULL REFERENCES community_themes(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS utf_user_idx ON user_theme_favorites(user_id);
CREATE INDEX IF NOT EXISTS utf_theme_idx ON user_theme_favorites(theme_id);
CREATE UNIQUE INDEX IF NOT EXISTS utf_user_theme_uniq_idx ON user_theme_favorites(user_id, theme_id);

CREATE TABLE IF NOT EXISTS user_preferences (
	user_id INTEGER PRIMARY KEY,
	active_theme_id INTEGER NOT NULL DEFAULT 1 REFERENCES community_themes(id),
	edge_drawer_mode TEXT NOT NULL DEFAULT 'OVERLAY_HOVER',
	font_ligatures INTEGER NOT NULL DEFAULT 1,
	code_font_size_px INTEGER NOT NULL DEFAULT 13,
	tutorial_completed INTEGER NOT NULL DEFAULT 0,
	updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_gamification_profiles (
	user_id TEXT PRIMARY KEY,
	total_xp INTEGER NOT NULL DEFAULT 0,
	current_level INTEGER NOT NULL DEFAULT 1,
	curve_preset TEXT NOT NULL DEFAULT 'MEDIUM_FAST',
	updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievement_cards (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id TEXT NOT NULL,
	card_id TEXT NOT NULL,
	card_level INTEGER NOT NULL DEFAULT 1,
	current_progress INTEGER NOT NULL DEFAULT 0,
	unlocked_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS system_configs (
	config_key TEXT PRIMARY KEY,
	config_value TEXT NOT NULL,
	updated_by TEXT NOT NULL DEFAULT 'system',
	updated_at INTEGER NOT NULL
);
`;
