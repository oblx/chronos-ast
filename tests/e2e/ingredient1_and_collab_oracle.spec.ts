/**
 * @author Oblx <code@oblx.dev>
 * @description Ingredient 1 Red-Box & v1.7.2 Remediation Oracle verifying centered rails, Zone 1/2 geometry, Chronos Lobby, and Octagon Modal Shell.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'bun:test';
import {
	AUTH_LOBBY_TITLE,
	CHAMFER_PROFILES,
	COLLAB_CURSOR_PALETTE,
	HUD_FOLD_VECTORS,
	HUD_ZONE_VISIBILITY,
	HUD_ZONES,
} from '@config/hud.tokens';
import { REF_KIND_STYLE_MAP } from '@config/hud/hud.projections';

describe('Chronos v1.7.2 Ingredient 1 Red-Box & Modal Geometry Remediation Oracle', () => {
	test('Red Boxes 1 & 2: WING_CREST bottom-left and bottom-right corner carets render 4-point 135° obtuse polylines', () => {
		const frameSrc = readFileSync('src/client/components/atoms/HudChamferFrame.svelte', 'utf8');
		expect(frameSrc).toContain('profile === HULL_PROFILES.WING_CREST');
		expect(frameSrc).toContain('${x0},${y1 - c - leg} ${x0},${y1 - c} ${x0 + c},${y1} ${x0 + c + leg},${y1}');
		expect(frameSrc).toContain('${x1 - c - leg},${y1} ${x1 - c},${y1} ${x1},${y1 - c} ${x1},${y1 - c - leg}');
	});

	test('Red Boxes 3 & 4 + v1.9.5: LEFT_EDGE and RIGHT_EDGE are vertically centered at top-1/2 with translate3d(..., -50%, 0) and max-h-[calc(100vh-320px)]', () => {
		expect(CHAMFER_PROFILES.TOP_CAP_CHAMFER).toBe('TOP_CAP_CHAMFER');
		expect(HUD_FOLD_VECTORS.LEFT_EDGE).toBe('translate3d(-110%, -50%, 0)');
		expect(HUD_FOLD_VECTORS.RIGHT_EDGE).toBe('translate3d(110%, -50%, 0)');

		const btnSrc = readFileSync('src/client/components/atoms/HudChamferButton.svelte', 'utf8');
		expect(btnSrc).toContain('CHAMFER_PROFILES.TOP_CAP_CHAMFER');
		expect(btnSrc).toContain('CHAMFER_PROFILES.CHAMFER_OCTAGON');
		expect(btnSrc).toContain('`${x0 + c},${y0} ${x1 - c},${y0} ${x1},${y0 + c} ${x1},${y1} ${x0},${y1} ${x0},${y0 + c}`');

		const leftSrc = readFileSync('src/client/components/zones/HudLeftEdgeZone.svelte', 'utf8');
		const rightSrc = readFileSync('src/client/components/zones/HudRightEdgeZone.svelte', 'utf8');
		for (const edgeSrc of [leftSrc, rightSrc]) {
			expect(edgeSrc).toContain('top-1/2');
			expect(edgeSrc).toContain('h-auto');
			expect(edgeSrc).toContain('max-h-[calc(100vh-320px)]');
			expect(edgeSrc).toContain('CHAMFER_PROFILES.TOP_CAP_CHAMFER');
			expect(edgeSrc).toContain('CHAMFER_PROFILES.BOTTOM_CAP_CHAMFER');
			expect(edgeSrc).toContain('p-1.5');
		}
		const wireSrc = readFileSync('src/client/state/hud.wire.svelte.ts', 'utf8');
		expect(wireSrc).toContain('translate3d(0, -50%, 0)');
	});

	test('Red Box 5: Focal Cartridge top-right reticle is a 4-point 45°/135° diagonal bracket (dx === dy) and DEFINES edge uses high-contrast secondary accent', () => {
		const cartSrc = readFileSync('src/client/components/atoms/HudEntityCartridge.svelte', 'utf8');
		expect(cartSrc).toContain('data-testid="focal-reticle-tr"');
		expect(cartSrc).toContain('${width - chamfer - 10},-6 ${width - chamfer + 2},-6 ${width + 6},${chamfer - 2} ${width + 6},${chamfer + 10}');

		const width = 240, chamfer = 12;
		const p1x = width - chamfer + 2, p1y = -6;
		const p2x = width + 6, p2y = chamfer - 2;
		expect(p2x - p1x).toBe(chamfer + 4);
		expect(p2y - p1y).toBe(chamfer + 4);
		expect(p2x - p1x).toBe(p2y - p1y);
		expect(REF_KIND_STYLE_MAP.DEFINES.colorVar).toBe('var(--hud-accent-secondary)');
	});

	test('Red Boxes 6, 7 & 8: UNFOLDED_ZONES unfolds all 8 perimeter zones including BOTTOM_LEFT and two-tier BOTTOM_CENTER', () => {
		const wireSrc = readFileSync('src/client/state/hud.wire.svelte.ts', 'utf8');
		expect(wireSrc).toContain('[HUD_ZONES.TOP_LEFT]: HUD_ZONE_VISIBILITY.OPEN');
		expect(wireSrc).toContain('[HUD_ZONES.TOP_CENTER]: HUD_ZONE_VISIBILITY.OPEN');
		expect(wireSrc).toContain('[HUD_ZONES.TOP_RIGHT]: HUD_ZONE_VISIBILITY.OPEN');
		expect(wireSrc).toContain('[HUD_ZONES.LEFT_EDGE]: HUD_ZONE_VISIBILITY.COMPACT');
		expect(wireSrc).toContain('[HUD_ZONES.RIGHT_EDGE]: HUD_ZONE_VISIBILITY.COMPACT');
		expect(wireSrc).toContain('[HUD_ZONES.BOTTOM_LEFT]: HUD_ZONE_VISIBILITY.OPEN');
		expect(wireSrc).toContain('[HUD_ZONES.BOTTOM_CENTER]: HUD_ZONE_VISIBILITY.OPEN');
		expect(wireSrc).toContain('[HUD_ZONES.BOTTOM_RIGHT]: HUD_ZONE_VISIBILITY.OPEN');
		expect(HUD_ZONES.BOTTOM_CENTER).toBe('BOTTOM_CENTER');
		expect(HUD_ZONE_VISIBILITY.COMPACT).toBe('COMPACT');

		const bottomSrc = readFileSync('src/client/components/zones/HudBottomDockZones.svelte', 'utf8');
		expect(bottomSrc).toContain('data-testid="tactical-action-hotbar"');
		expect(bottomSrc).toContain('<HudAiCommandDeck');
		expect(bottomSrc).toContain('<HudVirtualCursorsOverlay');
		expect(COLLAB_CURSOR_PALETTE.length).toBe(8);
	});

	test('v1.7.2 1.1, 1.3, 1.4 & 1.5: Chronos Lobby title, Zone 1 XP cartridge, Zone 2 end-caps/AI input, and CHAMFER_OCTAGON modal shell', () => {
		expect(AUTH_LOBBY_TITLE).toBe('Chronos Lobby');
		const lobbySrc = readFileSync('src/client/components/modals/lobby/AuthLobbyModal.svelte', 'utf8');
		expect(lobbySrc).toContain('title={AUTH_LOBBY_TITLE}');
		expect(lobbySrc).not.toContain('Chronos Welcome & Identity Lobby');

		const topBarSrc = readFileSync('src/client/components/zones/HudTopBarZones.svelte', 'utf8');
		expect(topBarSrc).toContain('hud-gamification-level-badge');
		expect(topBarSrc).toContain('GRADE {health.grade}');
		expect(topBarSrc).not.toContain('H {health.grade}');
		expect(topBarSrc).not.toContain('active-project-shortcode');

		const deckSrc = readFileSync('src/client/components/zones/ProjectTabDeck.svelte', 'utf8');
		expect(deckSrc).toContain('px-3.5');
		expect(deckSrc).toContain('CHAMFER_PROFILES.LEFT_END_CAP');
		expect(deckSrc).toContain('CHAMFER_PROFILES.RIGHT_END_CAP');

		const aiSrc = readFileSync('src/client/components/zones/HudAiCommandDeck.svelte', 'utf8');
		expect(aiSrc.includes('flex-1 min-w-0') || aiSrc.includes('min-w-[304px]')).toBe(true);
		expect(aiSrc).toContain('ai-privacy-shield-badge');

		const shellSrc = readFileSync('src/client/components/modals/HudModalShell.svelte', 'utf8');
		const headerSrc = readFileSync('src/client/components/modals/HudModalHeader.svelte', 'utf8');
		const collabSrc = readFileSync('src/client/components/modals/collab/CollabSocialModal.svelte', 'utf8');
		expect(shellSrc).toContain('HULL_PROFILES.CHAMFER_OCTAGON');
		expect(shellSrc).not.toContain('hud-double-frame');
		expect(headerSrc).toContain('CHAMFER_PROFILES.CHAMFER_OCTAGON');
		expect(headerSrc.includes('px-6 pt-5') || headerSrc.includes('px-[14px] pt-[14px]')).toBe(true);
		expect(collabSrc).toContain('<HudModalShell');
		expect(collabSrc).toContain('<HudModalHeader');
		expect(collabSrc).toContain('<HudSubTabBar');
		expect(collabSrc).toContain('data-testid="collab-subtab-toolbar"');
		expect(collabSrc).toContain('title="Social Hub"');
		expect(collabSrc).toContain('<HudHorizontalDeck');
		const frameSrc = readFileSync('src/client/components/atoms/HudChamferFrame.svelte', 'utf8');
		expect(frameSrc).toContain('z-20');
		const hudSrc = readFileSync('src/client/components/organisms/perimeter/ViewportHUD.svelte', 'utf8');
		expect(hudSrc).toContain('<HudCyberTooltip />');
	});
});
