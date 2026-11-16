/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v2.4.0 projection palette tokens, Git pack limits, Treemap nesting, DFG stages, and Mermaid Studio constants.
 */
import type { ReferenceKind } from '../metamodel.constants';

export const REF_KIND_STYLE_MAP: Readonly<Record<ReferenceKind, { readonly colorVar: string; readonly label: string }>> = {
	CALLS: { colorVar: 'var(--hud-accent-primary)', label: 'CALLS' },
	MODIFIES: { colorVar: 'var(--hud-danger)', label: 'MODIFIES' },
	SETS: { colorVar: 'var(--hud-warning)', label: 'SETS' },
	IMPLEMENTS: { colorVar: 'var(--hud-nominal)', label: 'IMPLEMENTS' },
	INHERITS: { colorVar: 'var(--hud-nominal)', label: 'INHERITS' },
	OVERRIDES: { colorVar: 'var(--hud-nominal)', label: 'OVERRIDES' },
	TYPED: { colorVar: 'var(--hud-accent-secondary)', label: 'TYPED' },
	USES: { colorVar: 'var(--hud-muted)', label: 'USES' },
	IMPORTS: { colorVar: 'var(--hud-accent-primary)', label: 'IMPORTS' },
	DEFINES: { colorVar: 'var(--hud-accent-secondary)', label: 'DEFINES' },
} as const;

export const TREEMAP_CUSHION_TOKENS = {
	HEADER_HEIGHT_PX: 20,
	OUTER_PAD_PX: 3,
	INNER_PAD_PX: 3,
	MIN_LABEL_W: 56,
	MIN_LABEL_H: 26,
	HEAT_COLORS: {
		NOMINAL_TOP: '#123328', NOMINAL_BOT: '#0A1C16',
		WARN_TOP: '#3D2B10', WARN_BOT: '#221807',
		CRIT_TOP: '#45151C', CRIT_BOT: '#250A0E',
		DEFAULT_TOP: '#102438', DEFAULT_BOT: '#091420',
	},
} as const;

export const DFG_PIPELINE_STAGES = [
	{ id: 'INGRESS', title: '1 · Ingress', accentVar: 'var(--hud-accent-primary)' },
	{ id: 'SETS', title: '2 · Initialization (SETS)', accentVar: 'var(--hud-warning)' },
	{ id: 'MODIFIES', title: '3 · Mutation (MODIFIES)', accentVar: 'var(--hud-danger)' },
	{ id: 'EGRESS', title: '4 · Consumers (USES/CALLS)', accentVar: 'var(--hud-nominal)' },
] as const;

export const GIT_INGESTION_LIMITS = {
	MAX_PACKFILE_BYTES: 32 * 1024 * 1024,
	MAX_UNPACKED_BLOB_BYTES: 2 * 1024 * 1024,
	MAX_SOURCE_FILES: 400,
	PACK_SIGNATURE: 0x5041434b,
	PACK_VERSION: 2,
	SHALLOW_DEPTH: 1,
} as const;

export const MERMAID_STUDIO_TOKENS = {
	EDITOR_WIDTH_PCT: 38.2,
	CANVAS_WIDTH_PCT: 61.8,
	NODE_W: 168,
	NODE_H: 46,
	COL_GAP: 220,
	ROW_GAP: 82,
	DEFAULT_DSL: `flowchart TD\n\tA[Snapshot Indexer] -->|DEFINES| B{Tarjan SCC}\n\tB -->|clean DAG| C[Projection Views]\n\tB -->|cycle detected| D((DSM Alert))\n\tC --> E[[Mermaid Studio]]`,
} as const;

export const CODEMAP_LOD_TOKENS = {
	MACRO_MAX_ZOOM: 0.45,
	MESO_MAX_ZOOM: 1.05,
	MAX_DOM_NODES: 350,
	FRUSTUM_STRIDE: 4,
	FRUSTUM_PAD_PX: 160,
	START_X_PX: 64,
	START_Y_PX: 72,
	RING_COL_GAP_PX: 360,
	RING_SUBCOL_GAP_PX: 320,
	MIN_RING_COL_H_PX: 640,
	MAX_RING_COL_H_PX: 2400,
	ASPECT_FACTOR_PX: 240,
	MIN_WORLD_W_PX: 1200,
	MIN_WORLD_H_PX: 760,
	WORLD_PAD_PX: 96,
	CLUSTER_PAD_PX: 24,
	CLUSTER_HEADER_H: 34,
	FILE_CARD_W: 256,
	FILE_CARD_BASE_H: 64,
	FILE_ROW_GAP_PX: 18,
	SYMBOL_PILL_H: 26,
	SYMBOL_GAP_PX: 6,
	HIGHWAY_MIN_STROKE: 1.5,
	HIGHWAY_MAX_STROKE: 6.5,
	HIGHWAY_LOG_SCALE: 1.6,
	BOOTSTRAP_PATTERNS: ['server', 'main', 'index', 'app', 'cli', 'boot', 'dispatch', 'router', 'kernel'] as const,
} as const;

