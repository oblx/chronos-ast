/**
 * @author Oblx <code@oblx.dev>
 * @description Universal event-driven Spotlight & Guided Tour state machine (createSpotlightMachine) and use:uiSpotlight Svelte action with multi-rect cutout tracking (v1.9.6).
 */
import { UI_CORNER_TUPLES, type CornerTuple } from '../tokens';

export const UI_SPOTLIGHT_TARGETS = {
	WORLD_CANVAS: 'hud-world-canvas',
	TOP_CENTER_CROWN: 'hud-top-center-crown',
	PROJECT_TAB_DECK: 'hud-project-tab-deck',
	LEFT_EDGE_RAIL: 'hud-left-edge-rail',
	RIGHT_EDGE_RAIL: 'hud-right-edge-rail',
	BOTTOM_CENTER_DECK: 'hud-bottom-center-deck',
	BOTTOM_RIGHT_RADAR: 'hud-bottom-right-radar',
	TOP_LEFT_IDENTITY: 'hud-top-left-identity',
} as const;

export type UiSpotlightTargetId = (typeof UI_SPOTLIGHT_TARGETS)[keyof typeof UI_SPOTLIGHT_TARGETS] | string;

export interface SpotlightRect {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly top: number;
	readonly left: number;
	readonly right: number;
	readonly bottom: number;
	readonly corners: CornerTuple;
}
export type UiSpotlightRect = SpotlightRect;

export interface UiSpotlightStepSpec {
	readonly stepIndex: number;
	readonly totalSteps: number;
	readonly targetIds: readonly string[];
	readonly title: string;
	readonly description: string;
}

export const DEFAULT_TOUR_STEPS: readonly UiSpotlightStepSpec[] = [
	{ stepIndex: 1, totalSteps: 5, targetIds: [UI_SPOTLIGHT_TARGETS.WORLD_CANVAS], title: 'Interactive Spatial Graph Canvas', description: 'Explore multi-scale architecture graphs with semantic zoom, zero-collision hop splines, and frustum culling.' },
	{ stepIndex: 2, totalSteps: 5, targetIds: [UI_SPOTLIGHT_TARGETS.TOP_CENTER_CROWN], title: '9-Projection Crown', description: 'Switch instantaneously across all 9 canonical structural, control-flow, data-flow, matrix, and source projections.' },
	{ stepIndex: 3, totalSteps: 5, targetIds: [UI_SPOTLIGHT_TARGETS.PROJECT_TAB_DECK], title: 'Zero-CLS Project Tab Deck & Ingestion Trigger', description: 'Manage concurrent workspace tabs, open shared repositories, or trigger archive and Git packfile ingestion.' },
	{ stepIndex: 4, totalSteps: 5, targetIds: [UI_SPOTLIGHT_TARGETS.LEFT_EDGE_RAIL, UI_SPOTLIGHT_TARGETS.RIGHT_EDGE_RAIL], title: 'Persistent Edge Rails', description: 'Unfold non-resizing overlay drawers for symbol filtering on the left and 3-tier telemetry inspection on the right.' },
	{ stepIndex: 5, totalSteps: 5, targetIds: [UI_SPOTLIGHT_TARGETS.BOTTOM_CENTER_DECK], title: 'Shortcut Hotbar & Command Console', description: 'Trigger stations, instant search, steppers, audits, collaboration rooms, and context-redacted local prompts.' },
] as const;

const TARGET_CORNERS: Record<string, CornerTuple> = {
	[UI_SPOTLIGHT_TARGETS.WORLD_CANVAS]: UI_CORNER_TUPLES.PERIMETER_CHAMFER,
	[UI_SPOTLIGHT_TARGETS.TOP_CENTER_CROWN]: UI_CORNER_TUPLES.TOP_CENTER_CROWN,
	[UI_SPOTLIGHT_TARGETS.PROJECT_TAB_DECK]: UI_CORNER_TUPLES.TOP_CENTER_CROWN,
	[UI_SPOTLIGHT_TARGETS.LEFT_EDGE_RAIL]: UI_CORNER_TUPLES.LEFT_EDGE_WING,
	[UI_SPOTLIGHT_TARGETS.RIGHT_EDGE_RAIL]: UI_CORNER_TUPLES.RIGHT_EDGE_WING,
	[UI_SPOTLIGHT_TARGETS.BOTTOM_CENTER_DECK]: UI_CORNER_TUPLES.BOTTOM_CENTER_DECK,
	[UI_SPOTLIGHT_TARGETS.BOTTOM_RIGHT_RADAR]: UI_CORNER_TUPLES.BOTTOM_RIGHT_POD,
	[UI_SPOTLIGHT_TARGETS.TOP_LEFT_IDENTITY]: UI_CORNER_TUPLES.TOP_LEFT_WING,
};

const elementRegistry = new Map<string, HTMLElement>();

