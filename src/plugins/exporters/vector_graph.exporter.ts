/**
 * @author Oblx <code@oblx.dev>
 * @description Deterministic pure-string SVG and Graphviz .dot exporters for BUTTERFLY, CONTROL_FLOW, and DATA_FLOW views.
 */
import { HUD_VIEWS, type HudViewMode } from '@config/constants';
import { VECTOR_EXPORT_TOKENS } from '@config/hud.tokens';
import { LEXICAL_CONSTANTS } from '@config/metamodel.constants';
import { HUD_THEME_IDS, HUD_THEME_PRESETS, type HudThemeId } from '@config/themes/presets.registry';
import { buildControlFlowGraph } from '@core/ast/cfg.builder';
import { buildButterflyProjection, type GraphEntityNode, type GraphReferenceEdge } from '@core/graph/graph_traversal';
import { traceVariableDataFlow } from '@core/graph/variable_tracker';

export function exportGraphvizDotGraph(
	viewMode: HudViewMode,
	focalEntity: GraphEntityNode,
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	sourceCode: string = ''
): string {
	const lines: string[] = [`digraph Chronos_${viewMode} {`, '\trankdir=LR;', `\tnode [shape=box, fontname="${VECTOR_EXPORT_TOKENS.FONT_FAMILY}"];`];
	if (viewMode === HUD_VIEWS.CONTROL_FLOW) {
		const cfg = buildControlFlowGraph(focalEntity.qualifiedName, sourceCode, LEXICAL_CONSTANTS.FIRST_LINE);
		for (const b of cfg.blocks) lines.push(`\tB${b.id} [label="B${b.id}: ${b.kind} (L${b.lineStart})"];`);
		for (const e of cfg.edges) lines.push(`\tB${e.fromBlockId} -> B${e.toBlockId} [label="${e.kind}"];`);
	} else if (viewMode === HUD_VIEWS.DATA_FLOW) {
		const dfg = traceVariableDataFlow(focalEntity.id, nodes, edges);
		for (const s of dfg?.steps ?? []) {
			lines.push(`\t"${s.sourceEntity.name}" -> "${s.targetEntity.name}" [label="${s.referenceKind}@L${s.line}"];`);
		}
	} else {
		const butterfly = buildButterflyProjection(focalEntity.id, nodes, edges);
		for (const caller of butterfly?.afferentCallers ?? []) {
			lines.push(`\t"${caller.node.name}" -> "${focalEntity.name}" [label="${caller.edgeKind}@L${caller.line}"];`);
		}
		for (const callee of butterfly?.efferentTargets ?? []) {
			lines.push(`\t"${focalEntity.name}" -> "${callee.node.name}" [label="${callee.edgeKind}@L${callee.line}"];`);
		}
	}
	lines.push('}');
	return lines.join('\n');
}

export function exportVectorSvgGraph(
	viewMode: HudViewMode,
	focalEntity: GraphEntityNode,
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	sourceCode: string = '',
	themeId: HudThemeId = HUD_THEME_IDS.OBSIDIAN_CYBER
): string {
	const theme = HUD_THEME_PRESETS[themeId];
	const T = VECTOR_EXPORT_TOKENS;
	const svgNodes: string[] = [];
	if (viewMode === HUD_VIEWS.CONTROL_FLOW) {
		const cfg = buildControlFlowGraph(focalEntity.qualifiedName, sourceCode, LEXICAL_CONSTANTS.FIRST_LINE);
		cfg.blocks.forEach((b, idx) => {
			const y = T.CFG_START_Y + idx * T.CFG_STEP_Y;
			svgNodes.push(`<rect x="${T.CFG_RECT_X}" y="${y}" width="${T.CFG_RECT_W}" height="${T.CFG_RECT_H}" fill="${theme.bgPanel}" stroke="${theme.accentPrimary}" />`);
			svgNodes.push(`<text x="${T.CFG_TEXT_X}" y="${y + T.CFG_TEXT_OFFSET_Y}" fill="${theme.textPrimary}" font-family="${T.FONT_FAMILY}" font-size="11">B${b.id} ${b.kind} L${b.lineStart}</text>`);
		});
	} else if (viewMode === HUD_VIEWS.DATA_FLOW) {
		const dfg = traceVariableDataFlow(focalEntity.id, nodes, edges);
		(dfg?.steps ?? []).forEach((s, idx) => {
			const y = T.CFG_START_Y + idx * T.DFG_STEP_Y;
			svgNodes.push(`<rect x="${T.DFG_RECT_X}" y="${y}" width="${T.DFG_RECT_W}" height="${T.DFG_RECT_H}" fill="${theme.bgPanel}" stroke="${theme.statusNominal}" />`);
			svgNodes.push(`<text x="${T.DFG_TEXT_X}" y="${y + T.DFG_TEXT_OFFSET_Y}" fill="${theme.textPrimary}" font-family="${T.FONT_FAMILY}" font-size="11">${s.sourceEntity.name} -[${s.referenceKind}]-&gt; ${s.targetEntity.name}</text>`);
		});
	} else {
		const butterfly = buildButterflyProjection(focalEntity.id, nodes, edges);
		svgNodes.push(`<rect x="${T.FOCAL_RECT_X}" y="${T.FOCAL_RECT_Y}" width="${T.FOCAL_RECT_W}" height="${T.FOCAL_RECT_H}" fill="${theme.bgSurface}" stroke="${theme.accentPrimary}" stroke-width="2" />`);
		svgNodes.push(`<text x="${T.FOCAL_TEXT_X}" y="${T.FOCAL_TEXT_Y}" fill="${theme.textPrimary}" font-family="${T.FONT_FAMILY}" font-size="12">${focalEntity.name} (Ca:${butterfly?.afferentCallers.length ?? 0} Ce:${butterfly?.efferentTargets.length ?? 0})</text>`);
	}
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T.SVG_WIDTH} ${T.SVG_HEIGHT}" width="${T.SVG_WIDTH}" height="${T.SVG_HEIGHT}">`,
		`\t<rect width="100%" height="100%" fill="${theme.bgCanvas}" />`,
		...svgNodes.map((n) => `\t${n}`),
		`</svg>`,
	].join('\n');
}
