/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.0 Full-Project Compound Codemap Projection, BFS Depth Rings & Entry-Point Travel Spine.
 */
import { CODEMAP_LOD_TOKENS } from '@config/hud/hud.projections';
import type { GraphEntityNode, GraphReferenceEdge } from '@core/graph/graph_traversal';
import { type CodemapEntryCandidate, detectProjectEntryPoints } from './entry.detector';
import { type SpatialBoundingBox, buildSpatialFrustumIndex } from './frustum.culler';
import type {
	CodemapFileContainer, CodemapMacroHighway, CodemapMesoEdge, CodemapModuleCluster,
	CodemapSymbolPill, CodemapTravelHop, ProjectCodemapProjection,
} from './codemap.types';

export type * from './codemap.types';

function extractPaths(qName: string): { readonly dirPath: string; readonly filePath: string } {
	const parts = (qName.split('::')[0]?.split('#')[0] ?? qName).split('/').filter(Boolean);
	if (parts.length === 0) return { dirPath: 'core', filePath: 'core/root.ts' };
	if (parts.length === 1) return { dirPath: 'root', filePath: `root/${parts[0]}` };
	return { dirPath: parts.slice(0, -1).join('/'), filePath: parts.join('/') };
}

function computeDepthsAndParents(nodes: readonly GraphEntityNode[], edges: readonly GraphReferenceEdge[], entries: readonly CodemapEntryCandidate[]) {
	const adj = new Map<number, number[]>();
	for (const e of edges) if (e.sourceEntityId !== e.targetEntityId) adj.set(e.sourceEntityId, [...(adj.get(e.sourceEntityId) ?? []), e.targetEntityId]);
	const depthMap = new Map<number, number>(), parentMap = new Map<number, number>();
	const queue = entries.filter((e) => e.isGenesis).map((e) => e.entityId);
	if (queue.length === 0 && nodes[0]) queue.push(nodes[0].id);
	for (const rootId of queue) depthMap.set(rootId, 0);
	for (let head = 0; head < queue.length; head++) {
		const curr = queue[head]!, nextD = Math.min(6, (depthMap.get(curr) ?? 0) + 1);
		for (const nxt of adj.get(curr) ?? []) if (!depthMap.has(nxt)) { depthMap.set(nxt, nextD); parentMap.set(nxt, curr); queue.push(nxt); }
	}
	for (const n of nodes) if (!depthMap.has(n.id)) depthMap.set(n.id, 1);
	return { depthMap, parentMap };
}

interface FileDraft { readonly filePath: string; readonly dirPath: string; readonly ring: number; readonly entities: GraphEntityNode[]; readonly height: number; }

