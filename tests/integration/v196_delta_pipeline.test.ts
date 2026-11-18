/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.6 Scoped Verification Gate: Edge-Rail Dotted Grip, 4-Corner Chamfer Completeness, Persistent Card Vault, ELK Codemap & Pluggable Ingestion.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { API_ROUTES } from '@config/constants';
import { ACHIEVEMENT_CARDS } from '@config/gamification/gamification.registry';
import { HUD_INTENT_KINDS } from '@config/hud/hud.intents';
import { HUD_ZONES } from '@config/hud.tokens';
import { PRINCIPAL_KINDS, ROLE_IDS } from '@config/security.constants';
import { createChronosDb } from '@lib/db/sqlite/client/connection';
import {
	MAX_RING_COL_HEIGHT, buildBoundaryPortPolygon, buildHighwayChannelPath,
	buildProjectCodemapProjection, computeCodemapLabelScale,
} from '@core/graph/codemap';
import { buildUmlClassProjection, exportMermaidClassDiagram } from '@core/graph/projections/uml_projections';
import { indexSourcesIntoDb } from '@core/metamodel/workspace.indexer';
import { EMBEDDED_MULTI_LANG_SAMPLES, loadWorkspaceSources } from '@core/metamodel/workspace.sources';
import { evaluateWorkspaceCodeCheck } from '@core/metrics/codecheck.engine';
import { exportSarif210Report } from '@plugins/exporters/sarif.adapter';
import { INGESTION_ADAPTER_KINDS, executePluggableIngestion } from '@plugins/ingestors';
import { handleProjectAndAiRoutes } from '@server/routes/project.routes';
import {
	INTENT_ROUTING_CLASS, RAIL_SAFE_CORRIDOR_REM, clampFloatingDrawerRem,
	clampRailOffsetYRem, classifyIntentRoutingTier, uiDrawerMachine,
} from '@ui';
import { clientDagKernel } from '@client/state/dag/client.kernel.svelte';
import { hudWire } from '@client/state/hud.wire.svelte';
import { fitGraphToSafeCorridor } from '@client/state/viewport.camera.svelte';
import { runCodebaseInvariantAudit } from '../../src/workers/auditor/invariant.auditor';

