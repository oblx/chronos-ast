/**
 * @author Oblx <code@oblx.dev>
 * @description Multi-modal workspace camera & gesture engine with universal fitGraphToSafeCorridor auto-centering (v2.6.0).
 */
import { CAMERA_PHYSICS_TOKENS, HUD_THEME } from '@config/hud.tokens';
import { clampValue, distanceBetween } from '@lib/utils/math_vector';

const B = HUD_THEME.CANVAS_BOUNDS;

export interface ViewportCameraState { readonly panX: number; readonly panY: number; readonly zoomScale: number; }
export interface HudContextMenuState { readonly open: boolean; readonly x: number; readonly y: number; readonly entityId: number | null; }
export interface RectExtent { readonly width: number; readonly height: number; }
export interface DrawerSafeOffsets { readonly leftPx?: number; readonly rightPx?: number; }

export function computeFocalPointZoom(
	panX: number, panY: number, currentZoom: number, nextZoomRaw: number, cursorX: number, cursorY: number
): ViewportCameraState {
	const safeCur = Math.max(CAMERA_PHYSICS_TOKENS.MIN_ZOOM, currentZoom);
	const zoomScale = Number(clampValue(nextZoomRaw, CAMERA_PHYSICS_TOKENS.MIN_ZOOM, CAMERA_PHYSICS_TOKENS.MAX_ZOOM).toFixed(3));
	const worldX = (cursorX - panX) / safeCur, worldY = (cursorY - panY) / safeCur;
	return { panX: Math.round(cursorX - worldX * zoomScale), panY: Math.round(cursorY - worldY * zoomScale), zoomScale };
}

export function fitGraphToSafeCorridor(bounds: RectExtent, viewportRect: RectExtent, paddingPx = 28, offsetsOrNodes?: DrawerSafeOffsets | number, maybeNodes?: number): ViewportCameraState {
	const offsets = typeof offsetsOrNodes === 'object' && offsetsOrNodes !== null ? offsetsOrNodes : { leftPx: 0, rightPx: 0 };
	const nodeCount = typeof offsetsOrNodes === 'number' ? offsetsOrNodes : maybeNodes;
	const leftOff = offsets.leftPx ?? 0, rightOff = offsets.rightPx ?? 0;
	const bw = Math.max(120, bounds.width), bh = Math.max(120, bounds.height);
	const corridorW = Math.max(240, viewportRect.width - paddingPx * 2 - leftOff - rightOff), vh = Math.max(180, viewportRect.height - paddingPx * 2);
	const rawScale = Math.min(corridorW / bw, vh / bh);
	const isSmall = typeof nodeCount === 'number' && nodeCount > 0 && nodeCount <= CAMERA_PHYSICS_TOKENS.AUTO_FIT_SMALL_SUBGRAPH_NODES;
	const autoMinZoom = isSmall ? CAMERA_PHYSICS_TOKENS.MIN_AUTO_FIT_ZOOM : CAMERA_PHYSICS_TOKENS.MIN_ZOOM;
	const minScale = rawScale < 0.85 ? Math.max(autoMinZoom, rawScale) : 0.85;
	const zoomScale = Number(clampValue(rawScale, minScale, 1.15).toFixed(3));
	return { panX: Math.round(paddingPx + leftOff + (corridorW - bw * zoomScale) / 2), panY: Math.round(paddingPx + (vh - bh * zoomScale) / 2), zoomScale };
}

export class ViewportCameraController {
	zoomScale = $state<number>(B.ZOOM_DEFAULT);
	panX = $state<number>(0);
	panY = $state<number>(0);
	isDragging = $state<boolean>(false);
	marqueeRect = $state<{ readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null>(null);
	contextMenu = $state<HudContextMenuState>({ open: false, x: 0, y: 0, entityId: null });
	private dragOrigin = { x: 0, y: 0 };
	private pointerDownPt = { x: 0, y: 0 };
	private pointerTravelPx = 0;
	private isMarquee = false;
	private initialPinchDist: number | null = null;
	private initialMidpoint = { x: 0, y: 0 };
	private longPressTimer: ReturnType<typeof setTimeout> | null = null;

	snapshot(): ViewportCameraState { return { panX: this.panX, panY: this.panY, zoomScale: this.zoomScale }; }
	destroy(): void { if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; } }
	reset(): void { this.zoomScale = B.ZOOM_DEFAULT; this.panX = 0; this.panY = 0; this.isDragging = false; this.marqueeRect = null; this.closeContextMenu(); }
	resetView(): void { this.reset(); }
	closeContextMenu(): void { if (this.contextMenu.open) this.contextMenu = { open: false, x: 0, y: 0, entityId: null }; }
	openContextMenu(x: number, y: number, entityId: number | null = null): void { this.contextMenu = { open: true, x: Math.round(x), y: Math.round(y), entityId }; }

