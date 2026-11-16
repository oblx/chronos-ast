/**
 * @author Oblx <code@oblx.dev>
 * @description Pure TypeScript Metamodel-to-Mermaid DSL compiler generating valid flowchart, classDiagram, and sequenceDiagram specs.
 */
import { resolveEntitySourceSlice } from '@config/metamodel.constants';
import { buildControlFlowGraph } from '@core/ast/cfg.builder';
import { buildButterflyProjection, type GraphEntityNode, type GraphReferenceEdge } from '@core/graph/graph_traversal';
import { buildUmlClassProjection, buildUmlSequenceProjection, exportMermaidClassDiagram } from '@core/graph/projections/uml_projections';
import { traceVariableDataFlow } from '@core/graph/variable_tracker';

export type MermaidProjectionSourceKind = 'BUTTERFLY' | 'CFG' | 'DFG' | 'UML_CLASS' | 'UML_SEQUENCE';

function sanitizeId(raw: string, fallback: string): string {
	const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_');
	return cleaned ? (/^[0-9]/.test(cleaned) ? `n_${cleaned}` : cleaned) : fallback;
}

function escLabel(raw: string): string {
	return raw.replace(/"/g, "'").replace(/[\r\n]+/g, ' ').slice(0, 42);
}

function buildCfgMermaid(focal: GraphEntityNode, sourceMap: Readonly<Record<string, string>>): string {
	const slice = resolveEntitySourceSlice(focal.qualifiedName, sourceMap, `function ${focal.name}() {}`);
	const cfg = buildControlFlowGraph(focal.qualifiedName, slice, 1);
	const lines = ['flowchart TD'];
	for (const b of cfg.blocks) {
		const id = `B${b.id}`;
		const lbl = escLabel(b.label);
		if (b.kind === 'BRANCH_DECISION') lines.push(`\t${id}{"${lbl}"}`);
		else if (b.kind === 'ENTRY' || b.kind === 'RETURN_EXIT') lines.push(`\t${id}(("${lbl}"))`);
		else lines.push(`\t${id}["${lbl}"]`);
	}
	for (const e of cfg.edges) {
		const lbl = e.kind === 'FALLTHROUGH' ? '' : `|${e.kind.replace('_BRANCH', '')}|`;
		lines.push(`\tB${e.fromBlockId} -->${lbl} B${e.toBlockId}`);
	}
	return lines.join('\n');
}

function buildDfgMermaid(focal: GraphEntityNode, nodes: readonly GraphEntityNode[], edges: readonly GraphReferenceEdge[]): string {
	const dfg = traceVariableDataFlow(focal.id, nodes, edges);
	if (!dfg) return 'flowchart LR\n\tEmpty["No DFG Lineage"]';
	const lines = ['flowchart LR'];
	const seen = new Set<string>();
	for (const s of dfg.steps.slice(0, 18)) {
		const a = sanitizeId(`${s.sourceEntity.name}_${s.sourceEntity.id}`, 'S');
		const b = sanitizeId(`${s.targetEntity.name}_${s.targetEntity.id}`, 'T');
		if (!seen.has(a)) { seen.add(a); lines.push(`\t${a}["${escLabel(s.sourceEntity.name)}"]`); }
		if (!seen.has(b)) { seen.add(b); lines.push(`\t${b}["${escLabel(s.targetEntity.name)}"]`); }
		const arrow = s.referenceKind === 'MODIFIES' ? '-.->' : '-->';
		lines.push(`\t${a} ${arrow}|${s.referenceKind} @L${s.line}| ${b}`);
	}
	return lines.join('\n');
}

function buildSequenceMermaid(focalId: number, nodes: readonly GraphEntityNode[], edges: readonly GraphReferenceEdge[]): string {
	const seq = buildUmlSequenceProjection(focalId, { nodes, edges });
	if (!seq) return 'sequenceDiagram\n\tparticipant Focal';
	const lines = ['sequenceDiagram'];
	for (const lf of seq.lifelines.slice(0, 6)) lines.push(`\tparticipant ${sanitizeId(lf.name, `P${lf.id}`)} as ${escLabel(lf.name)}`);
	for (const msg of seq.messages.slice(0, 12)) {
		lines.push(`\t${sanitizeId(msg.caller.name, 'A')}->>${sanitizeId(msg.callee.name, 'B')}: #${msg.stepOrder} @L${msg.line}`);
	}
	return lines.join('\n');
}

function buildButterflyMermaid(focalId: number, nodes: readonly GraphEntityNode[], edges: readonly GraphReferenceEdge[]): string {
	const bf = buildButterflyProjection(focalId, nodes, edges);
	if (!bf) return 'flowchart LR\n\tFocal((No Focal Entity))';
	const fId = `F_${bf.focalEntity.id}`;
	const lines = ['flowchart LR', `\t${fId}(("${escLabel(bf.focalEntity.name)}"))`];
	if (bf.afferentCallers.length > 0) {
		lines.push('\tsubgraph INBOUND_Ca ["Inbound Callers (Ca)"]');
		for (const c of bf.afferentCallers.slice(0, 8)) lines.push(`\t\tA_${c.node.id}["${escLabel(c.node.name)}"]`);
		lines.push('\tend');
		for (const c of bf.afferentCallers.slice(0, 8)) lines.push(`\tA_${c.node.id} -->|${c.edgeKind}| ${fId}`);
	}
	if (bf.efferentTargets.length > 0) {
		lines.push('\tsubgraph OUTBOUND_Ce ["Outbound Targets (Ce)"]');
		for (const t of bf.efferentTargets.slice(0, 8)) lines.push(`\t\tE_${t.node.id}["${escLabel(t.node.name)}"]`);
		lines.push('\tend');
		for (const t of bf.efferentTargets.slice(0, 8)) lines.push(`\t${fId} -->|${t.edgeKind}| E_${t.node.id}`);
	}
	return lines.join('\n');
}

export function metamodelToMermaidDsl(params: {
	readonly kind: MermaidProjectionSourceKind;
	readonly focalEntity?: GraphEntityNode;
	readonly nodes: readonly GraphEntityNode[];
	readonly edges: readonly GraphReferenceEdge[];
	readonly sourceMap?: Readonly<Record<string, string>>;
}): string {
	const focal = params.focalEntity ?? params.nodes[0];
	if (!focal) return 'flowchart TD\n\tEmpty["No Workspace Entities"]';
	if (params.kind === 'UML_CLASS') return exportMermaidClassDiagram(buildUmlClassProjection([], { nodes: params.nodes, edges: params.edges }));
	if (params.kind === 'UML_SEQUENCE') return buildSequenceMermaid(focal.id, params.nodes, params.edges);
	if (params.kind === 'CFG') return buildCfgMermaid(focal, params.sourceMap ?? {});
	if (params.kind === 'DFG') return buildDfgMermaid(focal, params.nodes, params.edges);
	return buildButterflyMermaid(focal.id, params.nodes, params.edges);
}