describe('Chronos v1.9.6 Precision & Production Pipeline Seal', () => {
	test('1. Edge-Rail Dotted Grip mechanics, vertical safe corridor clamping & 4-corner stage chamfer', () => {
		const topClamped = clampRailOffsetYRem(-99, 900, 16);
		const botClamped = clampRailOffsetYRem(99, 900, 16);
		const vhRem = 900 / 16, halfRail = RAIL_SAFE_CORRIDOR_REM.RAIL_HEIGHT_REM / 2;
		expect(vhRem / 2 + topClamped - halfRail).toBeGreaterThanOrEqual(RAIL_SAFE_CORRIDOR_REM.MIN_TOP_REM - 0.01);
		expect(vhRem / 2 + botClamped + halfRail).toBeLessThanOrEqual(vhRem - RAIL_SAFE_CORRIDOR_REM.BOTTOM_RESERVE_REM + 0.01);

		const movedLeft = hudWire.moveEdgeRail('LEFT', -40, 900);
		expect(movedLeft).toBe(topClamped);
		expect(hudWire.lastIntent?.intentKind).toBe(HUD_INTENT_KINDS.HUD_MOVE_EDGE_RAIL);

		hudWire.toggleDockFloat('LEFT_EDGE');
		expect(hudWire.lastIntent?.intentKind).toBe(HUD_INTENT_KINDS.HUD_TOGGLE_DRAWER_FLOAT);
		uiDrawerMachine.toggleFloat('RIGHT');
		const floatClamped = clampFloatingDrawerRem(200, 200, 1440, 900, 16);
		expect(floatClamped.yRem).toBeLessThanOrEqual(900 / 16 - RAIL_SAFE_CORRIDOR_REM.BOTTOM_RESERVE_REM);

		const leftSrc = readFileSync('src/client/components/zones/HudLeftEdgeZone.svelte', 'utf8');
		const rightSrc = readFileSync('src/client/components/zones/HudRightEdgeZone.svelte', 'utf8');
		const stageSrc = readFileSync('src/client/components/organisms/perimeter/HudInteractiveCanvasStage.svelte', 'utf8');
		expect(leftSrc.includes("'PIN' : 'FLOAT'")).toBe(false);
		expect(rightSrc.includes("'PIN' : 'FLOAT'")).toBe(false);
		expect(leftSrc).toContain('uiDrawerGrip');
		expect(rightSrc).toContain('Forensic Metrics &amp; Export →');
		expect(stageSrc).toContain('ZONE_CORNER_TUPLES.PERIMETER_CHAMFER');
	});

	test('2. Persistent Card Vault progression bar & monochrome-to-color CSS filter', () => {
		const vaultSrc = readFileSync('src/client/components/modals/vault/AchievementVaultModal.svelte', 'utf8');
		const cssSrc = readFileSync('src/client/app.css', 'utf8') + '\n' + readFileSync('src/client/styles/hud.fx.css', 'utf8');
		expect(vaultSrc).toContain("ACHIEVEMENT_CARDS[0]?.id ?? 'card-codemap-1'");
		expect(vaultSrc).toContain('data-testid="vault-card-progression-strip"');
		expect(vaultSrc.includes('{#if inspectedCard}')).toBe(false);
		expect(vaultSrc).toContain('ui-vault-card-active');
		expect(vaultSrc).toContain('ui-vault-card-idle');
		expect(cssSrc).toContain('grayscale(0.92)');
		expect(cssSrc).toContain('saturate(1.18)');

		const targetCard = ACHIEVEMENT_CARDS[2]!;
		hudWire.emitUiIntent(HUD_INTENT_KINDS.VAULT_SELECT_CARD, HUD_ZONES.APP_MODAL, { cardId: targetCard.id });
		expect(hudWire.lastIntent?.intentKind).toBe(HUD_INTENT_KINDS.VAULT_SELECT_CARD);
		expect(hudWire.lastIntent?.payload?.cardId).toBe(targetCard.id);
	});

	test('3. ELK-inspired Codemap aspect-ratio packing (>= 1.4), >= 60% auto-fit zoom & unclipped Entry pill', async () => {
		const db = createChronosDb(':memory:');
		const sources = await loadWorkspaceSources();
		const snap = indexSourcesIntoDb(db, sources);
		const proj = buildProjectCodemapProjection(snap.nodes, snap.edges);
		const aspect = proj.worldWidth / proj.worldHeight;
		expect(aspect).toBeGreaterThanOrEqual(1.4);
		for (const cluster of proj.moduleClusters) {
			expect(cluster.height).toBeLessThanOrEqual(MAX_RING_COL_HEIGHT + 48);
		}
		const fitted = fitGraphToSafeCorridor({ width: proj.worldWidth, height: proj.worldHeight }, { width: 1360, height: 680 }, 28, snap.nodes.length);
		expect(fitted.zoomScale).toBeGreaterThanOrEqual(0.6);
		expect(computeCodemapLabelScale(0.45)).toBeGreaterThan(1.2);
		expect(buildBoundaryPortPolygon(100, 50, 3)).toContain('100,47');
		expect(buildHighwayChannelPath(10, 20, 110, 80, 12)).toContain('C 60 20, 60 80, 98 80');

		const codemapSrc = readFileSync('src/client/components/organisms/projections/CodemapCanvas.svelte', 'utf8');
		expect(codemapSrc).toContain('Entry: {activeEntry.name}');
		expect(codemapSrc.includes('max-w-[6.75rem]')).toBe(false);
		db.sqlite.close();
	});

	test('4. 3-Tier intent routing, pluggable multi-source ingestion (GitHub/ZIP/Local/SARIF), exports & repo invariants', async () => {
		expect(classifyIntentRoutingTier(HUD_INTENT_KINDS.HUD_MOVE_EDGE_RAIL)).toBe(INTENT_ROUTING_CLASS.TIER_0_LOCAL_UI);
		expect(classifyIntentRoutingTier(HUD_INTENT_KINDS.VAULT_SELECT_CARD)).toBe(INTENT_ROUTING_CLASS.TIER_0_LOCAL_UI);
		expect(classifyIntentRoutingTier(HUD_INTENT_KINDS.HUD_TOGGLE_DRAWER_FLOAT)).toBe(INTENT_ROUTING_CLASS.TIER_1_COALESCED_PERSIST);
		expect(classifyIntentRoutingTier(HUD_INTENT_KINDS.VIEW_SWITCH)).toBe(INTENT_ROUTING_CLASS.TIER_2_REALTIME_CLUSTER);
		const tr = clientDagKernel.dispatch({ intentKind: HUD_INTENT_KINDS.VIEW_SWITCH, sourceZone: 'TOP_CENTER', payload: { view: 'CODEMAP' } });
		expect(tr.routingTier).toBe(INTENT_ROUTING_CLASS.TIER_2_REALTIME_CLUSTER);

		const db = createChronosDb(':memory:');
		const baseSnap = indexSourcesIntoDb(db, EMBEDDED_MULTI_LANG_SAMPLES);
		const principal = {
			userId: '1', uid: 1, username: 'oblx', sid: 's-1', familyId: 'fam-1',
			roleId: ROLE_IDS.ADMIN, principalKind: PRINCIPAL_KINDS.USER, effectiveMask: 0xffffffff,
			isCookieOrJwtAuth: false, clientIp: '127.0.0.1',
		};
		const ghRes = await handleProjectAndAiRoutes(
			db, baseSnap, API_ROUTES.INGEST_UNIFIED, 'POST',
			JSON.stringify({ adapter: INGESTION_ADAPTER_KINDS.PUBLIC_GITHUB_AND_GIT_PACK, repoUrl: 'https://github.com/oblx/chronos', files: EMBEDDED_MULTI_LANG_SAMPLES }),
			{}, principal
		);
		expect(ghRes?.status).toBe(200);
		const ghPayload = ghRes?.payload as { adapterUsed: string; codemapSummary: { aspectRatio: number; ringCount: number } };
		expect(ghPayload.adapterUsed).toBe(INGESTION_ADAPTER_KINDS.PUBLIC_GITHUB_AND_GIT_PACK);
		expect(ghPayload.codemapSummary.aspectRatio).toBeGreaterThanOrEqual(1.4);

		const localOut = await executePluggableIngestion(db, baseSnap, { adapter: INGESTION_ADAPTER_KINDS.LOCAL_WORKSPACE });
		expect(localOut.snapshot.nodes.length).toBeGreaterThan(20);
		const suite = evaluateWorkspaceCodeCheck(localOut.snapshot.nodes, localOut.snapshot.edges, localOut.snapshot.sourceMap);
		const sarif = exportSarif210Report(suite.violations);
		expect(sarif.version).toBe('2.1.0');
		const mmd = exportMermaidClassDiagram(buildUmlClassProjection([], { nodes: localOut.snapshot.nodes, edges: localOut.snapshot.edges }));
		expect(mmd).toContain('classDiagram');
		db.sqlite.close();

		const audit = await runCodebaseInvariantAudit('src', 'docs');
		if (!audit.passed) console.error('Audit report:', audit);
		expect(audit.passed).toBe(true);
	});
});
