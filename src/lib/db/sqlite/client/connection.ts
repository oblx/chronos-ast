/**
 * @author Oblx <code@oblx.dev>
 * @description Bun native SQLite + Drizzle ORM connection with WAL isolation, PRAGMA trusted_schema = OFF, cell_size_check = ON, and v2.1.0 security DDL.
 */
import { Database, type Statement } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { resolveParallelTestDbUri, SQLITE_CONFIG } from '@config/env.schema';
import { METAMODEL_DDL, SECURITY_DDL } from '../schema/bootstrap.ddl';
import { THEME_DDL } from '../schema/theme.ddl';
import * as schema from '../schema/tables';

export interface ChronosDatabaseHandle {
	readonly sqlite: Database;
	readonly db: ReturnType<typeof drizzle<typeof schema>>;
	readonly trackedStatements: Statement[];
	readonly prepareTracked: (sql: string) => Statement;
}

export function closeChronosDb(handle: ChronosDatabaseHandle | null | undefined): void {
	if (!handle) return;
	for (const stmt of handle.trackedStatements) {
		try { stmt.finalize(); } catch {}
	}
	handle.trackedStatements.length = 0;
	try { handle.sqlite.exec(SQLITE_CONFIG.PRAGMA_OPTIMIZE); } catch {}
	try { handle.sqlite.exec(SQLITE_CONFIG.PRAGMA_WAL_CHECKPOINT_TRUNCATE); } catch {}
	try { handle.sqlite.close(false); } catch {}
}

const SAFE_ALTERS: readonly string[] = [
	"ALTER TABLE workspaces ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'guest';",
	'ALTER TABLE users ADD COLUMN uid INTEGER NOT NULL DEFAULT 1;',
	"ALTER TABLE users ADD COLUMN slug TEXT NOT NULL DEFAULT 'operator';",
	'ALTER TABLE users ADD COLUMN email TEXT;',
	"ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT 'Operator';",
	'ALTER TABLE users ADD COLUMN avatar_url TEXT;',
	'ALTER TABLE users ADD COLUMN primary_group_id INTEGER NOT NULL DEFAULT 3;',
	'ALTER TABLE users ADD COLUMN time_logged_sec INTEGER NOT NULL DEFAULT 0;',
	'ALTER TABLE users ADD COLUMN last_login_at INTEGER NOT NULL DEFAULT 0;',
	'ALTER TABLE entities ADD COLUMN project_id INTEGER DEFAULT 1;',
	'ALTER TABLE "references" ADD COLUMN project_id INTEGER DEFAULT 1;',
	'ALTER TABLE metrics ADD COLUMN project_id INTEGER DEFAULT 1;',
	'ALTER TABLE source_units ADD COLUMN project_id INTEGER DEFAULT 1;',
	'ALTER TABLE annotations ADD COLUMN project_id INTEGER DEFAULT 1;',
	'ALTER TABLE sync_operations ADD COLUMN project_id INTEGER NOT NULL DEFAULT 1;',
	"ALTER TABLE projects ADD COLUMN project_identity_key TEXT NOT NULL DEFAULT 'core:chronos-core';",
	'ALTER TABLE projects ADD COLUMN violation_count INTEGER NOT NULL DEFAULT 0;',
	'ALTER TABLE projects ADD COLUMN snapshot_revision INTEGER NOT NULL DEFAULT 1;',
	"ALTER TABLE projects ADD COLUMN active_hlc_timestamp TEXT NOT NULL DEFAULT '';",
];

export function createChronosDb(dbPath: string = SQLITE_CONFIG.MEMORY_DB_URI): ChronosDatabaseHandle {
	const isolatedUri = resolveParallelTestDbUri(dbPath);
	const cleanPath = isolatedUri.replace(/^file:/, '');
	const sqlite = new Database(cleanPath, { create: true });
	try {
		sqlite.fileControl(SQLITE_CONFIG.FCNTL_PERSIST_WAL_OP, SQLITE_CONFIG.FCNTL_PERSIST_WAL_DISABLED);
	} catch {}
	sqlite.exec(SQLITE_CONFIG.PRAGMA_JOURNAL_WAL);
	sqlite.exec(SQLITE_CONFIG.PRAGMA_FOREIGN_KEYS);
	sqlite.exec(SQLITE_CONFIG.PRAGMA_SYNCHRONOUS);
	sqlite.exec(SQLITE_CONFIG.PRAGMA_TRUSTED_SCHEMA_OFF);
	sqlite.exec(SQLITE_CONFIG.PRAGMA_CELL_SIZE_CHECK);
	sqlite.exec(SQLITE_CONFIG.PRAGMA_BUSY_TIMEOUT);
	sqlite.exec(SQLITE_CONFIG.PRAGMA_TEMP_STORE_MEMORY);
	sqlite.exec(METAMODEL_DDL);
	sqlite.exec(SECURITY_DDL);
	sqlite.exec(THEME_DDL);
	for (const stmt of SAFE_ALTERS) {
		try { sqlite.exec(stmt); } catch {}
	}
	const db = drizzle(sqlite, { schema });
	const trackedStatements: Statement[] = [];
	return {
		sqlite, db, trackedStatements,
		prepareTracked(sql: string): Statement {
			const stmt = sqlite.prepare(sql);
			trackedStatements.push(stmt);
			return stmt;
		},
	};
}
