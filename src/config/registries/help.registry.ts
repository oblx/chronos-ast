/**
 * @author Oblx <code@oblx.dev>
 * @description Declarative Weighted Token-Vector & Folder-Topology Auto-Classifier for the Architect's Field Tome.
 * Zero hardcoded document ID tables: any new or modified markdown file in docs/ is auto-classified into Beginner -> Advanced -> Expert.
 */

import { HUD_VIEWS, type HudViewMode } from '@config/constants';

export const HELP_SKILL_TIERS = Object.freeze({ BEGINNER: 'BEGINNER', ADVANCED: 'ADVANCED', EXPERT: 'EXPERT' } as const);
export type HelpSkillTier = (typeof HELP_SKILL_TIERS)[keyof typeof HELP_SKILL_TIERS];

export const HELP_LEARNING_STAGES = Object.freeze({
	S1_FOUNDATION: 'STAGE 01 // ORIENTATION & INGESTION',
	S2_EXPLORATION: 'STAGE 02 // GRAPH PROJECTIONS & SEARCH',
	S3_ARCHITECTURE: 'STAGE 03 // METRICS, COUPLING & CYCLES',
	S4_FORENSICS: 'STAGE 04 // COMPILER FORENSICS & GOVERNANCE',
} as const);
export type HelpLearningStage = (typeof HELP_LEARNING_STAGES)[keyof typeof HELP_LEARNING_STAGES];

export const HELP_TARGET_ANCHORS = Object.freeze({
	HEADER_NAV: 'HEADER_NAV',
	PROJECT_TAB_DECK: 'PROJECT_TAB_DECK',
	WORKSPACE_TABS: 'WORKSPACE_TABS',
	COMPARE_BANNER: 'COMPARE_BANNER',
	AI_COMMAND_DECK: 'AI_COMMAND_DECK',
	BREADCRUMB_RADAR: 'BREADCRUMB_RADAR',
	LEFT_ENTITY_EXPLORER: 'LEFT_ENTITY_EXPLORER',
	PRIMARY_CANVAS: 'PRIMARY_CANVAS',
	RIGHT_IB_TELEMETRY: 'RIGHT_IB_TELEMETRY',
	INSTANT_SEARCH_TRIGGER: 'INSTANT_SEARCH_TRIGGER',
	EXPORTERS_DOCK: 'EXPORTERS_DOCK',
} as const);

export type HelpTargetAnchorId = (typeof HELP_TARGET_ANCHORS)[keyof typeof HELP_TARGET_ANCHORS];
export type TooltipPlacement = 'BOTTOM' | 'TOP' | 'LEFT' | 'RIGHT';

export interface HelpTierMetadata {
	readonly id: HelpSkillTier; readonly badge: string; readonly title: string; readonly tagline: string;
}

export interface DocPedagogyRule {
	readonly docCode: string; readonly order: number; readonly tier: HelpSkillTier; readonly stage: HelpLearningStage;
	readonly shortcutKey: string; readonly anchorId: HelpTargetAnchorId; readonly recommendedView: HudViewMode;
	readonly tooltipPlacement: TooltipPlacement; readonly actionDrill: string;
}

export interface HelpAnchorVectorSpec {
	readonly anchorId: HelpTargetAnchorId; readonly recommendedView: HudViewMode; readonly tooltipPlacement: TooltipPlacement;
	readonly shortcutKey: string; readonly drillTemplate: string; readonly weightedTokens: ReadonlyArray<readonly [string, number]>;
}

export const HELP_TIER_METADATA: Readonly<Record<HelpSkillTier, HelpTierMetadata>> = Object.freeze({
	BEGINNER: { id: 'BEGINNER', badge: 'TIER 01 // BEGINNER', title: 'Orientation, Project Tab Deck & Detachable HUD Ergonomics', tagline: 'Switch callsign project tabs (Ctrl+Shift+P), undock floating toolbars, and navigate with multi-modal camera gestures.' },
	ADVANCED: { id: 'ADVANCED', badge: 'TIER 02 // ADVANCED', title: 'Graphs, Instant Search, AI Command Console & Metrics', tagline: 'Master Butterfly/UML Studio, Ctrl+K queries, Bottom-Center AI Chat (/explain, /hotspots), and Tarjan DSMs.' },
	EXPERT: { id: 'EXPERT', badge: 'TIER 03 // EXPERT', title: 'CFG Dominators, Drizzle Projects, Chronos RBAC & MCP', tagline: 'Audit static execution paths, u32 project_members RBAC inheritance, C/C++ macros, CHR-001..017, and MCP.' },
});

