/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.6 ELK-Inspired Aspect-Ratio Codemap Layout Helpers, Splines, Travel Hop Tracer & Boundary Port Routing.
 */
import { CODEMAP_LOD_TOKENS } from '@config/hud/hud.projections';
import type { GraphReferenceEdge } from '@core/graph/graph_traversal';
import type {
	CodemapMacroHighway, CodemapMesoEdge, CodemapModuleCluster,
	CodemapSymbolPill, CodemapTravelHop, ProjectCodemapProjection,
} from './codemap.types';

export const MAX_RING_COL_HEIGHT = CODEMAP_LOD_TOKENS.MAX_RING_COL_H_PX;

export function extractCodemapPaths(qName: string): { readonly dirPath: string; readonly filePath: string } {
	const parts = (qName.split('::')[0]?.split('#')[0] ?? qName).split('/').filter(Boolean);
	if (parts.length === 0) return { dirPath: 'core', filePath: 'core/root.ts' };
	if (parts.length === 1) return { dirPath: 'root', filePath: `root/${parts[0]}` };
	return { dirPath: parts.slice(0, -1).join('/'), filePath: parts.join('/') };
}

export function computeCodemapLabelScale(zoomScale: number): number {
	if (zoomScale >= 0.7) return 1;
	const safeZoom = Math.max(0.2, zoomScale);
	return Number(Math.min(1.75, 1 / Math.sqrt(safeZoom)).toFixed(3));
}

export function buildBoundaryPortPolygon(cx: number, cy: number, radiusPx = 3): string {
	return `${cx},${cy - radiusPx} ${cx + radiusPx},${cy} ${cx},${cy + radiusPx} ${cx - radiusPx},${cy}`;
}

export function buildHighwayChannelPath(x1: number, y1: number, x2: number, y2: number, stubPx = 12): string {
	const outX = x1 + stubPx, inX = x2 - stubPx, midX = Math.round((outX + inX) / 2);
	return `M ${x1} ${y1} L ${outX} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${inX} ${y2} L ${x2} ${y2}`;
}

export function buildCodemapSplines(
	edges: readonly GraphReferenceEdge[],
	symbolById: ReadonlyMap<number, CodemapSymbolPill>,
	clusters: readonly CodemapModuleCluster[],
) {
	const T = CODEMAP_LOD_TOKENS, mesoEdges: CodemapMesoEdge[] = [];
	const pairs = new Map<string, { src: CodemapModuleCluster; dst: CodemapModuleCluster; count: number }>();
	const clusterByDir = new Map(clusters.map((c) => [c.id, c]));
	for (const e of edges) {
		const src = symbolById.get(e.sourceEntityId), dst = symbolById.get(e.targetEntityId);
		if (!src || !dst || src.id === dst.id) continue;
		mesoEdges.push({ id: `edge:${e.id}:${src.id}-${dst.id}`, sourceEntityId: src.id, targetEntityId: dst.id, kind: e.kind, x1: src.x + src.width, y1: src.y + src.height / 2, x2: dst.x, y2: dst.y + dst.height / 2 });
		const srcDir = extractCodemapPaths(src.filePath).dirPath, dstDir = extractCodemapPaths(dst.filePath).dirPath;
		const cSrc = clusterByDir.get(`cluster:${src.ringDepth}::${srcDir}`), cDst = clusterByDir.get(`cluster:${dst.ringDepth}::${dstDir}`);
		if (cSrc && cDst && cSrc.id !== cDst.id) pairs.set(`${cSrc.id}->${cDst.id}`, { src: cSrc, dst: cDst, count: (pairs.get(`${cSrc.id}->${cDst.id}`)?.count ?? 0) + 1 });
	}
	const macroHighways: CodemapMacroHighway[] = Array.from(pairs.entries()).map(([k, v]) => ({
		id: `hwy:${k}`, sourceClusterId: v.src.id, targetClusterId: v.dst.id, edgeCount: v.count,
		strokeWidth: Math.max(T.HIGHWAY_MIN_STROKE, Math.min(T.HIGHWAY_MAX_STROKE, Math.log2(v.count + 1) * T.HIGHWAY_LOG_SCALE)),
		x1: v.src.x + v.src.width, y1: v.src.y + v.src.height / 2, x2: v.dst.x, y2: v.dst.y + v.dst.height / 2,
	}));
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
			badgeText: hopIndex === 0 ? 'HOP 0 · ENTRY' : `HOP ${hopIndex}`,
			x: (rowLeftX + rowRightX) / 2, y: rowMidY, rowLeftX, rowRightX, rowMidY,
		};
	});
}
