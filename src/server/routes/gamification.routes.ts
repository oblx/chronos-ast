/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos HTTP API Routes for Cubic XP Gamification State, DAG Rules Matrix & Award Dispatcher.
 */
import { API_ROUTES } from '@config/constants';
import { CAPABILITY_BITS } from '@config/security.constants';
import { calculateLevelFromXp } from '@core/gamification/xp.curve';
import { defaultGamificationInterceptor } from '@plugins/gamification/gamification.interceptor';
import { badRequestResponse, okResponse, parseBodyObject, runCapabilityRoute, type ApiResponseEnvelope, type RequestPrincipal } from '../http/middleware';
import type { ChronosDatabaseHandle } from '@lib/db/client';

export async function handleGamificationRoutes(
	_handle: ChronosDatabaseHandle,
	urlPath: string,
	method: string,
	bodyText: string | undefined,
	headers: Record<string, string>,
	principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	if (urlPath.startsWith(API_ROUTES.GAMIFICATION_STATE) && method === 'GET') {
		const xp = defaultGamificationInterceptor.getUserTotalXp();
		return okResponse({ totalXp: xp, levelMeta: calculateLevelFromXp(xp), rulesCount: defaultGamificationInterceptor.getAllRules().length });
	}

	if (urlPath.startsWith(API_ROUTES.GAMIFICATION_RULES)) {
		if (method === 'GET') return okResponse({ rules: defaultGamificationInterceptor.getAllRules() });
		if (method === 'POST') {
			return runCapabilityRoute(principal, method, headers, CAPABILITY_BITS.RULE_PROFILE_MUTATE, false, () => {
				const body = parseBodyObject(bodyText);
				if (typeof body.eventKind === 'string' && typeof body.baseXp === 'number') {
					defaultGamificationInterceptor.updateRule(body as unknown as import('@config/gamification/gamification.registry').GamificationXpRuleSpec);
					return okResponse({ updated: true, rule: body });
				}
				return badRequestResponse('Valid GamificationXpRuleSpec with eventKind and baseXp required');
			});
		}
	}

	if (urlPath.startsWith(API_ROUTES.GAMIFICATION_AWARD) && method === 'POST') {
		const body = parseBodyObject<{ eventKind?: string }>(bodyText);
		if (!body?.eventKind) return badRequestResponse('eventKind is required');
		const res = defaultGamificationInterceptor.intercept({ kind: body.eventKind, actorId: principal.username });
		return okResponse({ success: Boolean(res), result: res });
	}

	return null;
}
