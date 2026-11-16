/**
 * @author Oblx <code@oblx.dev>
 * @description Declarative virtual architecture clustering (.arch), grouping modes (DIRECTORY, LANGUAGE, CALENDAR_RECENCY), and 5-operator dependency enforcement.
 */
import { detectLanguageFromPath } from '@core/ast/parsers';
import { ARCH_RECENCY_THRESHOLDS_DAYS } from '../constants';
import { ENTITY_KINDS, extractFileScopePrefix, type EntityKind } from '../metamodel.constants';

export const ARCH_GROUPING_MODES = {
	DIRECTORY: 'DIRECTORY',
	CUSTOM_RULES: 'CUSTOM_RULES',
	LANGUAGE: 'LANGUAGE',
	CALENDAR_RECENCY: 'CALENDAR_RECENCY',
} as const;
export type ArchGroupingMode = (typeof ARCH_GROUPING_MODES)[keyof typeof ARCH_GROUPING_MODES];

export const RECENCY_BUCKETS = {
	TODAY: 'TODAY',
	THIS_WEEK: 'THIS_WEEK',
	THIS_MONTH: 'THIS_MONTH',
	THIS_QUARTER: 'THIS_QUARTER',
	EARLIER: 'EARLIER',
} as const;
export type RecencyBucket = (typeof RECENCY_BUCKETS)[keyof typeof RECENCY_BUCKETS];

export const ARCH_DEPENDENCY_OPERATORS = {
	NO_CIRCULAR_CHILDREN: 'NO_CIRCULAR_CHILDREN',
	CAN_ONLY_DEPEND_ON: 'CAN_ONLY_DEPEND_ON',
	CAN_ONLY_BE_DEPENDED_ON_BY: 'CAN_ONLY_BE_DEPENDED_ON_BY',
	CANNOT_DEPEND_ON: 'CANNOT_DEPEND_ON',
	CANNOT_DIRECTLY_DEPEND_ON: 'CANNOT_DIRECTLY_DEPEND_ON',
} as const;
export type ArchDependencyOperator = (typeof ARCH_DEPENDENCY_OPERATORS)[keyof typeof ARCH_DEPENDENCY_OPERATORS];

export interface ArchDependencyRuleSpec {
	readonly id: string;
	readonly operator: ArchDependencyOperator;
	readonly sourceLayerId: string;
	readonly targetLayerIds: readonly string[];
}

export interface VirtualArchitectureLayer {
	readonly id: string;
	readonly label: string;
	readonly ringOrder: number;
	readonly pathPrefixes: readonly string[];
	readonly entityKinds?: readonly EntityKind[];
	readonly allowedOutboundLayerIds: readonly string[];
}

export const VIRTUAL_ARCHITECTURE_LAYERS: readonly VirtualArchitectureLayer[] = [
	{ id: 'RING_0_CONFIG', label: 'Ring 0 // Config & Schemas', ringOrder: 0, pathPrefixes: ['src/config/'], allowedOutboundLayerIds: ['RING_0_CONFIG'] },
	{ id: 'RING_1_CORE', label: 'Ring 1 // AST, Graph & Metrics Core', ringOrder: 1, pathPrefixes: ['src/core/ast/', 'src/core/graph/', 'src/core/metrics/'], allowedOutboundLayerIds: ['RING_0_CONFIG', 'RING_1_CORE', 'RING_2_METAMODEL_DB', 'RING_3_PLUGINS_WORKERS'] },
	{ id: 'RING_2_METAMODEL_DB', label: 'Ring 2 // Metamodel & Persistence', ringOrder: 2, pathPrefixes: ['src/core/metamodel/', 'src/lib/'], allowedOutboundLayerIds: ['RING_0_CONFIG', 'RING_1_CORE', 'RING_2_METAMODEL_DB', 'RING_3_PLUGINS_WORKERS'] },
	{ id: 'RING_3_PLUGINS_WORKERS', label: 'Ring 3 // Language Plugins & Workers', ringOrder: 3, pathPrefixes: ['src/plugins/', 'src/workers/'], allowedOutboundLayerIds: ['RING_0_CONFIG', 'RING_1_CORE', 'RING_2_METAMODEL_DB', 'RING_3_PLUGINS_WORKERS'] },
	{ id: 'RING_4_CLIENT_HUD', label: 'Ring 4 // Tactical HUD & API Ingress', ringOrder: 4, pathPrefixes: ['src/client/', 'src/core/api/'], allowedOutboundLayerIds: ['RING_0_CONFIG', 'RING_1_CORE', 'RING_2_METAMODEL_DB', 'RING_3_PLUGINS_WORKERS', 'RING_4_CLIENT_HUD'] },
	{ id: 'EXTERNAL_WORKSPACE', label: 'External // Ingested Subsystem', ringOrder: 5, pathPrefixes: [''], entityKinds: Object.values(ENTITY_KINDS), allowedOutboundLayerIds: ['RING_0_CONFIG', 'RING_1_CORE', 'RING_2_METAMODEL_DB', 'RING_3_PLUGINS_WORKERS', 'RING_4_CLIENT_HUD', 'EXTERNAL_WORKSPACE'] },
] as const;