	fitToBounds(bounds: RectExtent, viewportRect: RectExtent, paddingPx = 28, offsetsOrNodes?: DrawerSafeOffsets | number, maybeNodes?: number): ViewportCameraState {
		const fitted = fitGraphToSafeCorridor(bounds, viewportRect, paddingPx, offsetsOrNodes, maybeNodes);
		this.zoomScale = fitted.zoomScale; this.panX = fitted.panX; this.panY = fitted.panY; return fitted;
	}
	stepZoom(delta: number, cursorX = 720, cursorY = 450): void {
		const next = computeFocalPointZoom(this.panX, this.panY, this.zoomScale, this.zoomScale + delta, cursorX, cursorY);
		this.panX = next.panX; this.panY = next.panY; this.zoomScale = next.zoomScale;
	}
	focusNodeAt(offsetX = 0, offsetY = 0): void { this.zoomScale = CAMERA_PHYSICS_TOKENS.DOUBLE_CLICK_NODE_ZOOM; this.panX = Math.round(-offsetX); this.panY = Math.round(-offsetY); }
	panBy(dx: number, dy: number): void { this.panX += dx; this.panY += dy; }

	handleWheel = (event: WheelEvent): void => {
		event.preventDefault(); this.closeContextMenu();
		this.stepZoom(-event.deltaY * B.WHEEL_SENSITIVITY * (event.ctrlKey ? 1.65 : 1), event.clientX, event.clientY);
	};

	handlePointerDown = (event: PointerEvent): void => {
		this.pointerDownPt = { x: event.clientX, y: event.clientY }; this.pointerTravelPx = 0;
		if (event.button === 0) this.closeContextMenu();
		const onNode = Boolean((event.target as HTMLElement | null)?.closest('[data-graph-node]'));
		if (event.button === 0 && event.shiftKey && !onNode) { this.isMarquee = true; this.marqueeRect = { x: event.clientX, y: event.clientY, w: 0, h: 0 }; return; }
		if (onNode && event.button === 0) return;
		this.isDragging = true; this.dragOrigin = { x: event.clientX - this.panX, y: event.clientY - this.panY };
	};

	handlePointerMove = (event: PointerEvent): void => {
		this.pointerTravelPx = Math.hypot(event.clientX - this.pointerDownPt.x, event.clientY - this.pointerDownPt.y);
		if (this.isMarquee) {
			const x = Math.min(this.pointerDownPt.x, event.clientX), y = Math.min(this.pointerDownPt.y, event.clientY);
			this.marqueeRect = { x, y, w: Math.abs(event.clientX - this.pointerDownPt.x), h: Math.abs(event.clientY - this.pointerDownPt.y) };
			return;
		}
		if (!this.isDragging) return;
		this.panX = Math.round(event.clientX - this.dragOrigin.x); this.panY = Math.round(event.clientY - this.dragOrigin.y);
	};

	handlePointerUp = (): void => { this.isDragging = false; this.isMarquee = false; this.marqueeRect = null; };

	handleContextMenu = (event: MouseEvent): void => {
		event.preventDefault();
		if (this.pointerTravelPx >= CAMERA_PHYSICS_TOKENS.RIGHT_CLICK_DEADZONE_PX) return;
		const nodeEl = (event.target as HTMLElement | null)?.closest('[data-graph-node]') as HTMLElement | null;
		const rawId = nodeEl?.getAttribute('data-entity-id');
		this.openContextMenu(event.clientX, event.clientY, rawId ? Number(rawId) : null);
	};

	handleTouchStart = (event: TouchEvent): void => {
		if (this.longPressTimer) clearTimeout(this.longPressTimer);
		if (event.touches.length === 2) {
			const t0 = event.touches[0]!, t1 = event.touches[1]!;
			this.initialPinchDist = distanceBetween({ x: t0.clientX, y: t0.clientY }, { x: t1.clientX, y: t1.clientY });
			this.initialMidpoint = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
		} else if (event.touches.length === 1) {
			const t0 = event.touches[0]!;
			this.isDragging = true; this.dragOrigin = { x: t0.clientX - this.panX, y: t0.clientY - this.panY };
			this.longPressTimer = setTimeout(() => { this.isDragging = false; this.openContextMenu(t0.clientX, t0.clientY, null); }, CAMERA_PHYSICS_TOKENS.LONG_PRESS_MS);
		}
	};

	handleTouchMove = (event: TouchEvent): void => {
		if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
		if (event.touches.length === 2 && this.initialPinchDist) {
			const t0 = event.touches[0]!, t1 = event.touches[1]!;
			const dist = distanceBetween({ x: t0.clientX, y: t0.clientY }, { x: t1.clientX, y: t1.clientY });
			const mid = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
			this.stepZoom((dist - this.initialPinchDist) * B.PINCH_SENSITIVITY, mid.x, mid.y);
			this.panBy(Math.round(mid.x - this.initialMidpoint.x), Math.round(mid.y - this.initialMidpoint.y));
			this.initialPinchDist = dist; this.initialMidpoint = mid;
		} else if (event.touches.length === 1 && this.isDragging) {
			this.panX = Math.round(event.touches[0]!.clientX - this.dragOrigin.x);
			this.panY = Math.round(event.touches[0]!.clientY - this.dragOrigin.y);
		}
	};

	handleTouchEnd = (): void => {
		if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
		this.isDragging = false; this.initialPinchDist = null;
	};
}

export function createViewportCameraController(): ViewportCameraController { return new ViewportCameraController(); }
