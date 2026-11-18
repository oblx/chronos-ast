/**
 * @author Oblx <code@oblx.dev>
 * @description Typed Game-HUD event channels (including WebSocket collab events), modal descriptors, disclosure states, and role-scoped Stations Launcher directory (v2.1.0).
 */
import { EXPORT_FORMATS, HUD_VIEWS, type ExportFormat, type HudViewMode } from './constants';
import { CAPABILITY_BITS } from './security.constants';

export const HUD_EVENTS = {
	TOGGLE_STEALTH: 'HUD_TOGGLE_STEALTH',
	SET_ZONE: 'HUD_SET_ZONE',
	REVEAL_ZONE: 'HUD_REVEAL_ZONE',
	OPEN_MODAL: 'HUD_OPEN_MODAL',
	CLOSE_MODAL: 'HUD_CLOSE_MODAL',
	SELECT_VIEW: 'HUD_SELECT_VIEW',
	SET_THEME: 'HUD_SET_THEME',
	THEME_CHANGED: 'HUD_THEME_CHANGED',
	SET_SURFACE_PATTERN: 'HUD_SET_SURFACE_PATTERN',
	SET_SUBSTRATE_CONFIG: 'HUD_SET_SUBSTRATE_CONFIG',
	TOGGLE_GUIDES: 'HUD_TOGGLE_GUIDES',
	CYCLE_DISCLOSURE: 'HUD_CYCLE_DISCLOSURE',
	PUSH_TICKER: 'HUD_PUSH_TICKER',
	SECURITY_SESSION_REVOKED: 'SECURITY_SESSION_REVOKED',
	SYNC_RECONCILED: 'SYNC_RECONCILED',
	LOCKDOWN_TOGGLED: 'LOCKDOWN_TOGGLED',
	WS_ROSTER_UPDATE: 'WS_ROSTER_UPDATE',
	WS_REMOTE_CURSOR: 'WS_REMOTE_CURSOR',
	WS_REMOTE_ANNOTATION: 'WS_REMOTE_ANNOTATION',
	WS_LOCKDOWN_BROADCAST: 'WS_LOCKDOWN_BROADCAST',
	WS_CLUSTER_UPDATE: 'WS_CLUSTER_UPDATE',
	WS_PEER_LEFT: 'WS_PEER_LEFT',
	AWARENESS_STATE_FRAME: 'AWARENESS_STATE_FRAME',
	CAUSAL_OP_FRAME: 'CAUSAL_OP_FRAME',
	WS_COLLAB_INVITE: 'WS_COLLAB_INVITE',
	WS_PRIVILEGED_OVERRIDE: 'WS_PRIVILEGED_OVERRIDE',
	FOLLOW_PEER_SESSION: 'FOLLOW_PEER_SESSION',
	CLUSTER_SEAT_LIMIT_REACHED: 'CLUSTER_SEAT_LIMIT_REACHED',
	SERVER_EVENT_COMMITTED: 'SERVER_EVENT_COMMITTED',
	HUD_SPOTLIGHT_SET: 'HUD_SPOTLIGHT_SET',
	HUD_SPOTLIGHT_CLEAR: 'HUD_SPOTLIGHT_CLEAR',
	GAME_XP_GAINED: 'GAME_XP_GAINED',
	GAME_LEVEL_UP: 'GAME_LEVEL_UP',
	GAME_CARD_LEVEL_UP: 'GAME_CARD_LEVEL_UP',
	GAME_CARD_UNLOCKED: 'GAME_CARD_UNLOCKED',
	TWIN_DISPATCH_INTENT: 'TWIN_DISPATCH_INTENT',
	TWIN_CLIENT_ACK: 'TWIN_CLIENT_ACK',
} as const;
export type HudEventName = (typeof HUD_EVENTS)[keyof typeof HUD_EVENTS];

export const HUD_MODALS = {
	NONE: 'NONE',
	STATIONS_LAUNCHER: 'STATIONS_LAUNCHER',
	INSTANT_SEARCH: 'INSTANT_SEARCH',
	SSOT_HELP_BOOK: 'SSOT_HELP_BOOK',
	WORKSPACE_INGEST: 'WORKSPACE_INGEST',
	DEVIATION_SIGN_OFF: 'DEVIATION_SIGN_OFF',
	SETTINGS: 'SETTINGS',
	AUTH_LOBBY: 'AUTH_LOBBY',
	ACHIEVEMENT_VAULT: 'ACHIEVEMENT_VAULT',
	COLLAB_SOCIAL: 'COLLAB_SOCIAL',
	WIRE_OBSERVATORY: 'WIRE_OBSERVATORY',
} as const;
export type HudModalId = (typeof HUD_MODALS)[keyof typeof HUD_MODALS];

