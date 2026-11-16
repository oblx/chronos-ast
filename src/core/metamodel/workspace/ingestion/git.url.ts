/**
 * @author Oblx <code@oblx.dev>
 * @description Universal Git URL normalizer and Tier-1 archive URL resolver supporting HTTPS, /tree/<ref>, github:, gitlab:, and gitea: shorthands.
 */
import { computeProjectIdentity } from '@core/metamodel/project.identity';

export type GitForgeKind = 'GITHUB' | 'GITLAB' | 'GITEA' | 'GENERIC_GIT';

export interface GitSourceDescriptor {
	readonly forge: GitForgeKind;
	readonly host: string;
	readonly owner: string;
	readonly repo: string;
	readonly ref: string;
	readonly subpath: string;
	readonly cloneUrl: string;
	readonly archiveUrls: readonly string[];
	readonly projectIdentityKey: string;
	readonly workspaceName: string;
}

function detectForge(host: string, explicit?: GitForgeKind): GitForgeKind {
	if (explicit) return explicit;
	const lower = host.toLowerCase();
	if (lower.includes('github.com')) return 'GITHUB';
	if (lower.includes('gitlab.com')) return 'GITLAB';
	if (lower.includes('gitea') || lower.includes('codeberg.org') || lower.includes('forgejo')) return 'GITEA';
	return 'GENERIC_GIT';
}

function buildArchiveCandidates(forge: GitForgeKind, host: string, owner: string, repo: string, ref: string): readonly string[] {
	const safeRef = encodeURIComponent(ref);
	if (forge === 'GITHUB') {
		return [
			`https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${safeRef}`,
			`https://codeload.github.com/${owner}/${repo}/zip/refs/tags/${safeRef}`,
		];
	}
	if (forge === 'GITLAB') {
		return [`https://${host}/${owner}/${repo}/-/archive/${safeRef}/${repo}-${safeRef}.zip`];
	}
	if (forge === 'GITEA') {
		return [`https://${host}/api/v1/repos/${owner}/${repo}/archive/${safeRef}.zip`];
	}
	return [];
}

function parseShorthandInput(raw: string): { host: string; owner: string; repo: string; ref: string; forge?: GitForgeKind } | null {
	const ghMatch = raw.match(/^(github|gitlab):([^/@\s]+)\/([^/@#\s]+?)(?:[@#]([^\s]+))?$/i);
	if (ghMatch) {
		const isGl = ghMatch[1]!.toLowerCase() === 'gitlab';
		return { host: isGl ? 'gitlab.com' : 'github.com', owner: ghMatch[2]!, repo: ghMatch[3]!.replace(/\.git$/i, ''), ref: ghMatch[4] || 'main', forge: isGl ? 'GITLAB' : 'GITHUB' };
	}
	const giteaMatch = raw.match(/^gitea:([^/\s]+)\/([^/\s]+)\/([^/@#\s]+?)(?:[@#]([^\s]+))?$/i);
	if (giteaMatch) {
		return { host: giteaMatch[1]!, owner: giteaMatch[2]!, repo: giteaMatch[3]!.replace(/\.git$/i, ''), ref: giteaMatch[4] || 'main', forge: 'GITEA' };
	}
	return null;
}

export function parseGitSourceDescriptor(rawInput: string, branchOverride?: string): GitSourceDescriptor {
	const trimmed = rawInput.trim();
	if (!trimmed) throw new Error('Git repository URL or shorthand is required.');
	let host = '', owner = '', repo = '', ref = branchOverride?.trim() || '', subpath = '', explicitForge: GitForgeKind | undefined;
	const short = parseShorthandInput(trimmed);
	if (short) {
		({ host, owner, repo, forge: explicitForge } = short);
		ref = branchOverride?.trim() || short.ref;
	} else {
		const url = new URL(trimmed);
		if (url.protocol !== 'https:') throw new Error(`Git URL must use HTTPS (${url.protocol} rejected).`);
		host = url.host;
		const hashRef = url.hash ? url.hash.slice(1).trim() : '';
		const parts = url.pathname.split('/').filter(Boolean);
		if (parts.length < 2) throw new Error('Git URL must include /<owner>/<repo>.');
		owner = parts[0]!;
		const treeIdx = parts.indexOf('tree');
		if (treeIdx >= 2 && parts[treeIdx + 1]) {
			repo = parts[1]!.replace(/\.git$/i, '');
			ref = branchOverride?.trim() || parts[treeIdx + 1]!;
			subpath = parts.slice(treeIdx + 2).join('/');
		} else {
			repo = parts[1]!.replace(/\.git$/i, '');
			ref = branchOverride?.trim() || hashRef || 'main';
		}
	}
	const forge = detectForge(host, explicitForge);
	const cloneUrl = `https://${host}/${owner}/${repo}.git`;
	const identity = computeProjectIdentity({ kind: 'GIT', name: `${repo}@${ref}`, sourceOrigin: cloneUrl, branchOrRef: ref });
	return {
		forge, host, owner, repo, ref, subpath, cloneUrl,
		archiveUrls: buildArchiveCandidates(forge, host, owner, repo, ref),
		projectIdentityKey: identity.projectIdentityKey,
		workspaceName: `${owner}/${repo}#${ref}`,
	};
}
