/**
 * @author Oblx <code@oblx.dev>
 * @description Stage 3 Schema-Driven Recursive Backend Sanitizer & Outbound RBAC Scrubber (v2.6.0).
 */
import { CAPABILITY_BITS, ROLE_IDS } from '@config/security.constants';
import { hasCapability } from '@core/security/rbac.bitmask';

const PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const RAW_CODE_KEYS = new Set(['sourceCode', 'code', 'bundleJson', 'dsl', 'mermaidDraftDsl', 'payloadJson']);
const CONTROL_CHAR_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const INJECTION_SEQ_RE = /(?:javascript:|vbscript:|data:text\/html|\$\{|\b(?:DROP|ALTER|TRUNCATE)\s+TABLE\b)/gi;

export interface SanitizeOptions {
	readonly maxDepth?: number;
	readonly maxStringLen?: number;
	readonly preserveCodeFields?: boolean;
}

export function sanitizeInputString(raw: string, opts: { rawCode?: boolean; maxLen?: number } = {}): string {
	const normalized = raw.normalize('NFC').replace(CONTROL_CHAR_RE, '');
	const bounded = normalized.slice(0, opts.maxLen ?? 120_000);
	if (opts.rawCode) return bounded;
	return bounded.replace(HTML_TAG_RE, '').replace(INJECTION_SEQ_RE, '').trim();
}

export function clampNumericBound(val: number, min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): number {
	if (!Number.isFinite(val)) return 0;
	return Math.max(min, Math.min(max, val));
}

export function sanitizeInboundPayload(input: unknown, opts: SanitizeOptions = {}, depth = 0, keyHint = ''): unknown {
	const maxDepth = opts.maxDepth ?? 8;
	if (depth > maxDepth) return null;
	if (typeof input === 'string') {
		const rawCode = Boolean(opts.preserveCodeFields ?? true) && RAW_CODE_KEYS.has(keyHint);
		return sanitizeInputString(input, { rawCode, maxLen: opts.maxStringLen });
	}
	if (typeof input === 'number') return clampNumericBound(input);
	if (typeof input === 'boolean' || input === null || input === undefined) return input;
	if (Array.isArray(input)) {
		return input.slice(0, 512).map((item) => sanitizeInboundPayload(item, opts, depth + 1, keyHint));
	}
	if (typeof input === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
			if (PROTOTYPE_KEYS.has(k)) continue;
			const safeKey = sanitizeInputString(k, { maxLen: 64 });
			if (!safeKey || PROTOTYPE_KEYS.has(safeKey)) continue;
			out[safeKey] = sanitizeInboundPayload(v, opts, depth + 1, safeKey);
		}
		return out;
	}
	return null;
}

export function sanitizeOutboundForPrincipal<T>(
	payload: T,
	effectiveMask: number,
	roleId: string = ROLE_IDS.GUEST
): T {
	if (!payload || typeof payload !== 'object') return payload;
	if (Array.isArray(payload)) {
		return payload.map((item) => sanitizeOutboundForPrincipal(item, effectiveMask, roleId)) as unknown as T;
	}
	const canAudit = hasCapability(effectiveMask, CAPABILITY_BITS.AUDIT_LOG_READ);
	const canVault = hasCapability(effectiveMask, CAPABILITY_BITS.VAULT_SECRET_USE);
	const canCollab = hasCapability(effectiveMask, CAPABILITY_BITS.SYNC_PULL);
	const isAdmin = roleId === ROLE_IDS.ADMIN;
	const clone: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
		if (PROTOTYPE_KEYS.has(k)) continue;
		if (k === 'ciphertextB64' || k === 'ivB64' || k === 'passwordHash' || k === 'providerBearer') continue;
		if (!canVault && (k === 'vaultSecrets' || k === 'secrets')) { clone[k] = []; continue; }
		if (!canAudit && (k === 'auditChain' || k === 'sessions' || k === 'permissionNodes')) { clone[k] = k === 'auditChain' ? { valid: true, count: 0 } : []; continue; }
		if (!canCollab && k === 'roster' && Array.isArray(v)) { clone[k] = []; continue; }
		if (!isAdmin && k === 'groups' && Array.isArray(v)) {
			clone[k] = v.map((g) => (typeof g === 'object' && g !== null ? { name: (g as Record<string, unknown>).name, roleId: (g as Record<string, unknown>).roleId } : g));
			continue;
		}
		clone[k] = typeof v === 'object' && v !== null ? sanitizeOutboundForPrincipal(v, effectiveMask, roleId) : v;
	}
	return clone as T;
}
