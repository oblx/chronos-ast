/**
 * @author Oblx <code@oblx.dev>
 * @description Stage 1 Client & Shared Pre-Validation Engine enforcing schema, length, format, and numeric bounds before network dispatch (v2.6.0).
 */

export type FormSchemaId =
	| 'AUTH_LOGIN'
	| 'AUTH_REGISTER'
	| 'GIT_REPO'
	| 'VAULT_SECRET'
	| 'DEVIATION_SIGNOFF'
	| 'CUSTOM_THEME'
	| 'AI_PROMPT'
	| 'PROJECT_CREATE'
	| 'ANALYZE_SOURCE';

export interface FormValidationResult {
	readonly valid: boolean;
	readonly error: string;
	readonly fieldErrors: Readonly<Record<string, string>>;
}

const USERNAME_RE = /^[a-zA-Z0-9._-]{2,48}$/;
const GIT_TARGET_RE = /^(?:https:\/\/[a-zA-Z0-9.-]+(?:\/[^\s"'<>]+)+|(?:github|gitlab|gitea):[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:@[^\s"'<>]+)?)$/;
const SAFE_PATH_RE = /^[a-zA-Z0-9._/-]{2,180}$/;

function ok(): FormValidationResult {
	return { valid: true, error: '', fieldErrors: {} };
}

function fail(field: string, msg: string): FormValidationResult {
	return { valid: false, error: msg, fieldErrors: { [field]: msg } };
}

function validateAuthForm(kind: 'AUTH_LOGIN' | 'AUTH_REGISTER', data: Record<string, unknown>): FormValidationResult {
	const username = String(data.username ?? '').trim();
	const password = String(data.password ?? '');
	if (!USERNAME_RE.test(username)) return fail('username', 'Username must be 2–48 alphanumeric, dot, dash, or underscore characters.');
	const minPw = kind === 'AUTH_REGISTER' ? 8 : 4;
	if (password.length < minPw || password.length > 256) return fail('password', `Passphrase must be ${minPw}–256 characters.`);
	return ok();
}

function validateGitAndVault(kind: 'GIT_REPO' | 'VAULT_SECRET', data: Record<string, unknown>): FormValidationResult {
	if (kind === 'GIT_REPO') {
		const repoUrl = String(data.repoUrl ?? data.url ?? '').trim();
		if (!GIT_TARGET_RE.test(repoUrl)) return fail('repoUrl', 'Enter a valid https:// Git URL or github:/gitlab:/gitea: shorthand.');
		const branch = String(data.branch ?? data.baseBranch ?? '').trim();
		if (branch && !/^[a-zA-Z0-9._/-]{1,80}$/.test(branch)) return fail('branch', 'Invalid Git branch/ref characters.');
		return ok();
	}
	const label = String(data.label ?? '').trim();
	const secret = String(data.plaintextSecret ?? '').trim();
	if (label.length < 2 || label.length > 64) return fail('label', 'Secret label must be 2–64 characters.');
	if (secret.length < 6 || secret.length > 512) return fail('plaintextSecret', 'Plaintext secret must be 6–512 characters.');
	return ok();
}

function validateWorkspaceForms(kind: FormSchemaId, data: Record<string, unknown>): FormValidationResult {
	if (kind === 'DEVIATION_SIGNOFF') {
		const note = String(data.note ?? '').trim();
		const ruleCode = String(data.ruleCode ?? '').trim();
		if (note.length < 4 || note.length > 500) return fail('note', 'Engineering rationale must be 4–500 characters.');
		if (ruleCode && !/^[a-zA-Z0-9_*-]{1,24}$/.test(ruleCode)) return fail('ruleCode', 'Rule code must be alphanumeric or *.');
		return ok();
	}
	if (kind === 'CUSTOM_THEME') {
		const name = String(data.name ?? '').trim();
		if (name.length < 2 || name.length > 48 || /[<>;{}]/.test(name)) return fail('name', 'Theme name must be 2–48 safe characters.');
		return ok();
	}
	if (kind === 'AI_PROMPT') {
		const prompt = String(data.prompt ?? '').trim();
		if (prompt.length < 1 || prompt.length > 600) return fail('prompt', 'AI query must be 1–600 characters.');
		return ok();
	}
	if (kind === 'PROJECT_CREATE') {
		const name = String(data.name ?? '').trim();
		if (name.length < 2 || name.length > 64) return fail('name', 'Project name must be 2–64 characters.');
		return ok();
	}
	const filePath = String(data.filePath ?? '').trim();
	const sourceCode = String(data.sourceCode ?? '').trim();
	if (!SAFE_PATH_RE.test(filePath) || filePath.includes('..')) return fail('filePath', 'Invalid source file path.');
	if (sourceCode.length < 4 || sourceCode.length > 100_000) return fail('sourceCode', 'Source payload must be 4–100,000 chars.');
	return ok();
}

export function validateClientForm(schemaId: FormSchemaId, payload: Readonly<Record<string, unknown>>): FormValidationResult {
	const data = { ...payload };
	if (schemaId === 'AUTH_LOGIN' || schemaId === 'AUTH_REGISTER') return validateAuthForm(schemaId, data);
	if (schemaId === 'GIT_REPO' || schemaId === 'VAULT_SECRET') return validateGitAndVault(schemaId, data);
	return validateWorkspaceForms(schemaId, data);
}
