/**
 * @author Oblx <code@oblx.dev>
 * @description Community Theme Marketplace, User Theme Favorites, and User Preferences API route handlers (v2.5.0).
 */
import { and, desc, eq } from 'drizzle-orm';
import { API_ROUTES } from '@config/constants';
import { CAPABILITY_BITS } from '@config/security.constants';
import { COMMUNITY_SHOWCASE_PRESETS, HUD_THEME_PRESETS } from '@config/themes/presets.registry';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { communityThemes, userPreferences, users, userThemeFavorites } from '@lib/db/sqlite/schema/tables';
import { parseSafeJson } from '@lib/utils/log.sanitizer';
import { appendAuditEntry } from '@core/security/audit.chain';
import { validateCustomThemePayload } from '@core/security/guards/theme.validator';
import { badRequestResponse, okResponse, requireCapability, type ApiResponseEnvelope, type RequestPrincipal } from '../http/middleware';

export function ensureCommunityThemesSeeded(handle: ChronosDatabaseHandle): void {
	const existing = handle.db.select().from(communityThemes).limit(1).get();
	if (existing) return;
	const now = Date.now();
	let order = 0;
	for (const preset of Object.values(HUD_THEME_PRESETS)) {
		const slug = preset.id.toLowerCase().replace(/_/g, '-');
		handle.db.insert(communityThemes).values({
			slug, name: preset.label, authorUserId: 1, authorHandle: 'oblx',
			polarity: preset.polarity, tokensJson: JSON.stringify(preset),
			favoritesCount: 50 - order * 4, appliesCount: 180 - order * 12,
			isBuiltIn: true, createdAt: now - order * 60000, updatedAt: now,
		}).run();
		order++;
	}
	for (const comm of COMMUNITY_SHOWCASE_PRESETS) {
		const base = HUD_THEME_PRESETS[comm.baseId];
		const tokens = { ...base, accentPrimary: comm.accentPrimary, accentSecondary: comm.accentSecondary, bgCanvas: comm.bgCanvas, bgPanel: comm.bgPanel };
		handle.db.insert(communityThemes).values({
			slug: comm.slug, name: comm.name, authorUserId: 1, authorHandle: comm.authorHandle,
			polarity: comm.polarity, tokensJson: JSON.stringify(tokens),
			favoritesCount: comm.favoritesCount, appliesCount: comm.appliesCount,
			isBuiltIn: true, createdAt: now - order * 60000, updatedAt: now,
		}).run();
		order++;
	}
}

function resolveCallerUid(handle: ChronosDatabaseHandle, principal: RequestPrincipal): number {
	return handle.db.select().from(users).where(eq(users.id, principal.userId)).get()?.uid ?? (Number(principal.userId) || 0);
}

async function handleThemePublish(
	handle: ChronosDatabaseHandle, bodyText: string | undefined, method: string, headers: Record<string, string>, principal: RequestPrincipal, uid: number
): Promise<ApiResponseEnvelope> {
	const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.WORKSPACE_CREATE);
	if (denied) return denied;
	const body = bodyText ? parseSafeJson<Record<string, unknown>>(bodyText) : {};
	const check = validateCustomThemePayload(body);
	if (!check.valid || !check.tokens || !check.name || !check.slug || !check.polarity) {
		return badRequestResponse(check.error ?? 'Invalid theme payload.');
	}
	const now = Date.now(), authorUid = uid || 1;
	const authorRow = handle.db.select().from(users).where(eq(users.id, principal.userId)).get();
	const authorHandle = authorRow?.username ?? (principal.userId === '1' ? 'oblx' : principal.userId);
	const existing = handle.db.select().from(communityThemes).where(eq(communityThemes.slug, check.slug)).get();
	const row = existing
		? handle.db.update(communityThemes).set({ name: check.name, polarity: check.polarity, tokensJson: JSON.stringify(check.tokens), updatedAt: now }).where(eq(communityThemes.id, existing.id)).returning().get()!
		: handle.db.insert(communityThemes).values({ slug: check.slug, name: check.name, authorUserId: authorUid, authorHandle, polarity: check.polarity, tokensJson: JSON.stringify(check.tokens), favoritesCount: 1, appliesCount: 1, isBuiltIn: false, createdAt: now, updatedAt: now }).returning().get();
	await appendAuditEntry(handle, principal.userId, 'COMMUNITY_THEME_PUBLISHED', 'INFO', `Published theme ${row.name} (${row.slug})`);
	return okResponse({ theme: row });
}