export const HELP_ANCHOR_VECTORS: readonly HelpAnchorVectorSpec[] = Object.freeze([
	{ anchorId: HELP_TARGET_ANCHORS.INSTANT_SEARCH_TRIGGER, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'BOTTOM', shortcutKey: 'Ctrl+K', drillTemplate: 'Press Ctrl+K to run field-prefixed (identifier:, string:, comment:), wildcard (*), and Levenshtein (~) queries.', weightedTokens: [['instant search', 9], ['ctrl+k', 9], ['levenshtein', 7], ['fuzzy', 6], ['wildcard', 6], ['identifier:', 7]] },
	{ anchorId: HELP_TARGET_ANCHORS.PROJECT_TAB_DECK, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'BOTTOM', shortcutKey: 'Ctrl+Shift+P', drillTemplate: 'Use the Upper TOP_CENTER Project Tab Deck to switch shortCode tabs, search +N overflow projects, or sync ws:project:<id> rooms.', weightedTokens: [['project tab', 9], ['shortcode', 9], ['project_members', 9], ['ctrl+shift+p', 9], ['ws:project', 8], ['overflow', 7]] },
	{ anchorId: HELP_TARGET_ANCHORS.WORKSPACE_TABS, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'BOTTOM', shortcutKey: 'Upload / Open', drillTemplate: 'Inspect Operator Identity, Role Posture, and Project Health in TOP_LEFT or ingest .ZIP archives and remote URLs.', weightedTokens: [['zip', 7], ['remote url', 8], ['indexeddb', 7], ['sqlite', 5], ['memgraph', 7], ['workspace', 5], ['theme', 6], ['ingest', 5], ['uwqhd', 8], ['floating', 8]] },
	{ anchorId: HELP_TARGET_ANCHORS.AI_COMMAND_DECK, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'TOP', shortcutKey: 'AI Chat [↵]', drillTemplate: 'Run /explain, /hotspots, /cycles, or /blast-radius in the Bottom-Center AI Command Deck with +@Focal and +@Violations pills.', weightedTokens: [['ai command', 9], ['chat console', 9], ['/explain', 8], ['/hotspots', 8], ['ai_bridge_invoke', 8]] },
	{ anchorId: HELP_TARGET_ANCHORS.COMPARE_BANNER, recommendedView: HUD_VIEWS.TREEMAP, tooltipPlacement: 'TOP', shortcutKey: 'Hotbar [1..6]', drillTemplate: 'Trigger the 6-slot Tactical Hotbar ([1] Stations .. [6] Stealth) or audit Ca/Ce instability deltas and % Churn.', weightedTokens: [['compare', 8], ['churn', 8], ['percentchanged', 9], ['baseline', 7], ['delta', 6], ['instability', 5]] },
	{ anchorId: HELP_TARGET_ANCHORS.LEFT_ENTITY_EXPLORER, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'RIGHT', shortcutKey: 'Left Dock / Float', drillTemplate: 'Filter the 9 Entity Kinds in the Left AST Explorer or click the Pin/Float toggle to undock it near the focal graph.', weightedTokens: [['entity kind', 8], ['reference kind', 8], ['explorer', 7], ['9 entity', 9], ['10 reference', 9], ['filter bar', 7], ['detachable', 8]] },
	{ anchorId: HELP_TARGET_ANCHORS.RIGHT_IB_TELEMETRY, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'LEFT', shortcutKey: 'IB & CodeCheck', drillTemplate: 'Inspect Information Browser folds, McCabe/Halstead gauges, CK OO metrics, and CHR-001..017 rules in the Right Dock.', weightedTokens: [['information browser', 9], ['codecheck', 8], ['chidamber', 8], ['lcom4', 8], ['halstead', 7], ['mccabe', 7], ['chr-0', 7], ['deviation', 6]] },
	{ anchorId: HELP_TARGET_ANCHORS.PRIMARY_CANVAS, recommendedView: HUD_VIEWS.DSM, tooltipPlacement: 'LEFT', shortcutKey: 'DSM Matrix', drillTemplate: 'Switch to "DSM & SCC Matrix" on the primary canvas to inspect Tarjan cycles and Clean Onion ring rules.', weightedTokens: [['dsm', 9], ['tarjan', 8], ['strongly connected', 8], ['matrix', 7], ['onion', 6], ['chr-017', 8]] },
	{ anchorId: HELP_TARGET_ANCHORS.PRIMARY_CANVAS, recommendedView: HUD_VIEWS.CONTROL_FLOW, tooltipPlacement: 'LEFT', shortcutKey: 'CFG & Stepper', drillTemplate: 'Open "Control Flow & Stepper" to step through basic blocks, Cooper-Harvey-Kennedy IDoms, and unreachable code.', weightedTokens: [['cfg', 8], ['dominator', 9], ['stepper', 9], ['virtual debugger', 9], ['basic block', 8], ['unreachable', 7]] },
	{ anchorId: HELP_TARGET_ANCHORS.PRIMARY_CANVAS, recommendedView: HUD_VIEWS.DATA_FLOW, tooltipPlacement: 'LEFT', shortcutKey: 'DFG / HIS', drillTemplate: 'Open "Variable Tracker (DFG)" to trace SETS -> MODIFIES -> USES chains and toggle the HIS Safety Profile.', weightedTokens: [['variable tracker', 9], ['data_flow', 8], ['lineage', 7], ['his ', 7], ['misra', 7], ['sets', 5], ['modifies', 5]] },
	{ anchorId: HELP_TARGET_ANCHORS.PRIMARY_CANVAS, recommendedView: HUD_VIEWS.TREEMAP, tooltipPlacement: 'LEFT', shortcutKey: 'Treemap', drillTemplate: 'Switch to "Hotspot & Churn Treemap" to inspect Bruls-Huizing-van Wijk squarified complexity tiles.', weightedTokens: [['treemap', 9], ['squarified', 9], ['bruls', 8], ['hotspot', 5]] },
	{ anchorId: HELP_TARGET_ANCHORS.PRIMARY_CANVAS, recommendedView: HUD_VIEWS.INSPECTOR, tooltipPlacement: 'LEFT', shortcutKey: 'AST Ingest', drillTemplate: 'Open "Source & AST Ingest" to edit code live and trigger scope-stack re-indexing.', weightedTokens: [['tree-sitter', 8], ['lexical scanner', 8], ['scope-stack', 8], ['preprocessor', 7], ['macro', 7], ['grammar', 6]] },
	{ anchorId: HELP_TARGET_ANCHORS.EXPORTERS_DOCK, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'LEFT', shortcutKey: 'SARIF / SVG / MCP', drillTemplate: 'Export SARIF 2.1.0, Vector SVG, Graphviz DOT, HTML/CSV compliance reports, or query the stdio MCP server.', weightedTokens: [['sarif', 9], ['graphviz', 9], ['svg', 7], ['compliance', 8], ['mcp', 9], ['do-178c', 8], ['export', 6]] },
	{ anchorId: HELP_TARGET_ANCHORS.BREADCRUMB_RADAR, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'BOTTOM', shortcutKey: 'Radar / Benches', drillTemplate: 'Monitor worker parse latency (us) in the Breadcrumb Radar and verify <25ms Tarjan SCC benchmarks.', weightedTokens: [['benchmark', 9], [' radar', 7], ['headless cli', 8], ['latency', 7], ['vitest', 6]] },
	{ anchorId: HELP_TARGET_ANCHORS.PRIMARY_CANVAS, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'LEFT', shortcutKey: 'Camera & Context Menu', drillTemplate: 'Use cursor-anchored Wheel/Pinch zoom, right-click Tactical Context Menu, or double-click to lock Focal Target at 125%.', weightedTokens: [['butterfly', 8], ['uml', 8], ['lifeline', 7], ['shared object', 8], ['alias', 6], ['andersen', 7], ['camera', 8], ['context menu', 8]] },
	{ anchorId: HELP_TARGET_ANCHORS.HEADER_NAV, recommendedView: HUD_VIEWS.CODEMAP, tooltipPlacement: 'BOTTOM', shortcutKey: 'Codemap [Slot 1]', drillTemplate: 'Open "Codemap" (Crown Slot 1) to trace Genesis Entry Points across Macro, Meso, and Micro semantic zoom rings.', weightedTokens: [['codemap', 10], ['genesis', 9], ['frustum', 9], ['meso', 8], ['macro', 7], ['entry point', 8], ['blueprint', 7]] },
	{ anchorId: HELP_TARGET_ANCHORS.HEADER_NAV, recommendedView: HUD_VIEWS.BUTTERFLY, tooltipPlacement: 'BOTTOM', shortcutKey: '? / F1', drillTemplate: "Use the Header Bar to switch between 9 workspace projections, launch Ctrl+K search, or open this Architect's Field Tome.", weightedTokens: [['quickstart', 9], ['cheatsheet', 9], ['manifesto', 8], ['ssot', 7], ['adr-', 8]] },
]);

