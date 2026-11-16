/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.0 Automatic Genesis Entry-Point Detector ranking root bootstrap entities.
 */
import { CODEMAP_LOD_TOKENS } from '@config/hud/hud.projections';
import { ENTITY_KINDS, REFERENCE_KINDS } from '@config/metamodel.constants';
import type { GraphEntityNode, GraphReferenceEdge } from '@core/graph/graph_traversal';

export interface CodemapEntryCandidate {
	readonly entityId: number;
	readonly name: string;
	readonly qualifiedName: string;
	readonly kind: GraphEntityNode['kind'];
	readonly score: number;
	readonly inboundCount: number;
	readonly outboundCount: number;
	readonly isGenesis: boolean;
	readonly badgeLabel: string;
}

const ENTRY_EDGE_KINDS = new Set<string>([
	REFERENCE_KINDS.IMPORTS,
	REFERENCE_KINDS.CALLS,
	REFERENCE_KINDS.DEFINES,
	REFERENCE_KINDS.INHERITS,
	REFERENCE_KINDS.IMPLEMENTS,
]);

function computeBootstrapKeywordScore(node: GraphEntityNode): number {
	const haystack = `${node.name} ${node.qualifiedName}`.toLowerCase();
	let bonus = 0;
	for (let i = 0; i < CODEMAP_LOD_TOKENS.BOOTSTRAP_PATTERNS.length; i++) {
		const token = CODEMAP_LOD_TOKENS.BOOTSTRAP_PATTERNS[i]!;
		if (haystack.includes(token)) {
			bonus += (CODEMAP_LOD_TOKENS.BOOTSTRAP_PATTERNS.length - i) * 6;
		}
	}
	if (node.kind === ENTITY_KINDS.FILE || node.kind === ENTITY_KINDS.MODULE) bonus += 18;
	else if (node.kind === ENTITY_KINDS.FUNCTION) bonus += 12;
	return bonus;
}

export function detectProjectEntryPoints(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[]
): readonly CodemapEntryCandidate[] {
	if (nodes.length === 0) return [];
	const inboundCalls = new Map<number, number>();
	const outboundCalls = new Map<number, number>();
	for (const edge of edges) {
		if (!ENTRY_EDGE_KINDS.has(edge.kind) || edge.sourceEntityId === edge.targetEntityId) continue;
		outboundCalls.set(edge.sourceEntityId, (outboundCalls.get(edge.sourceEntityId) ?? 0) + 1);
		if (edge.kind === REFERENCE_KINDS.IMPORTS || edge.kind === REFERENCE_KINDS.CALLS) {
			inboundCalls.set(edge.targetEntityId, (inboundCalls.get(edge.targetEntityId) ?? 0) + 1);
		}
	}

	const scored: CodemapEntryCandidate[] = nodes.map((node) => {
		const inDeg = inboundCalls.get(node.id) ?? node.afferentCoupling ?? 0;
		const outDeg = outboundCalls.get(node.id) ?? node.efferentCoupling ?? 0;
		const zeroInboundBonus = inDeg === 0 && outDeg > 0 ? 50 : inDeg === 0 ? 25 : 0;
		const fanOutScore = Math.min(40, outDeg * 8);
		const score = zeroInboundBonus + fanOutScore + computeBootstrapKeywordScore(node);
		return {
			entityId: node.id,
			name: node.name,
			qualifiedName: node.qualifiedName,
			kind: node.kind,
			score,
			inboundCount: inDeg,
			outboundCount: outDeg,
			isGenesis: false,
			badgeLabel: '⚡ ENTRY',
		};
	});

	scored.sort((a, b) => b.score - a.score || a.entityId - b.entityId);
	const topGenesisCount = Math.max(1, Math.min(4, Math.ceil(scored.length * 0.25)));
	return scored.map((item, idx) => ({
		...item,
		isGenesis: idx < topGenesisCount && (item.score >= 20 || idx === 0),
		badgeLabel: idx === 0 ? '⚡ GENESIS ROOT' : '⚡ ENTRY',
	}));
}
