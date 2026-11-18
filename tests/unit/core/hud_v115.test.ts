/**
 * @author Oblx <code@oblx.dev>
 * @description Unit verification for Chronos v1.9.0 5-tier UWQHD breakpoints, Codemap LOD & Frustum Culler, Cross-View Camera Sync, and Invariant Auditor.
 */
import { describe, expect, test } from 'bun:test';
import {
	CAMERA_PHYSICS_TOKENS, CHAMFER_PROFILES, DARK_HUD_THEME_IDS, DOCK_FLOAT_TOKENS, ENTITY_KIND_STYLE_MAP,
	HUD_ALIGNMENT_RAILS, HUD_BREAKPOINTS, HUD_ELEVATION_TOKENS, HUD_GLYPHS, HUD_HARMONIC_RATIOS, HUD_MOTION_TOKENS,
	HUD_THEME_IDS, HUD_THEME_PRESETS, HULL_TOKENS, LIGHT_HUD_THEME_IDS, PRINCIPAL_POSTURE_META, PROJECT_DECK_TOKENS,
	SEEDED_OPERATOR_CONFIG, SEVERITY_STYLE_MAP, SUBSTRATE_DEFAULTS, SURFACE_PATTERN_IDS, SURFACE_PATTERNS, SURFACE_TARGETS,
	TYPOGRAPHY_TOKENS, pickNextPolarityRandomTheme, resolveHudBreakpoint,
} from '@config/hud.tokens';
import { HUD_EVENTS, HUD_MODALS, STATIONS_DIRECTORY } from '@config/hud.events';
import { APP_METADATA, GRAPH_PROJECTIONS, HUD_VIEWS, WS_CONFIG } from '@config/constants';
import { TOME_SSG_CHAPTERS } from '@config/help/index';
import { SQLITE_CONFIG } from '@config/env.schema';
import { ROLE_MASKS } from '@config/security.constants';
import { tokenizeCodeLine } from '@core/ast/syntax.highlighter';
import { buildProjectCodemapProjection, detectProjectEntryPoints, queryFrustumVisibleIds, resolveCodemapLodTier, traceCodemapEntryPath } from '@core/graph/codemap';
import { computeUmlSequenceLayout } from '@core/graph/projections/uml.layout';
import { buildUmlSequenceProjection } from '@core/graph/projections/uml_projections';
import { validateCustomThemePayload } from '@core/security/guards/theme.validator';
import { bytesToBase64Url, base64UrlToBytes, bytesToHex, encodeUtf8, hexToBytes, hmacSha256Bytes, timingSafeEqualBytes } from '@core/security/crypto.primitives';
import { evaluateMetricBand } from '@core/metamodel/snapshot.helpers';
import { deriveShortCodeFromName } from '@lib/db/indexeddb/repository/workspace.idb';
import { navigationSync, syncCameraToFocalEntity } from '@client/state/navigation.sync.svelte';
import { clientDagKernel, MAX_WIRE_RING_BUFFER } from '@client/state/dag/client.kernel.svelte';
import { computeFocalPointZoom, fitGraphToSafeCorridor } from '@client/state/viewport.camera.svelte';
import { runCodebaseInvariantAudit } from '../../../src/workers/auditor/invariant.auditor';
import pkg from '../../../package.json';

