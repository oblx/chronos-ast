/**
 * @author Oblx <code@oblx.dev>
 * @description Declarative CodeCheck evaluator (CHR-001..017) driven strictly by CODECHECK_RULES_REGISTRY thresholds with O(V + E) adjacency.
 */
import type { DeviationTemplateId } from '@config/registries/annotation.templates';
import { evaluateArchDependencyOperatorEdge, resolveVirtualLayerForEntity } from '@config/registries/architecture.schema';
import { HIS_SAFETY_THRESHOLDS } from '@config/constants';
import { ANNOTATION_KINDS, ENTITY_KINDS, REFERENCE_KINDS, type AnnotationKind, type EntityKind } from '@config/metamodel.constants';
import { CODECHECK_RULES_REGISTRY, type RuleSeverity } from '@config/registries/rules.registry';
import { buildControlFlowGraph, type ControlFlowGraphProjection } from '@core/ast/cfg.builder';
import type { CfgBasicBlock } from '@core/graph/dominators';
import type { GraphEntityNode, GraphReferenceEdge } from '@core/graph/graph_traversal';
import { computeTarjanScc } from '@core/graph/scc.tarjan';
import { buildSnapshotAdjacency, evaluateMetricBand } from '@core/metamodel/snapshot.helpers';
import { computeChidamberKemererSuite, type EntityCkMetrics } from './oo_metrics.engine';

export interface AuditAnnotationRecord {
	readonly id: number; readonly entityKind: EntityKind; readonly qualifiedName: string; readonly tagKind: AnnotationKind;
	readonly ruleCode: string | null; readonly templateId?: DeviationTemplateId | null; readonly reviewer?: string | null;
	readonly ticketId?: string | null; readonly expiresAt?: number | null; readonly note: string; readonly author: string; readonly createdAt: number;
}

export interface CodeCheckViolation {
	readonly ruleId: string; readonly ruleCode: string; readonly severity: RuleSeverity; readonly entityId: number;
	readonly entityName: string; readonly qualifiedName: string; readonly line: number; readonly message: string;
	readonly remediationHint: string; readonly sourceTool?: string;
}

function isBlockDominatedBy(blockId: number, dominatorCandidateId: number, blockById: ReadonlyMap<number, CfgBasicBlock>): boolean {
	let cursor: number | null = blockId;
	const seen = new Set<number>();
	while (cursor !== null && !seen.has(cursor)) {
		if (cursor === dominatorCandidateId) return true;
		seen.add(cursor);
		cursor = blockById.get(cursor)?.immediateDominatorId ?? null;
	}
	return false;
}

function detectReadBeforeSetInCfg(cfg: ControlFlowGraphProjection): ReadonlyArray<{ readonly varName: string; readonly line: number }> {
	const blockById = new Map(cfg.blocks.map((b) => [b.id, b]));
	const setBlocksByVar = new Map<string, CfgBasicBlock[]>();
	const uninitDeclarations = new Set<string>();
	const findings: Array<{ readonly varName: string; readonly line: number }> = [];

	for (const block of cfg.blocks) {
		if (!block.isReachable) continue;
		const stmt = block.statements[0] ?? '';
		const uninitDecl = stmt.match(/^(?:let|var)\s+([A-Za-z_]\w*)\s*(?::[^=;]+)?;/);
		if (uninitDecl?.[1]) uninitDeclarations.add(uninitDecl[1]);
		for (const setMatch of stmt.matchAll(/\b(?:(?:this|self)\.)?([A-Za-z_]\w*)\s*=(?!=)/g)) {
			const v = setMatch[1];
			if (v) setBlocksByVar.set(v, [...(setBlocksByVar.get(v) ?? []), block]);
		}
	}

	for (const block of cfg.blocks) {
		if (!block.isReachable) continue;
		const stmt = block.statements[0] ?? '';
		for (const useMatch of stmt.matchAll(/\b(?:(?:this|self)\.([A-Za-z_]\w*)|([A-Za-z_]\w*))(?!\s*=(?!=))/g)) {
			const v = useMatch[1] ?? (uninitDeclarations.has(useMatch[2] ?? '') ? useMatch[2] : undefined);
			if (!v) continue;
			const setBlocks = setBlocksByVar.get(v) ?? [];
			const dominatedBySet = setBlocks.some((sb) => sb.lineStart <= block.lineStart && isBlockDominatedBy(block.id, sb.id, blockById));
			if (!dominatedBySet && !(setBlocks.some((sb) => sb.id === block.id) && /^\s*(?:this\.|self\.)?[A-Za-z_]\w*\s*=(?!=)/.test(stmt))) {
				findings.push({ varName: v, line: block.lineStart });
			}
		}
	}
	return findings;
}

