/**
 * @author Oblx <code@oblx.dev>
 * @description Registry for Chronos v1.9.0 Cubic Progression: 9 Card Categories, 27 Leveled Cards (5-Tier) & DAG XP Rules.
 */

export const CARD_CATEGORIES = {
	CODEMAP_PIONEER: 'CODEMAP_PIONEER',
	AST_CARTOGRAPHER: 'AST_CARTOGRAPHER',
	GRAPH_NAVIGATOR: 'GRAPH_NAVIGATOR',
	ARCHITECT_SENTINEL: 'ARCHITECT_SENTINEL',
	MODELING_ARTISAN: 'MODELING_ARTISAN',
	GIT_FORGE_OPERATOR: 'GIT_FORGE_OPERATOR',
	CRYPTO_GUARDIAN: 'CRYPTO_GUARDIAN',
	SQUAD_COMMANDER: 'SQUAD_COMMANDER',
	STUDIO_CUSTOMIZER: 'STUDIO_CUSTOMIZER',
} as const;
export type CardCategory = (typeof CARD_CATEGORIES)[keyof typeof CARD_CATEGORIES];

export const CARD_TIERS = {
	TIER_1_COPPER: { level: 1, label: 'I · Copper', tierBonusXp: 100, borderStyle: 'border-[#B87333]', foilClass: 'foil-copper' },
	TIER_2_SILVER: { level: 2, label: 'II · Silver', tierBonusXp: 250, borderStyle: 'border-[#C0C0C0]', foilClass: 'foil-silver' },
	TIER_3_GOLD: { level: 3, label: 'III · Gold', tierBonusXp: 500, borderStyle: 'border-[#FFD700]', foilClass: 'foil-gold' },
	TIER_4_EMERALD: { level: 4, label: 'IV · Emerald', tierBonusXp: 1000, borderStyle: 'border-[#50C878]', foilClass: 'foil-emerald' },
	TIER_5_HOLO: { level: 5, label: 'V · Holographic Obsidian', tierBonusXp: 2500, borderStyle: 'border-[#8B5CF6]', foilClass: 'foil-holo' },
} as const;
export type CardTierLevel = 1 | 2 | 3 | 4 | 5;

export interface AchievementCardSpec {
	readonly id: string;
	readonly category: CardCategory;
	readonly glyph: string;
	readonly title: string;
	readonly description: string;
	readonly metricKey: string;
	readonly tierThresholds: readonly [number, number, number, number, number];
}