export const DEFAULT_ARCH_DEPENDENCY_RULES: readonly ArchDependencyRuleSpec[] = [
	{ id: 'ARCH-OP-1', operator: ARCH_DEPENDENCY_OPERATORS.CAN_ONLY_DEPEND_ON, sourceLayerId: 'RING_0_CONFIG', targetLayerIds: ['RING_0_CONFIG'] },
	{ id: 'ARCH-OP-2', operator: ARCH_DEPENDENCY_OPERATORS.CANNOT_DEPEND_ON, sourceLayerId: 'RING_1_CORE', targetLayerIds: ['RING_4_CLIENT_HUD'] },
	{ id: 'ARCH-OP-3', operator: ARCH_DEPENDENCY_OPERATORS.CANNOT_DIRECTLY_DEPEND_ON, sourceLayerId: 'RING_2_METAMODEL_DB', targetLayerIds: ['RING_4_CLIENT_HUD'] },
	{ id: 'ARCH-OP-4', operator: ARCH_DEPENDENCY_OPERATORS.CAN_ONLY_BE_DEPENDED_ON_BY, sourceLayerId: 'RING_4_CLIENT_HUD', targetLayerIds: ['RING_4_CLIENT_HUD', 'EXTERNAL_WORKSPACE'] },
	{ id: 'ARCH-OP-5', operator: ARCH_DEPENDENCY_OPERATORS.NO_CIRCULAR_CHILDREN, sourceLayerId: 'RING_1_CORE', targetLayerIds: ['RING_1_CORE'] },
] as const;

export function resolveVirtualLayerForEntity(qualifiedName: string): VirtualArchitectureLayer {
	const cleanPath = extractFileScopePrefix(qualifiedName);
	for (const layer of VIRTUAL_ARCHITECTURE_LAYERS) {
		if (layer.id === 'EXTERNAL_WORKSPACE') continue;
		if (layer.pathPrefixes.some((prefix) => cleanPath.startsWith(prefix))) return layer;
	}
	return VIRTUAL_ARCHITECTURE_LAYERS[VIRTUAL_ARCHITECTURE_LAYERS.length - 1]!;
}

export function resolveArchitectureGroupLabel(qualifiedName: string, mode: ArchGroupingMode = ARCH_GROUPING_MODES.CUSTOM_RULES, modifiedDaysAgo = 0): string {
	const cleanPath = extractFileScopePrefix(qualifiedName);
	if (mode === ARCH_GROUPING_MODES.DIRECTORY) return cleanPath.split('/').slice(0, 2).join('/') || 'root';
	if (mode === ARCH_GROUPING_MODES.LANGUAGE) return `LANG // ${detectLanguageFromPath(cleanPath)}`;
	if (mode === ARCH_GROUPING_MODES.CALENDAR_RECENCY) {
		if (modifiedDaysAgo <= ARCH_RECENCY_THRESHOLDS_DAYS.TODAY) return RECENCY_BUCKETS.TODAY;
		if (modifiedDaysAgo <= ARCH_RECENCY_THRESHOLDS_DAYS.THIS_WEEK) return RECENCY_BUCKETS.THIS_WEEK;
		if (modifiedDaysAgo <= ARCH_RECENCY_THRESHOLDS_DAYS.THIS_MONTH) return RECENCY_BUCKETS.THIS_MONTH;
		if (modifiedDaysAgo <= ARCH_RECENCY_THRESHOLDS_DAYS.THIS_QUARTER) return RECENCY_BUCKETS.THIS_QUARTER;
		return RECENCY_BUCKETS.EARLIER;
	}
	return resolveVirtualLayerForEntity(qualifiedName).label;
}

export function evaluateArchDependencyOperatorEdge(
	srcLayerId: string,
	dstLayerId: string,
	isCyclicEdge: boolean,
	rules: readonly ArchDependencyRuleSpec[] = DEFAULT_ARCH_DEPENDENCY_RULES
): ArchDependencyRuleSpec | null {
	for (const r of rules) {
		if (r.operator === ARCH_DEPENDENCY_OPERATORS.NO_CIRCULAR_CHILDREN && r.sourceLayerId === srcLayerId && srcLayerId === dstLayerId && isCyclicEdge) return r;
		if (r.operator === ARCH_DEPENDENCY_OPERATORS.CAN_ONLY_DEPEND_ON && r.sourceLayerId === srcLayerId && !r.targetLayerIds.includes(dstLayerId)) return r;
		if (r.operator === ARCH_DEPENDENCY_OPERATORS.CAN_ONLY_BE_DEPENDED_ON_BY && r.sourceLayerId === dstLayerId && !r.targetLayerIds.includes(srcLayerId)) return r;
		if ((r.operator === ARCH_DEPENDENCY_OPERATORS.CANNOT_DEPEND_ON || r.operator === ARCH_DEPENDENCY_OPERATORS.CANNOT_DIRECTLY_DEPEND_ON) && r.sourceLayerId === srcLayerId && r.targetLayerIds.includes(dstLayerId)) return r;
	}
	return null;
}
