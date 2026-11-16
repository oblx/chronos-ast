/**
 * @author Oblx <code@oblx.dev>
 * @description Pure TypeScript Mermaid DSL parser supporting flowchart/graph (shapes, subgraphs, labeled/dashed/thick edges), classDiagram, and sequenceDiagram.
 */
export type MermaidDiagramKind = 'FLOWCHART' | 'CLASS' | 'SEQUENCE';
export type MermaidDirection = 'TD' | 'LR';
export type MermaidNodeShape = 'RECT' | 'ROUND' | 'DIAMOND' | 'SUBROUTINE' | 'CIRCLE';
export type MermaidEdgeStyle = 'SOLID' | 'DASHED' | 'THICK';

export interface MermaidAstNode { readonly id: string; readonly label: string; readonly shape: MermaidNodeShape; readonly subgraphId: string | null; readonly members: readonly string[]; }
export interface MermaidAstEdge { readonly from: string; readonly to: string; readonly label: string; readonly style: MermaidEdgeStyle; }
export interface MermaidSubgraph { readonly id: string; readonly label: string; }
export interface MermaidParseDiagnostic { readonly line: number; readonly message: string; }
export interface ParsedMermaidGraph {
	readonly kind: MermaidDiagramKind; readonly direction: MermaidDirection; readonly nodes: readonly MermaidAstNode[];
	readonly edges: readonly MermaidAstEdge[]; readonly subgraphs: readonly MermaidSubgraph[]; readonly diagnostics: readonly MermaidParseDiagnostic[];
}

