/**
 * @author Oblx <code@oblx.dev>
 * @description Telemetry log/error sanitizer and JSON prototype-pollution stripper re-exporting unified crypto codec primitives.
 */
import {
	base64UrlToBytes,
	bytesToBase64Url,
	bytesToHex,
	timingSafeEqualBytes,
} from '@core/security/crypto.primitives';

const SECRET_FIELD_PATTERN = /([?&](?:token|key|secret|password|code|signature)=)[^&\s"']+/gi;
const BEARER_PATTERN = /(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const PAT_PATTERN = /chr_live_[A-Za-z0-9_-]+/g;
const URL_USERINFO_PATTERN = /(https?:\/\/)([^:@/\s]+):([^@/\s]+)@/gi;
const AUTH_HEADER_PATTERN = /(Authorization["':\s]+)[^\n,;"}]+/gi;
const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeTelemetryPayload(raw: string): string {
	return raw
		.replace(PAT_PATTERN, 'chr_live_[REDACTED]')
		.replace(BEARER_PATTERN, '$1[REDACTED]')
		.replace(URL_USERINFO_PATTERN, '$1[REDACTED]:[REDACTED]@')
		.replace(AUTH_HEADER_PATTERN, '$1[REDACTED]')
		.replace(SECRET_FIELD_PATTERN, '$1[REDACTED]');
}

export function sanitizeJsonKeys<T>(input: T): T {
	if (input === null || typeof input !== 'object') return input;
	if (Array.isArray(input)) return input.map((item) => sanitizeJsonKeys(item)) as unknown as T;
	const clean: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
		if (!DANGEROUS_OBJECT_KEYS.has(k)) clean[k] = sanitizeJsonKeys(v);
	}
	return clean as T;
}

export function parseSafeJson<T = Record<string, unknown>>(rawJson: string): T {
	return sanitizeJsonKeys(JSON.parse(rawJson) as T);
}

export const constantTimeEqualBytes = timingSafeEqualBytes;
export const toBase64Url = bytesToBase64Url;
export const fromBase64Url = base64UrlToBytes;
export const toHex = bytesToHex;
