/**
 * @author Oblx <code@oblx.dev>
 * @description Headless CLI utility minting scoped chr_live_* Personal Access Tokens directly against local SQLite for autonomous CI & MCP agents.
 */
import { eq } from 'drizzle-orm';
import { ROLE_MASKS, SEEDED_OPERATOR_CONFIG } from '@config/security.constants';
import { closeChronosDb, createChronosDb } from '@lib/db/sqlite/client/connection';
import { ensureSeededOperatorAccount } from '@lib/db/seed.operator';
import { users } from '@lib/db/sqlite/schema/tables';
import { mintPersonalAccessToken } from '@plugins/auth/pat.auth';

export interface CliPatMintOptions {
	readonly dbPath?: string;
	readonly username?: string;
	readonly label?: string;
	readonly scopePreset?: string;
	readonly scopeMask?: number;
	readonly expiresInDays?: number;
}

export interface CliPatMintResult {
	readonly issuedAt: number;
	readonly username: string;
	readonly userId: string;
	readonly roleId: string;
	readonly label: string;
	readonly tokenPrefix: string;
	readonly rawToken: string;
	readonly scopedBitmask: number;
	readonly scopedBitmaskHex: string;
	readonly expiresAt: number | null;
}

function resolveScopeMask(opts: CliPatMintOptions): number {
	if (typeof opts.scopeMask === 'number' && Number.isFinite(opts.scopeMask)) return opts.scopeMask >>> 0;
	const key = (opts.scopePreset ?? 'ADMIN').trim().toUpperCase();
	if (key === 'VIEWER') return ROLE_MASKS.ROLE_VIEWER;
	if (key === 'ANALYST') return ROLE_MASKS.ROLE_ANALYST;
	if (key === 'AUDITOR') return ROLE_MASKS.ROLE_AUDITOR;
	if (key === 'GUEST') return ROLE_MASKS.ROLE_GUEST;
	return ROLE_MASKS.ROLE_ADMIN;
}

export function parseCliPatArgs(argv: readonly string[]): CliPatMintOptions {
	let dbPath = process.env.CHRONOS_DB_PATH || 'file:chronos.sqlite';
	let username: string = SEEDED_OPERATOR_CONFIG.USERNAME;
	let label = 'autonomous-agent';
	let scopePreset = 'ADMIN';
	let expiresInDays = 30;
	let scopeMask: number | undefined;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;
		const next = argv[i + 1];
		if (arg === '--memory') dbPath = ':memory:';
		else if (arg === '--db' && next) { dbPath = next; i++; }
		else if (arg === '--username' && next) { username = next; i++; }
		else if (arg === '--label' && next) { label = next; i++; }
		else if (arg === '--scope' && next) { scopePreset = next; i++; }
		else if (arg === '--mask' && next) { scopeMask = Number(next); i++; }
		else if (arg === '--days' && next) { expiresInDays = Math.max(1, Number(next) || 30); i++; }
	}
	return { dbPath, username, label, scopePreset, scopeMask, expiresInDays };
}

export async function mintScopableCliPat(options: CliPatMintOptions = {}): Promise<CliPatMintResult> {
	const handle = createChronosDb(options.dbPath ?? ':memory:');
	try {
		await ensureSeededOperatorAccount(handle);
		const targetUsername = options.username ?? SEEDED_OPERATOR_CONFIG.USERNAME;
		const userRow = handle.db.select().from(users).where(eq(users.username, targetUsername)).get();
		if (!userRow) throw new Error(`Operator account not found for username: ${targetUsername}`);
		const label = options.label?.trim() || 'autonomous-agent';
		const mask = resolveScopeMask(options);
		const minted = await mintPersonalAccessToken(handle, {
			userId: userRow.id,
			label,
			scopedBitmask: mask,
			expiresInDays: options.expiresInDays ?? 30,
		});
		return {
			issuedAt: Date.now(),
			username: userRow.username,
			userId: userRow.id,
			roleId: userRow.roleId,
			label,
			tokenPrefix: minted.tokenPrefix,
			rawToken: minted.rawToken,
			scopedBitmask: minted.scopedBitmask,
			scopedBitmaskHex: `0x${(minted.scopedBitmask >>> 0).toString(16).padStart(8, '0')}`,
			expiresAt: minted.expiresAt,
		};
	} finally {
		closeChronosDb(handle);
	}
}

if (import.meta.main) {
	const result = await mintScopableCliPat(parseCliPatArgs(Bun.argv.slice(2)));
	console.log(JSON.stringify(result, null, '\t'));
}