function fallbackTargetBounds(id: string, vw: number, vh: number): { x: number; y: number; width: number; height: number } {
	if (id === UI_SPOTLIGHT_TARGETS.TOP_CENTER_CROWN) return { x: Math.round(vw * 0.23), y: 8, width: Math.round(vw * 0.54), height: 48 };
	if (id === UI_SPOTLIGHT_TARGETS.PROJECT_TAB_DECK) return { x: Math.round(vw * 0.23), y: 60, width: Math.round(vw * 0.54), height: 34 };
	if (id === UI_SPOTLIGHT_TARGETS.LEFT_EDGE_RAIL) return { x: 8, y: Math.round(vh * 0.35), width: 48, height: Math.round(vh * 0.3) };
	if (id === UI_SPOTLIGHT_TARGETS.RIGHT_EDGE_RAIL) return { x: vw - 56, y: Math.round(vh * 0.35), width: 48, height: Math.round(vh * 0.3) };
	if (id === UI_SPOTLIGHT_TARGETS.BOTTOM_CENTER_DECK) return { x: Math.round(vw * 0.22), y: vh - 124, width: Math.round(vw * 0.56), height: 116 };
	if (id === UI_SPOTLIGHT_TARGETS.BOTTOM_RIGHT_RADAR) return { x: vw - 228, y: vh - 124, width: 220, height: 116 };
	if (id === UI_SPOTLIGHT_TARGETS.TOP_LEFT_IDENTITY) return { x: 8, y: 8, width: 280, height: 84 };
	return { x: Math.round(vw * 0.16), y: Math.round(vh * 0.18), width: Math.round(vw * 0.68), height: Math.round(vh * 0.58) };
}

function measureTargetRect(id: string, vw: number, vh: number): SpotlightRect {
	const corners = TARGET_CORNERS[id] ?? UI_CORNER_TUPLES.PERIMETER_CHAMFER;
	if (typeof document !== 'undefined' && id !== UI_SPOTLIGHT_TARGETS.WORLD_CANVAS) {
		const el = elementRegistry.get(id) ?? (document.querySelector(`[data-ui-spotlight="${id}"]`) as HTMLElement | null);
		const r = el?.getBoundingClientRect();
		if (r && r.width > 4 && r.height > 4) {
			const width = Math.round(r.width), height = Math.round(r.height);
			const x = Math.max(4, Math.min(vw - width - 4, Math.round(r.left))), y = Math.max(4, Math.min(vh - height - 4, Math.round(r.top)));
			return { id, x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, corners };
		}
	}
	const fb = fallbackTargetBounds(id, vw, vh);
	return { id, ...fb, top: fb.y, left: fb.x, right: fb.x + fb.width, bottom: fb.y + fb.height, corners };
}

export function createSpotlightMachine(steps: readonly UiSpotlightStepSpec[] = DEFAULT_TOUR_STEPS) {
	let active = $state(false), stepIndex = $state(1), customSpec = $state<UiSpotlightStepSpec | null>(null), rects = $state.raw<readonly SpotlightRect[]>([]);
	function currentSpec(): UiSpotlightStepSpec { return customSpec ?? steps[Math.max(0, Math.min(steps.length - 1, stepIndex - 1))] ?? steps[0]!; }
	function recomputeRects(): readonly SpotlightRect[] {
		const vw = typeof window !== 'undefined' ? window.innerWidth || 1440 : 1440, vh = typeof window !== 'undefined' ? window.innerHeight || 900 : 900;
		const next = currentSpec().targetIds.map((id) => measureTargetRect(id, vw, vh));
		rects = next;
		return next;
	}
	return {
		get active() { return active; }, get stepIndex() { return stepIndex; }, get totalSteps() { return currentSpec().totalSteps; },
		get title() { return currentSpec().title; }, get description() { return currentSpec().description; },
		get activeTargetIds() { return currentSpec().targetIds; }, get currentSpec() { return active ? currentSpec() : null; },
		get rects() { return rects; }, get primaryRect() { return rects[0] ?? null; },
		startTour(initialStep = 1): void { customSpec = null; stepIndex = Math.max(1, Math.min(steps.length, initialStep)); active = true; recomputeRects(); },
		setStep(nextStep: number): void { customSpec = null; stepIndex = Math.max(1, Math.min(steps.length, nextStep)); active = true; recomputeRects(); },
		nextStep(): void { if (stepIndex >= steps.length) { active = false; rects = []; } else { stepIndex += 1; recomputeRects(); } },
		spotlightCustom(spec: UiSpotlightStepSpec): void { customSpec = spec; stepIndex = spec.stepIndex; active = true; recomputeRects(); },
		stopTour(): void { active = false; customSpec = null; rects = []; },
		stop(): void { active = false; customSpec = null; rects = []; },
		recomputeRects, refreshRects: recomputeRects,
	};
}

export const uiSpotlightMachine = createSpotlightMachine();

export function uiSpotlight(node: HTMLElement, targetId: UiSpotlightTargetId) {
	let currentId = targetId;
	node.setAttribute('data-ui-spotlight', currentId); elementRegistry.set(currentId, node);
	if (uiSpotlightMachine.active) uiSpotlightMachine.recomputeRects();
	const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (uiSpotlightMachine.active) uiSpotlightMachine.recomputeRects(); }) : null;
	ro?.observe(node);
	return {
		update(nextId: UiSpotlightTargetId) {
			if (nextId === currentId) return;
			elementRegistry.delete(currentId); currentId = nextId; node.setAttribute('data-ui-spotlight', currentId);
			elementRegistry.set(currentId, node); if (uiSpotlightMachine.active) uiSpotlightMachine.recomputeRects();
		},
		destroy() { ro?.disconnect(); if (elementRegistry.get(currentId) === node) elementRegistry.delete(currentId); },
	};
}
