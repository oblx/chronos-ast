/**
 * @author Oblx <code@oblx.dev>
 * @description Client-side Twin MCP intent router applying SWITCH_PROJECT, SWITCH_PROJECTION, SELECT_ENTITY, SET_THEME, TOGGLE_DRAWER, CAMERA_FIT, and modal intents.
 */
import type { HudViewMode } from '@config/constants';
import type { HudModalId } from '@config/hud.events';
import { HUD_ZONE_VISIBILITY, HUD_ZONES, type HudThemeId } from '@config/hud.tokens';
import { hudWire } from '@client/state/hud.wire.svelte';

export interface TwinIntentActionHooks {
	readonly onOpenProject?: (projectKey: string) => Promise<void>;
	readonly onSelectTab?: (tabId: string) => void;
	readonly onSelectEntity: (entityId: number) => void;
	readonly onSwitchProjection: (view: HudViewMode) => void;
	readonly hasTab: (projectKey: string) => boolean;
}

export async function executeTwinClientIntent(intent: Record<string, unknown>, hooks: TwinIntentActionHooks): Promise<void> {
	const kind = String(intent.kind ?? '');
	if (kind === 'SWITCH_PROJECT') {
		const projKey = String(intent.projectId ?? '').trim();
		if (projKey) {
			if (hooks.hasTab(projKey)) hooks.onSelectTab?.(projKey);
			else await hooks.onOpenProject?.(projKey);
		}
		return;
	}
	const targetView = (typeof intent.view === 'string' ? intent.view : typeof intent.viewId === 'string' ? intent.viewId : '') as HudViewMode;
	if (kind === 'SWITCH_PROJECTION' && targetView) {
		hooks.onSwitchProjection(targetView);
		return;
	}
	if (kind === 'SELECT_ENTITY' && typeof intent.entityId === 'number') {
		hooks.onSelectEntity(intent.entityId);
		return;
	}
	if (kind === 'SET_THEME' && typeof intent.themeId === 'string') {
		hudWire.setTheme(intent.themeId as HudThemeId);
		return;
	}
	if (kind === 'TOGGLE_DRAWER') {
		const zone = intent.drawer === 'RIGHT_EDGE' ? HUD_ZONES.RIGHT_EDGE : HUD_ZONES.LEFT_EDGE;
		if (typeof intent.open === 'boolean') hudWire.setZoneVisibility(zone, intent.open ? HUD_ZONE_VISIBILITY.OPEN : HUD_ZONE_VISIBILITY.COMPACT);
		else hudWire.toggleEdgeZone(zone);
		return;
	}
	if (kind === 'CAMERA_FIT') {
		hudWire.triggerCanvasRecenter();
		return;
	}
	if (kind === 'OPEN_MODAL' && typeof intent.modal === 'string') {
		hudWire.openModal(intent.modal as HudModalId);
		return;
	}
	if (kind === 'CLOSE_MODAL') hudWire.closeModal();
}
