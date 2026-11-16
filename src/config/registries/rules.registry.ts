/**
 * @author Oblx <code@oblx.dev>
 * @description Homoiconic declarative CodeCheck governance registry with 17 architectural, complexity, CFG, dominance, OO, and 5-operator dependency rules.
 */
import { CK_THRESHOLDS, HUD_CONFIG } from '../constants';

export const RULE_SEVERITIES = {
	INFO: 'INFO',
	WARN: 'WARN',
	CRITICAL: 'CRITICAL',
	BLOCKER: 'BLOCKER',
} as const;

export type RuleSeverity = (typeof RULE_SEVERITIES)[keyof typeof RULE_SEVERITIES];

export interface CodeCheckRuleSpec {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly category: 'COMPLEXITY' | 'COHESION' | 'COUPLING' | 'CFG_SAFETY' | 'ARCHITECTURE';
	readonly severity: RuleSeverity;
	readonly threshold: number;
	readonly remediationHint: string;
}

export const CODECHECK_RULES_REGISTRY: readonly CodeCheckRuleSpec[] = [
	{ id: 'CHR-001', code: 'MCCABE_WARN', title: 'Elevated Cyclomatic Complexity', category: 'COMPLEXITY', severity: RULE_SEVERITIES.WARN, threshold: HUD_CONFIG.METRIC_THRESHOLDS.COMPLEXITY_WARNING, remediationHint: 'Decompose branching predicates into pure helper functions.' },
	{ id: 'CHR-002', code: 'MCCABE_CRIT', title: 'Critical Cyclomatic Complexity Breach', category: 'COMPLEXITY', severity: RULE_SEVERITIES.BLOCKER, threshold: HUD_CONFIG.METRIC_THRESHOLDS.COMPLEXITY_CRITICAL, remediationHint: 'Extract state machine or dispatch table to bring v(G) below 25.' },
	{ id: 'CHR-003', code: 'HALSTEAD_WARN', title: 'High Halstead Lexical Volume', category: 'COMPLEXITY', severity: RULE_SEVERITIES.WARN, threshold: HUD_CONFIG.METRIC_THRESHOLDS.HALSTEAD_WARNING, remediationHint: 'Reduce distinct operator/operand density per compilation unit.' },
	{ id: 'CHR-004', code: 'HALSTEAD_CRIT', title: 'Excessive Halstead Cognitive Effort', category: 'COMPLEXITY', severity: RULE_SEVERITIES.CRITICAL, threshold: HUD_CONFIG.METRIC_THRESHOLDS.HALSTEAD_CRITICAL, remediationHint: 'Split dense algorithmic module into smaller pure transforms.' },
	{ id: 'CHR-005', code: 'LOC_BUDGET', title: 'Entity Exceeds Line Budget', category: 'COMPLEXITY', severity: RULE_SEVERITIES.WARN, threshold: 150, remediationHint: 'Enforce <= 150 LoC per file and <= 42 LoC per function.' },
	{ id: 'CHR-006', code: 'CFG_UNREACHABLE', title: 'Unreachable Dead Basic Block After Return/Throw', category: 'CFG_SAFETY', severity: RULE_SEVERITIES.BLOCKER, threshold: 1, remediationHint: 'Remove dead statements following unconditional return, throw, break, or continue.' },
	{ id: 'CHR-007', code: 'LCOM4_SPLIT', title: 'Low Cohesion Class/Module (LCOM4 >= 2)', category: 'COHESION', severity: RULE_SEVERITIES.WARN, threshold: HUD_CONFIG.METRIC_THRESHOLDS.LCOM_WARNING, remediationHint: 'Split disconnected method/field components into separate cohesive units.' },
	{ id: 'CHR-008', code: 'GOD_CLASS', title: 'God Class Detected (High WMC + Low Cohesion)', category: 'COHESION', severity: RULE_SEVERITIES.CRITICAL, threshold: CK_THRESHOLDS.WMC_CRITICAL, remediationHint: 'Extract domain responsibilities; class combines high WMC with LCOM4 > 1.' },
	{ id: 'CHR-009', code: 'CK_DIT_DEEP', title: 'Deep Inheritance Hierarchy (DIT Breach)', category: 'COUPLING', severity: RULE_SEVERITIES.WARN, threshold: CK_THRESHOLDS.DIT_WARNING, remediationHint: 'Prefer composition and hexagonal ports over deep inheritance chains.' },
	{ id: 'CHR-010', code: 'CK_CBO_HIGH', title: 'Excessive Coupling Between Objects (CBO)', category: 'COUPLING', severity: RULE_SEVERITIES.CRITICAL, threshold: CK_THRESHOLDS.CBO_CRITICAL, remediationHint: 'Invert dependencies via interfaces to reduce direct object fan-out.' },
	{ id: 'CHR-011', code: 'CK_RFC_HIGH', title: 'High Response For a Class (RFC)', category: 'COUPLING', severity: RULE_SEVERITIES.WARN, threshold: CK_THRESHOLDS.RFC_WARNING, remediationHint: 'Narrow the public method surface and outbound call fan-out.' },
	{ id: 'CHR-012', code: 'SCC_CYCLE', title: 'Tarjan Strongly Connected Dependency Cycle', category: 'ARCHITECTURE', severity: RULE_SEVERITIES.CRITICAL, threshold: 2, remediationHint: 'Break mutual recursion or circular module imports via shared contract ring.' },
	{ id: 'CHR-013', code: 'MAIN_SEQ_PAIN', title: 'Martin Zone of Pain / Uselessness Breach (D)', category: 'ARCHITECTURE', severity: RULE_SEVERITIES.WARN, threshold: CK_THRESHOLDS.MAIN_SEQUENCE_WARNING, remediationHint: 'Balance Abstractness (A) and Instability (I) toward the Main Sequence (A + I = 1).' },
	{ id: 'CHR-014', code: 'LAYER_VIOLATION', title: 'Hexagonal Onion Ring Inward Dependency Violation', category: 'ARCHITECTURE', severity: RULE_SEVERITIES.BLOCKER, threshold: 1, remediationHint: 'Inner rings (Config/Core) must never depend on outer rings (Client/HUD).' },
	{ id: 'CHR-015', code: 'STATE_MUTATION_HOTSPOT', title: 'High In-Place State Mutation Density (MODIFIES)', category: 'CFG_SAFETY', severity: RULE_SEVERITIES.INFO, threshold: 4, remediationHint: 'Replace in-place mutations (+=, .push, .splice) with immutable value transforms.' },
	{ id: 'CHR-016', code: 'UNINITIALIZED_VARIABLE_READ', title: 'Read-Before-Set Uninitialized Variable / Field Access', category: 'CFG_SAFETY', severity: RULE_SEVERITIES.CRITICAL, threshold: 1, remediationHint: 'Ensure every READ_USES basic block in the CFG is dominated by an INITIAL_SETS block.' },
	{ id: 'CHR-017', code: 'ARCH_DEPENDENCY_OPERATOR_BREACH', title: '5-Operator Architecture Rule Enforcement Breach', category: 'ARCHITECTURE', severity: RULE_SEVERITIES.BLOCKER, threshold: 1, remediationHint: 'Satisfy NO_CIRCULAR_CHILDREN, CAN_ONLY_DEPEND_ON, CAN_ONLY_BE_DEPENDED_ON_BY, CANNOT_DEPEND_ON, and CANNOT_DIRECTLY_DEPEND_ON constraints.' },
] as const;
