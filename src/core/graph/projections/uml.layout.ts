/**
 * @author Oblx <code@oblx.dev>
 * @description Industry-Benchmarked UML Sequence, UML Class & Shared-Object Contention Layout Engine (v2.5.0).
 */
import type { SharedObjectCouplingEntry, UmlClassCompartment, UmlClassProjection, UmlSequenceMessage, UmlSequenceProjection } from './uml_projections';

export interface SequenceLifelineBox { readonly id: number; readonly name: string; readonly kind: string; readonly cx: number; readonly width: number; }
export interface SequenceFragmentBox { readonly kind: string; readonly label: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; }
export interface SequenceMessageLayout {
	readonly stepOrder: number; readonly callerCx: number; readonly calleeCx: number; readonly y: number;
	readonly label: string; readonly isSelfCall: boolean; readonly returnY: number;
}
export interface UmlSequenceLayout {
	readonly lifelines: readonly SequenceLifelineBox[]; readonly fragments: readonly SequenceFragmentBox[];
	readonly messages: readonly SequenceMessageLayout[]; readonly lifelineEndY: number;
	readonly footboxY: number; readonly viewWidth: number; readonly viewHeight: number;
}

export interface ClassCardLayout {
	readonly comp: UmlClassCompartment; readonly x: number; readonly y: number;
	readonly width: number; readonly height: number;
}
export interface ClassRelationPath { readonly key: string; readonly path: string; readonly kind: string; }

export function visibilityColorVar(vis: '+' | '-' | '#'): string {
	return vis === '+' ? 'var(--hud-nominal)' : vis === '#' ? 'var(--hud-warning)' : 'var(--hud-danger)';
}

export function computeUmlSequenceLayout(seq: UmlSequenceProjection): UmlSequenceLayout {
	const slices = seq.lifelines.slice(0, 6);
	const msgs = seq.messages.slice(0, 10);
	const longestLabelPx = msgs.reduce((max, m) => Math.max(max, (`#${m.stepOrder} ${m.callee.name}() @L${m.line}`).length * 7.1), 160);
	const colWidths = slices.map((lf) => Math.max(156, lf.name.length * 8.2 + 36));
	const maxColW = Math.max(156, ...colWidths);
	const pitch = Math.max(maxColW + 48, longestLabelPx + 40);
	let curX = 48;
	const lifelines: SequenceLifelineBox[] = slices.map((lf, idx) => {
		const width = colWidths[idx]!, cx = Math.round(curX + width / 2);
		curX += pitch;
		return { id: lf.id, name: lf.name, kind: lf.kind, cx, width };
	});
	const fragmentTopY = 76;
	const hasFrag = seq.fragments.length > 0;
	const firstArrowY = hasFrag ? fragmentTopY + 46 : 96;
	const rowStep = 44;
	const xById = new Map(lifelines.map((l) => [l.id, l.cx]));
	const messages: SequenceMessageLayout[] = msgs.map((m, idx) => {
		const callerCx = xById.get(m.caller.id) ?? lifelines[0]?.cx ?? 120;
		const calleeCx = xById.get(m.callee.id) ?? callerCx;
		const y = firstArrowY + idx * rowStep;
		return {
			stepOrder: m.stepOrder, callerCx, calleeCx, y,
			label: `#${m.stepOrder} ${m.callee.name}() @L${m.line}`,
			isSelfCall: m.caller.id === m.callee.id,
			returnY: y + 18,
		};
	});
	const lastArrowY = messages.length > 0 ? messages[messages.length - 1]!.returnY : firstArrowY + 40;
	const fragments: SequenceFragmentBox[] = seq.fragments.map((f) => {
		const startY = firstArrowY + (f.startStep - 1) * rowStep - 46;
		const endY = firstArrowY + (Math.min(f.endStep, Math.max(1, messages.length)) - 1) * rowStep + 22;
		const minX = (lifelines[0]?.cx ?? 120) - maxColW / 2 - 12;
		const maxX = (lifelines[lifelines.length - 1]?.cx ?? 320) + maxColW / 2 + 12;
		return { kind: f.kind.toUpperCase(), label: f.label, x: Math.max(20, minX), y: startY, width: Math.max(320, maxX - minX), height: Math.max(88, endY - startY + 18) };
	});
	const lifelineEndY = Math.max(240, lastArrowY + 34);
	const footboxY = lifelineEndY + 6;
	const viewWidth = Math.max(960, Math.round(curX + 40));
	const viewHeight = Math.max(480, footboxY + 56);
	return { lifelines, fragments, messages, lifelineEndY, footboxY, viewWidth, viewHeight };
}

