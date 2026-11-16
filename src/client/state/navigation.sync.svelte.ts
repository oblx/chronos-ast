/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.0 Cross-View Camera & Focal Entity State Synchronizer (ProjectNavigationCursor).
 */
import { GRAPH_PROJECTIONS, HUD_VIEWS, WORKSPACE_DEFAULTS, type HudViewMode } from '@config/constants';

export interface ProjectNavigationCursor {
	readonly projectId: string;
	readonly activeView: HudViewMode;
	readonly selectedEntityId: number | null;
	readonly focalEntityId: number | null;
	readonly activeFilePath: string | null;
	readonly activeSourceLine: number;
	readonly normalizedFocusX: number;
	readonly normalizedFocusY: number;
	readonly zoomLevel: number;
	readonly panX: number;
	readonly panY: number;
	readonly codemapPanX: number;
	readonly codemapPanY: number;
	readonly codemapZoom: number;
	readonly codemapTrailIds: readonly number[];
	readonly codemapTravelMode: boolean;
}

export interface EntityTargetBounds {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

const NAV_STORAGE_PREFIX = 'chronos:v190:nav-cursor:';

function createDefaultCursor(projectId: string = WORKSPACE_DEFAULTS.CORE_ID): ProjectNavigationCursor {
	return {
		projectId,
		activeView: HUD_VIEWS.CODEMAP,
		selectedEntityId: WORKSPACE_DEFAULTS.FALLBACK_ENTITY_ID,
		focalEntityId: WORKSPACE_DEFAULTS.FALLBACK_ENTITY_ID,
		activeFilePath: null,
		activeSourceLine: 1,
		normalizedFocusX: 0.5,
		normalizedFocusY: 0.5,
		zoomLevel: 1,
		panX: 36,
		panY: 28,
		codemapPanX: 36,
		codemapPanY: 28,
		codemapZoom: 0.85,
		codemapTrailIds: [],
		codemapTravelMode: true,
	};
}

export function syncCameraToFocalEntity(
	cursor: ProjectNavigationCursor,
	target: EntityTargetBounds,
	viewportWidth: number = 1280,
	viewportHeight: number = 720
): { readonly panX: number; readonly panY: number; readonly zoomScale: number } {
	const zoomScale = Math.max(0.25, Math.min(2.5, cursor.zoomLevel));
	const centerX = target.x + target.width / 2;
	const centerY = target.y + target.height / 2;
	const panX = Math.round(viewportWidth * cursor.normalizedFocusX - centerX * zoomScale);
	const panY = Math.round(viewportHeight * cursor.normalizedFocusY - centerY * zoomScale);
	return { panX, panY, zoomScale };
}

class NavigationSyncStore {
	private cursorsByProject = new Map<string, ProjectNavigationCursor>();
	cursor: ProjectNavigationCursor = createDefaultCursor();

	private persist(next: ProjectNavigationCursor): void {
		this.cursorsByProject.set(next.projectId, next);
		this.cursor = next;
		if (typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(`${NAV_STORAGE_PREFIX}${next.projectId}`, JSON.stringify(next));
			} catch {
				// Ignore quota errors in sandboxed iframes
			}
		}
	}

	switchProject(projectId: string): ProjectNavigationCursor {
		const cached = this.cursorsByProject.get(projectId);
		if (cached) {
			this.cursor = cached;
			return cached;
		}
		if (typeof localStorage !== 'undefined') {
			try {
				const raw = localStorage.getItem(`${NAV_STORAGE_PREFIX}${projectId}`);
				if (raw) {
					const parsed = { ...createDefaultCursor(projectId), ...(JSON.parse(raw) as Partial<ProjectNavigationCursor>) };
					this.cursorsByProject.set(projectId, parsed);
					this.cursor = parsed;
					return parsed;
				}
			} catch {
				// Fallback to default cursor
			}
		}
		const fresh = createDefaultCursor(projectId);
		this.persist(fresh);
		return fresh;
	}

	selectEntity(entityId: number | null, filePath?: string | null, sourceLine?: number): void {
		this.persist({
			...this.cursor,
			selectedEntityId: entityId,
			focalEntityId: entityId ?? this.cursor.focalEntityId,
			activeFilePath: filePath !== undefined ? filePath : this.cursor.activeFilePath,
			activeSourceLine: sourceLine !== undefined ? Math.max(1, sourceLine) : this.cursor.activeSourceLine,
		});
	}

	recordCamera(view: HudViewMode, panX: number, panY: number, zoomLevel: number): void {
		const isCodemap = view === HUD_VIEWS.CODEMAP;
		this.persist({
			...this.cursor,
			activeView: view,
			panX,
			panY,
			zoomLevel,
			codemapPanX: isCodemap ? panX : this.cursor.codemapPanX,
			codemapPanY: isCodemap ? panY : this.cursor.codemapPanY,
			codemapZoom: isCodemap ? zoomLevel : this.cursor.codemapZoom,
		});
	}

	setCodemapTravel(travelMode: boolean, trailIds: readonly number[]): void {
		this.persist({
			...this.cursor,
			codemapTravelMode: travelMode,
			codemapTrailIds: trailIds,
		});
	}
}

export const navigationSync = new NavigationSyncStore();
