/**
 * @author Oblx <code@oblx.dev>
 * @description Headless Edge-Rail & Floating Drawer gesture state machine and use:uiDrawerGrip action for @chronos-ui/svelte.
 */
import { uiWireBroker } from '../wire';

export type UiDrawerMode = 'FOLDED_RAIL' | 'DOCKED_OPEN' | 'FLOATING_PANEL';
export type UiDrawerSide = 'LEFT' | 'RIGHT';

export interface UiDrawerPlacement {
	readonly mode: UiDrawerMode;
	readonly activeTab: string;
	readonly xRem: number;
	readonly yRem: number;
	readonly railOffsetYRem: number;
	readonly snapped: boolean;
}

export interface UiDrawerGripOptions {
	readonly side: UiDrawerSide;
	readonly mode: 'RAIL' | 'DRAWER';
	readonly getInitialOffsetRem?: () => { readonly xRem: number; readonly yRem: number; readonly railOffsetYRem: number };
	readonly onToggleFloat?: (side: UiDrawerSide) => void;
	readonly onMoveRail?: (side: UiDrawerSide, offsetYRem: number) => void;
	readonly onMoveDrawer?: (side: UiDrawerSide, xRem: number, yRem: number) => void;
}

export const RAIL_SAFE_CORRIDOR_REM = { MIN_TOP_REM: 5.25, BOTTOM_RESERVE_REM: 9.25, RAIL_HEIGHT_REM: 15.5, CLICK_DEADZONE_PX: 5 } as const;

export function clampRailOffsetYRem(offsetYRem: number, viewportHeightPx = 900, rootFontPx = 16): number {
	const vhRem = Math.max(32, viewportHeightPx / Math.max(12, rootFontPx));
	const centerRem = vhRem / 2, halfRailRem = RAIL_SAFE_CORRIDOR_REM.RAIL_HEIGHT_REM / 2;
	const minOffsetRem = RAIL_SAFE_CORRIDOR_REM.MIN_TOP_REM + halfRailRem - centerRem;
	const maxOffsetRem = vhRem - RAIL_SAFE_CORRIDOR_REM.BOTTOM_RESERVE_REM - halfRailRem - centerRem;
	return Number(Math.max(minOffsetRem, Math.min(Math.max(minOffsetRem, maxOffsetRem), offsetYRem)).toFixed(3));
}

export function clampFloatingDrawerRem(xRem: number, yRem: number, viewportWidthPx = 1440, viewportHeightPx = 900, rootFontPx = 16): { readonly xRem: number; readonly yRem: number } {
	const vwRem = Math.max(40, viewportWidthPx / Math.max(12, rootFontPx)), vhRem = Math.max(32, viewportHeightPx / Math.max(12, rootFontPx));
	return {
		xRem: Number(Math.max(0.75, Math.min(vwRem - 18.5, xRem)).toFixed(3)),
		yRem: Number(Math.max(RAIL_SAFE_CORRIDOR_REM.MIN_TOP_REM, Math.min(vhRem - RAIL_SAFE_CORRIDOR_REM.BOTTOM_RESERVE_REM, yRem)).toFixed(3)),
	};
}

export function uiDrawerGrip(node: HTMLElement, initialOpts: UiDrawerGripOptions): { update: (next: UiDrawerGripOptions) => void; destroy: () => void } {
	let opts = initialOpts, startX = 0, startY = 0, baseRailRem = 0, baseXRem = 1.5, baseYRem = 6;
	let dragging = false, wasDragged = false, activePointerId = -1, lastToggleTs = 0;
	function onPointerDown(e: PointerEvent): void {
		if (e.button !== 0) return;
		e.stopPropagation(); activePointerId = e.pointerId; startX = e.clientX; startY = e.clientY; dragging = false; wasDragged = false;
		const init = opts.getInitialOffsetRem?.() ?? { xRem: opts.side === 'LEFT' ? 1.5 : 68, yRem: 6, railOffsetYRem: 0 };
		baseRailRem = init.railOffsetYRem; baseXRem = init.xRem; baseYRem = init.yRem;
		try { node.setPointerCapture(e.pointerId); } catch {}
		window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);
	}
	function onPointerMove(e: PointerEvent): void {
		if (e.pointerId !== activePointerId) return;
		const dx = e.clientX - startX, dy = e.clientY - startY;
		if (!dragging && Math.hypot(dx, dy) >= RAIL_SAFE_CORRIDOR_REM.CLICK_DEADZONE_PX) { dragging = true; wasDragged = true; }
		if (!dragging) return;
		const rootPx = typeof window !== 'undefined' ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 : 16;
		const vw = typeof window !== 'undefined' ? window.innerWidth : 1440, vh = typeof window !== 'undefined' ? window.innerHeight : 900;
		if (opts.mode === 'RAIL') opts.onMoveRail?.(opts.side, clampRailOffsetYRem(baseRailRem + dy / rootPx, vh, rootPx));
		else { const c = clampFloatingDrawerRem(baseXRem + dx / rootPx, baseYRem + dy / rootPx, vw, vh, rootPx); opts.onMoveDrawer?.(opts.side, c.xRem, c.yRem); }
	}
	function onPointerUp(e: PointerEvent): void {
		if (e.pointerId !== activePointerId) return;
		window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp);
		try { node.releasePointerCapture(e.pointerId); } catch {}
		const totalDist = Math.hypot(e.clientX - startX, e.clientY - startY); activePointerId = -1;
		if (!wasDragged && totalDist < RAIL_SAFE_CORRIDOR_REM.CLICK_DEADZONE_PX) { lastToggleTs = performance.now(); opts.onToggleFloat?.(opts.side); }
		dragging = false;
	}
	function onClick(e: MouseEvent): void {
		if (wasDragged) { wasDragged = false; e.preventDefault(); e.stopPropagation(); return; }
		if (performance.now() - lastToggleTs > 80) { lastToggleTs = performance.now(); opts.onToggleFloat?.(opts.side); }
	}
	node.addEventListener('pointerdown', onPointerDown); node.addEventListener('click', onClick, true);
	return {
		update(next: UiDrawerGripOptions): void { opts = next; },
		destroy(): void { node.removeEventListener('pointerdown', onPointerDown); node.removeEventListener('click', onClick, true); window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); },
	};
}

