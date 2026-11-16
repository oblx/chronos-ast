/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.0 Float32Array Spatial Bounding-Box Index & 3-Tier Semantic Zoom LOD Frustum Culler.
 */
import { CODEMAP_LOD_TOKENS } from '@config/hud/hud.projections';

export type CodemapLodTier = 'MACRO' | 'MESO' | 'MICRO';

export interface SpatialBoundingBox {
	readonly id: string;
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
	readonly priority: number;
}

export interface SpatialFrustumIndex {
	readonly ids: readonly string[];
	readonly priorities: Float32Array;
	readonly bounds: Float32Array;
	readonly count: number;
}

export interface ViewportCameraFrustum {
	readonly panX: number;
	readonly panY: number;
	readonly zoomScale: number;
	readonly viewportWidth: number;
	readonly viewportHeight: number;
}

export function resolveCodemapLodTier(zoomScale: number): CodemapLodTier {
	if (zoomScale < CODEMAP_LOD_TOKENS.MACRO_MAX_ZOOM) return 'MACRO';
	if (zoomScale < CODEMAP_LOD_TOKENS.MESO_MAX_ZOOM) return 'MESO';
	return 'MICRO';
}

export function buildSpatialFrustumIndex(boxes: readonly SpatialBoundingBox[]): SpatialFrustumIndex {
	const count = boxes.length;
	const bounds = new Float32Array(count * CODEMAP_LOD_TOKENS.FRUSTUM_STRIDE);
	const priorities = new Float32Array(count);
	const ids: string[] = new Array(count);

	for (let i = 0; i < count; i++) {
		const box = boxes[i]!;
		const offset = i * CODEMAP_LOD_TOKENS.FRUSTUM_STRIDE;
		bounds[offset] = box.minX;
		bounds[offset + 1] = box.minY;
		bounds[offset + 2] = box.maxX;
		bounds[offset + 3] = box.maxY;
		priorities[i] = box.priority;
		ids[i] = box.id;
	}
	return { ids, priorities, bounds, count };
}

export function queryFrustumVisibleIds(
	index: SpatialFrustumIndex,
	frustum: ViewportCameraFrustum,
	maxDomNodes: number = CODEMAP_LOD_TOKENS.MAX_DOM_NODES
): ReadonlySet<string> {
	const scale = Math.max(0.08, frustum.zoomScale);
	const pad = CODEMAP_LOD_TOKENS.FRUSTUM_PAD_PX / scale;
	const viewMinX = -frustum.panX / scale - pad;
	const viewMinY = -frustum.panY / scale - pad;
	const viewMaxX = (frustum.viewportWidth - frustum.panX) / scale + pad;
	const viewMaxY = (frustum.viewportHeight - frustum.panY) / scale + pad;

	const matchedIndices: number[] = [];
	const { bounds, count } = index;
	const stride = CODEMAP_LOD_TOKENS.FRUSTUM_STRIDE;

	for (let i = 0; i < count; i++) {
		const offset = i * stride;
		const minX = bounds[offset]!;
		const minY = bounds[offset + 1]!;
		const maxX = bounds[offset + 2]!;
		const maxY = bounds[offset + 3]!;
		if (maxX >= viewMinX && minX <= viewMaxX && maxY >= viewMinY && minY <= viewMaxY) {
			matchedIndices.push(i);
		}
	}

	if (matchedIndices.length > maxDomNodes) {
		matchedIndices.sort((a, b) => (index.priorities[b] ?? 0) - (index.priorities[a] ?? 0));
		matchedIndices.length = maxDomNodes;
	}

	const visible = new Set<string>();
	for (let i = 0; i < matchedIndices.length; i++) {
		visible.add(index.ids[matchedIndices[i]!]!);
	}
	return visible;
}