export const ACHIEVEMENT_CARDS: readonly AchievementCardSpec[] = [
	{ id: 'card-genesis-pathfinder', category: CARD_CATEGORIES.CODEMAP_PIONEER, glyph: '⚡', title: 'Genesis Pathfinder', description: 'Detect Tier-0 project entry points and trace execution hops.', metricKey: 'codemap_entry_traces', tierThresholds: [1, 5, 20, 60, 150] },
	{ id: 'card-macro-cartographer', category: CARD_CATEGORIES.CODEMAP_PIONEER, glyph: '🗺', title: 'Macro Cartographer', description: 'Navigate Macro, Meso, and Micro semantic zoom LOD rings.', metricKey: 'codemap_lod_transitions', tierThresholds: [3, 15, 50, 150, 400] },
	{ id: 'card-cross-view-navigator', category: CARD_CATEGORIES.CODEMAP_PIONEER, glyph: '⇄', title: 'Cross-View Navigator', description: 'Sync focal entity & camera across Codemap, Butterfly, CFG & Source.', metricKey: 'cross_view_handoffs', tierThresholds: [2, 10, 35, 100, 300] },

	{ id: 'card-polyglot', category: CARD_CATEGORIES.AST_CARTOGRAPHER, glyph: '⊞', title: 'Polyglot Indexer', description: 'Index and map source files across 12 supported languages.', metricKey: 'indexed_files_count', tierThresholds: [5, 25, 100, 500, 1500] },
	{ id: 'card-preprocessor-alchemist', category: CARD_CATEGORIES.AST_CARTOGRAPHER, glyph: '⚙', title: 'Preprocessor Alchemist', description: 'Expand C/C++ #define macros and conditional compilation branches.', metricKey: 'macros_expanded', tierThresholds: [2, 10, 35, 100, 250] },
	{ id: 'card-alias-resolver', category: CARD_CATEGORIES.AST_CARTOGRAPHER, glyph: '☍', title: 'Alias Resolver', description: 'Converge flow-insensitive pointer & reference alias sets.', metricKey: 'alias_sets_converged', tierThresholds: [2, 10, 40, 120, 300] },

	{ id: 'card-butterfly-hops', category: CARD_CATEGORIES.GRAPH_NAVIGATOR, glyph: '⌖', title: 'Butterfly Cartographer', description: 'Traverse multi-hop Ca/Ce call graph paths.', metricKey: 'butterfly_traversals', tierThresholds: [3, 15, 50, 150, 500] },
	{ id: 'card-cfg-stepper', category: CARD_CATEGORIES.GRAPH_NAVIGATOR, glyph: '⑂', title: 'Virtual Debugger Stepper', description: 'Step basic blocks and dominators in Control Flow.', metricKey: 'cfg_steps_count', tierThresholds: [5, 25, 100, 300, 1000] },
	{ id: 'card-lineage-slicer', category: CARD_CATEGORIES.GRAPH_NAVIGATOR, glyph: '⟡', title: 'Lineage Slicer', description: 'Slice forward and backward Data Flow SETS/MODIFIES/USES chains.', metricKey: 'dfg_slices_traced', tierThresholds: [3, 12, 40, 120, 350] },

	{ id: 'card-cycle-breaker', category: CARD_CATEGORIES.ARCHITECT_SENTINEL, glyph: '▦', title: 'Cycle Breaker', description: 'Inspect and isolate Tarjan SCC feedback cycles in DSM.', metricKey: 'cycles_analyzed', tierThresholds: [1, 5, 25, 60, 150] },
	{ id: 'card-codecheck-audit', category: CARD_CATEGORIES.ARCHITECT_SENTINEL, glyph: '✎', title: 'Compliance Warden', description: 'Audit CHR-001..017 rules and record deviation sign-offs.', metricKey: 'deviations_signed', tierThresholds: [1, 5, 15, 40, 100] },
	{ id: 'card-hotspot-hunter', category: CARD_CATEGORIES.ARCHITECT_SENTINEL, glyph: '🔥', title: 'Hotspot Hunter', description: 'Isolate high-complexity cushion tiles in Squarified Treemap.', metricKey: 'treemap_hotspots_inspected', tierThresholds: [2, 10, 35, 100, 250] },

	{ id: 'card-uml-architect', category: CARD_CATEGORIES.MODELING_ARTISAN, glyph: '◈', title: 'UML Architect', description: 'Project Class Hierarchy, Sequence Lifelines & Shared Objects.', metricKey: 'uml_diagrams_rendered', tierThresholds: [2, 8, 25, 80, 200] },
	{ id: 'card-mermaid-weaver', category: CARD_CATEGORIES.MODELING_ARTISAN, glyph: '❖', title: 'Mermaid Weaver', description: 'Author live Mermaid DSL blueprints and export PlantUML.', metricKey: 'mermaid_renders', tierThresholds: [2, 8, 30, 90, 240] },
	{ id: 'card-tome-scholar', category: CARD_CATEGORIES.MODELING_ARTISAN, glyph: '📖', title: 'Formula Scholar', description: 'Master Field Tome chapters and execute HUD spotlight drills.', metricKey: 'tome_steps_mastered', tierThresholds: [1, 5, 15, 35, 75] },

	{ id: 'card-git-ingest', category: CARD_CATEGORIES.GIT_FORGE_OPERATOR, glyph: '⇣', title: 'Packfile Ingestor', description: 'Ingest Git Smart HTTP v2 packfiles and ZIP archives.', metricKey: 'git_ingest_count', tierThresholds: [1, 3, 10, 25, 50] },
	{ id: 'card-pr-publisher', category: CARD_CATEGORIES.GIT_FORGE_OPERATOR, glyph: '⇪', title: 'Pull Request Publisher', description: 'Publish automated architectural remediation PR bundles.', metricKey: 'git_prs_published', tierThresholds: [1, 3, 10, 25, 60] },
	{ id: 'card-vector-export', category: CARD_CATEGORIES.GIT_FORGE_OPERATOR, glyph: '↥', title: 'SARIF Bridge Marshal', description: 'Export SARIF 2.1.0, SonarQube, Cytoscape & Memgraph Cypher.', metricKey: 'exports_generated', tierThresholds: [1, 5, 20, 50, 120] },

	{ id: 'card-vault-sentinel', category: CARD_CATEGORIES.CRYPTO_GUARDIAN, glyph: '🛡', title: 'Vault Sentinel', description: 'Seal secrets inside AEAD AES-256-GCM write-only vault.', metricKey: 'vault_secrets_stored', tierThresholds: [1, 3, 8, 20, 50] },
	{ id: 'card-hlc-sync', category: CARD_CATEGORIES.CRYPTO_GUARDIAN, glyph: '⏱', title: 'HLC Sync Chronicler', description: 'Reconcile causal offline HLC delta mutations & audit chains.', metricKey: 'hlc_deltas_synced', tierThresholds: [2, 10, 40, 120, 300] },
	{ id: 'card-multi-auth-sovereign', category: CARD_CATEGORIES.CRYPTO_GUARDIAN, glyph: '🔑', title: 'Multi-Auth Sovereign', description: 'Authenticate via Passkey, OIDC PKCE, PAT & 16-bit RBAC masks.', metricKey: 'auth_elevations', tierThresholds: [1, 3, 10, 25, 60] },

	{ id: 'card-cluster-collab', category: CARD_CATEGORIES.SQUAD_COMMANDER, glyph: '👥', title: 'Cluster Synapse', description: 'Collaborate live in multi-user WebSocket squad clusters.', metricKey: 'collab_sessions', tierThresholds: [1, 5, 20, 50, 150] },
	{ id: 'card-cursor-telepath', category: CARD_CATEGORIES.SQUAD_COMMANDER, glyph: '↖', title: 'Cursor Telepath', description: 'Stream 60fps virtual cursors across Canvas, Modal & HUD scopes.', metricKey: 'cursor_frames_streamed', tierThresholds: [5, 25, 100, 300, 1000] },
	{ id: 'card-social-diplomat', category: CARD_CATEGORIES.SQUAD_COMMANDER, glyph: '🤝', title: 'Social Diplomat', description: 'Build operator friend graph and dispatch room invitations.', metricKey: 'social_invites_sent', tierThresholds: [1, 4, 12, 30, 80] },

	{ id: 'card-theme-alchemist', category: CARD_CATEGORIES.STUDIO_CUSTOMIZER, glyph: '🎨', title: 'Theme Alchemist', description: 'Switch themes and publish WCAG-verified community palettes.', metricKey: 'themes_applied', tierThresholds: [2, 6, 18, 50, 100] },
	{ id: 'card-bento-radar-ace', category: CARD_CATEGORIES.STUDIO_CUSTOMIZER, glyph: '◎', title: 'Bento Radar Ace', description: 'Calibrate Bento Tactical Radar sweep, zoom & detachable docks.', metricKey: 'radar_calibrations', tierThresholds: [2, 10, 35, 100, 250] },
	{ id: 'card-privacy-sbc-master', category: CARD_CATEGORIES.STUDIO_CUSTOMIZER, glyph: '⚖', title: 'Privacy & SBC Master', description: 'Exercise GDPR Art. 15/17 sovereignty & edge budget profiles.', metricKey: 'privacy_audits_run', tierThresholds: [1, 3, 10, 25, 60] },
] as const;