class UiDrawerMachine {
	left = $state<UiDrawerPlacement>({ mode: 'FOLDED_RAIL', activeTab: 'EXPLORER', xRem: 1.5, yRem: 6, railOffsetYRem: 0, snapped: true });
	right = $state<UiDrawerPlacement>({ mode: 'FOLDED_RAIL', activeTab: 'VERDICT', xRem: 70, yRem: 6, railOffsetYRem: 0, snapped: true });

	toggleFold(side: UiDrawerSide): void {
		const target = side === 'LEFT' ? this.left : this.right, nextMode: UiDrawerMode = target.mode === 'FOLDED_RAIL' ? 'DOCKED_OPEN' : 'FOLDED_RAIL';
		if (side === 'LEFT') this.left = { ...this.left, mode: nextMode, snapped: true }; else this.right = { ...this.right, mode: nextMode, snapped: true };
		uiWireBroker.emit(`HUD_TOGGLE_${side}_DRAWER`, `${side}_EDGE`, { mode: nextMode });
	}
	setTab(side: UiDrawerSide, tabId: string, expandIfFolded = true): void {
		const cur = side === 'LEFT' ? this.left : this.right, nextMode: UiDrawerMode = expandIfFolded && cur.mode === 'FOLDED_RAIL' ? 'DOCKED_OPEN' : cur.mode;
		if (side === 'LEFT') this.left = { ...this.left, activeTab: tabId, mode: nextMode }; else this.right = { ...this.right, activeTab: tabId, mode: nextMode };
		uiWireBroker.emit(`HUD_SET_${side}_DRAWER_TAB`, `${side}_EDGE`, { tab: tabId, mode: nextMode });
	}
	toggleFloat(side: UiDrawerSide): void {
		const cur = side === 'LEFT' ? this.left : this.right, nextMode: UiDrawerMode = cur.mode === 'FLOATING_PANEL' ? 'DOCKED_OPEN' : 'FLOATING_PANEL';
		if (side === 'LEFT') this.left = { ...this.left, mode: nextMode, snapped: nextMode !== 'FLOATING_PANEL' }; else this.right = { ...this.right, mode: nextMode, snapped: nextMode !== 'FLOATING_PANEL' };
		uiWireBroker.emit('HUD_TOGGLE_DRAWER_FLOAT', `${side}_EDGE`, { side, mode: nextMode });
	}
	moveRail(side: UiDrawerSide, offsetYRem: number, vhPx = 900): void {
		const clamped = clampRailOffsetYRem(offsetYRem, vhPx);
		if (side === 'LEFT') this.left = { ...this.left, railOffsetYRem: clamped }; else this.right = { ...this.right, railOffsetYRem: clamped };
		uiWireBroker.emit('HUD_MOVE_EDGE_RAIL', `${side}_EDGE`, { side, offsetYRem: clamped });
	}
	moveFloating(side: UiDrawerSide, xRem: number, yRem: number, vwPx = 1440, vhPx = 900): void {
		const c = clampFloatingDrawerRem(xRem, yRem, vwPx, vhPx);
		if (side === 'LEFT') this.left = { ...this.left, mode: 'FLOATING_PANEL', xRem: c.xRem, yRem: c.yRem, snapped: false }; else this.right = { ...this.right, mode: 'FLOATING_PANEL', xRem: c.xRem, yRem: c.yRem, snapped: false };
		uiWireBroker.emit('HUD_MOVE_FLOATING_DRAWER', `${side}_EDGE`, { side, xRem: c.xRem, yRem: c.yRem });
	}
}

export const uiDrawerMachine = new UiDrawerMachine();
