/**
 * @author Oblx <code@oblx.dev>
 * @description Pure 2D vector geometry and cubic Bezier spline helpers for Butterfly Graph.
 */

export interface Vector2D {
	readonly x: number;
	readonly y: number;
}

const BEZIER_TENSION = 0.48;

export function addVectors(a: Vector2D, b: Vector2D): Vector2D {
	return { x: a.x + b.x, y: a.y + b.y };
}

export function distanceBetween(a: Vector2D, b: Vector2D): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	return Math.hypot(dx, dy);
}

export function clampValue(val: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, val));
}

export function buildCubicBezierPath(source: Vector2D, target: Vector2D): string {
	const deltaX = (target.x - source.x) * BEZIER_TENSION;
	const c1x = Math.round(source.x + deltaX);
	const c2x = Math.round(target.x - deltaX);
	return `M ${source.x} ${source.y} C ${c1x} ${source.y}, ${c2x} ${target.y}, ${target.x} ${target.y}`;
}

export function distributeVerticalNodes(
	count: number,
	centerY: number,
	gap: number
): readonly number[] {
	if (count <= 0) return [];
	const totalSpan = (count - 1) * gap;
	const startY = centerY - totalSpan / 2;
	return Array.from({ length: count }, (_, idx) => Math.round(startY + idx * gap));
}