export const HUD_DISCLOSURE_TIERS = {
	TIER_1_VERDICT: 'TIER_1_VERDICT',
	TIER_2_SUMMARY: 'TIER_2_SUMMARY',
	TIER_3_FORENSIC: 'TIER_3_FORENSIC',
} as const;
export type HudDisclosureTier = (typeof HUD_DISCLOSURE_TIERS)[keyof typeof HUD_DISCLOSURE_TIERS];

export type StationCategoryKey = 'MONITOR' | 'MANAGE' | 'INTERACT' | 'ADMIN';
export type StationActionKind =
	| { readonly type: 'VIEW'; readonly view: HudViewMode }
	| { readonly type: 'MODAL'; readonly modal: HudModalId }
	| { readonly type: 'EXPORT'; readonly format: ExportFormat }
	| { readonly type: 'STEALTH' }
	| { readonly type: 'ENGINE_TOGGLE' }
	| { readonly type: 'OPEN_PRESET' }
	| { readonly type: 'PIN_COMPARE' }
	| { readonly type: 'REINDEX' };

export interface StationCatalogItem {
	readonly id: string;
	readonly category: StationCategoryKey;
	readonly iconGlyph: string;
	readonly label: string;
	readonly description: string;
	readonly shortcutKey: string;
	readonly requiredMask?: number;
	readonly action: StationActionKind;
}

export const STATION_CATEGORIES: ReadonlyArray<{ readonly key: StationCategoryKey; readonly label: string }> = [
	{ key: 'MONITOR', label: 'MONITOR' },
	{ key: 'MANAGE', label: 'MANAGE' },
	{ key: 'INTERACT', label: 'INTERACT' },
	{ key: 'ADMIN', label: 'ADMIN' },
] as const;

