/**
 * @author Oblx <code@oblx.dev>
 * @description Self-contained offline HTML and CSV compliance report exporter pairing CodeCheck violations with signed Deviation Templates.
 */
import { APP_METADATA, HIS_SAFETY_THRESHOLDS } from '@config/constants';
import { HUD_THEME_IDS, HUD_THEME_PRESETS } from '@config/themes/presets.registry';
import type { AuditAnnotationRecord, CodeCheckViolation } from '@core/metrics/codecheck.engine';

function escapeCsvCell(value: string | number | null | undefined): string {
	const raw = String(value ?? '');
	return raw.includes(',') || raw.includes('"') || raw.includes('\n') ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function exportComplianceCsvReport(
	violations: readonly CodeCheckViolation[],
	annotations: readonly AuditAnnotationRecord[]
): string {
	const headers = ['RecordType', 'RuleId', 'Severity', 'QualifiedName', 'Line', 'TemplateId', 'Reviewer', 'TicketId', 'MessageOrRationale'];
	const rows: string[] = [headers.join(',')];

	for (const v of violations) {
		rows.push(
			['VIOLATION', v.ruleId, v.severity, v.qualifiedName, v.line, '', '', '', v.message].map(escapeCsvCell).join(',')
		);
	}
	for (const a of annotations) {
		rows.push(
			['DEVIATION_ATN', a.ruleCode ?? '*', a.tagKind, a.qualifiedName, 1, a.templateId ?? 'CUSTOM', a.reviewer ?? a.author, a.ticketId ?? '', a.note].map(escapeCsvCell).join(',')
		);
	}
	return rows.join('\n');
}

export function exportComplianceHtmlReport(
	workspaceName: string,
	violations: readonly CodeCheckViolation[],
	annotations: readonly AuditAnnotationRecord[]
): string {
	const theme = HUD_THEME_PRESETS[HUD_THEME_IDS.OBSIDIAN_CYBER];
	const violationRows = violations
		.map(
			(v) =>
				`<tr><td>${v.ruleId}</td><td>${v.severity}</td><td>${v.qualifiedName}</td><td>L${v.line}</td><td>${v.message}</td></tr>`
		)
		.join('\n\t\t\t');

	const deviationRows = annotations
		.map(
			(a) =>
				`<tr><td>${a.templateId ?? a.tagKind}</td><td>${a.ruleCode ?? '*'}</td><td>${a.qualifiedName}</td><td>${a.reviewer ?? a.author}</td><td>${a.ticketId ?? 'N/A'}</td><td>${a.note}</td></tr>`
		)
		.join('\n\t\t\t');

	return [
		'<!doctype html>',
		'<html lang="en"><head><meta charset="utf-8"><title>Chronos Compliance Audit Report</title></head>',
		`<body style="font-family:monospace;background:${theme.bgCanvas};color:${theme.textPrimary};padding:24px;">`,
		`\t<h1>${APP_METADATA.NAME} v${APP_METADATA.VERSION} // Forensic &amp; HIS Compliance Report</h1>`,
		`\t<p>Workspace: <strong>${workspaceName}</strong> | Active Violations: <strong>${violations.length}</strong> | Signed Deviations: <strong>${annotations.length}</strong> | HIS Strict v(G) Cap: <strong>${HIS_SAFETY_THRESHOLDS.CYCLOMATIC_STRICT_MAX}</strong></p>`,
		'\t<h2>1. Unsuppressed CodeCheck Violations (CHR-001 .. CHR-016)</h2>',
		'\t<table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Rule</th><th>Severity</th><th>Entity</th><th>Line</th><th>Diagnostic</th></tr></thead><tbody>',
		`\t\t\t${violationRows || '<tr><td colspan="5">Zero active violations.</td></tr>'}`,
		'\t</tbody></table>',
		'\t<h2>2. Signed Deviation Approvals &amp; Audit Trail (Atn)</h2>',
		'\t<table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Template</th><th>Rule</th><th>Entity</th><th>Reviewer</th><th>Ticket</th><th>Rationale</th></tr></thead><tbody>',
		`\t\t\t${deviationRows || '<tr><td colspan="6">No deviations recorded.</td></tr>'}`,
		'\t</tbody></table>',
		'</body></html>',
	].join('\n');
}