export interface GamificationXpRuleSpec {
	readonly eventKind: string;
	readonly category: CardCategory;
	readonly baseXp: number;
	readonly cooldownSec: number;
	readonly dailyCapCount: number;
	readonly enabled: boolean;
	readonly label: string;
}

export const INITIAL_DAG_XP_RULES: readonly GamificationXpRuleSpec[] = [
	{ eventKind: 'CODEMAP_TRACE', category: CARD_CATEGORIES.CODEMAP_PIONEER, baseXp: 30, cooldownSec: 3, dailyCapCount: 50, enabled: true, label: 'Trace Codemap Entry Spine' },
	{ eventKind: 'WORKSPACE_INDEXED', category: CARD_CATEGORIES.AST_CARTOGRAPHER, baseXp: 50, cooldownSec: 10, dailyCapCount: 30, enabled: true, label: 'Workspace Index Complete' },
	{ eventKind: 'WORKSPACE_OPENED', category: CARD_CATEGORIES.AST_CARTOGRAPHER, baseXp: 20, cooldownSec: 5, dailyCapCount: 50, enabled: true, label: 'Workspace Hydrated' },
	{ eventKind: 'VIEW_SWITCH', category: CARD_CATEGORIES.GRAPH_NAVIGATOR, baseXp: 10, cooldownSec: 3, dailyCapCount: 80, enabled: true, label: 'Switch Projection Crown Slot' },
	{ eventKind: 'BUTTERFLY_HOP', category: CARD_CATEGORIES.GRAPH_NAVIGATOR, baseXp: 15, cooldownSec: 2, dailyCapCount: 60, enabled: true, label: 'Traverse Call Graph Node' },
	{ eventKind: 'VIRTUAL_STEPPER_STEP', category: CARD_CATEGORIES.GRAPH_NAVIGATOR, baseXp: 15, cooldownSec: 2, dailyCapCount: 80, enabled: true, label: 'Virtual Debugger Stepper Traverse' },
	{ eventKind: 'DEVIATION_SIGN_OFF', category: CARD_CATEGORIES.ARCHITECT_SENTINEL, baseXp: 40, cooldownSec: 5, dailyCapCount: 25, enabled: true, label: 'Record Deviation Sign-Off' },
	{ eventKind: 'CODECHECK_RUN', category: CARD_CATEGORIES.ARCHITECT_SENTINEL, baseXp: 25, cooldownSec: 10, dailyCapCount: 40, enabled: true, label: 'Run Architecture CodeCheck' },
	{ eventKind: 'TOUR_STEP_ADVANCE', category: CARD_CATEGORIES.MODELING_ARTISAN, baseXp: 25, cooldownSec: 2, dailyCapCount: 20, enabled: true, label: 'Progressive HUD Tour Step' },
	{ eventKind: 'TOME_FOLIO_MASTER', category: CARD_CATEGORIES.MODELING_ARTISAN, baseXp: 30, cooldownSec: 5, dailyCapCount: 40, enabled: true, label: 'Master Help Book Sub-Step' },
	{ eventKind: 'INGEST_GIT', category: CARD_CATEGORIES.GIT_FORGE_OPERATOR, baseXp: 100, cooldownSec: 30, dailyCapCount: 15, enabled: true, label: 'Remote Git Repository Ingest' },
	{ eventKind: 'EXPORT_GENERATED', category: CARD_CATEGORIES.GIT_FORGE_OPERATOR, baseXp: 35, cooldownSec: 10, dailyCapCount: 25, enabled: true, label: 'Generate Architectural Export' },
	{ eventKind: 'VAULT_SECRET_STORE', category: CARD_CATEGORIES.CRYPTO_GUARDIAN, baseXp: 50, cooldownSec: 15, dailyCapCount: 20, enabled: true, label: 'Seal Secret in AEAD Vault' },
	{ eventKind: 'SYNC_RECONCILED', category: CARD_CATEGORIES.CRYPTO_GUARDIAN, baseXp: 35, cooldownSec: 10, dailyCapCount: 30, enabled: true, label: 'HLC Offline Delta Reconciliation' },
	{ eventKind: 'WS_CLUSTER_UPDATE', category: CARD_CATEGORIES.SQUAD_COMMANDER, baseXp: 25, cooldownSec: 10, dailyCapCount: 40, enabled: true, label: 'Multiplayer Collab Room Join' },
	{ eventKind: 'HUD_THEME_CHANGED', category: CARD_CATEGORIES.STUDIO_CUSTOMIZER, baseXp: 15, cooldownSec: 5, dailyCapCount: 30, enabled: true, label: 'Theme Palette Switch' },
] as const;
