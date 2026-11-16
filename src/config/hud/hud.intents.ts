/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v2.6.0 Universal Intent Bus contracts, Particle Burst FX payloads, and Compare Staging Tray descriptors.
 */
import type { HudPerimeterZoneId } from '../hud.tokens';

export const HUD_INTENT_KINDS = {
	RADAR_ZOOM_IN: 'RADAR_ZOOM_IN',
	RADAR_ZOOM_OUT: 'RADAR_ZOOM_OUT',
	RADAR_FIT_WORLD: 'RADAR_FIT_WORLD',
	RADAR_CENTER_FOCAL: 'RADAR_CENTER_FOCAL',
	RADAR_FILTER_HOTSPOTS: 'RADAR_FILTER_HOTSPOTS',
	RADAR_TOGGLE_SWEEP: 'RADAR_TOGGLE_SWEEP',
	COMPARE_PIN_BASELINE: 'COMPARE_PIN_BASELINE',
	COMPARE_CLEAR_BASELINE: 'COMPARE_CLEAR_BASELINE',
	COMPARE_TOGGLE_DRAWER: 'COMPARE_TOGGLE_DRAWER',
	QUEST_ADVANCE_STEP: 'QUEST_ADVANCE_STEP',
	TOUR_STEP_ADVANCE: 'TOUR_STEP_ADVANCE',
	HUD_REVEAL_ZONE: 'HUD_REVEAL_ZONE',
	HUD_SPOTLIGHT_SET: 'HUD_SPOTLIGHT_SET',
	HUD_SPOTLIGHT_CLEAR: 'HUD_SPOTLIGHT_CLEAR',
	GAME_XP_GAINED: 'GAME_XP_GAINED',
	GAME_LEVEL_UP: 'GAME_LEVEL_UP',
	GAME_CARD_LEVEL_UP: 'GAME_CARD_LEVEL_UP',
	VIEW_SWITCH: 'VIEW_SWITCH',
	MODAL_OPEN: 'MODAL_OPEN',
	FORM_SUBMIT_INTENT: 'FORM_SUBMIT_INTENT',
	TWIN_DISPATCH_INTENT: 'TWIN_DISPATCH_INTENT',
} as const;
export type HudIntentKind = (typeof HUD_INTENT_KINDS)[keyof typeof HUD_INTENT_KINDS];

export interface HudIntent {
	readonly intentKind: HudIntentKind;
	readonly sourceZone: HudPerimeterZoneId | 'WORLD_CANVAS' | 'APP_MODAL';
	readonly targetId?: string | number;
	readonly payload?: Readonly<Record<string, unknown>>;
	readonly timestamp: number;
}

export interface HudParticleBurst {
	readonly id: number;
	readonly x: number;
	readonly y: number;
	readonly tone: 'compare' | 'quest' | 'accent';
}

export interface CompareTraySummary {
	readonly active: boolean;
	readonly drawerOpen: boolean;
	readonly baselineLabel: string;
	readonly addedCount: number;
	readonly modifiedCount: number;
	readonly removedCount: number;
	readonly percentChanged: number;
}
