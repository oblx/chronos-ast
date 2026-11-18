/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.6 Full-Project Compound Codemap Projection: ELK-Inspired Aspect-Ratio Packing (MAX_RING_COL_H_PX=440) & Tight Ring Bounds.
 */
import { CODEMAP_LOD_TOKENS } from '@config/hud/hud.projections';
import type { GraphEntityNode, GraphReferenceEdge } from '@core/graph/graph_traversal';
import { buildCodemapSplines, extractCodemapPaths, traceCodemapEntryPath } from './codemap.layout';
import { type CodemapEntryCandidate, detectProjectEntryPoints } from './entry.detector';
import { type SpatialBoundingBox, buildSpatialFrustumIndex } from './frustum.culler';
import type { CodemapFileContainer, CodemapModuleCluster, CodemapSymbolPill, ProjectCodemapProjection } from './codemap.types';

export type * from './codemap.types';
export { traceCodemapEntryPath };

function computeDepthsAndParents(nodes: readonly GraphEntityNode[], edges: readonly GraphReferenceEdge[], entries: readonly CodemapEntryCandidate[]) {
	const adj = new Map<number, number[]>();
	for (const e of edges) if (e.sourceEntityId !== e.targetEntityId) adj.set(e.sourceEntityId, [...(adj.get(e.sourceEntityId) ?? []), e.targetEntityId]);
	const depthMap = new Map<number, number>(), parentMap = new Map<number, number>();
	const queue = entries.filter((e) => e.isGenesis).map((e) => e.entityId);
	if (queue.length === 0 && nodes[0]) queue.push(nodes[0].id);
	for (const rootId of queue) depthMap.set(rootId, 0);
	for (let head = 0; head < queue.length; head++) {
		const curr = queue[head]!, nextD = Math.min(5, (depthMap.get(curr) ?? 0) + 1);
		for (const nxt of adj.get(curr) ?? []) if (!depthMap.has(nxt)) { depthMap.set(nxt, nextD); parentMap.set(nxt, curr); queue.push(nxt); }
	}
	for (const n of nodes) if (!depthMap.has(n.id)) depthMap.set(n.id, 1);
	return { depthMap, parentMap };
}

interface FileDraft { readonly filePath: string; readonly dirPath: string; readonly ring: number; readonly entities: GraphEntityNode[]; readonly height: number; }

function placeFileCard(
	draft: FileDraft, x: number, y: number, genesisIds: ReadonlySet<number>, cyclicEntityIds: ReadonlySet<number>,
	symbolById: Map<number, CodemapSymbolPill>, boxes: SpatialBoundingBox[],
): CodemapFileContainer {
	const T = CODEMAP_LOD_TOKENS, maxVisRows = 4;
	const symbols = draft.entities.map((ent, idx): CodemapSymbolPill => {
		const rowIdx = Math.min(idx, maxVisRows - 1);
		const pill: CodemapSymbolPill = {
			id: ent.id, name: ent.name, kind: ent.kind, filePath: draft.filePath, ringDepth: draft.ring, loc: ent.loc, cyclomatic: ent.cyclomatic,
			isGenesis: genesisIds.has(ent.id), isCyclic: cyclicEntityIds.has(ent.id), x: x + 8, y: y + T.FILE_CARD_BASE_H + rowIdx * (T.SYMBOL_PILL_H + T.SYMBOL_GAP_PX), width: T.FILE_CARD_W - 16, height: T.SYMBOL_PILL_H,
		};
		symbolById.set(ent.id, pill);
		return pill;
	});
	const maxCyc = Math.max(1, ...draft.entities.map((e) => e.cyclomatic)), loc = draft.entities.reduce((s, e) => s + Math.max(1, e.loc), 0);
	const file: CodemapFileContainer = { id: `file:${draft.filePath}`, filePath: draft.filePath, dirPath: draft.dirPath, primaryEntityId: draft.entities[0]!.id, ringDepth: draft.ring, loc, maxCyclomatic: maxCyc, healthGrade: maxCyc > 20 ? 'D' : maxCyc > 12 ? 'C' : maxCyc > 6 ? 'B' : 'A', isEntryFile: symbols.some((s) => s.isGenesis), isCyclic: symbols.some((s) => s.isCyclic), x, y, width: T.FILE_CARD_W, height: draft.height, symbols };
	boxes.push({ id: file.id, minX: x, minY: y, maxX: x + T.FILE_CARD_W, maxY: y + draft.height, priority: file.isEntryFile ? 100 : 50 });
	return file;
}