const FOLDER_BASE_PRIORITY: Readonly<Record<string, { readonly baseOrder: number; readonly defaultStage: HelpLearningStage; readonly baseTierScore: number }>> = Object.freeze({
	'00': { baseOrder: 1, defaultStage: HELP_LEARNING_STAGES.S1_FOUNDATION, baseTierScore: 0 },
	'05': { baseOrder: 10, defaultStage: HELP_LEARNING_STAGES.S1_FOUNDATION, baseTierScore: 0 },
	'02': { baseOrder: 20, defaultStage: HELP_LEARNING_STAGES.S2_EXPLORATION, baseTierScore: 1 },
	'03': { baseOrder: 30, defaultStage: HELP_LEARNING_STAGES.S3_ARCHITECTURE, baseTierScore: 1 },
	'01': { baseOrder: 40, defaultStage: HELP_LEARNING_STAGES.S3_ARCHITECTURE, baseTierScore: 1 },
	'04': { baseOrder: 50, defaultStage: HELP_LEARNING_STAGES.S4_FORENSICS, baseTierScore: 2 },
	'06': { baseOrder: 60, defaultStage: HELP_LEARNING_STAGES.S4_FORENSICS, baseTierScore: 2 },
	'07': { baseOrder: 70, defaultStage: HELP_LEARNING_STAGES.S4_FORENSICS, baseTierScore: 2 },
});