export function evaluateWorkspaceCodeCheck(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	sourceMap: Readonly<Record<string, string>>,
	annotations: readonly AuditAnnotationRecord[] = [],
	externalViolations: readonly CodeCheckViolation[] = [],
	useHisSafetyProfile: boolean = false,
	existingCkMap?: Readonly<Record<number, EntityCkMetrics>>
): {
	readonly violations: readonly CodeCheckViolation[];
	readonly suppressedCount: number;
	readonly violationCountByEntityId: Readonly<Record<number, number>>;
} {
	const ckMap = existingCkMap ?? computeChidamberKemererSuite(nodes, edges);
	const scc = computeTarjanScc(nodes, edges);
	const { nodeById, outboundBySourceId } = buildSnapshotAdjacency(nodes, edges);
	const ruleByCode = new Map(CODECHECK_RULES_REGISTRY.map((r) => [r.code, r]));
	const thresholdOf = (code: string): number => ruleByCode.get(code)?.threshold ?? 1;
	const violations: CodeCheckViolation[] = [...externalViolations];
	const violationCountByEntityId: Record<number, number> = {};
	let suppressedCount = 0;

	for (const ext of externalViolations) violationCountByEntityId[ext.entityId] = (violationCountByEntityId[ext.entityId] ?? 0) + 1;

	function pushViolation(code: string, node: GraphEntityNode, actualValue: number | string, line: number = 1): void {
		const spec = ruleByCode.get(code);
		if (!spec) return;
		const isSuppressed = annotations.some(
			(atn) => atn.tagKind === ANNOTATION_KINDS.SUPPRESS_RULE && atn.qualifiedName === node.qualifiedName && (!atn.ruleCode || atn.ruleCode === '*' || atn.ruleCode === spec.code || atn.ruleCode === spec.id)
		);
		if (isSuppressed) { suppressedCount++; return; }
		violations.push({ ruleId: spec.id, ruleCode: spec.code, severity: spec.severity, entityId: node.id, entityName: node.name, qualifiedName: node.qualifiedName, line, message: `${spec.title} (${actualValue} >= ${spec.threshold})`, remediationHint: spec.remediationHint, sourceTool: 'CHRONOS_CODECHECK' });
		violationCountByEntityId[node.id] = (violationCountByEntityId[node.id] ?? 0) + 1;
	}

	const warnMccabe = useHisSafetyProfile ? HIS_SAFETY_THRESHOLDS.CYCLOMATIC_STRICT_MAX : thresholdOf('MCCABE_WARN');
	for (const node of nodes) {
		const ck = ckMap[node.id];
		const ccBand = evaluateMetricBand(node.cyclomatic, warnMccabe, thresholdOf('MCCABE_CRIT'));
		if (ccBand === 'CRIT') pushViolation('MCCABE_CRIT', node, node.cyclomatic);
		else if (ccBand === 'WARN') pushViolation('MCCABE_WARN', node, node.cyclomatic);
		const hvBand = evaluateMetricBand(node.halsteadVolume, thresholdOf('HALSTEAD_WARN'), thresholdOf('HALSTEAD_CRIT'));
		if (hvBand === 'CRIT') pushViolation('HALSTEAD_CRIT', node, node.halsteadVolume);
		else if (hvBand === 'WARN') pushViolation('HALSTEAD_WARN', node, node.halsteadVolume);
		if (node.loc > thresholdOf('LOC_BUDGET')) pushViolation('LOC_BUDGET', node, node.loc);

		const slice = sourceMap[node.qualifiedName];
		if (slice && (node.kind === ENTITY_KINDS.FUNCTION || node.kind === ENTITY_KINDS.METHOD)) {
			const cfg = buildControlFlowGraph(node.qualifiedName, slice, 1);
			if (cfg.unreachableCount >= thresholdOf('CFG_UNREACHABLE')) pushViolation('CFG_UNREACHABLE', node, cfg.unreachableCount);
			for (const uninit of detectReadBeforeSetInCfg(cfg)) pushViolation('UNINITIALIZED_VARIABLE_READ', node, uninit.varName, uninit.line);
		}
		if (ck) {
			if (ck.lcom4 >= thresholdOf('LCOM4_SPLIT')) pushViolation('LCOM4_SPLIT', node, ck.lcom4);
			if (ck.wmc >= thresholdOf('GOD_CLASS') && ck.lcom4 >= thresholdOf('LCOM4_SPLIT')) pushViolation('GOD_CLASS', node, `WMC=${ck.wmc},LCOM4=${ck.lcom4}`);
			if (ck.dit >= thresholdOf('CK_DIT_DEEP')) pushViolation('CK_DIT_DEEP', node, ck.dit);
			if (ck.cbo >= thresholdOf('CK_CBO_HIGH')) pushViolation('CK_CBO_HIGH', node, ck.cbo);
			if (ck.rfc >= thresholdOf('CK_RFC_HIGH')) pushViolation('CK_RFC_HIGH', node, ck.rfc);
			if (ck.mainSequenceDistance >= thresholdOf('MAIN_SEQ_PAIN') && node.kind === ENTITY_KINDS.CLASS) pushViolation('MAIN_SEQ_PAIN', node, ck.mainSequenceDistance);
		}
		if (scc.cyclicEntityIds.has(node.id)) pushViolation('SCC_CYCLE', node, 'CYCLIC_SCC');
		const modifiesCount = (outboundBySourceId.get(node.id) ?? []).filter((e) => e.kind === REFERENCE_KINDS.MODIFIES).length;
		if (modifiesCount >= thresholdOf('STATE_MUTATION_HOTSPOT')) pushViolation('STATE_MUTATION_HOTSPOT', node, modifiesCount);
	}

	for (const edge of edges) {
		const src = nodeById.get(edge.sourceEntityId), dst = nodeById.get(edge.targetEntityId);
		if (!src || !dst) continue;
		const srcLayer = resolveVirtualLayerForEntity(src.qualifiedName), dstLayer = resolveVirtualLayerForEntity(dst.qualifiedName);
		if (!srcLayer.allowedOutboundLayerIds.includes(dstLayer.id)) pushViolation('LAYER_VIOLATION', src, `${srcLayer.id}->${dstLayer.id}`, edge.line);
		const isCyclicEdge = scc.cyclicEntityIds.has(src.id) && scc.entityToClusterId[src.id] === scc.entityToClusterId[dst.id];
		const opBreach = evaluateArchDependencyOperatorEdge(srcLayer.id, dstLayer.id, isCyclicEdge);
		if (opBreach) pushViolation('ARCH_DEPENDENCY_OPERATOR_BREACH', src, `${opBreach.operator}(${srcLayer.id}->${dstLayer.id})`, edge.line);
	}
	return { violations, suppressedCount, violationCountByEntityId };
}