function layoutRingClusters(
	ring: number, clusters: readonly (readonly [string, FileDraft[]])[], startX: number, genesisIds: ReadonlySet<number>,
	cyclicEntityIds: ReadonlySet<number>, symbolById: Map<number, CodemapSymbolPill>, boxes: SpatialBoundingBox[],
	fileContainers: CodemapFileContainer[], moduleClusters: CodemapModuleCluster[], subColGapPx: number, ringColGapPx: number,
): number {
	const T = CODEMAP_LOD_TOKENS, maxColY = T.START_Y_PX + T.MAX_RING_COL_H_PX;
	let colIdx = 0, curY = T.START_Y_PX;
	for (const [dirPath, drafts] of clusters) {
		const clusterNeedH = T.CLUSTER_HEADER_H + drafts.reduce((s, d) => s + d.height + T.FILE_ROW_GAP_PX, 0);
		if (curY > T.START_Y_PX && curY + clusterNeedH > maxColY) { colIdx++; curY = T.START_Y_PX; }
		const startCol = colIdx, placed: CodemapFileContainer[] = [];
		let fy = curY + T.CLUSTER_HEADER_H;
		for (const d of drafts) {
			if (placed.length > 0 && fy + d.height > maxColY) { colIdx++; curY = T.START_Y_PX; fy = curY + T.CLUSTER_HEADER_H; }
			const f = placeFileCard(d, startX + colIdx * subColGapPx, fy, genesisIds, cyclicEntityIds, symbolById, boxes);
			fileContainers.push(f); placed.push(f);
			fy += d.height + T.FILE_ROW_GAP_PX;
		}
		if (placed.length > 0) {
			const minX = Math.min(...placed.map((p) => p.x)) - T.CLUSTER_PAD_PX, minY = Math.min(...placed.map((p) => p.y)) - T.CLUSTER_HEADER_H;
			const maxX = Math.max(...placed.map((p) => p.x + p.width)) + T.CLUSTER_PAD_PX, maxY = Math.max(...placed.map((p) => p.y + p.height)) + Math.round(T.CLUSTER_PAD_PX * 0.65);
			moduleClusters.push({ id: `cluster:${ring}::${dirPath}`, dirPath, ringDepth: ring, fileCount: placed.length, totalLoc: placed.reduce((s, f) => s + f.loc, 0), isEntryCluster: placed.some((f) => f.isEntryFile), hasCycles: placed.some((f) => f.isCyclic), x: minX, y: minY, width: maxX - minX, height: maxY - minY });
			if (colIdx > startCol) { colIdx++; curY = T.START_Y_PX; } else { curY = maxY + T.FILE_ROW_GAP_PX; }
		}
	}
	return startX + (colIdx + 1) * subColGapPx + Math.max(16, ringColGapPx - subColGapPx);
}

export function buildProjectCodemapProjection(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	cyclicEntityIds: ReadonlySet<number> = new Set(),
): ProjectCodemapProjection {
	const T = CODEMAP_LOD_TOKENS, entryPoints = detectProjectEntryPoints(nodes, edges);
	const genesisIds = new Set(entryPoints.filter((e) => e.isGenesis).map((e) => e.entityId));
	const { depthMap, parentMap } = computeDepthsAndParents(nodes, edges, entryPoints);
	const groupedByFile = new Map<string, { dirPath: string; ring: number; entities: GraphEntityNode[] }>();
	for (const n of nodes) {
		const { dirPath, filePath } = extractCodemapPaths(n.qualifiedName || n.name), cur = groupedByFile.get(filePath), ring = depthMap.get(n.id) ?? 1;
		if (cur) { cur.ring = Math.min(cur.ring, ring); cur.entities.push(n); } else groupedByFile.set(filePath, { dirPath, ring, entities: [n] });
	}
	const ringMap = new Map<number, Map<string, FileDraft[]>>();
	for (const [filePath, g] of groupedByFile.entries()) {
		const visRows = Math.min(g.entities.length, 4), height = T.FILE_CARD_BASE_H + visRows * (T.SYMBOL_PILL_H + T.SYMBOL_GAP_PX) + 6;
		const dirMap = ringMap.get(g.ring) ?? new Map<string, FileDraft[]>();
		dirMap.set(g.dirPath, [...(dirMap.get(g.dirPath) ?? []), { filePath, dirPath: g.dirPath, ring: g.ring, entities: g.entities, height }]);
		ringMap.set(g.ring, dirMap);
	}
	const sortedRings = Array.from(ringMap.keys()).sort((a, b) => a - b), estCols = Math.max(1, sortedRings.length);
	const minSubCol = T.FILE_CARD_W + T.CLUSTER_PAD_PX * 2 + 12;
	const subColGapPx = Math.max(minSubCol, estCols > 4 ? minSubCol : T.RING_SUBCOL_GAP_PX);
	const ringColGapPx = Math.max(subColGapPx + 20, estCols > 4 ? subColGapPx + 20 : T.RING_COL_GAP_PX);
	const fileContainers: CodemapFileContainer[] = [], moduleClusters: CodemapModuleCluster[] = [], symbolById = new Map<number, CodemapSymbolPill>(), boxes: SpatialBoundingBox[] = [];
	let ringX: number = T.START_X_PX;
	for (const ring of sortedRings) {
		ringX = layoutRingClusters(ring, Array.from(ringMap.get(ring)!.entries()), ringX, genesisIds, cyclicEntityIds, symbolById, boxes, fileContainers, moduleClusters, subColGapPx, ringColGapPx);
	}
	const { macroHighways, mesoEdges } = buildCodemapSplines(edges, symbolById, moduleClusters);
	const rawMaxY = moduleClusters.length > 0 ? Math.max(...moduleClusters.map((c) => c.y + c.height)) + T.WORLD_PAD_PX : T.MIN_WORLD_H_PX;
	const rawMaxX = moduleClusters.length > 0 ? Math.max(...moduleClusters.map((c) => c.x + c.width)) + T.WORLD_PAD_PX : T.MIN_WORLD_W_PX;
	const worldHeight = Math.max(T.MIN_WORLD_H_PX, Math.min(620, rawMaxY));
	const worldWidth = Math.max(T.MIN_WORLD_W_PX, Math.round(worldHeight * 1.68), rawMaxX);
	return { entryPoints, moduleClusters, fileContainers, symbolById, macroHighways, mesoEdges, frustumIndex: buildSpatialFrustumIndex(boxes), parentByEntityId: parentMap, worldWidth, worldHeight };
}
