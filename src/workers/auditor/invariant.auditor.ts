/**
 * @author Oblx <code@oblx.dev>
 * @description Pure-Bun codebase invariant auditor enforcing LoC caps (<=150 code, <=100 docs), folder cap (<=10 files), 100% barrel index.ts in src/, zero code fences, balanced LaTeX, brand-agnostic 07-blueprint, and zero hardcoded versions.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { hasBalancedLatexDelimiters } from '@core/math/latex.mathml';
import { runRepoHygieneAudit } from './repo_hygiene.auditor';

export const MAX_FILES_PER_FOLDER = 10 as const;

export interface InvariantAuditReport {
	readonly passed: boolean;
	readonly checkedSourceFiles: number;
	readonly checkedDocFiles: number;
	readonly totalSrcLines: number;
	readonly oversizedSourceFiles: readonly string[];
	readonly oversizedDocFiles: readonly string[];
	readonly docFenceViolations: readonly string[];
	readonly orphanedComponentFiles: readonly string[];
	readonly magicColorViolations: readonly string[];
	readonly hardcodedVersionViolations: readonly string[];
	readonly brandLeakViolations: readonly string[];
	readonly folderCapViolations: readonly string[];
	readonly missingBarrelViolations: readonly string[];
	readonly blueprintBrandViolations: readonly string[];
	readonly forbiddenSvelteImports: readonly string[];
	readonly emojiViolations: readonly string[];
	readonly uiFirewallViolations: readonly string[];
	readonly repoHygieneViolations: readonly string[];
}

const BRAND_LEAK_RE = /(scitools|luckperms|pokemon|gen-?1)/i;
const BLUEPRINT_BRAND_RE = /chronos/i;
const FORBIDDEN_SVELTE_RE = /(from\s+['"]@(core|lib|plugins|server|workers)(\/|['"])|\bfetch\s*\()/;
const UI_FIREWALL_IMPORT_RE = /from\s+['"](@(core|server|plugins|lib|client|config|workers)(\/|['"])|(\.\.\/)+(core|server|plugins|lib|client|config|workers)\b)/;
const UI_FIREWALL_DOMAIN_RE = /\b(Butterfly|Tarjan|CodeCheck|CHR-CORE|dispatch_ast_job)\b/;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

function stripNonTemplateComments(raw: string): string {
	return raw.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

function walkDirectories(rootDir: string, out: string[] = []): string[] {
	if (!existsSync(rootDir)) return out;
	out.push(rootDir);
	for (const ent of readdirSync(rootDir, { withFileTypes: true })) {
		if (ent.isDirectory()) walkDirectories(join(rootDir, ent.name), out);
	}
	return out;
}

function auditFolderCapsAndBarrels(srcRoot: string, docsRoot: string): { folderCapViolations: string[]; missingBarrelViolations: string[] } {
	const folderCapViolations: string[] = [], missingBarrelViolations: string[] = [];
	for (const root of [srcRoot, docsRoot, 'tests', 'benches']) {
		for (const dir of walkDirectories(root)) {
			if (dir.startsWith(`${docsRoot}/skills`)) continue;
			const directFiles = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile());
			if (directFiles.length > MAX_FILES_PER_FOLDER) folderCapViolations.push(`${dir} (${directFiles.length} > ${MAX_FILES_PER_FOLDER})`);
			if ((dir === srcRoot || dir.startsWith(`${srcRoot}/`)) && !existsSync(join(dir, 'index.ts'))) missingBarrelViolations.push(dir);
		}
	}
	return { folderCapViolations, missingBarrelViolations };
}

function findOrphanedComponents(srcFiles: readonly string[], contents: ReadonlyMap<string, string>): string[] {
	const orphaned: string[] = [];
	for (const comp of srcFiles.filter((f) => f.startsWith('src/client/components/') && f.endsWith('.svelte'))) {
		const name = comp.split('/').pop()!.replace(/\.svelte$/, '');
		let referenced = false;
		for (const [otherPath, content] of contents) {
			if (otherPath !== comp && !otherPath.endsWith('/index.ts') && content.includes(name)) { referenced = true; break; }
		}
		if (!referenced) orphaned.push(comp);
	}
	return orphaned;
}

async function auditDocs(docFiles: readonly string[]): Promise<{ oversizedDocFiles: string[]; docFenceViolations: string[]; docBrandViolations: string[]; blueprintBrandViolations: string[] }> {
	const oversizedDocFiles: string[] = [], docFenceViolations: string[] = [], docBrandViolations: string[] = [], blueprintBrandViolations: string[] = [];
	for (const doc of docFiles) {
		const raw = await Bun.file(doc).text();
		const lineCount = raw.split('\n').length - (raw.endsWith('\n') ? 1 : 0);
		if (lineCount > 100) oversizedDocFiles.push(`${doc} (${lineCount})`);
		if (raw.includes('```') || !hasBalancedLatexDelimiters(raw)) docFenceViolations.push(doc);
		if (BRAND_LEAK_RE.test(raw)) docBrandViolations.push(doc);
		if (doc.includes('07-blueprint/') && BLUEPRINT_BRAND_RE.test(raw)) blueprintBrandViolations.push(doc);
	}
	return { oversizedDocFiles, docFenceViolations, docBrandViolations, blueprintBrandViolations };
}

export async function runCodebaseInvariantAudit(srcRoot = 'src', docsRoot = 'docs'): Promise<InvariantAuditReport> {
	const srcFiles = Array.from(new Bun.Glob('**/*.{ts,svelte,css}').scanSync({ cwd: srcRoot })).map((p) => `${srcRoot}/${p}`);
	const docFiles = Array.from(new Bun.Glob('**/*.md').scanSync({ cwd: docsRoot })).filter((p) => !p.startsWith('skills/')).map((p) => `${docsRoot}/${p}`);
	const oversizedSourceFiles: string[] = [], magicColorViolations: string[] = [], hardcodedVersionViolations: string[] = [];
	const brandLeakViolations: string[] = [], forbiddenSvelteImports: string[] = [], emojiViolations: string[] = [], uiFirewallViolations: string[] = [];
	let totalSrcLines = 0;
	const allSourceContents = new Map<string, string>();

	for (const file of srcFiles) {
		const raw = await Bun.file(file).text();
		allSourceContents.set(file, raw);
		const lineCount = raw.split('\n').length - (raw.endsWith('\n') ? 1 : 0);
		totalSrcLines += lineCount;
		if (lineCount > 150) oversizedSourceFiles.push(`${file} (${lineCount})`);
		if ((file.startsWith('src/client/') || file.startsWith('src/config/') || file.startsWith('src/ui/')) && (file.endsWith('.ts') || file.endsWith('.svelte')) && EMOJI_RE.test(raw)) {
			emojiViolations.push(file);
		}
		if (file.startsWith('src/ui/') && (UI_FIREWALL_IMPORT_RE.test(raw) || UI_FIREWALL_DOMAIN_RE.test(raw))) {
			uiFirewallViolations.push(file);
		}
		if (!file.startsWith('src/config/') && !file.startsWith('src/ui/tokens/') && !file.endsWith('app.css')) {
			const cleaned = raw.replace(/#(ffffff|000000)\b/gi, '');
			if (/["']#[0-9a-fA-F]{6}["']/.test(cleaned)) magicColorViolations.push(file);
			if (file.endsWith('.ts') || file.endsWith('.svelte')) {
				const stripped = stripNonTemplateComments(raw);
				if (/\bv[12]\.\d+\.\d+\b/.test(stripped)) hardcodedVersionViolations.push(file);
				if (file.startsWith('src/client/components/') && file.endsWith('.svelte') && FORBIDDEN_SVELTE_RE.test(stripped)) forbiddenSvelteImports.push(file);
			}
		}
		if (!file.endsWith('invariant.auditor.ts') && BRAND_LEAK_RE.test(raw)) brandLeakViolations.push(file);
	}

	const orphanedComponentFiles = findOrphanedComponents(srcFiles, allSourceContents);
	const { oversizedDocFiles, docFenceViolations, docBrandViolations, blueprintBrandViolations } = await auditDocs(docFiles);
	const { folderCapViolations, missingBarrelViolations } = auditFolderCapsAndBarrels(srcRoot, docsRoot);
	const hygiene = await runRepoHygieneAudit();
	brandLeakViolations.push(...docBrandViolations);
	const passed =
		oversizedSourceFiles.length === 0 && oversizedDocFiles.length === 0 && docFenceViolations.length === 0 &&
		orphanedComponentFiles.length === 0 && magicColorViolations.length === 0 && hardcodedVersionViolations.length === 0 &&
		brandLeakViolations.length === 0 && folderCapViolations.length === 0 && missingBarrelViolations.length === 0 &&
		blueprintBrandViolations.length === 0 && forbiddenSvelteImports.length === 0 && emojiViolations.length === 0 &&
		uiFirewallViolations.length === 0 && hygiene.violations.length === 0;

	return {
		passed, checkedSourceFiles: srcFiles.length, checkedDocFiles: docFiles.length, totalSrcLines,
		oversizedSourceFiles, oversizedDocFiles, docFenceViolations, orphanedComponentFiles,
		magicColorViolations, hardcodedVersionViolations, brandLeakViolations,
		folderCapViolations, missingBarrelViolations, blueprintBrandViolations, forbiddenSvelteImports,
		emojiViolations, uiFirewallViolations, repoHygieneViolations: hygiene.violations,
	};
}

