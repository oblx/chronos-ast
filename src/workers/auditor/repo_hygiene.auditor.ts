/**
 * @author Oblx <code@oblx.dev>
 * @description Open-source repository hygiene auditor verifying OSS root files, .gitignore coverage, zero unignored DB/env artifacts, zero literal secrets, and zero staging URLs.
 */
import { existsSync } from 'node:fs';

export interface RepoHygieneReport {
	readonly passed: boolean;
	readonly checkedTrackedFiles: number;
	readonly violations: readonly string[];
}

const SKIP_DIRS = ['.git/', 'node_modules/', 'dist/', 'build/', 'coverage/', '.trash/', '.playwright-cli/', 'tmp/'] as const;
const TEXT_EXT_RE = /\.(ts|svelte|md|yml|yaml|json|html|css)$/i;
const SKIP_SCAN_FILES = ['payload.redactor.ts', 'log.sanitizer.ts', 'repo_hygiene.auditor.ts'] as const;
const REQUIRED_ROOT_FILES = ['LICENSE', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', '.gitignore', '.github/workflows/ci.yml'] as const;
const REQUIRED_IGNORE_TOKENS = ['node_modules/', 'dist/', 'coverage/', '.env*', '!.env.example', '*.sqlite', '.playwright-cli/', '.trash/', 'tmp/'] as const;

const HYGIENE_PATTERNS: ReadonlyArray<{ readonly label: string; readonly re: RegExp }> = [
	{ label: 'literal chr_live PAT', re: /\bchr_live_[A-Za-z0-9_-]{6,}/ },
	{ label: 'literal GitHub PAT', re: /\bghp_[A-Za-z0-9_]{8,}/ },
	{ label: 'literal GitLab PAT', re: /\bglpat-[A-Za-z0-9_-]{8,}/ },
	{ label: 'literal sk-* secret', re: /\bsk-[A-Za-z0-9_-]{8,}/ },
	{ label: 'literal PEM private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
	{ label: 'staging *.run.app URL', re: /[a-z0-9-]+\.run\.app\b/i },
];

function isSkippedPath(relPath: string): boolean {
	return SKIP_DIRS.some((prefix) => relPath === prefix.slice(0, -1) || relPath.startsWith(prefix));
}

function collectTrackedFiles(): string[] {
	const found: string[] = [];
	for (const rel of new Bun.Glob('**/*').scanSync({ cwd: '.', dot: true })) {
		const norm = rel.replace(/\\/g, '/').replace(/^\.\//, '');
		if (!norm || isSkippedPath(norm)) continue;
		found.push(norm);
	}
	return found.sort();
}

function checkOssBaseline(violations: string[]): void {
	for (const file of REQUIRED_ROOT_FILES) {
		if (!existsSync(file)) violations.push(`missing required OSS file: ${file}`);
	}
}

async function checkGitignoreCoverage(violations: string[]): Promise<void> {
	if (!existsSync('.gitignore')) return;
	const lines = (await Bun.file('.gitignore').text()).split('\n').map((l) => l.trim());
	for (const token of REQUIRED_IGNORE_TOKENS) {
		if (!lines.includes(token)) violations.push(`.gitignore missing entry: ${token}`);
	}
}

async function scanTrackedTextAndArtifacts(tracked: readonly string[], violations: string[]): Promise<number> {
	let scanned = 0;
	for (const rel of tracked) {
		const base = rel.split('/').pop() ?? rel;
		if (/\.sqlite(-wal|-shm)?$/i.test(base) || (/^\.env(\..+)?$/i.test(base) && base !== '.env.example')) {
			violations.push(`unignored runtime artifact: ${rel}`);
			continue;
		}
		if (!TEXT_EXT_RE.test(rel) || SKIP_SCAN_FILES.some((s) => rel.endsWith(s))) continue;
		scanned++;
		const content = await Bun.file(rel).text();
		for (const pat of HYGIENE_PATTERNS) {
			if (pat.re.test(content)) violations.push(`${pat.label} in ${rel}`);
		}
	}
	return scanned;
}

export async function runRepoHygieneAudit(): Promise<RepoHygieneReport> {
	const violations: string[] = [];
	checkOssBaseline(violations);
	await checkGitignoreCoverage(violations);
	const tracked = collectTrackedFiles();
	const checkedTrackedFiles = await scanTrackedTextAndArtifacts(tracked, violations);
	return { passed: violations.length === 0, checkedTrackedFiles, violations };
}
