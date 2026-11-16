/**
 * @author Oblx <code@oblx.dev>
 * @description Structured CodeCheck deviation approval templates (ARCHITECTURAL_WAIVER, HIS_COMPLEXITY_EXEMPTION, LEGACY_FREEZE).
 */
import { APP_METADATA } from '../constants';

export const DEVIATION_TEMPLATE_IDS = {
	ARCHITECTURAL_WAIVER: 'ARCHITECTURAL_WAIVER',
	HIS_COMPLEXITY_EXEMPTION: 'HIS_COMPLEXITY_EXEMPTION',
	LEGACY_FREEZE: 'LEGACY_FREEZE',
} as const;

export type DeviationTemplateId = (typeof DEVIATION_TEMPLATE_IDS)[keyof typeof DEVIATION_TEMPLATE_IDS];

export interface DeviationTemplateSpec {
	readonly id: DeviationTemplateId;
	readonly title: string;
	readonly defaultValidityDays: number;
	readonly allowedRulePrefixes: readonly string[];
	readonly requiredApprovalRole: string;
}

export interface StructuredDeviationMetadata {
	readonly templateId: DeviationTemplateId;
	readonly reviewer: string;
	readonly rationale: string;
	readonly ticketId: string;
	readonly expiresAt: number;
}

export const DEVIATION_TEMPLATES_REGISTRY: Readonly<Record<DeviationTemplateId, DeviationTemplateSpec>> = {
	[DEVIATION_TEMPLATE_IDS.ARCHITECTURAL_WAIVER]: {
		id: DEVIATION_TEMPLATE_IDS.ARCHITECTURAL_WAIVER,
		title: 'Architectural Boundary / Cycle Waiver',
		defaultValidityDays: 90,
		allowedRulePrefixes: ['CHR-012', 'CHR-013', 'CHR-014', 'SCC_CYCLE', 'LAYER_VIOLATION', 'MAIN_SEQ_PAIN'],
		requiredApprovalRole: 'Principal Architect',
	},
	[DEVIATION_TEMPLATE_IDS.HIS_COMPLEXITY_EXEMPTION]: {
		id: DEVIATION_TEMPLATE_IDS.HIS_COMPLEXITY_EXEMPTION,
		title: 'HIS Safety Complexity & Control-Flow Exemption',
		defaultValidityDays: 60,
		allowedRulePrefixes: ['CHR-001', 'CHR-002', 'CHR-003', 'CHR-004', 'CHR-006', 'CHR-016', 'MCCABE_WARN', 'MCCABE_CRIT', 'CFG_UNREACHABLE', 'UNINITIALIZED_VARIABLE_READ'],
		requiredApprovalRole: 'Safety Lead',
	},
	[DEVIATION_TEMPLATE_IDS.LEGACY_FREEZE]: {
		id: DEVIATION_TEMPLATE_IDS.LEGACY_FREEZE,
		title: 'Frozen Legacy Module Exemption',
		defaultValidityDays: 180,
		allowedRulePrefixes: ['*'],
		requiredApprovalRole: 'Engineering Director',
	},
} as const;

export function createStructuredDeviationMetadata(
	templateId: DeviationTemplateId,
	rationale: string,
	ticketId: string = 'CHRONOS-AUDIT-001',
	reviewer: string = APP_METADATA.AUTHOR,
	nowMs: number = Date.now()
): StructuredDeviationMetadata {
	const spec = DEVIATION_TEMPLATES_REGISTRY[templateId];
	const msPerDay = 86_400_000;
	return {
		templateId,
		reviewer,
		rationale,
		ticketId,
		expiresAt: nowMs + spec.defaultValidityDays * msPerDay,
	};
}
