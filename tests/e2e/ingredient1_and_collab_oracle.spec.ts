/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.7 Geometry, Bilateral Symmetry, Edge Rail, Dock, and Modal Shell Oracle.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'bun:test';
import {
	AUTH_LOBBY_TITLE,
	CHAMFER_PROFILES,
	COLLAB_CURSOR_PALETTE,
	CORNER_STYLES,
	HUD_FOLD_VECTORS,
	HUD_ZONE_VISIBILITY,
	HUD_ZONES,
	ZONE_CORNER_TUPLES,
	buildEntityCartridgePolygons,
	mirrorCornerTuple,
	resolveEffectiveCornerTuple,
} from '@config/hud.tokens';
import { REF_KIND_STYLE_MAP } from '@config/hud/hud.projections';

describe('Chronos v1.9.7 Geometry Symmetry, Edge Rails & Modal Shell Oracle', () => {
	test('1. Bilateral corner symmetry (X = 50vw) & shared hud.geometry.ts STRAIGHT | CHAMFER collapse', () => {
		expect(mirrorCornerTuple(['CHAMFER', 'STRAIGHT', 'CHAMFER', 'STRAIGHT'])).toEqual(['STRAIGHT', 'CHAMFER', 'STRAIGHT', 'CHAMFER']);
		expect(mirrorCornerTuple(ZONE_CORNER_TUPLES.RADAR_TOP_LEFT)).toEqual(ZONE_CORNER_TUPLES.RADAR_TOP_RIGHT);
		expect(mirrorCornerTuple(ZONE_CORNER_TUPLES.RADAR_BOTTOM_LEFT)).toEqual(ZONE_CORNER_TUPLES.RADAR_BOTTOM_RIGHT);
		expect(resolveEffectiveCornerTuple({ cornerStyle: CORNER_STYLES.STRAIGHT, explicitCorners: ZONE_CORNER_TUPLES.PERIMETER_CHAMFER })).toEqual(ZONE_CORNER_TUPLES.STRAIGHT_QUAD);

		const frameSrc = readFileSync('src/client/components/atoms/HudChamferFrame.svelte', 'utf8');
		const btnSrc = readFileSync('src/client/components/atoms/HudChamferButton.svelte', 'utf8');
		expect(frameSrc).toContain('buildCornerPolygonPoints');
		expect(frameSrc).toContain('buildCornerCarets');
		expect(frameSrc).toContain('data-corner-style={hudWire.cornerStyle}');
		expect(btnSrc).toContain('buildCornerPolygonPoints');
		expect(btnSrc).toContain('resolveEffectiveCornerTuple');
		expect(btnSrc).toContain('data-corner-style={hudWire.cornerStyle}');
	});

	test('2. LEFT_EDGE and RIGHT_EDGE are vertically centered with rem scaling and synced Wire tabs', () => {
		expect(CHAMFER_PROFILES.TOP_CAP_CHAMFER).toBe('TOP_CAP_CHAMFER');
		expect(HUD_FOLD_VECTORS.LEFT_EDGE).toBe('translate3d(-110%, -50%, 0)');
		expect(HUD_FOLD_VECTORS.RIGHT_EDGE).toBe('translate3d(110%, -50%, 0)');

		const leftSrc = readFileSync('src/client/components/zones/HudLeftEdgeZone.svelte', 'utf8');
		const rightSrc = readFileSync('src/client/components/zones/HudRightEdgeZone.svelte', 'utf8');
		for (const edgeSrc of [leftSrc, rightSrc]) {
			expect(edgeSrc).toContain('top-1/2');
			expect(edgeSrc).toContain('h-auto');
			expect(edgeSrc).toContain('max-h-[calc(100vh-20rem)]');
			expect(edgeSrc).toContain('ZONE_CORNER_TUPLES.RAIL_TOP_CAP');
			expect(edgeSrc).toContain('ZONE_CORNER_TUPLES.RAIL_BOTTOM_CAP');
			expect(edgeSrc).toContain('p-1.5');
		}
		expect(leftSrc).toContain('left-drawer-tab-explorer');
		expect(leftSrc).toContain('left-drawer-tab-files');
		expect(leftSrc).toContain('left-drawer-tab-violations');
		expect(rightSrc).toContain('right-drawer-tab-verdict');
		expect(rightSrc).toContain('right-drawer-tab-relations');
		expect(rightSrc).toContain('right-drawer-tab-forensic');

		const wireSrc = readFileSync('src/client/state/hud.wire.svelte.ts', 'utf8');
		expect(wireSrc).toContain('calc(-50% + ${railOff}rem)');
		expect(wireSrc).toContain('HUD_DISCLOSURE_TIERS.TIER_2_SUMMARY');
		expect(wireSrc).not.toContain('TIER_2_RELATIONS');
	});

	test('3. Focal Cartridge 45°/135° reticle reacts to CHAMFER <-> STRAIGHT and DEFINES uses secondary accent', () => {
		const cartSrc = readFileSync('src/client/components/atoms/HudEntityCartridge.svelte', 'utf8');
		expect(cartSrc).toContain('data-testid="focal-reticle-tr"');
		expect(cartSrc).toContain('buildEntityCartridgePolygons');
		const chamfered = buildEntityCartridgePolygons(240, 68, 12, CORNER_STYLES.CHAMFER);
		const straight = buildEntityCartridgePolygons(240, 68, 12, CORNER_STYLES.STRAIGHT);
		expect(chamfered.cut).toBe(12);
		expect(chamfered.reticleTrPts).toContain('218,-6 230,-6 246,10 246,22');
		expect(straight.cut).toBe(0);
		expect(straight.reticleTrPts).toBe('230,-6 246,-6 246,10');
		expect(REF_KIND_STYLE_MAP.DEFINES.colorVar).toBe('var(--hud-accent-secondary)');
	});

	test('4. UNFOLDED_ZONES unfolds all 8 perimeter zones with two-tier BOTTOM_CENTER and 8 collab cursor colors', () => {
		const healthSrc = readFileSync('src/client/state/hud.health.ts', 'utf8');
		expect(healthSrc).toContain('[HUD_ZONES.TOP_LEFT]: HUD_ZONE_VISIBILITY.OPEN');
		expect(healthSrc).toContain('[HUD_ZONES.TOP_CENTER]: HUD_ZONE_VISIBILITY.OPEN');
		expect(healthSrc).toContain('[HUD_ZONES.TOP_RIGHT]: HUD_ZONE_VISIBILITY.OPEN');
		expect(healthSrc).toContain('[HUD_ZONES.LEFT_EDGE]: HUD_ZONE_VISIBILITY.COMPACT');
		expect(healthSrc).toContain('[HUD_ZONES.RIGHT_EDGE]: HUD_ZONE_VISIBILITY.COMPACT');
		expect(healthSrc).toContain('[HUD_ZONES.BOTTOM_LEFT]: HUD_ZONE_VISIBILITY.OPEN');
		expect(healthSrc).toContain('[HUD_ZONES.BOTTOM_CENTER]: HUD_ZONE_VISIBILITY.OPEN');
		expect(healthSrc).toContain('[HUD_ZONES.BOTTOM_RIGHT]: HUD_ZONE_VISIBILITY.OPEN');
		expect(HUD_ZONES.BOTTOM_CENTER).toBe('BOTTOM_CENTER');
		expect(HUD_ZONE_VISIBILITY.COMPACT).toBe('COMPACT');

		const bottomSrc = readFileSync('src/client/components/zones/HudBottomDockZones.svelte', 'utf8');
		expect(bottomSrc).toContain('data-testid="tactical-action-hotbar"');
		expect(bottomSrc).toContain('<HudAiCommandDeck');
		expect(bottomSrc).toContain('<HudVirtualCursorsOverlay');
		expect(COLLAB_CURSOR_PALETTE.length).toBe(8);
	});

	test('5. Chronos Lobby, 2.25rem zero-CLS modal close, ProjectTabDeck, Wire Tap & CHAMFER_OCTAGON shell', () => {
		expect(AUTH_LOBBY_TITLE).toBe('Chronos Lobby');
		const lobbySrc = readFileSync('src/client/components/modals/lobby/AuthLobbyModal.svelte', 'utf8');
		expect(lobbySrc).toContain('title={AUTH_LOBBY_TITLE}');
		expect(lobbySrc).not.toContain('Chronos Welcome & Identity Lobby');

		const topLeftSrc = readFileSync('src/client/components/zones/top/HudTopLeftSystemPod.svelte', 'utf8');
		const topRightSrc = readFileSync('src/client/components/zones/top/HudTopRightUtilityPod.svelte', 'utf8');
		expect(topLeftSrc).toContain('hud-gamification-level-badge');
		expect(topLeftSrc).toContain('top-left-grade-crest');
		expect(topRightSrc).toContain('top-wire-tap-btn');
		expect(topRightSrc).toContain('codecheck-visor');

		const deckSrc = readFileSync('src/client/components/zones/ProjectTabDeck.svelte', 'utf8');
		expect(deckSrc).toContain('px-3.5');
		expect(deckSrc).toContain('CHAMFER_PROFILES.LEFT_END_CAP');
		expect(deckSrc).toContain('CHAMFER_PROFILES.RIGHT_END_CAP');

		const aiSrc = readFileSync('src/client/components/zones/HudAiCommandDeck.svelte', 'utf8');
		expect(aiSrc).toContain('flex-1 min-w-0');
		expect(aiSrc).toContain('ai-privacy-shield-badge');

		const shellSrc = readFileSync('src/client/components/modals/HudModalShell.svelte', 'utf8');
		const headerSrc = readFileSync('src/client/components/modals/HudModalHeader.svelte', 'utf8') + readFileSync('src/ui/modals/UiModalHeader.svelte', 'utf8');
		const collabSrc = readFileSync('src/client/components/modals/collab/CollabSocialModal.svelte', 'utf8');
		expect(shellSrc).toContain('HULL_PROFILES.CHAMFER_OCTAGON');
		expect(shellSrc).toContain('tweenedHeightPx={tweenedOuterHeightPx}');
		expect(headerSrc).toContain('2.25rem');
		expect(headerSrc).toContain('testid="modal-close-btn"');
		expect(collabSrc).toContain('title="Social Hub"');
		expect(collabSrc).toContain('<HudHorizontalDeck');

		const hudSrc = readFileSync('src/client/components/organisms/perimeter/ViewportHUD.svelte', 'utf8');
		expect(hudSrc).toContain('<HudCyberTooltip />');
	});
});