describe('Chronos v1.9.7 Breakpoints, Codemap Engine, Observable Wire DAG, Cross-View Sync & Invariant Auditor', () => {
	test('enforces v1.9.7 version lock, MIT license, CODEMAP Slot 1, CHAMFER_PROFILES, SQLite PRAGMA/WS constants, and 5-tier HUD_BREAKPOINTS', () => {
		expect(APP_METADATA.VERSION).toBe('1.9.7'); expect(APP_METADATA.LICENSE).toBe('MIT');
		expect(pkg.version).toBe('1.9.7'); expect(pkg.license).toBe('MIT');
		expect(TOME_SSG_CHAPTERS).toHaveLength(34);
		expect(HUD_THEME_PRESETS.OBSIDIAN_CYBER.textMuted).toBe('#A3B8D0');
		expect(HUD_THEME_PRESETS.TITANIUM_NIGHT.textMuted).toBe('#A3B8D0');
		expect(HUD_THEME_PRESETS.VOID_AMBER.textMuted).toBe('#A3B8D0');
		expect(HUD_THEME_PRESETS.CLINICAL_LAB.textMuted).toBe('#334155');
		expect(HUD_THEME_PRESETS.PAPER_ARCHITECT.textMuted).toBe('#334155');
		expect(HUD_THEME_PRESETS.DAYLIGHT_SOLAR.textMuted).toBe('#334155');
		expect(HUD_MOTION_TOKENS.ACTIVE_SCALE).toBe(0.985); expect(HUD_MOTION_TOKENS.MODAL_RESIZE_DURATION_MS).toBe(220);
		expect(GRAPH_PROJECTIONS.CODEMAP).toBe('CODEMAP'); expect(HUD_VIEWS.CODEMAP).toBe('CODEMAP');
		expect(CHAMFER_PROFILES.RIGHT_END_CAP).toBe('RIGHT_END_CAP'); expect(CHAMFER_PROFILES.LEFT_END_CAP).toBe('LEFT_END_CAP');
		expect(CHAMFER_PROFILES.BOTTOM_CAP_CHAMFER).toBe('BOTTOM_CAP_CHAMFER'); expect(HUD_EVENTS.REVEAL_ZONE).toBe('HUD_REVEAL_ZONE');
		expect(HUD_MODALS.ACHIEVEMENT_VAULT).toBe('ACHIEVEMENT_VAULT'); expect(HUD_MODALS.WIRE_OBSERVATORY).toBe('WIRE_OBSERVATORY');
		expect(WS_CONFIG.MAX_BUFFERED_BYTES).toBe(131072); expect(SQLITE_CONFIG.PRAGMA_BUSY_TIMEOUT).toBe('PRAGMA busy_timeout = 3000;');
		expect(HUD_BREAKPOINTS.UWQHD.edgeTrackExpandedPx).toBe(360);
		expect(resolveHudBreakpoint(390).id).toBe('PHONE'); expect(resolveHudBreakpoint(1440).id).toBe('DESKTOP'); expect(resolveHudBreakpoint(5120).id).toBe('UWQHD');
		expect(DOCK_FLOAT_TOKENS.SNAP_THRESHOLD_PX).toBe(24); expect(CAMERA_PHYSICS_TOKENS.MIN_ZOOM).toBe(0.15);
		expect(PROJECT_DECK_TOKENS.SHORT_CODE_MAX_CHARS).toBe(12); expect(deriveShortCodeFromName('Chronos Core Workspace')).toBe('CHR-CORE');
		const zoomed = computeFocalPointZoom(40, -20, 1.0, 2.0, 640, 380);
		expect((640 - zoomed.panX) / zoomed.zoomScale).toBeCloseTo((640 - 40) / 1.0, 2);
		expect(TYPOGRAPHY_TOKENS.TEXT_MICRO_TELEMETRY.px).toBe(13); expect(PRINCIPAL_POSTURE_META.GUEST.demoTag).toBe('DEMO MODE');
		expect(ROLE_MASKS.ROLE_GUEST).toBe(0x000001c1); expect(SEEDED_OPERATOR_CONFIG.USERNAME).toBe('oblx');
		expect(ENTITY_KIND_STYLE_MAP.FUNCTION?.glyph).toBeTruthy(); expect(SEVERITY_STYLE_MAP.BLOCKER?.textClass).toContain('danger');
	});

	test('verifies Codemap entry-point detector, 3-tier LOD frustum culler, zero-collision port anchors, and clientDagKernel', () => {
		const nodes = [
			{ id: 1, uuid: 'u1', qualifiedName: 'src/server/index.ts::bootServer', name: 'bootServer', kind: 'FUNCTION', loc: 32, cyclomatic: 4, halsteadVolume: 90, instability: 20, afferentCoupling: 0, efferentCoupling: 2 },
			{ id: 2, uuid: 'u2', qualifiedName: 'src/core/router.ts::dispatch', name: 'dispatch', kind: 'FUNCTION', loc: 24, cyclomatic: 6, halsteadVolume: 80, instability: 40, afferentCoupling: 1, efferentCoupling: 1 },
			{ id: 3, uuid: 'u3', qualifiedName: 'src/lib/db.ts::query', name: 'query', kind: 'FUNCTION', loc: 18, cyclomatic: 2, halsteadVolume: 40, instability: 10, afferentCoupling: 1, efferentCoupling: 0 },
		] as any;
		const edges = [{ id: 1, sourceEntityId: 1, targetEntityId: 2, kind: 'CALLS', line: 5, column: 2 }, { id: 2, sourceEntityId: 2, targetEntityId: 3, kind: 'CALLS', line: 9, column: 2 }] as any;
		const entries = detectProjectEntryPoints(nodes, edges);
		expect(entries[0]?.entityId).toBe(1); expect(entries[0]?.isGenesis).toBe(true);
		expect(resolveCodemapLodTier(0.3)).toBe('MACRO'); expect(resolveCodemapLodTier(0.75)).toBe('MESO'); expect(resolveCodemapLodTier(1.25)).toBe('MICRO');

		const proj = buildProjectCodemapProjection(nodes, edges, new Set([3]));
		expect(proj.moduleClusters.length).toBeGreaterThanOrEqual(2); expect(proj.fileContainers.length).toBe(3);
		const vis = queryFrustumVisibleIds(proj.frustumIndex, { panX: 0, panY: 0, zoomScale: 0.85, viewportWidth: 1440, viewportHeight: 900 });
		expect(vis.size).toBe(3);
		const hops = traceCodemapEntryPath(proj, 3);
		expect(hops.map((h) => h.entityId)).toEqual([1, 2, 3]); expect(hops[0]?.badgeText).toContain('HOP 0 · ENTRY');
		expect(hops[0]!.rowRightX).toBeGreaterThan(hops[0]!.rowLeftX); expect(hops[1]!.rowMidY).toBeGreaterThan(0);

		const traceRec = clientDagKernel.dispatch({ intentKind: 'HUD_SELECT_ENTITY', sourceZone: 'CODEMAP', payload: { target: 'dispatch' } });
		expect(traceRec.stage).toBe('STAGE_4_TELEMETRY'); expect(clientDagKernel.traces[0]?.intentKind).toBe('HUD_SELECT_ENTITY'); expect(MAX_WIRE_RING_BUFFER).toBe(256);

		navigationSync.selectEntity(2, 'src/core/router.ts', 14); navigationSync.recordCamera(HUD_VIEWS.CODEMAP, -120, -45, 0.9);
		expect(navigationSync.cursor.selectedEntityId).toBe(2); expect(navigationSync.cursor.codemapPanX).toBe(-120);
		const synced = syncCameraToFocalEntity(navigationSync.cursor, { x: 200, y: 100, width: 160, height: 60 }, 1280, 720);
		expect(synced.zoomScale).toBeCloseTo(0.9, 2);
	});

	test('verifies Golden Ratio proportions, syntax tokenizer, theme validator, UML Sequence layout, and Invariant Auditor', async () => {
		expect(HUD_HARMONIC_RATIOS.PHI).toBeCloseTo(1.618, 3); expect(HUD_HARMONIC_RATIOS.COLLAPSED_RAIL_PX).toBe(44);
		expect(HUD_ALIGNMENT_RAILS.UPPER_PERIMETER_TOP_PX).toBe(12); expect(HUD_ELEVATION_TOKENS.Z0_SUBSTRATE.tier).toBe(0);
		expect(HULL_TOKENS.CHAMFER_PX).toBe(12); expect(SUBSTRATE_DEFAULTS.minorGridPx).toBe(20); expect(HUD_MOTION_TOKENS.HOVER_LIFT_PX).toBe(-2);
		expect(Object.keys(SURFACE_PATTERN_IDS)).toHaveLength(6); expect(Object.values(SURFACE_PATTERNS)).toHaveLength(6);
		expect(Object.keys(SURFACE_TARGETS)).toEqual(['ALL', 'SUBSTRATE', 'DOCKS', 'MODALS']);
		expect(HUD_GLYPHS.BRAND_CREST).toBe('◈'); expect(STATIONS_DIRECTORY.some((s) => s.id === 'st-settings')).toBe(true);
		const fitMid = fitGraphToSafeCorridor({ width: 640, height: 360 }, { width: 1000, height: 640 });
		expect(fitMid.zoomScale).toBeGreaterThanOrEqual(0.85);
		const fitSmall = fitGraphToSafeCorridor({ width: 1800, height: 1200 }, { width: 1000, height: 640 }, 28, 6);
		expect(fitSmall.zoomScale).toBeGreaterThanOrEqual(CAMERA_PHYSICS_TOKENS.MIN_AUTO_FIT_ZOOM);
		expect(LIGHT_HUD_THEME_IDS).toContain(pickNextPolarityRandomTheme(HUD_THEME_IDS.OBSIDIAN_CYBER, HUD_THEME_IDS.CLINICAL_LAB, 0.0));
		expect(DARK_HUD_THEME_IDS).toContain(pickNextPolarityRandomTheme(HUD_THEME_IDS.PAPER_ARCHITECT, HUD_THEME_IDS.OBSIDIAN_CYBER, 0.99));
		const tokens = tokenizeCodeLine('export async function dispatch(x: number) { if (x > 42) return "ok"; }');
		expect(tokens.some((t) => t.kind === 'KEYWORD' && t.text === 'function')).toBe(true);
		expect(validateCustomThemePayload({ name: 'Bad', polarity: 'DARK', tokens: { bgCanvas: 'url(javascript:alert(1))' } }).valid).toBe(false);
		expect(validateCustomThemePayload({ name: 'Neon', polarity: 'DARK', tokens: { bgCanvas: HUD_THEME_PRESETS.OBSIDIAN_CYBER.bgCanvas } }).valid).toBe(true);

		const nodes = [
			{ id: 1, qualifiedName: 'dispatch', name: 'dispatch', kind: 'FUNCTION', filePath: 'a.ts', startLine: 1, endLine: 20, loc: 20, cyclomatic: 5, halsteadVolume: 80, instability: 50, afferentCoupling: 0, efferentCoupling: 1 },
			{ id: 2, qualifiedName: 'verify', name: 'verify', kind: 'FUNCTION', filePath: 'a.ts', startLine: 22, endLine: 30, loc: 8, cyclomatic: 2, halsteadVolume: 30, instability: 20, afferentCoupling: 1, efferentCoupling: 0 },
		] as any;
		const seqLayout = computeUmlSequenceLayout(buildUmlSequenceProjection(1, { nodes, edges: [{ id: 1, sourceEntityId: 1, targetEntityId: 2, kind: 'CALLS', line: 4, column: 2 }] as any })!);
		expect(seqLayout.messages[0]!.y).toBeGreaterThan(40);
		const sample = new Uint8Array([1, 2, 3, 254, 255]);
		expect(timingSafeEqualBytes(hexToBytes(bytesToHex(sample)), sample)).toBe(true);
		expect(timingSafeEqualBytes(base64UrlToBytes(bytesToBase64Url(sample)), sample)).toBe(true);
		expect((await hmacSha256Bytes(encodeUtf8('chronos-secret'), encodeUtf8('payload'))).byteLength).toBe(32);
		expect(evaluateMetricBand(2, 5, 10)).toBe('NOMINAL');

		const audit = await runCodebaseInvariantAudit();
		expect(audit.oversizedSourceFiles).toEqual([]); expect(audit.oversizedDocFiles).toEqual([]);
		expect(audit.docFenceViolations).toEqual([]); expect(audit.orphanedComponentFiles).toEqual([]);
		expect(audit.magicColorViolations).toEqual([]); expect(audit.hardcodedVersionViolations).toEqual([]);
		expect(audit.brandLeakViolations).toEqual([]); expect(audit.folderCapViolations).toEqual([]);
		expect(audit.missingBarrelViolations).toEqual([]); expect(audit.blueprintBrandViolations).toEqual([]);
		expect(audit.forbiddenSvelteImports).toEqual([]); expect(audit.uiFirewallViolations).toEqual([]);
		expect(audit.repoHygieneViolations).toEqual([]); expect(audit.checkedDocFiles).toBe(51);
		expect(audit.passed).toBe(true);
	});
});

