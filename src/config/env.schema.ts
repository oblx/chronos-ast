/**
 * @author Oblx <code@oblx.dev>
 * @description Typed environment variable, DEVMODE, OAuth2 PKCE, WebSocket Hub, SQLite WAL isolation, and IndexedDB stores (v2.1.0).
 */

export const SQLITE_CONFIG = {
	DIALECT: 'sqlite',
	SCHEMA_PATH: './src/lib/db/sqlite/schema/tables.ts',
	MIGRATIONS_DIR: './src/lib/db/migrations',
	DEFAULT_DB_FILE: './data/chronos_metamodel.sqlite',
	MEMORY_DB_URI: ':memory:',
	PRAGMA_JOURNAL_WAL: 'PRAGMA journal_mode = WAL;',
	PRAGMA_FOREIGN_KEYS: 'PRAGMA foreign_keys = ON;',
	PRAGMA_SYNCHRONOUS: 'PRAGMA synchronous = NORMAL;',
	PRAGMA_TRUSTED_SCHEMA_OFF: 'PRAGMA trusted_schema = OFF;',
	PRAGMA_CELL_SIZE_CHECK: 'PRAGMA cell_size_check = ON;',
	PRAGMA_BUSY_TIMEOUT: 'PRAGMA busy_timeout = 3000;',
	PRAGMA_TEMP_STORE_MEMORY: 'PRAGMA temp_store = MEMORY;',
	PRAGMA_OPTIMIZE: 'PRAGMA optimize;',
	PRAGMA_WAL_CHECKPOINT_TRUNCATE: 'PRAGMA wal_checkpoint(TRUNCATE);',
	FCNTL_PERSIST_WAL_OP: 10,
	FCNTL_PERSIST_WAL_DISABLED: 0,
} as const;

export function resolveParallelTestDbUri(
	requestedUri: string = SQLITE_CONFIG.MEMORY_DB_URI,
	envRecord: Record<string, string | undefined> = typeof Bun !== 'undefined' ? Bun.env : {}
): string {
	if (requestedUri === SQLITE_CONFIG.MEMORY_DB_URI) return SQLITE_CONFIG.MEMORY_DB_URI;
	const workerId = envRecord.BUN_TEST_WORKER_ID;
	return workerId ? `${requestedUri}.worker-${workerId}` : requestedUri;
}

export const INDEXEDDB_CONFIG = {
	DB_NAME: 'chronos_offline_metamodel_db',
	DB_VERSION: 6,
	STORES: {
		PROJECTS: 'projects',
		PROJECT_MEMBERS: 'project_members',
		WORKSPACES: 'workspaces',
		ENTITIES: 'entities',
		REFERENCES: 'references',
		METRICS: 'metrics',
		SOURCE_UNITS: 'source_units',
		ANNOTATIONS: 'annotations',
		SECURITY_IDENTITY: 'security_identity',
		SYNC_JOURNAL: 'sync_journal',
	},
} as const;

export const ENV_DEFAULTS = {
	DATABASE_URL: 'file:./data/chronos_metamodel.sqlite',
	MEMGRAPH_URI: '', WORKER_THREAD_POOL_SIZE: 4, MEMORY_HARD_LIMIT_MB: 4096,
	DEFAULT_SCAN_DIRECTORY: './src', MAX_FILE_SIZE_BYTES: 5242880, INCREMENTAL_INDEXING_ENABLED: true,
	HUD_REFRESH_RATE_MS: 16, HUD_AUDIO_FEEDBACK_SYNTH: false, SERVER_PORT: 3000,
	PROVIDER_URL: '', PROVIDER_BEARER: '',
	DEVMODE: false,
	WS_ENABLED: true, WS_MAX_CLIENTS: 100, WS_HEARTBEAT_INTERVAL_MS: 15000,
	WS_IDLE_TIMEOUT_MS: 45000, WS_MAX_PAYLOAD_BYTES: 65536, WS_MSG_RATE_LIMIT_PER_SEC: 30,
} as const;

export interface RuntimeEnvConfig {
	readonly databaseUrl: string; readonly memgraphUri: string; readonly workerPoolSize: number;
	readonly memoryHardLimitMb: number; readonly defaultScanDirectory: string; readonly maxFileSizeBytes: number;
	readonly incrementalIndexing: boolean; readonly hudRefreshRateMs: number; readonly serverPort: number;
	readonly providerUrl: string; readonly providerBearer: string;
	readonly authPepperV1: string; readonly authPepperV2: string; readonly masterKek: string;
	readonly sessionSecret: string; readonly strictSecurity: boolean; readonly devMode: boolean;
	readonly githubClientId: string; readonly githubClientSecret: string;
	readonly googleClientId: string; readonly googleClientSecret: string; readonly oauthRedirectBaseUrl: string;
	readonly wsEnabled: boolean; readonly wsMaxClients: number; readonly wsHeartbeatIntervalMs: number;
	readonly wsIdleTimeoutMs: number; readonly wsMaxPayloadBytes: number; readonly wsMsgRateLimitPerSec: number;
}