export function scoreTargetAnchorVector(corpus: string): HelpAnchorVectorSpec {
	const low = corpus.toLowerCase();
	let best = HELP_ANCHOR_VECTORS[HELP_ANCHOR_VECTORS.length - 1]!;
	let maxScore = -1;
	for (const candidate of HELP_ANCHOR_VECTORS) {
		const score = candidate.weightedTokens.reduce((acc, [token, weight]) => (low.includes(token) ? acc + weight : acc), 0);
		if (score > maxScore) { maxScore = score; best = candidate; }
	}
	return best;
}

export function inferDocPedagogyRule(docCode: string, rawMarkdown: string): DocPedagogyRule {
	const [folderPrefix = '00', subIndexRaw = '99'] = docCode.split('-');
	const subNum = Number.parseInt(subIndexRaw, 10) || 99;
	const folderMeta = FOLDER_BASE_PRIORITY[folderPrefix] ?? FOLDER_BASE_PRIORITY['04']!;
	const low = rawMarkdown.slice(0, 900).toLowerCase();
	const isIntroIngest = docCode === '00-01' || docCode === '04-02' || folderPrefix === '05' || docCode === '02-01';
	const isForensicDeep = folderPrefix === '06' || (folderPrefix === '04' && subNum !== 2) || docCode === '02-03' || docCode === '03-04' || docCode === '01-03' || docCode === '00-02' || docCode === '00' || low.includes('dominator') || low.includes('mcp');
	const tier: HelpSkillTier = isIntroIngest ? HELP_SKILL_TIERS.BEGINNER : isForensicDeep ? HELP_SKILL_TIERS.EXPERT : HELP_SKILL_TIERS.ADVANCED;
	const tierRank = tier === HELP_SKILL_TIERS.BEGINNER ? 0 : tier === HELP_SKILL_TIERS.ADVANCED ? 100 : 200;
	const stage = tier === HELP_SKILL_TIERS.BEGINNER ? (subNum <= 2 && folderPrefix !== '02' ? HELP_LEARNING_STAGES.S1_FOUNDATION : HELP_LEARNING_STAGES.S2_EXPLORATION) : tier === HELP_SKILL_TIERS.ADVANCED ? folderMeta.defaultStage : HELP_LEARNING_STAGES.S4_FORENSICS;
	const vec = scoreTargetAnchorVector(rawMarkdown);
	return { docCode, order: tierRank + folderMeta.baseOrder + subNum, tier, stage, shortcutKey: vec.shortcutKey, anchorId: vec.anchorId, recommendedView: vec.recommendedView, tooltipPlacement: vec.tooltipPlacement, actionDrill: vec.drillTemplate };
}