function placeFileCard(
	draft: FileDraft, x: number, y: number, genesisIds: ReadonlySet<number>, cyclicEntityIds: ReadonlySet<number>,
	symbolById: Map<number, CodemapSymbolPill>, boxes: SpatialBoundingBox[]
): CodemapFileContainer {
	const T = CODEMAP_LOD_TOKENS;
	const symbols = draft.entities.map((ent, idx): CodemapSymbolPill => {
		const pill: CodemapSymbolPill = {
			id: ent.id, name: ent.name, kind: ent.kind, filePath: draft.filePath, ringDepth: draft.ring, loc: ent.loc, cyclomatic: ent.cyclomatic,
			isGenesis: genesisIds.has(ent.id), isCyclic: cyclicEntityIds.has(ent.id), x: x + 10, y: y + T.FILE_CARD_BASE_H + idx * (T.SYMBOL_PILL_H + T.SYMBOL_GAP_PX), width: T.FILE_CARD_W - 20, height: T.SYMBOL_PILL_H,
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
	fileContainers: CodemapFileContainer[], moduleClusters: CodemapModuleCluster[]
): number {
	const T = CODEMAP_LOD_TOKENS, ringTotalH = clusters.reduce((s, [, fs]) => s + T.CLUSTER_HEADER_H + T.CLUSTER_PAD_PX + fs.reduce((a, f) => a + f.height + T.FILE_ROW_GAP_PX, 0), 0);
	const targetColH = Math.max(T.MIN_RING_COL_H_PX, Math.min(T.MAX_RING_COL_H_PX, Math.round(Math.sqrt(ringTotalH * T.ASPECT_FACTOR_PX))));
	let colIdx = 0, curY = T.START_Y_PX;
	for (const [dirPath, drafts] of clusters) {
		const clusterH = T.CLUSTER_HEADER_H + drafts.reduce((a, f) => a + f.height + T.FILE_ROW_GAP_PX, 0);
		if (curY > T.START_Y_PX && curY + clusterH > targetColH + T.START_Y_PX) { colIdx++; curY = T.START_Y_PX; }
		const colX = startX + colIdx * T.RING_SUBCOL_GAP_PX, placed: CodemapFileContainer[] = [];
		let fy = curY + T.CLUSTER_HEADER_H;
		for (const d of drafts) { const f = placeFileCard(d, colX, fy, genesisIds, cyclicEntityIds, symbolById, boxes); fileContainers.push(f); placed.push(f); fy += d.height + T.FILE_ROW_GAP_PX; }
		const minX = colX - T.CLUSTER_PAD_PX, minY = curY, maxX = colX + T.FILE_CARD_W + T.CLUSTER_PAD_PX, maxY = fy - T.FILE_ROW_GAP_PX + T.CLUSTER_PAD_PX / 2;
		moduleClusters.push({ id: `cluster:${ring}::${dirPath}`, dirPath, ringDepth: ring, fileCount: placed.length, totalLoc: placed.reduce((s, f) => s + f.loc, 0), isEntryCluster: placed.some((f) => f.isEntryFile), hasCycles: placed.some((f) => f.isCyclic), x: minX, y: minY, width: maxX - minX, height: maxY - minY });
		curY = maxY + T.FILE_ROW_GAP_PX;
	}
	return startX + (colIdx + 1) * T.RING_SUBCOL_GAP_PX + (T.RING_COL_GAP_PX - T.RING_SUBCOL_GAP_PX);
}

export function buildProjectCodemapProjection(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[],
	cyclicEntityIds: ReadonlySet<number> = new Set()
): ProjectCodemapProjection {
	const T = CODEMAP_LOD_TOKENS, entryPoints = detectProjectEntryPoints(nodes, edges);
	const genesisIds = new Set(entryPoints.filter((e) => e.isGenesis).map((e) => e.entityId));
	const { depthMap, parentMap } = computeDepthsAndParents(nodes, edges, entryPoints);
	const groupedByFile = new Map<string, { dirPath: string; ring: number; entities: GraphEntityNode[] }>();
	for (const n of nodes) {
		const { dirPath, filePath } = extractPaths(n.qualifiedName || n.name), cur = groupedByFile.get(filePath), ring = depthMap.get(n.id) ?? 1;
		if (cur) { cur.ring = Math.min(cur.ring, ring); cur.entities.push(n); } else groupedByFile.set(filePath, { dirPath, ring, entities: [n] });
	}
	const ringMap = new Map<number, Map<string, FileDraft[]>>();
	for (const [filePath, g] of groupedByFile.entries()) {
		const height = T.FILE_CARD_BASE_H + g.entities.length * (T.SYMBOL_PILL_H + T.SYMBOL_GAP_PX) + 10;
		const dirMap = ringMap.get(g.ring) ?? new Map<string, FileDraft[]>();
		dirMap.set(g.dirPath, [...(dirMap.get(g.dirPath) ?? []), { filePath, dirPath: g.dirPath, ring: g.ring, entities: g.entities, height }]);
		ringMap.set(g.ring, dirMap);
	}
	const fileContainers: CodemapFileContainer[] = [], moduleClusters: CodemapModuleCluster[] = [], symbolById = new Map<number, CodemapSymbolPill>(), boxes: SpatialBoundingBox[] = [];
	let ringX: number = T.START_X_PX;
	for (const ring of Array.from(ringMap.keys()).sort((a, b) => a - b)) {
		ringX = layoutRingClusters(ring, Array.from(ringMap.get(ring)!.entries()), ringX, genesisIds, cyclicEntityIds, symbolById, boxes, fileContainers, moduleClusters);
	}
	const { macroHighways, mesoEdges } = buildCodemapSplines(edges, symbolById, moduleClusters);
	return { entryPoints, moduleClusters, fileContainers, symbolById, macroHighways, mesoEdges, frustumIndex: buildSpatialFrustumIndex(boxes), parentByEntityId: parentMap, worldWidth: Math.max(T.MIN_WORLD_W_PX, ...moduleClusters.map((c) => c.x + c.width + T.WORLD_PAD_PX)), worldHeight: Math.max(T.MIN_WORLD_H_PX, ...moduleClusters.map((c) => c.y + c.height + T.WORLD_PAD_PX)) };
}

function buildCodemapSplines(edges: readonly GraphReferenceEdge[], symbolById: ReadonlyMap<number, CodemapSymbolPill>, clusters: readonly CodemapModuleCluster[]) {
	const T = CODEMAP_LOD_TOKENS, mesoEdges: CodemapMesoEdge[] = [], pairs = new Map<string, { src: CodemapModuleCluster; dst: CodemapModuleCluster; count: number }>();
	const clusterByDir = new Map(clusters.map((c) => [c.id, c]));
	for (const e of edges) {
		const src = symbolById.get(e.sourceEntityId), dst = symbolById.get(e.targetEntityId);
		if (!src || !dst || src.id === dst.id) continue;
		mesoEdges.push({ id: `edge:${e.id}:${src.id}-${dst.id}`, sourceEntityId: src.id, targetEntityId: dst.id, kind: e.kind, x1: src.x + src.width, y1: src.y + src.height / 2, x2: dst.x, y2: dst.y + dst.height / 2 });
		const srcDir = extractPaths(src.filePath).dirPath, dstDir = extractPaths(dst.filePath).dirPath;
		const cSrc = clusterByDir.get(`cluster:${src.ringDepth}::${srcDir}`), cDst = clusterByDir.get(`cluster:${dst.ringDepth}::${dstDir}`);
		if (cSrc && cDst && cSrc.id !== cDst.id) pairs.set(`${cSrc.id}->${cDst.id}`, { src: cSrc, dst: cDst, count: (pairs.get(`${cSrc.id}->${cDst.id}`)?.count ?? 0) + 1 });
	}
	const macroHighways: CodemapMacroHighway[] = Array.from(pairs.entries()).map(([k, v]) => ({ id: `hwy:${k}`, sourceClusterId: v.src.id, targetClusterId: v.dst.id, edgeCount: v.count, strokeWidth: Math.max(T.HIGHWAY_MIN_STROKE, Math.min(T.HIGHWAY_MAX_STROKE, Math.log2(v.count + 1) * T.HIGHWAY_LOG_SCALE)), x1: v.src.x + v.src.width, y1: v.src.y + v.src.height / 2, x2: v.dst.x, y2: v.dst.y + v.dst.height / 2 }));
	return { macroHighways, mesoEdges };
}

export function traceCodemapEntryPath(projection: ProjectCodemapProjection, targetEntityId: number | null): readonly CodemapTravelHop[] {
	const fallbackId = targetEntityId ?? projection.entryPoints[0]?.entityId ?? null;
	if (fallbackId === null) return [];
	const chain: number[] = [], visited = new Set<number>();
	for (let cur: number | undefined = fallbackId; cur !== undefined && !visited.has(cur); cur = projection.parentByEntityId.get(cur)) { visited.add(cur); chain.unshift(cur); }
	if (chain.length === 1 && projection.entryPoints[0] && projection.entryPoints[0].entityId !== fallbackId) chain.unshift(projection.entryPoints[0].entityId);
	return chain.map((entityId, hopIndex) => {
		const s = projection.symbolById.get(entityId);
		const rowLeftX = s?.x ?? 80, rowRightX = (s?.x ?? 80) + (s?.width ?? 120), rowMidY = (s?.y ?? 80) + (s?.height ?? 24) / 2;
		return {
			hopIndex, entityId, ringDepth: s?.ringDepth ?? hopIndex,
			label: hopIndex === 0 ? `Hop 0 [Entry] · ${s?.name ?? entityId}` : `Hop ${hopIndex} · ${s?.name ?? entityId}`,
			badgeText: hopIndex === 0 ? '⚡ HOP 0 · ENTRY' : `⚡ HOP ${hopIndex}`,
			x: (rowLeftX + rowRightX) / 2, y: rowMidY, rowLeftX, rowRightX, rowMidY,
		};
	});
}
