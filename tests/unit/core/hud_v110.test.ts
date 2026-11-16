/**
 * @author Oblx <code@oblx.dev>
 * @description Unit checks for Chronos v1.1.0 11-Zone Game-HUD topology, fold vectors, 6 calibrated themes, and Stations catalog.
 */
import { describe, expect, test } from 'bun:test';
import { HUD_FOLD_VECTORS, HUD_MOTION, HUD_ZONE_VISIBILITY, HUD_ZONES } from '@config/hud.tokens';
import { HUD_DISCLOSURE_TIERS, HUD_EVENTS, HUD_MODALS, STATION_CATEGORIES, STATIONS_DIRECTORY } from '@config/hud.events';
import { HUD_THEME_IDS, HUD_THEME_PRESETS } from '@config/themes/presets.registry';

describe('Chronos v1.1.0 Game-HUD Configuration & Contracts', () => {
	test('defines all 11 clockwise HUD zones and 8 axial/diagonal fold vectors', () => {
		expect(Object.keys(HUD_ZONES)).toHaveLength(11);
		expect(Object.keys(HUD_FOLD_VECTORS)).toHaveLength(8);
		expect(HUD_FOLD_VECTORS[HUD_ZONES.TOP_CENTER]).toBe('translate3d(0, -110%, 0)');
		expect(HUD_FOLD_VECTORS[HUD_ZONES.BOTTOM_RIGHT]).toBe('translate3d(110%, 110%, 0)');
		expect(HUD_MOTION.FOLD_EASING).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
		expect(Object.keys(HUD_ZONE_VISIBILITY)).toEqual(['OPEN', 'COMPACT', 'FOLDED']);
	});

	test('defines 6 calibrated retro-editorial themes (3 Dark, 3 Light) with brassFrame token', () => {
		const presets = Object.values(HUD_THEME_PRESETS);
		expect(presets).toHaveLength(6);
		expect(presets.filter((p) => p.polarity === 'DARK')).toHaveLength(3);
		expect(presets.filter((p) => p.polarity === 'LIGHT')).toHaveLength(3);
		expect(HUD_THEME_PRESETS[HUD_THEME_IDS.OBSIDIAN_CYBER].label).toBe('Obsidian Brass');
		expect(HUD_THEME_PRESETS[HUD_THEME_IDS.PAPER_ARCHITECT].label).toBe('Archival Vellum');
		for (const p of presets) {
			expect(p.brassFrame).toMatch(/^#[0-9A-Fa-f]{6}$/);
		}
	});

	test('defines Stations Launcher directory across 4 columns, typed HUD events, and 3 disclosure tiers', () => {
		expect(STATION_CATEGORIES.map((c) => c.key)).toEqual(['MONITOR', 'MANAGE', 'INTERACT', 'ADMIN']);
		for (const cat of STATION_CATEGORIES) {
			expect(STATIONS_DIRECTORY.filter((item) => item.category === cat.key).length).toBeGreaterThanOrEqual(4);
		}
		expect(Object.keys(HUD_EVENTS).length).toBeGreaterThanOrEqual(8);
		expect(Object.keys(HUD_MODALS)).toContain('STATIONS_LAUNCHER');
		expect(Object.keys(HUD_MODALS)).toContain('DEVIATION_SIGN_OFF');
		expect(Object.keys(HUD_DISCLOSURE_TIERS)).toHaveLength(3);
	});
});