function handleThemeFavoriteOrApply(handle: ChronosDatabaseHandle, bodyText: string | undefined, uid: number): ApiResponseEnvelope {
	const body = bodyText ? parseSafeJson<Record<string, unknown>>(bodyText) : {};
	const themeId = Number(body.themeId ?? 1) >>> 0;
	const action = String(body.action ?? 'FAVORITE').toUpperCase();
	const target = handle.db.select().from(communityThemes).where(eq(communityThemes.id, themeId)).get();
	if (!target) return badRequestResponse('Theme not found.');
	const userId = uid || 1, now = Date.now();
	if (action === 'APPLY') {
		const updated = handle.db.update(communityThemes).set({ appliesCount: target.appliesCount + 1, updatedAt: now }).where(eq(communityThemes.id, themeId)).returning().get()!;
		const pref = handle.db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get();
		if (pref) handle.db.update(userPreferences).set({ activeThemeId: themeId, updatedAt: now }).where(eq(userPreferences.userId, userId)).run();
		else handle.db.insert(userPreferences).values({ userId, activeThemeId: themeId, edgeDrawerMode: 'OVERLAY_HOVER', fontLigatures: true, codeFontSizePx: 13, tutorialCompleted: false, updatedAt: now }).run();
		return okResponse({ theme: updated, applied: true });
	}
	const existingFav = handle.db.select().from(userThemeFavorites).where(and(eq(userThemeFavorites.userId, userId), eq(userThemeFavorites.themeId, themeId))).get();
	let favorited = false;
	if (existingFav) {
		handle.db.delete(userThemeFavorites).where(eq(userThemeFavorites.id, existingFav.id)).run();
	} else {
		handle.db.insert(userThemeFavorites).values({ userId, themeId, createdAt: now }).run();
		favorited = true;
	}
	const nextFavCount = Math.max(0, target.favoritesCount + (favorited ? 1 : -1));
	const updated = handle.db.update(communityThemes).set({ favoritesCount: nextFavCount, updatedAt: now }).where(eq(communityThemes.id, themeId)).returning().get()!;
	return okResponse({ theme: updated, favorited });
}

function handleUserPreferencesRoute(handle: ChronosDatabaseHandle, method: string, bodyText: string | undefined, uid: number): ApiResponseEnvelope {
	const userId = uid || 1, now = Date.now();
	const current = handle.db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get()
		?? handle.db.insert(userPreferences).values({ userId, activeThemeId: 1, edgeDrawerMode: 'OVERLAY_HOVER', fontLigatures: true, codeFontSizePx: 13, tutorialCompleted: false, updatedAt: now }).returning().get();
	if (method === 'GET') return okResponse({ preferences: current });
	const body = bodyText ? parseSafeJson<Record<string, unknown>>(bodyText) : {};
	const edgeDrawerMode = body.edgeDrawerMode === 'DOCKED_RESIZE' ? 'DOCKED_RESIZE' : body.edgeDrawerMode === 'OVERLAY_HOVER' ? 'OVERLAY_HOVER' : current.edgeDrawerMode;
	const fontLigatures = typeof body.fontLigatures === 'boolean' ? body.fontLigatures : current.fontLigatures;
	const codeFontSizePx = body.codeFontSizePx !== undefined ? Math.max(12, Math.min(16, Number(body.codeFontSizePx) >>> 0)) : current.codeFontSizePx;
	const tutorialCompleted = typeof body.tutorialCompleted === 'boolean' ? body.tutorialCompleted : current.tutorialCompleted;
	const activeThemeId = body.activeThemeId !== undefined ? (Number(body.activeThemeId) >>> 0) || 1 : current.activeThemeId;
	const updated = handle.db.update(userPreferences).set({ activeThemeId, edgeDrawerMode, fontLigatures, codeFontSizePx, tutorialCompleted, updatedAt: now }).where(eq(userPreferences.userId, userId)).returning().get()!;
	return okResponse({ preferences: updated });
}

export async function handleThemeAndPreferenceRoutes(
	handle: ChronosDatabaseHandle, urlPath: string, method: string, bodyText: string | undefined, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	ensureCommunityThemesSeeded(handle);
	const uid = resolveCallerUid(handle, principal);
	if (urlPath.startsWith(API_ROUTES.THEME_FAVORITE) && method === 'POST') return handleThemeFavoriteOrApply(handle, bodyText, uid);
	if (urlPath.startsWith(API_ROUTES.USER_PREFERENCES)) return handleUserPreferencesRoute(handle, method, bodyText, uid);
	if (urlPath.startsWith(API_ROUTES.THEMES)) {
		if (method === 'GET') {
			const themes = handle.db.select().from(communityThemes).orderBy(desc(communityThemes.favoritesCount)).all();
			const favs = handle.db.select().from(userThemeFavorites).where(eq(userThemeFavorites.userId, uid || 1)).all().map((f) => f.themeId);
			const prefs = handle.db.select().from(userPreferences).where(eq(userPreferences.userId, uid || 1)).get() ?? null;
			return okResponse({ themes, favoriteThemeIds: favs, preferences: prefs });
		}
		if (method === 'POST') return handleThemePublish(handle, bodyText, method, headers, principal, uid);
	}
	return null;
}
