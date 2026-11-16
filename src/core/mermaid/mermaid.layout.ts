/**
 * @author Oblx <code@oblx.dev>
 * @description Layered Sugiyama-style layout engine positioning parsed Mermaid AST nodes, subgraphs, and sequence lifelines for CRT SVG rendering.
 */
import { MERMAID_STUDIO_TOKENS } from '@config/hud/hud.projections';
import type { MermaidAstEdge, MermaidAstNode, MermaidSubgraph, ParsedMermaidGraph } from './mermaid.parser';

export interface PositionedMermaidNode extends MermaidAstNode {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

export interface PositionedMermaidEdge extends MermaidAstEdge {
	readonly x1: number;
	readonly y1: number;
	readonly x2: number;
	readonly y2: number;
}

export interface PositionedMermaidSubgraph extends MermaidSubgraph {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

export interface MermaidDiagramLayout {
	readonly width: number;
	readonly height: number;
	readonly nodes: readonly PositionedMermaidNode[];
	readonly edges: readonly PositionedMermaidEdge[];
	readonly subgraphs: readonly PositionedMermaidSubgraph[];
}

function assignTopologicalRanks(nodes: readonly MermaidAstNode[], edges: readonly MermaidAstEdge[]): Map<string, number> {
	const inDeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
	const outAdj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
	for (const e of edges) {
		if (!inDeg.has(e.from) || !inDeg.has(e.to) || e.from === e.to) continue;
		outAdj.get(e.from)!.push(e.to);
		inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
	}
	const rank = new Map<string, number>(nodes.map((n) => [n.id, 0]));
	const queue = nodes.filter((n) => (inDeg.get(n.id) ?? 0) === 0).map((n) => n.id);
	if (queue.length === 0 && nodes[0]) queue.push(nodes[0].id);
	const visited = new Set<string>();
	while (queue.length > 0) {
		const id = queue.shift()!;
		if (visited.has(id)) continue;
		visited.add(id);
		const curRank = rank.get(id) ?? 0;
		for (const nxt of outAdj.get(id) ?? []) {
			rank.set(nxt, Math.max(rank.get(nxt) ?? 0, curRank + 1));
			queue.push(nxt);
		}
	}
	return rank;
}

export function layoutParsedMermaidGraph(ast: ParsedMermaidGraph): MermaidDiagramLayout {
	const { NODE_W, NODE_H, COL_GAP, ROW_GAP } = MERMAID_STUDIO_TOKENS;
	if (ast.nodes.length === 0) return { width: 800, height: 420, nodes: [], edges: [], subgraphs: [] };

	const positionedNodes: PositionedMermaidNode[] = [];
	if (ast.kind === 'SEQUENCE') {
		ast.nodes.forEach((n, idx) => {
			positionedNodes.push({ ...n, x: 48 + idx * 190, y: 24, w: 144, h: 42 });
		});
		const byId = new Map(positionedNodes.map((n) => [n.id, n]));
		const seqEdges = ast.edges.map((e, idx) => {
			const s = byId.get(e.from), t = byId.get(e.to);
			const y = 96 + idx * 44;
			return { ...e, x1: (s?.x ?? 80) + 72, y1: y, x2: (t?.x ?? 260) + 72, y2: y };
		});
		return {
			width: Math.max(820, positionedNodes.length * 190 + 64),
			height: Math.max(440, 130 + seqEdges.length * 44),
			nodes: positionedNodes, edges: seqEdges, subgraphs: [],
		};
	}

	const ranks = ast.kind === 'CLASS' ? new Map(ast.nodes.map((n, i) => [n.id, Math.floor(i / 3)])) : assignTopologicalRanks(ast.nodes, ast.edges);
	const layers = new Map<number, MermaidAstNode[]>();
	for (const n of ast.nodes) {
		const r = ranks.get(n.id) ?? 0;
		const list = layers.get(r) ?? [];
		list.push(n);
		layers.set(r, list);
	}

	const isLr = ast.direction === 'LR';
	for (const [r, bucket] of layers) {
		bucket.forEach((n, idx) => {
			const h = ast.kind === 'CLASS' && n.members.length > 0 ? Math.min(130, 44 + n.members.length * 14) : NODE_H;
			const x = isLr ? 56 + r * COL_GAP : 56 + idx * COL_GAP;
			const y = isLr ? 54 + idx * (h + 36) : 54 + r * (h + 44);
			positionedNodes.push({ ...n, x, y, w: NODE_W, h });
		});
	}

	const byId = new Map(positionedNodes.map((n) => [n.id, n]));
	const subgraphs: PositionedMermaidSubgraph[] = ast.subgraphs.map((sg) => {
		const members = positionedNodes.filter((n) => n.subgraphId === sg.id);
		if (members.length === 0) return { ...sg, x: 24, y: 24, w: 120, h: 60 };
		const minX = Math.min(...members.map((m) => m.x)) - 14;
		const minY = Math.min(...members.map((m) => m.y)) - 24;
		const maxX = Math.max(...members.map((m) => m.x + m.w)) + 14;
		const maxY = Math.max(...members.map((m) => m.y + m.h)) + 14;
		return { ...sg, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
	});

	const edges = ast.edges.map((e) => {
		const s = byId.get(e.from), t = byId.get(e.to);
		if (!s || !t) return { ...e, x1: 0, y1: 0, x2: 0, y2: 0 };
		return isLr
			? { ...e, x1: s.x + s.w, y1: s.y + s.h / 2, x2: t.x, y2: t.y + t.h / 2 }
			: { ...e, x1: s.x + s.w / 2, y1: s.y + s.h, x2: t.x + t.w / 2, y2: t.y };
	});

	const maxX = Math.max(820, ...positionedNodes.map((n) => n.x + n.w + 64), ROW_GAP);
	const maxY = Math.max(460, ...positionedNodes.map((n) => n.y + n.h + 64));
	return { width: maxX, height: maxY, nodes: positionedNodes, edges, subgraphs };
}