function parseNodeToken(raw: string, subgraphId: string | null): MermaidAstNode {
	const t = raw.trim();
	const shapes: Array<{ re: RegExp; shape: MermaidNodeShape }> = [
		{ re: /^([A-Za-z0-9_.-]+)\(\((.+)\)\)$/, shape: 'CIRCLE' }, { re: /^([A-Za-z0-9_.-]+)\[\[(.+)\]\]$/, shape: 'SUBROUTINE' },
		{ re: /^([A-Za-z0-9_.-]+)\[(.+)\]$/, shape: 'RECT' }, { re: /^([A-Za-z0-9_.-]+)\((.+)\)$/, shape: 'ROUND' },
		{ re: /^([A-Za-z0-9_.-]+)\{(.+)\}$/, shape: 'DIAMOND' },
	];
	for (const { re, shape } of shapes) {
		const m = t.match(re);
		if (m) return { id: m[1]!, label: m[2]!.replace(/^["']|["']$/g, '').trim(), shape, subgraphId, members: [] };
	}
	return { id: t.replace(/[^A-Za-z0-9_.-]/g, '') || 'Node', label: t, shape: 'RECT', subgraphId, members: [] };
}

function upsertNode(map: Map<string, MermaidAstNode>, token: MermaidAstNode): void {
	const prev = map.get(token.id);
	if (!prev) { map.set(token.id, token); return; }
	map.set(token.id, {
		...prev, label: token.label !== token.id ? token.label : prev.label, shape: token.shape !== 'RECT' ? token.shape : prev.shape,
		subgraphId: prev.subgraphId ?? token.subgraphId, members: token.members.length > 0 ? token.members : prev.members,
	});
}

function parseFlowchartEdgeLine(trimmed: string): { fromRaw: string; toRaw: string; label: string; style: MermaidEdgeStyle } | null {
	const patterns: Array<{ re: RegExp; style: MermaidEdgeStyle }> = [
		{ re: /^(.+?)\s*==>\s*(?:\|([^|]*)\|)?\s*(.+)$/, style: 'THICK' }, { re: /^(.+?)\s*-\.-\>\s*(?:\|([^|]*)\|)?\s*(.+)$/, style: 'DASHED' },
		{ re: /^(.+?)\s*--\s*([^->\n]+?)\s*-->\s*(.+)$/, style: 'SOLID' }, { re: /^(.+?)\s*-->\s*(?:\|([^|]*)\|)?\s*(.+)$/, style: 'SOLID' },
	];
	for (const { re, style } of patterns) {
		const m = trimmed.match(re);
		if (m) return { fromRaw: m[1]!, label: (m[2] ?? '').trim(), toRaw: m[3]!, style };
	}
	return null;
}

function parseClassLine(trimmed: string, map: Map<string, MermaidAstNode>, edges: MermaidAstEdge[], activeClass: { id: string | null }): boolean {
	const hdr = trimmed.match(/^class\s+([A-Za-z0-9_.-]+)(?:\s*\{)?$/);
	if (hdr) { upsertNode(map, { id: hdr[1]!, label: hdr[1]!, shape: 'RECT', subgraphId: null, members: [] }); activeClass.id = trimmed.endsWith('{') ? hdr[1]! : null; return true; }
	if (trimmed === '}' && activeClass.id) { activeClass.id = null; return true; }
	if (activeClass.id) { const cur = map.get(activeClass.id); if (cur) map.set(activeClass.id, { ...cur, members: [...cur.members, trimmed] }); return true; }
	const rel = trimmed.match(/^([A-Za-z0-9_.-]+)\s*(?:<\|--|--\|>|<--|\*--|o--|\.\.>|<\|..|-->)\s*([A-Za-z0-9_.-]+)(?:\s*:\s*(.+))?$/);
	if (!rel) return false;
	upsertNode(map, parseNodeToken(rel[1]!, null)); upsertNode(map, parseNodeToken(rel[2]!, null));
	edges.push({ from: rel[1]!, to: rel[2]!, label: (rel[3] ?? '').trim(), style: trimmed.includes('..') ? 'DASHED' : 'SOLID' });
	return true;
}

function parseSequenceLine(trimmed: string, map: Map<string, MermaidAstNode>, edges: MermaidAstEdge[]): boolean {
	const part = trimmed.match(/^participant\s+([A-Za-z0-9_.-]+)(?:\s+as\s+(.+))?$/);
	if (part) { upsertNode(map, { id: part[1]!, label: (part[2] ?? part[1]!).trim(), shape: 'RECT', subgraphId: null, members: [] }); return true; }
	const msg = trimmed.match(/^([A-Za-z0-9_.-]+)\s*(->>|-->>|->|-->)\s*([A-Za-z0-9_.-]+)\s*:\s*(.+)$/);
	if (!msg) return false;
	upsertNode(map, parseNodeToken(msg[1]!, null)); upsertNode(map, parseNodeToken(msg[3]!, null));
	edges.push({ from: msg[1]!, to: msg[3]!, label: msg[4]!.trim(), style: msg[2]!.startsWith('--') ? 'DASHED' : 'SOLID' });
	return true;
}

function parseFlowchartLine(trimmed: string, lineNo: number, nodeMap: Map<string, MermaidAstNode>, edges: MermaidAstEdge[], subgraphs: MermaidSubgraph[], sgStack: string[], diagnostics: MermaidParseDiagnostic[]): void {
	const sg = trimmed.match(/^subgraph\s+([A-Za-z0-9_.-]+)(?:\s+\[?["']?([^\]"']+)["']?\]?)?$/i);
	if (sg) { sgStack.push(sg[1]!); subgraphs.push({ id: sg[1]!, label: (sg[2] ?? sg[1]!).trim() }); return; }
	if (trimmed === 'end') { if (sgStack.length === 0) diagnostics.push({ line: lineNo, message: 'Unexpected end without open subgraph' }); else sgStack.pop(); return; }
	const edge = parseFlowchartEdgeLine(trimmed);
	if (edge) {
		const fNode = parseNodeToken(edge.fromRaw, sgStack[sgStack.length - 1] ?? null), tNode = parseNodeToken(edge.toRaw, sgStack[sgStack.length - 1] ?? null);
		upsertNode(nodeMap, fNode); upsertNode(nodeMap, tNode);
		edges.push({ from: fNode.id, to: tNode.id, label: edge.label, style: edge.style });
		return;
	}
	if (/^[A-Za-z0-9_.-]+(\[|\(|\{)/.test(trimmed)) upsertNode(nodeMap, parseNodeToken(trimmed, sgStack[sgStack.length - 1] ?? null));
	else diagnostics.push({ line: lineNo, message: `Syntax error near '${trimmed.slice(0, 28)}'` });
}

export function parseMermaidDslToGraph(dsl: string): ParsedMermaidGraph {
	const lines = dsl.split(/\r?\n/), nodeMap = new Map<string, MermaidAstNode>(), edges: MermaidAstEdge[] = [], subgraphs: MermaidSubgraph[] = [], diagnostics: MermaidParseDiagnostic[] = [];
	let kind: MermaidDiagramKind = 'FLOWCHART', direction: MermaidDirection = 'TD', headerSeen = false;
	const sgStack: string[] = [], activeClass: { id: string | null } = { id: null };
	lines.forEach((raw, idx) => {
		const trimmed = raw.trim(), lineNo = idx + 1;
		if (!trimmed || trimmed.startsWith('%%')) return;
		if (!headerSeen) {
			headerSeen = true;
			const fMatch = trimmed.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL)\b/i);
			if (fMatch) { kind = 'FLOWCHART'; direction = /LR|RL/i.test(fMatch[1]!) ? 'LR' : 'TD'; return; }
			if (/^classDiagram\b/i.test(trimmed)) { kind = 'CLASS'; direction = 'TD'; return; }
			if (/^sequenceDiagram\b/i.test(trimmed)) { kind = 'SEQUENCE'; direction = 'LR'; return; }
			diagnostics.push({ line: lineNo, message: 'Missing diagram header (expected flowchart/classDiagram/sequenceDiagram)' });
		}
		if (kind === 'CLASS') { if (!parseClassLine(trimmed, nodeMap, edges, activeClass)) diagnostics.push({ line: lineNo, message: `Unrecognized classDiagram token: ${trimmed.slice(0, 32)}` }); }
		else if (kind === 'SEQUENCE') { if (!parseSequenceLine(trimmed, nodeMap, edges)) diagnostics.push({ line: lineNo, message: `Unrecognized sequence line: ${trimmed.slice(0, 32)}` }); }
		else parseFlowchartLine(trimmed, lineNo, nodeMap, edges, subgraphs, sgStack, diagnostics);
	});
	if (sgStack.length > 0) diagnostics.push({ line: lines.length, message: 'Unclosed subgraph block (missing end)' });
	return { kind, direction, nodes: Array.from(nodeMap.values()), edges, subgraphs, diagnostics };
}