export function buildSlottedManhattanPath(x1: number, y1: number, x2: number, y2: number, portIdx: number, portCount: number): string {
	const offset = Math.round((portIdx - (portCount - 1) / 2) * 16);
	const sx = x1 + offset, ex = x2 + offset, midY = Math.round((y1 + y2) / 2) + offset * 0.5;
	const r = 6, dx = ex >= sx ? r : -r, dy = y2 >= y1 ? r : -r;
	if (Math.abs(ex - sx) < 10) return `M ${sx} ${y1} L ${ex} ${y2}`;
	return `M ${sx} ${y1} L ${sx} ${midY - dy} Q ${sx} ${midY} ${sx + dx} ${midY} L ${ex - dx} ${midY} Q ${ex} ${midY} ${ex} ${midY + dy} L ${ex} ${y2}`;
}

export function computeUmlClassLayout(proj: UmlClassProjection): {
	readonly cards: readonly ClassCardLayout[]; readonly relations: readonly ClassRelationPath[]; readonly viewWidth: number; readonly viewHeight: number;
} {
	const slice = proj.classes.slice(0, 6);
	const maxSig = slice.reduce((m, c) => {
		const fMax = c.fields.reduce((fm, f) => Math.max(fm, f.name.length + 10), 0);
		const mMax = c.methods.reduce((mm, mt) => Math.max(mm, mt.name.length + 14), 0);
		return Math.max(m, c.entity.name.length + 6, fMax, mMax);
	}, 26);
	const cardW = Math.max(256, Math.min(340, Math.round(maxSig * 7.4 + 32)));
	const cardH = 192, gapX = 48, gapY = 46;
	const cards: ClassCardLayout[] = slice.map((comp, idx) => ({
		comp, width: cardW, height: cardH,
		x: 36 + (idx % 3) * (cardW + gapX),
		y: 28 + Math.floor(idx / 3) * (cardH + gapY) + comp.tier * 12,
	}));
	const byId = new Map(cards.map((c) => [c.comp.entity.id, c]));
	const validRels = proj.relations.filter((r) => byId.has(r.fromClassId) && byId.has(r.toClassId));
	const relations: ClassRelationPath[] = validRels.map((rel, idx) => {
		const c1 = byId.get(rel.fromClassId)!, c2 = byId.get(rel.toClassId)!;
		const down = c1.y <= c2.y;
		const y1 = down ? c1.y + c1.height : c1.y, y2 = down ? c2.y : c2.y + c2.height;
		return {
			key: `${rel.fromClassId}-${rel.toClassId}-${rel.kind}`, kind: rel.kind,
			path: buildSlottedManhattanPath(c1.x + c1.width / 2, y1, c2.x + c2.width / 2, y2, idx, validRels.length),
		};
	});
	return { cards, relations, viewWidth: Math.max(960, 72 + 3 * cardW + 2 * gapX), viewHeight: Math.max(540, cards.reduce((m, c) => Math.max(m, c.y + c.height + 36), 540)) };
}

export function buildBezierSpline(x1: number, y1: number, x2: number, y2: number): string {
	const mx = Math.round((x1 + x2) / 2);
	return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function computeContentionRatio(entry: SharedObjectCouplingEntry): { readonly writePct: number; readonly isHotspot: boolean } {
	const total = Math.max(1, entry.mutators.length + entry.readers.length);
	return { writePct: Math.round((entry.mutators.length / total) * 100), isHotspot: entry.mutators.length >= 2 };
}
