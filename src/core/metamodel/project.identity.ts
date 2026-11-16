/**
 * @author Oblx <code@oblx.dev>
 * @description Deterministic project fingerprint (projectIdentityKey), canonical slug/id derivation, and SHA-256 origin digesting for idempotent upsert.
 */
import { WORKSPACE_DEFAULTS } from '@config/constants';
import { computeDeterministicChecksum } from '@lib/utils/byte_formatter';

export type ProjectOriginKind = 'CORE' | 'PRESET' | 'ZIP' | 'LOCAL' | 'REMOTE' | 'GIT' | 'BUNDLE';

export interface ProjectIdentityInput {
	readonly kind: ProjectOriginKind;
	readonly name: string;
	readonly sourceOrigin?: string;
	readonly branchOrRef?: string;
	readonly customSlug?: string;
}

export interface ProjectIdentityDescriptor {
	readonly projectIdentityKey: string;
	readonly workspaceId: string;
	readonly slug: string;
	readonly normalizedOrigin: string;
}

export function normalizeSlug(raw: string, fallback = 'workspace'): string {
	const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
	return cleaned || fallback;
}

export function normalizeCanonicalOrigin(input: ProjectIdentityInput): string {
	const ref = (input.branchOrRef ?? 'main').trim().toLowerCase() || 'main';
	const raw = (input.sourceOrigin ?? input.name).trim();
	if (input.kind === 'CORE') return 'core://chronos-core';
	if (input.kind === 'PRESET') return `preset://${raw.toUpperCase()}`;
	if (input.kind === 'GIT') {
		const cleanedUrl = raw.replace(/\.git$/i, '').replace(/\/+$/, '').toLowerCase();
		return `git://${cleanedUrl}#${ref}`;
	}
	if (input.kind === 'REMOTE') {
		return `remote://${raw.replace(/\/+$/, '').toLowerCase()}`;
	}
	return `${input.kind.toLowerCase()}://${normalizeSlug(raw)}`;
}

export function computeProjectIdentity(input: ProjectIdentityInput): ProjectIdentityDescriptor {
	if (input.kind === 'CORE') {
		return {
			projectIdentityKey: 'core:chronos-core',
			workspaceId: WORKSPACE_DEFAULTS.CORE_ID,
			slug: 'chronos-core',
			normalizedOrigin: 'core://chronos-core',
		};
	}
	const normalizedOrigin = normalizeCanonicalOrigin(input);
	const hashA = computeDeterministicChecksum(normalizedOrigin);
	const hashB = computeDeterministicChecksum(`${normalizedOrigin}::chronos-v240`);
	const slug = normalizeSlug(input.customSlug || input.name, `proj-${hashA}`);
	const prefix = input.kind === 'PRESET' ? 'ws-preset' : `ws-${input.kind.toLowerCase()}`;
	return {
		projectIdentityKey: `${input.kind.toLowerCase()}:${hashA}${hashB}`,
		workspaceId: `${prefix}-${slug.slice(0, 18)}-${hashA}`,
		slug,
		normalizedOrigin,
	};
}

export async function computeOriginSha256Hex(normalizedOrigin: string): Promise<string> {
	const bytes = new TextEncoder().encode(normalizedOrigin);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
