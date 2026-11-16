/**
 * @author Oblx <code@oblx.dev>
 * @description Decoupled DAG Middleware Interceptor (next() pattern) for Cubic XP & Leveled Card Progression.
 */
import { ACHIEVEMENT_CARDS, INITIAL_DAG_XP_RULES, type GamificationXpRuleSpec } from '@config/gamification/gamification.registry';
import { calculateLevelFromXp } from '@core/gamification/xp.curve';

export interface GamificationEventPayload {
	readonly kind: string;
	readonly actorId?: string;
	readonly payload?: Readonly<Record<string, unknown>>;
	readonly timestamp?: number;
}

export interface GamificationAwardResult {
	readonly eventKind: string;
	readonly awardedXp: number;
	readonly newTotalXp: number;
	readonly levelUp: boolean;
	readonly newLevel: number;
	readonly cardLevelUps: readonly { readonly cardId: string; readonly newLevel: number }[];
}

export class GamificationInterceptorEngine {
	private rules = new Map<string, GamificationXpRuleSpec>();
	private lastFired = new Map<string, number>();
	private cardProgress = new Map<string, number>();
	private userTotalXp = 0;

	constructor(initialRules: readonly GamificationXpRuleSpec[] = INITIAL_DAG_XP_RULES) {
		for (const r of initialRules) this.rules.set(r.eventKind, r);
	}

	updateRule(rule: GamificationXpRuleSpec): void {
		this.rules.set(rule.eventKind, rule);
	}

	getAllRules(): readonly GamificationXpRuleSpec[] {
		return Array.from(this.rules.values());
	}

	setUserState(totalXp: number, cardCounters?: Record<string, number>): void {
		this.userTotalXp = Math.max(0, totalXp);
		if (cardCounters) {
			for (const [k, v] of Object.entries(cardCounters)) this.cardProgress.set(k, v);
		}
	}

	getUserTotalXp(): number {
		return this.userTotalXp;
	}

	intercept(event: GamificationEventPayload, next?: (ev: GamificationEventPayload) => void): GamificationAwardResult | null {
		if (next) next(event);
		const rule = this.rules.get(event.kind);
		if (!rule || !rule.enabled) return null;

		const now = event.timestamp ?? Date.now();
		const last = this.lastFired.get(event.kind) ?? 0;
		if (last > 0 && rule.cooldownSec > 0 && now - last < rule.cooldownSec * 1000) return null;

		this.lastFired.set(event.kind, now);
		const oldLevel = calculateLevelFromXp(this.userTotalXp).currentLevel;
		const awarded = rule.baseXp;
		this.userTotalXp += awarded;
		const nextMeta = calculateLevelFromXp(this.userTotalXp);
		const levelUp = nextMeta.currentLevel > oldLevel;
		const cardLevelUps = this.evaluateCardProgress(event);

		return {
			eventKind: event.kind,
			awardedXp: awarded,
			newTotalXp: this.userTotalXp,
			levelUp,
			newLevel: nextMeta.currentLevel,
			cardLevelUps,
		};
	}

	private evaluateCardProgress(event: GamificationEventPayload): readonly { readonly cardId: string; readonly newLevel: number }[] {
		const levelUps: { cardId: string; newLevel: number }[] = [];
		for (const card of ACHIEVEMENT_CARDS) {
			const curCount = (this.cardProgress.get(card.id) ?? 0) + 1;
			this.cardProgress.set(card.id, curCount);
			for (let tierIdx = card.tierThresholds.length - 1; tierIdx >= 0; tierIdx--) {
				const threshold = card.tierThresholds[tierIdx]!;
				if (curCount === threshold) {
					levelUps.push({ cardId: card.id, newLevel: tierIdx + 1 });
					break;
				}
			}
		}
		return levelUps;
	}
}

export const defaultGamificationInterceptor = new GamificationInterceptorEngine();
