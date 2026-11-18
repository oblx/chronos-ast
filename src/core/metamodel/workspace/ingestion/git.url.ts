/**
 * @author Oblx <code@oblx.dev>
 * @description Universal multi-forge Git URL normalizer & archive resolver supporting GitHub, GitLab subgroups, Bitbucket, Codeberg/Forgejo/Gitea, SourceHut, and self-hosted HTTPS.
 */
import { computeProjectIdentity } from '@core/metamodel/project.identity';

export type GitForgeKind = 'GITHUB' | 'GITLAB' | 'BITBUCKET' | 'GITEA' | 'SOURCEHUT' | 'GENERIC_GIT';

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

const TREE_MARKERS = ['tree', 'src'] as const;

function detectForge(host: string, explicit?: GitForgeKind): GitForgeKind {
	if (explicit) return explicit;
	const lower = host.toLowerCase().split(':')[0] ?? '';
	if (lower === 'github.com' || lower.endsWith('.github.com')) return 'GITHUB';
	if (lower === 'gitlab.com' || lower.includes('gitlab')) return 'GITLAB';
	if (lower === 'bitbucket.org' || lower.includes('bitbucket')) return 'BITBUCKET';
	if (lower === 'git.sr.ht' || lower.endsWith('.sr.ht')) return 'SOURCEHUT';
	if (lower.includes('gitea') || lower === 'codeberg.org' || lower.includes('forgejo')) return 'GITEA';
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
	if (forge === 'GITLAB') return [`https://${host}/${owner}/${repo}/-/archive/${safeRef}/${repo}-${safeRef}.zip`];
	if (forge === 'BITBUCKET') return [`https://${host}/${owner}/${repo}/get/${safeRef}.zip`];
	if (forge === 'GITEA') {
		return [
			`https://${host}/api/v1/repos/${owner}/${repo}/archive/${safeRef}.zip`,
			`https://${host}/${owner}/${repo}/archive/${safeRef}.zip`,
		];
	}
	return [];
}

function parseShorthandInput(raw: string): { host: string; owner: string; repo: string; ref: string; forge?: GitForgeKind } | null {
	const hostMap: Record<string, { host: string; forge: GitForgeKind }> = {
		github: { host: 'github.com', forge: 'GITHUB' }, gitlab: { host: 'gitlab.com', forge: 'GITLAB' },
		bitbucket: { host: 'bitbucket.org', forge: 'BITBUCKET' }, codeberg: { host: 'codeberg.org', forge: 'GITEA' },
		sourcehut: { host: 'git.sr.ht', forge: 'SOURCEHUT' }, srht: { host: 'git.sr.ht', forge: 'SOURCEHUT' },
	};
	const std = raw.match(/^(github|gitlab|bitbucket|codeberg|sourcehut|srht):(.+?)\/([^/@#\s]+?)(?:[@#]([^\s]+))?$/i);
	if (std) {
		const spec = hostMap[std[1]!.toLowerCase()]!;
		return { host: spec.host, owner: std[2]!, repo: std[3]!.replace(/\.git$/i, ''), ref: std[4] || 'main', forge: spec.forge };
	}
	const giteaMatch = raw.match(/^gitea:([^/\s]+)\/(.+?)\/([^/@#\s]+?)(?:[@#]([^\s]+))?$/i);
	if (giteaMatch) return { host: giteaMatch[1]!, owner: giteaMatch[2]!, repo: giteaMatch[3]!.replace(/\.git$/i, ''), ref: giteaMatch[4] || 'main', forge: 'GITEA' };
	return null;
}

function splitUrlRepoAndRef(parts: readonly string[]): { repoParts: readonly string[]; refToken: string; subpath: string } {
	const dashIdx = parts.indexOf('-');
	if (dashIdx >= 2 && (parts[dashIdx + 1] === 'tree' || parts[dashIdx + 1] === 'blob') && parts[dashIdx + 2]) {
		return { repoParts: parts.slice(0, dashIdx), refToken: parts[dashIdx + 2]!, subpath: parts.slice(dashIdx + 3).join('/') };
	}
	for (const marker of TREE_MARKERS) {
		const idx = parts.indexOf(marker);
		if (idx >= 2 && parts[idx + 1]) {
			return { repoParts: parts.slice(0, idx), refToken: parts[idx + 1]!, subpath: parts.slice(idx + 2).join('/') };
		}
	}
	return { repoParts: parts, refToken: '', subpath: '' };
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
		const parts = url.pathname.split('/').filter(Boolean);
		if (parts.length < 2) throw new Error('Git URL must include /<owner>/<repo>.');
		const parsed = splitUrlRepoAndRef(parts);
		owner = parsed.repoParts.slice(0, -1).join('/');
		repo = parsed.repoParts[parsed.repoParts.length - 1]!.replace(/\.git$/i, '');
		subpath = parsed.subpath;
		ref = branchOverride?.trim() || parsed.refToken || (url.hash ? url.hash.slice(1).trim() : '') || 'main';
	}
	const forge = detectForge(host, explicitForge);
	const cloneUrl = `https://${host}/${owner}/${repo}.git`;
	const identity = computeProjectIdentity({ kind: 'GIT', name: `${repo}@${ref}`, sourceOrigin: cloneUrl, branchOrRef: ref });
	return {
		forge, host, owner, repo, ref, subpath, cloneUrl, archiveUrls: buildArchiveCandidates(forge, host, owner, repo, ref),
		projectIdentityKey: identity.projectIdentityKey, workspaceName: `${owner}/${repo}#${ref}`,
	};
}

export const parseRemoteGitUrl = parseGitSourceDescriptor;
