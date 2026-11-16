/**
 * @author Oblx <code@oblx.dev>
 * @description Drizzle Kit SQLite metamodel configuration for Project Chronos.
 */
import { ENV_DEFAULTS, SQLITE_CONFIG } from './src/config/env.schema';

export default {
	schema: SQLITE_CONFIG.SCHEMA_PATH,
	out: SQLITE_CONFIG.MIGRATIONS_DIR,
	dialect: SQLITE_CONFIG.DIALECT,
	dbCredentials: {
		url: process.env.DATABASE_URL ?? ENV_DEFAULTS.DATABASE_URL,
	},
};
