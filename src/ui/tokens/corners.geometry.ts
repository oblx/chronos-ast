/**
 * @author Oblx <code@oblx.dev>
 * @description Canonical CornerTuple ([TL, TR, BR, BL]) polygon, 135/90-degree caret, clip-path, and spotlight cutout geometry engine (v1.9.6).
 */

export const CORNER_STYLES = { CHAMFER: 'CHAMFER', STRAIGHT: 'STRAIGHT' } as const;
export const UI_CORNER_STYLES = CORNER_STYLES;
export type CornerVertex = (typeof CORNER_STYLES)[keyof typeof CORNER_STYLES];
export type CornerTuple = readonly [CornerVertex, CornerVertex, CornerVertex, CornerVertex];

export const CHAMFER_CORNERS = {
	CORNER_TOP_LEFT: 'CORNER_TOP_LEFT', CORNER_BOTTOM_LEFT: 'CORNER_BOTTOM_LEFT',
	CORNER_TOP_RIGHT: 'CORNER_TOP_RIGHT', CORNER_BOTTOM_RIGHT: 'CORNER_BOTTOM_RIGHT',
	RIGHT_END_CAP: 'RIGHT_END_CAP', LEFT_END_CAP: 'LEFT_END_CAP', INTERIOR_CHAMFER: 'INTERIOR_CHAMFER',
	TOP_RIGHT: 'CORNER_TOP_RIGHT', BOTTOM_LEFT: 'CORNER_BOTTOM_LEFT', DIAGONAL_PAIR: 'INTERIOR_CHAMFER',
	WING_SLOT: 'WING_SLOT', OCTAGON_PILL: 'OCTAGON_PILL', CHAMFER_OCTAGON: 'CHAMFER_OCTAGON',
	TOP_CAP_CHAMFER: 'TOP_CAP_CHAMFER', BOTTOM_CAP_CHAMFER: 'BOTTOM_CAP_CHAMFER',
} as const;
export const CHAMFER_PROFILES = CHAMFER_CORNERS;
export type ChamferCornerMode = (typeof CHAMFER_CORNERS)[keyof typeof CHAMFER_CORNERS];
export type ChamferCorner = ChamferCornerMode;
export type ChamferProfile = ChamferCornerMode;

export const HULL_PROFILES = {
	CHAMFER_OCTAGON: 'CHAMFER_OCTAGON', CHAMFER_CORNER_POD: 'CHAMFER_CORNER_POD', WING_CREST: 'WING_CREST',
} as const;
export type HullProfile = (typeof HULL_PROFILES)[keyof typeof HULL_PROFILES];

export const HULL_TOKENS = {
	CHAMFER_PX: 12, CREST_CHAMFER_PX: 12, OCTAGON_CHAMFER_PX: 12, BUTTON_CHAMFER_PX: 6,
	CHAMFER_REM: 0.75, BUTTON_CHAMFER_REM: 0.375, INNER_BEZEL_INSET_PX: 3, INNER_BEZEL_OPACITY: 0.35,
	CORNER_CAP_LEG_PX: 10, CORNER_CAP_STROKE_PX: 2, OUTER_STROKE_PX: 1.5, CHEVRON_COUNT: 5, CHEVRON_WIDTH_PX: 5,
	CHEVRON_GAP_PX: 3, CHEVRON_HEIGHT_PX: 4, CHEVRON_SLANT_PX: 4, MIN_MEASURE_WIDTH_PX: 180, MIN_MEASURE_HEIGHT_PX: 44,
} as const;

