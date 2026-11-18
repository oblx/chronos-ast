/**
 * @author Oblx <code@oblx.dev>
 * @description Re-exports canonical CornerTuple polygon, caret, clip-path, and cartridge coordinate generators from @ui/tokens.
 */
export {
	resolveLegacyCornerTuple,
	resolveEffectiveCornerTuple,
	resolveChamferCutPx,
	buildCornerPolygonPoints,
	buildCornerCarets,
	buildHullClipPath,
	buildEntityCartridgePolygons,
} from '@ui/tokens';