export const STATIONS_DIRECTORY: readonly StationCatalogItem[] = [
	{ id: 'st-butterfly', category: 'MONITOR', iconGlyph: '⌖', label: 'Butterfly Call Graph', description: 'Inspect inbound callers and outbound callees.', shortcutKey: '1', action: { type: 'VIEW', view: HUD_VIEWS.BUTTERFLY } },
	{ id: 'st-dfg', category: 'MONITOR', iconGlyph: '⇢', label: 'Variable Lineage', description: 'Trace SETS, MODIFIES, and USES data flow.', shortcutKey: '2', action: { type: 'VIEW', view: HUD_VIEWS.DATA_FLOW } },
	{ id: 'st-cfg', category: 'MONITOR', iconGlyph: '⑂', label: 'Control Flow & Stepper', description: 'Walk basic blocks, dominators, and dead paths.', shortcutKey: '3', action: { type: 'VIEW', view: HUD_VIEWS.CONTROL_FLOW } },
	{ id: 'st-treemap', category: 'MONITOR', iconGlyph: '⊞', label: 'Hotspot & Churn Map', description: 'View squarified complexity and delta churn.', shortcutKey: '4', action: { type: 'VIEW', view: HUD_VIEWS.TREEMAP } },
	{ id: 'st-dsm', category: 'MONITOR', iconGlyph: '▦', label: 'DSM & SCC Matrix', description: 'Audit Tarjan dependency cycles and onion rings.', shortcutKey: '5', action: { type: 'VIEW', view: HUD_VIEWS.DSM } },
	{ id: 'st-search', category: 'MANAGE', iconGlyph: '⌘', label: 'Instant Search', description: 'Query identifiers, strings, and comments.', shortcutKey: '6', action: { type: 'MODAL', modal: HUD_MODALS.INSTANT_SEARCH } },
	{ id: 'st-ingest', category: 'MANAGE', iconGlyph: '⇣', label: 'Workspace Ingest', description: 'Load .ZIP archives, folders, URLs, or bundles.', shortcutKey: '7', requiredMask: CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE, action: { type: 'MODAL', modal: HUD_MODALS.WORKSPACE_INGEST } },
	{ id: 'st-compare', category: 'MANAGE', iconGlyph: 'Δ', label: 'Snapshot Compare', description: 'Pin current baseline to track Δ churn.', shortcutKey: '8', requiredMask: CAPABILITY_BITS.COMPARE_DIFF_EXEC, action: { type: 'PIN_COMPARE' } },
	{ id: 'st-preset', category: 'MANAGE', iconGlyph: '◈', label: 'Open Preset Repo', description: 'Hydrate built-in multi-language corpus.', shortcutKey: '—', action: { type: 'OPEN_PRESET' } },
	{ id: 'st-inspector', category: 'INTERACT', iconGlyph: '⌥', label: 'Source & AST Span', description: 'Edit source slices and live-reindex symbols.', shortcutKey: '9', action: { type: 'VIEW', view: HUD_VIEWS.INSPECTOR } },
	{ id: 'st-uml-cls', category: 'INTERACT', iconGlyph: '◫', label: 'UML Studio (Class)', description: 'Sugiyama class hierarchy, PlantUML & Mermaid.', shortcutKey: '—', action: { type: 'VIEW', view: HUD_VIEWS.UML_CLASS } },
	{ id: 'st-uml-seq', category: 'INTERACT', iconGlyph: '⇅', label: 'UML Studio (Sequence)', description: 'Activation bars, lifelines & loop/alt frames.', shortcutKey: '—', action: { type: 'VIEW', view: HUD_VIEWS.UML_SEQUENCE } },
	{ id: 'st-shared', category: 'INTERACT', iconGlyph: '◎', label: 'UML Shared Objects', description: '3-column mutator/state/reader contention hub.', shortcutKey: '—', action: { type: 'VIEW', view: HUD_VIEWS.SHARED_OBJECTS } },
	{ id: 'st-mermaid', category: 'INTERACT', iconGlyph: '❖', label: 'Mermaid Studio', description: 'Bidirectional flowchart, class & sequence DSL.', shortcutKey: 'M', action: { type: 'VIEW', view: HUD_VIEWS.MERMAID } },
	{ id: 'st-achievements', category: 'INTERACT', iconGlyph: '★', label: 'Card Vault', description: 'Inspect Cubic XP progress & leveled cards.', shortcutKey: 'A', action: { type: 'MODAL', modal: HUD_MODALS.ACHIEVEMENT_VAULT } },
	{ id: 'st-help', category: 'ADMIN', iconGlyph: '?', label: "Architect's Field Tome", description: 'Read Beginner-to-Expert manual & spotlights.', shortcutKey: '0', action: { type: 'MODAL', modal: HUD_MODALS.SSOT_HELP_BOOK } },
	{ id: 'st-deviation', category: 'ADMIN', iconGlyph: '✎', label: 'Deviation Sign-Off', description: 'Record structured CodeCheck exemption Atn.', shortcutKey: '—', requiredMask: CAPABILITY_BITS.DEVIATION_SIGN_OFF, action: { type: 'MODAL', modal: HUD_MODALS.DEVIATION_SIGN_OFF } },
	{ id: 'st-sarif', category: 'ADMIN', iconGlyph: '↥', label: 'Export SARIF 2.1.0', description: 'Generate static analysis exchange payload.', shortcutKey: '—', requiredMask: CAPABILITY_BITS.EXPORT_ARTIFACTS, action: { type: 'EXPORT', format: EXPORT_FORMATS.SARIF_210 } },
	{ id: 'st-stealth', category: 'ADMIN', iconGlyph: '◰', label: 'Stealth World Mode', description: 'Fold all 8 perimeter zones (Tab / Z).', shortcutKey: 'Z', action: { type: 'STEALTH' } },
	{ id: 'st-wire-tap', category: 'ADMIN', iconGlyph: '◈', label: 'Live Wire Observatory', description: 'Inspect real-time Client & Server DAG event frames.', shortcutKey: 'W', requiredMask: CAPABILITY_BITS.ADMIN_WIRE_OBSERVE, action: { type: 'MODAL', modal: HUD_MODALS.WIRE_OBSERVATORY } },
	{ id: 'st-settings', category: 'ADMIN', iconGlyph: '⎈', label: 'HUD & Admin Console', description: 'Configure themes, Chronos RBAC, and Vault.', shortcutKey: ',', action: { type: 'MODAL', modal: HUD_MODALS.SETTINGS } },
] as const;
