/**
 * @author Oblx <code@oblx.dev>
 * @description Background worker interface for offloading heavy gamification batch calculations and XP rule compilation (v1.6.2).
 */
import { defaultGamificationInterceptor, type GamificationAwardResult, type GamificationEventPayload } from '@plugins/gamification/gamification.interceptor';
import { calculateLevelFromXp, calculateXpForLevel, type GamificationLevelProgress } from '@core/gamification/xp.curve';

export interface GamificationWorkerMessage {
	readonly type: 'PROCESS_EVENT' | 'RECOMPUTE_LEVEL' | 'SYNC_RULES';
	readonly event?: GamificationEventPayload;
	readonly totalXp?: number;
}

export function handleGamificationWorkerMessage(msg: GamificationWorkerMessage): {
	readonly success: boolean;
	readonly result?: GamificationAwardResult | GamificationLevelProgress | number;
} {
	if (msg.type === 'PROCESS_EVENT' && msg.event) {
		const res = defaultGamificationInterceptor.intercept(msg.event);
		return { success: true, result: res ?? undefined };
	}
	if (msg.type === 'RECOMPUTE_LEVEL' && typeof msg.totalXp === 'number') {
		const res = calculateLevelFromXp(msg.totalXp);
		return { success: true, result: res };
	}
	return { success: true, result: calculateXpForLevel(100) };
}