export function resolveRuntimeEnv(
	envRecord: Record<string, string | undefined> = typeof Bun !== 'undefined' ? Bun.env : {}
): RuntimeEnvConfig {
	const isProd = envRecord.NODE_ENV === 'production';
	const devRaw = envRecord.DEVMODE;
	const devMode = !isProd && devRaw === 'true';

	let authPepperV1 = envRecord.CHRONOS_AUTH_PEPPER_V1 ?? '';
	let masterKek = envRecord.CHRONOS_MASTER_KEK ?? '';
	let sessionSecret = envRecord.CHRONOS_SESSION_SECRET ?? '';

	if (devMode && (!authPepperV1 || authPepperV1.length < 32 || !masterKek || masterKek.length < 32 || !sessionSecret || sessionSecret.length < 32)) {
		console.error('[CHRONOS] WARNING: DEVMODE active with unset or short secrets. Automatically hydrating ephemeral local-dev keys in memory.');
		if (!authPepperV1 || authPepperV1.length < 32) authPepperV1 = 'chronos-dev-ephemeral-pepper-v1-32bytes!';
		if (!masterKek || masterKek.length < 32) masterKek = 'chronos-dev-ephemeral-kek-v1-32bytes!!';
		if (!sessionSecret || sessionSecret.length < 32) sessionSecret = 'chronos-dev-ephemeral-session-32bytes!';
	} else if (!devMode && isProd && (!authPepperV1 || authPepperV1.length < 32 || !masterKek || masterKek.length < 32)) {
		throw new Error('Production mode requires CHRONOS_AUTH_PEPPER_V1 and CHRONOS_MASTER_KEK of at least 32 bytes.');
	}

	return {
		databaseUrl: envRecord.DATABASE_URL ?? ENV_DEFAULTS.DATABASE_URL,
		memgraphUri: envRecord.MEMGRAPH_URI ?? ENV_DEFAULTS.MEMGRAPH_URI,
		workerPoolSize: Number(envRecord.WORKER_THREAD_POOL_SIZE ?? ENV_DEFAULTS.WORKER_THREAD_POOL_SIZE),
		memoryHardLimitMb: Number(envRecord.MEMORY_HARD_LIMIT_MB ?? ENV_DEFAULTS.MEMORY_HARD_LIMIT_MB),
		defaultScanDirectory: envRecord.DEFAULT_SCAN_DIRECTORY ?? ENV_DEFAULTS.DEFAULT_SCAN_DIRECTORY,
		maxFileSizeBytes: Number(envRecord.MAX_FILE_SIZE_BYTES ?? ENV_DEFAULTS.MAX_FILE_SIZE_BYTES),
		incrementalIndexing: envRecord.INCREMENTAL_INDEXING_ENABLED !== 'false',
		hudRefreshRateMs: Number(envRecord.HUD_REFRESH_RATE_MS ?? ENV_DEFAULTS.HUD_REFRESH_RATE_MS),
		serverPort: Number(envRecord.PORT ?? ENV_DEFAULTS.SERVER_PORT),
		providerUrl: envRecord.provider_url ?? envRecord.PROVIDER_URL ?? ENV_DEFAULTS.PROVIDER_URL,
		providerBearer: envRecord.provider_bearer ?? envRecord.PROVIDER_BEARER ?? ENV_DEFAULTS.PROVIDER_BEARER,
		authPepperV1,
		authPepperV2: envRecord.CHRONOS_AUTH_PEPPER_V2 ?? '',
		masterKek,
		sessionSecret,
		strictSecurity: envRecord.CHRONOS_SECURITY_STRICT === 'true',
		devMode,
		githubClientId: envRecord.GITHUB_CLIENT_ID ?? '',
		githubClientSecret: envRecord.GITHUB_CLIENT_SECRET ?? '',
		googleClientId: envRecord.GOOGLE_CLIENT_ID ?? '',
		googleClientSecret: envRecord.GOOGLE_CLIENT_SECRET ?? '',
		oauthRedirectBaseUrl: envRecord.OAUTH_REDIRECT_BASE_URL ?? envRecord.APP_URL ?? 'http://localhost:3000',
		wsEnabled: envRecord.WS_ENABLED !== 'false',
		wsMaxClients: Number(envRecord.WS_MAX_CLIENTS ?? ENV_DEFAULTS.WS_MAX_CLIENTS),
		wsHeartbeatIntervalMs: Number(envRecord.WS_HEARTBEAT_INTERVAL_MS ?? ENV_DEFAULTS.WS_HEARTBEAT_INTERVAL_MS),
		wsIdleTimeoutMs: Number(envRecord.WS_IDLE_TIMEOUT_MS ?? ENV_DEFAULTS.WS_IDLE_TIMEOUT_MS),
		wsMaxPayloadBytes: Number(envRecord.WS_MAX_PAYLOAD_BYTES ?? ENV_DEFAULTS.WS_MAX_PAYLOAD_BYTES),
		wsMsgRateLimitPerSec: Number(envRecord.WS_MSG_RATE_LIMIT_PER_SEC ?? ENV_DEFAULTS.WS_MSG_RATE_LIMIT_PER_SEC),
	};
}