export const ZONE_CORNER_TUPLES = {
	PERIMETER_CHAMFER: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	STRAIGHT_QUAD: ['STRAIGHT', 'STRAIGHT', 'STRAIGHT', 'STRAIGHT'] as CornerTuple,
	DIAGONAL_CHAMFER: ['STRAIGHT', 'CHAMFER', 'STRAIGHT', 'CHAMFER'] as CornerTuple,
	TOP_LEFT: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	TOP_LEFT_WING: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	TOP_CENTER: ['CHAMFER', 'CHAMFER', 'STRAIGHT', 'STRAIGHT'] as CornerTuple,
	TOP_CENTER_CROWN: ['CHAMFER', 'CHAMFER', 'STRAIGHT', 'STRAIGHT'] as CornerTuple,
	PROJECT_TAB_DECK: ['STRAIGHT', 'STRAIGHT', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	TOP_RIGHT: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	LEFT_EDGE: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	LEFT_EDGE_WING: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	RIGHT_EDGE: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	RIGHT_EDGE_WING: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	BOTTOM_LEFT: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	BOTTOM_CENTER: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	BOTTOM_CENTER_DECK: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	BOTTOM_RIGHT: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	BOTTOM_RIGHT_POD: ['CHAMFER', 'CHAMFER', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	RAIL_TOP_CAP: ['CHAMFER', 'CHAMFER', 'STRAIGHT', 'STRAIGHT'] as CornerTuple,
	RAIL_BOTTOM_CAP: ['STRAIGHT', 'STRAIGHT', 'CHAMFER', 'CHAMFER'] as CornerTuple,
	RADAR_TOP_LEFT: ['CHAMFER', 'STRAIGHT', 'STRAIGHT', 'STRAIGHT'] as CornerTuple,
	RADAR_BOTTOM_LEFT: ['STRAIGHT', 'STRAIGHT', 'STRAIGHT', 'CHAMFER'] as CornerTuple,
	RADAR_TOP_RIGHT: ['STRAIGHT', 'CHAMFER', 'STRAIGHT', 'STRAIGHT'] as CornerTuple,
	RADAR_BOTTOM_RIGHT: ['STRAIGHT', 'STRAIGHT', 'CHAMFER', 'STRAIGHT'] as CornerTuple,
} as const;
export const UI_CORNER_TUPLES = ZONE_CORNER_TUPLES;

export function mirrorCornerTuple(tuple: CornerTuple): CornerTuple {
	return [tuple[1], tuple[0], tuple[3], tuple[2]] as const;
}

export function resolveCornerTuple(corners?: CornerTuple, cornerStyle: CornerVertex = CORNER_STYLES.CHAMFER): CornerTuple {
	if (cornerStyle === CORNER_STYLES.STRAIGHT) return ZONE_CORNER_TUPLES.STRAIGHT_QUAD;
	return corners ?? ZONE_CORNER_TUPLES.PERIMETER_CHAMFER;
}

export function resolveLegacyCornerTuple(mode: ChamferCorner): CornerTuple {
	if (mode === CHAMFER_PROFILES.CORNER_TOP_LEFT) return ZONE_CORNER_TUPLES.RADAR_TOP_LEFT;
	if (mode === CHAMFER_PROFILES.CORNER_TOP_RIGHT) return ZONE_CORNER_TUPLES.RADAR_TOP_RIGHT;
	if (mode === CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT) return ZONE_CORNER_TUPLES.RADAR_BOTTOM_RIGHT;
	if (mode === CHAMFER_PROFILES.CORNER_BOTTOM_LEFT) return ZONE_CORNER_TUPLES.RADAR_BOTTOM_LEFT;
	if (mode === CHAMFER_PROFILES.RIGHT_END_CAP) return ['STRAIGHT', 'CHAMFER', 'CHAMFER', 'STRAIGHT'];
	if (mode === CHAMFER_PROFILES.LEFT_END_CAP) return ['CHAMFER', 'STRAIGHT', 'STRAIGHT', 'CHAMFER'];
	if (mode === CHAMFER_PROFILES.WING_SLOT || mode === CHAMFER_PROFILES.TOP_CAP_CHAMFER) return ZONE_CORNER_TUPLES.RAIL_TOP_CAP;
	if (mode === CHAMFER_PROFILES.BOTTOM_CAP_CHAMFER) return ZONE_CORNER_TUPLES.RAIL_BOTTOM_CAP;
	if (mode === CHAMFER_PROFILES.OCTAGON_PILL || mode === CHAMFER_PROFILES.CHAMFER_OCTAGON) return ZONE_CORNER_TUPLES.PERIMETER_CHAMFER;
	return ZONE_CORNER_TUPLES.DIAGONAL_CHAMFER;
}

export function resolveEffectiveCornerTuple(opts: { cornerStyle: CornerVertex; explicitCorners?: CornerTuple; profile?: HullProfile | ChamferCorner; legacyCorner?: ChamferCorner }): CornerTuple {
	if (opts.cornerStyle === CORNER_STYLES.STRAIGHT) return ZONE_CORNER_TUPLES.STRAIGHT_QUAD;
	if (opts.explicitCorners) return opts.explicitCorners;
	if (opts.profile === HULL_PROFILES.WING_CREST) return ZONE_CORNER_TUPLES.RAIL_BOTTOM_CAP;
	if (opts.profile === HULL_PROFILES.CHAMFER_OCTAGON || opts.profile === HULL_PROFILES.CHAMFER_CORNER_POD) return ZONE_CORNER_TUPLES.PERIMETER_CHAMFER;
	return opts.profile ? resolveLegacyCornerTuple(opts.profile) : opts.legacyCorner ? resolveLegacyCornerTuple(opts.legacyCorner) : ZONE_CORNER_TUPLES.PERIMETER_CHAMFER;
}

export function resolveChamferCutPx(
	width: number, height: number, baseChamferPx: number, fontScalePct: number, cornerStyle: CornerVertex, minPx = 4,
): number {
	if (cornerStyle === CORNER_STYLES.STRAIGHT) return 0;
	return Math.max(minPx, Math.min(Math.round(baseChamferPx * (fontScalePct / 100)), Math.floor(Math.min(width, height) * 0.36)));
}

export function buildCornerPolygonPoints(
	width: number, height: number, inset: number, tuple: CornerTuple, cutPx: number, offsetX = 0, offsetY = 0,
): string {
	const x0 = offsetX + inset, y0 = offsetY + inset, x1 = offsetX + Math.max(inset + 6, width - inset), y1 = offsetY + Math.max(inset + 6, height - inset);
	const [tl, tr, br, bl] = tuple;
	const tlPts = tl === 'CHAMFER' && cutPx > 0 ? `${x0},${y0 + cutPx} ${x0 + cutPx},${y0}` : `${x0},${y0}`;
	const trPts = tr === 'CHAMFER' && cutPx > 0 ? `${x1 - cutPx},${y0} ${x1},${y0 + cutPx}` : `${x1},${y0}`;
	const brPts = br === 'CHAMFER' && cutPx > 0 ? `${x1},${y1 - cutPx} ${x1 - cutPx},${y1}` : `${x1},${y1}`;
	const blPts = bl === 'CHAMFER' && cutPx > 0 ? `${x0 + cutPx},${y1} ${x0},${y1 - cutPx}` : `${x0},${y1}`;
	return `${tlPts} ${trPts} ${brPts} ${blPts}`;
}

export function buildCornerCarets(
	width: number, height: number, tuple: CornerTuple, cutPx: number, legPx: number, offsetX = 0, offsetY = 0,
): string[] {
	const leg = Math.min(legPx, Math.floor(Math.min(width, height) * 0.2)), x0 = offsetX + 2, y0 = offsetY + 2, x1 = offsetX + Math.max(10, width - 2), y1 = offsetY + Math.max(10, height - 2);
	const [tl, tr, br, bl] = tuple;
	return [
		tl === 'CHAMFER' && cutPx > 0 ? `${x0},${y0 + cutPx + leg} ${x0},${y0 + cutPx} ${x0 + cutPx},${y0} ${x0 + cutPx + leg},${y0}` : `${x0},${y0 + leg} ${x0},${y0} ${x0 + leg},${y0}`,
		tr === 'CHAMFER' && cutPx > 0 ? `${x1 - cutPx - leg},${y0} ${x1 - cutPx},${y0} ${x1},${y0 + cutPx} ${x1},${y0 + cutPx + leg}` : `${x1 - leg},${y0} ${x1},${y0} ${x1},${y0 + leg}`,
		br === 'CHAMFER' && cutPx > 0 ? `${x1},${y1 - cutPx - leg} ${x1},${y1 - cutPx} ${x1 - cutPx},${y1} ${x1 - cutPx - leg},${y1}` : `${x1 - leg},${y1} ${x1},${y1} ${x1},${y1 - leg}`,
		bl === 'CHAMFER' && cutPx > 0 ? `${x0 + cutPx + leg},${y1} ${x0 + cutPx},${y1} ${x0},${y1 - cutPx} ${x0},${y1 - cutPx - leg}` : `${x0},${y1 - leg} ${x0},${y1} ${x0 + leg},${y1}`,
	];
}

export function buildHullClipPath(tuple: CornerTuple, cutPx: number, insetPx = 1): string {
	const [tl, tr, br, bl] = tuple, p = `${insetPx}px`, c = cutPx;
	const tlClip = tl === 'CHAMFER' && c > 0 ? `${p} ${c}px, ${c}px ${p}` : `${p} ${p}`;
	const trClip = tr === 'CHAMFER' && c > 0 ? `calc(100% - ${c}px) ${p}, calc(100% - ${p}) ${c}px` : `calc(100% - ${p}) ${p}`;
	const brClip = br === 'CHAMFER' && c > 0 ? `calc(100% - ${p}) calc(100% - ${c}px), calc(100% - ${c}px) calc(100% - ${p})` : `calc(100% - ${p}) calc(100% - ${p})`;
	const blClip = bl === 'CHAMFER' && c > 0 ? `${c}px calc(100% - ${p}), ${p} calc(100% - ${c}px)` : `${p} calc(100% - ${p})`;
	return `clip-path: polygon(${tlClip}, ${trClip}, ${brClip}, ${blClip});`;
}

export function buildEntityCartridgePolygons(width: number, height: number, chamfer: number, cornerStyle: CornerVertex) {
	const cut = cornerStyle === CORNER_STYLES.STRAIGHT ? 0 : Math.max(4, Math.min(chamfer, Math.floor(Math.min(width, height) * 0.4)));
	const tuple: CornerTuple = cut > 0 ? ZONE_CORNER_TUPLES.DIAGONAL_CHAMFER : ZONE_CORNER_TUPLES.STRAIGHT_QUAD;
	return {
		cut, outerPts: buildCornerPolygonPoints(width, height, 0, tuple, cut), innerPts: buildCornerPolygonPoints(width, height, 3, tuple, Math.max(0, cut - 2)),
		reticleTrPts: cut > 0 ? `${width - cut - 10},-6 ${width - cut + 2},-6 ${width + 6},${cut - 2} ${width + 6},${cut + 10}` : `${width - 10},-6 ${width + 6},-6 ${width + 6},10`,
		reticleBlPts: cut > 0 ? `-6,${height - cut - 10} -6,${height - cut + 2} ${cut - 2},${height + 6} ${cut + 10},${height + 6}` : `-6,${height - 10} -6,${height + 6} 10,${height + 6}`,
	};
}
