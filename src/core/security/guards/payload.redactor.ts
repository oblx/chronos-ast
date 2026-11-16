/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.7.0 Outbound AI & Git Payload Privacy Redactor masking secrets, PEM blocks, DSNs, and PII before egress.
 */

export const REDACTED_SECRET_TOKEN = '[REDACTED_SECRET]' as const;

export interface PayloadRedactionResult {
	readonly redactedText: string;
	readonly redactionCount: number;
	readonly shieldActive: boolean;
}

const REDACTION_PATTERNS: ReadonlyArray<{ readonly regex: RegExp; readonly replacement: string }> = [
	{
		regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
		replacement: REDACTED_SECRET_TOKEN,
	},
	{
		regex: /\b(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{16,}|glpat-[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{16,}|AIza[A-Za-z0-9_-]{20,}|chr_live_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,})\b/g,
		replacement: REDACTED_SECRET_TOKEN,
	},
	{
		regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi,
		replacement: `Bearer ${REDACTED_SECRET_TOKEN}`,
	},
	{
		regex: /\b(?:postgres(?:ql)?|mysql|redis|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/gi,
		replacement: REDACTED_SECRET_TOKEN,
	},
	{
		regex: /\b([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASS|PRIVATE_KEY|API_KEY|PEPPER)[A-Z0-9_]*)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"']+)/g,
		replacement: `$1=${REDACTED_SECRET_TOKEN}`,
	},
	{
		regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
		replacement: REDACTED_SECRET_TOKEN,
	},
];

export function redactOutboundPayload(rawText: string): PayloadRedactionResult {
	let output = String(rawText ?? '');
	let count = 0;
	for (const rule of REDACTION_PATTERNS) {
		output = output.replace(rule.regex, (...args) => {
			count += 1;
			if (rule.replacement.includes('$1') && typeof args[1] === 'string') {
				return `${args[1]}=${REDACTED_SECRET_TOKEN}`;
			}
			return rule.replacement;
		});
	}
	return {
		redactedText: output,
		redactionCount: count,
		shieldActive: true,
	};
}

export function redactSourceFilesMap(
	files: ReadonlyArray<{ readonly path: string; readonly content: string }>
): ReadonlyArray<{ readonly path: string; readonly content: string }> {
	return files.map((file) => ({
		path: file.path,
		content: redactOutboundPayload(file.content).redactedText,
	}));
}
