/**
 * @author Oblx <code@oblx.dev>
 * @description Generic, domain-agnostic symbolic intent envelope, 3-Tier routing classifier, and middleware types for @chronos-ui/svelte.
 */

export const INTENT_ROUTING_CLASS = {
	TIER_0_LOCAL_UI: 'TIER_0_LOCAL_UI',
	TIER_1_COALESCED_PERSIST: 'TIER_1_COALESCED_PERSIST',
	TIER_2_REALTIME_CLUSTER: 'TIER_2_REALTIME_CLUSTER',
} as const;

export type IntentRoutingTier = (typeof INTENT_ROUTING_CLASS)[keyof typeof INTENT_ROUTING_CLASS];

const TIER_1_PERSIST_INTENTS = new Set<string>([
	'SET_CORNER_STYLE', 'SET_FONT_SCALE', 'SET_HIGH_CONTRAST', 'SET_DYSLEXIA_FONT',
	'SET_KINETIC_MOTION', 'HUD_TOGGLE_DRAWER_FLOAT', 'TOME_COMPLETE_SUBSTEP',
	'GAME_XP_GAINED', 'GAME_LEVEL_UP', 'GAME_CARD_LEVEL_UP', 'THEME_SET', 'SURFACE_PATTERN_SET',
]);

const TIER_2_CLUSTER_INTENTS = new Set<string>([
	'VIEW_SWITCH', 'FOCUS_ENTITY', 'CODEMAP_TRACE_ENTRY', 'AWARENESS_CURSOR', 'COLLAB_PING', 'TWIN_DISPATCH_INTENT',
]);

export function classifyIntentRoutingTier(intentKind: string): IntentRoutingTier {
	if (TIER_2_CLUSTER_INTENTS.has(intentKind)) return INTENT_ROUTING_CLASS.TIER_2_REALTIME_CLUSTER;
	if (TIER_1_PERSIST_INTENTS.has(intentKind)) return INTENT_ROUTING_CLASS.TIER_1_COALESCED_PERSIST;
	return INTENT_ROUTING_CLASS.TIER_0_LOCAL_UI;
}

export interface UiWireEnvelope<TPayload = Record<string, unknown>> {
	readonly traceId: string;
	readonly intentKind: string;
	readonly sourceZone: string;
	readonly routingTier?: IntentRoutingTier;
	readonly payload: TPayload;
	readonly hlcTimestamp: string;
	readonly durationMicros: number;
	readonly status: 'OK' | 'BLOCKED' | 'ERROR';
}

export type UiWireMiddleware = (
	envelope: UiWireEnvelope,
	next: () => void,
) => void;

export type UiWireSubscriber = (envelope: UiWireEnvelope) => void;

export interface UiWireBrokerOptions {
	readonly channelName?: string;
	readonly ringCapacity?: number;
}
